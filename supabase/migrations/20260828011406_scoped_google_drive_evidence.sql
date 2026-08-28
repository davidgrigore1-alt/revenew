-- G3A: selected external sources, separate from generated/sent opportunity_documents.
begin;
alter table public.external_connections add column drive_status text not null default 'not_connected'
  check (drive_status in ('not_connected','connected','action_required','error'));

create table public.external_document_sources (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 owner_profile_id uuid not null references public.profiles(id) on delete cascade,
 connection_id uuid not null references public.external_connections(id) on delete cascade,
 opportunity_id uuid references public.opportunities(id) on delete cascade,
 provider text not null default 'google_drive' check (provider = 'google_drive'),
 provider_file_id text not null check (provider_file_id ~ '^[A-Za-z0-9_-]{1,200}$'),
 resource_key text,
 name text not null default '' check (length(name) <= 500),
 mime_type text not null default '' check (length(mime_type) <= 150),
 modified_time timestamptz,
 provider_version text,
 web_view_link text,
 document_kind text not null default 'other' check (document_kind in ('offer','contract','brief','specification','other')),
 state text not null check (state in ('synced','metadata_only','too_large','unsupported','access_revoked','unavailable','extraction_failed','removed')),
 extraction_note text,
 content_hash text check (content_hash is null or content_hash ~ '^[a-f0-9]{64}$'),
 selected_by uuid not null references public.profiles(id) check (selected_by = owner_profile_id),
 last_synced_at timestamptz,
 revision integer not null default 0 check (revision >= 0),
 created_at timestamptz not null default now(),
 unique(connection_id, provider_file_id),
 unique(id, business_id),
 check (state = 'removed' or opportunity_id is not null)
);
create index external_document_sources_context_idx on public.external_document_sources(business_id, opportunity_id, state);
create index external_document_sources_owner_idx on public.external_document_sources(business_id, owner_profile_id, connection_id);
create table public.external_document_segments (
 id uuid primary key default gen_random_uuid(),
 source_id uuid not null,
 business_id uuid not null,
 ordinal integer not null check (ordinal between 0 and 127),
 text text not null check (length(text) <= 8000),
 text_hash text not null check (text_hash ~ '^[a-f0-9]{64}$'),
 location_type text not null check (location_type in ('lines','csv_rows')),
 location_label text not null check (length(location_label) <= 200),
 content_trust text not null default 'untrusted_external_data' check (content_trust = 'untrusted_external_data'),
 unique(source_id, ordinal),
 foreign key (source_id, business_id) references public.external_document_sources(id, business_id) on delete cascade
);
create table public.external_document_audit (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 actor_profile_id uuid not null references public.profiles(id) on delete cascade,
 connection_id uuid not null references public.external_connections(id) on delete cascade,
 source_id uuid references public.external_document_sources(id) on delete set null,
 event text not null check (event in ('authorized','added','linked','synchronized','removed','access_revoked')),
 occurred_at timestamptz not null default now()
);
create index external_document_audit_business_idx on public.external_document_audit(business_id, occurred_at desc);

create function public.validate_external_document_target() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
 if new.opportunity_id is not null and not exists (
  select 1 from public.opportunities where id = new.opportunity_id and business_id = new.business_id
 ) then raise exception 'external document target scope mismatch' using errcode = '42501'; end if;
 if tg_op = 'UPDATE' and (new.business_id, new.owner_profile_id, new.connection_id, new.provider_file_id)
   is distinct from (old.business_id, old.owner_profile_id, old.connection_id, old.provider_file_id)
 then raise exception 'external source identity immutable' using errcode = '42501'; end if;
 return new;
end;
$$;
create trigger external_document_target before insert or update on public.external_document_sources
 for each row execute function public.validate_external_document_target();
revoke all on function public.validate_external_document_target() from public, anon, authenticated;

-- One transaction owns source revision, segment replacement and safe audit.
-- Network/extraction never run inside a DB transaction. CAS fences stale ingestion after removal/revocation.
create function public.commit_external_document(
 p_business uuid, p_actor uuid, p_connection uuid, p_file text, p_expected_revision integer,
 p_mode text, p_source jsonb, p_segments jsonb
) returns uuid language plpgsql set search_path = pg_catalog, public as $$
declare s public.external_document_sources; c public.external_connections; result_id uuid; changed_link boolean;
begin
 if p_expected_revision is null or p_expected_revision < -1 then raise exception 'invalid revision'; end if;
 if p_mode not in ('add','sync','remove') then raise exception 'invalid mode'; end if;
 select * into c from public.external_connections where id = p_connection
   and business_id = p_business and owner_profile_id = p_actor for share;
 if not found or (p_mode <> 'remove' and c.status = 'disconnected') then raise exception 'connection forbidden' using errcode = '42501'; end if;
 if p_mode <> 'remove' and (c.drive_status <> 'connected' or not ('https://www.googleapis.com/auth/drive.file' = any(c.granted_scopes)))
 then raise exception 'drive authorization required' using errcode = '42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_connection::text || ':' || p_file, 0));
 select * into s from public.external_document_sources where connection_id = p_connection and provider_file_id = p_file for update;
 if (s.id is null and p_expected_revision <> -1) or (s.id is not null and s.revision <> p_expected_revision)
 then raise exception 'source revision changed' using errcode = '40001'; end if;
 if p_mode <> 'add' and (s.id is null or s.state = 'removed') then raise exception 'source inactive'; end if;
 if p_mode = 'remove' then
   delete from public.external_document_segments where source_id = s.id;
   update public.external_document_sources set state = 'removed', opportunity_id = null, name = '', mime_type = '',
    resource_key = null, web_view_link = null, content_hash = null, modified_time = null, provider_version = null,
    extraction_note = null, last_synced_at = null, revision = revision + 1 where id = s.id;
   insert into public.external_document_audit(business_id,actor_profile_id,connection_id,source_id,event)
     values(p_business,p_actor,p_connection,s.id,'removed');
   return s.id;
 end if;
 if jsonb_typeof(p_segments) <> 'array' or jsonb_array_length(p_segments) > 128 then raise exception 'segment limit'; end if;
 if (select coalesce(sum(length(value->>'text')),0) from jsonb_array_elements(p_segments)) > 200000 then raise exception 'content limit'; end if;
 if p_source->>'state' <> 'synced' and jsonb_array_length(p_segments) > 0 then raise exception 'inactive content'; end if;
 changed_link := s.id is not null and s.opportunity_id is distinct from (p_source->>'opportunity_id')::uuid;
 insert into public.external_document_sources(
  business_id,owner_profile_id,connection_id,provider_file_id,opportunity_id,selected_by,
  name,mime_type,resource_key,modified_time,provider_version,web_view_link,document_kind,state,extraction_note,content_hash,last_synced_at
 ) values (
  p_business,p_actor,p_connection,p_file,(p_source->>'opportunity_id')::uuid,p_actor,
  p_source->>'name',p_source->>'mime_type',p_source->>'resource_key',(p_source->>'modified_time')::timestamptz,
  p_source->>'provider_version',p_source->>'web_view_link',p_source->>'document_kind',p_source->>'state',
  p_source->>'extraction_note',p_source->>'content_hash',now()
 ) on conflict(connection_id,provider_file_id) do update set
  opportunity_id = excluded.opportunity_id, name = excluded.name, mime_type = excluded.mime_type,
  resource_key = excluded.resource_key, modified_time = excluded.modified_time, provider_version = excluded.provider_version,
  web_view_link = excluded.web_view_link, document_kind = excluded.document_kind, state = excluded.state,
  extraction_note = excluded.extraction_note, content_hash = excluded.content_hash, last_synced_at = now(),
  revision = external_document_sources.revision + 1
 returning id into result_id;
 -- Preserve segment IDs for identical content; changed content replaces locations atomically.
 if s.id is null or s.content_hash is distinct from (p_source->>'content_hash') or p_source->>'state' <> 'synced' then
  delete from public.external_document_segments where source_id = result_id;
  insert into public.external_document_segments(source_id,business_id,ordinal,text,text_hash,location_type,location_label)
   select result_id,p_business,(value->>'ordinal')::integer,value->>'text',value->>'text_hash',
    value->>'location_type',value->>'location_label' from jsonb_array_elements(p_segments);
 end if;
 insert into public.external_document_audit(business_id,actor_profile_id,connection_id,source_id,event)
 values(p_business,p_actor,p_connection,result_id,case when s.id is null or s.state = 'removed' then 'added'
   when changed_link then 'linked' when p_source->>'state' = 'access_revoked' then 'access_revoked' else 'synchronized' end);
 return result_id;
end;
$$;
revoke all on function public.commit_external_document(uuid,uuid,uuid,text,integer,text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.commit_external_document(uuid,uuid,uuid,text,integer,text,jsonb,jsonb) to service_role;

create function public.external_drive_access_changed() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
 if new.drive_status = 'connected' and old.drive_status <> 'connected' then
  insert into public.external_document_audit(business_id,actor_profile_id,connection_id,event)
   values(new.business_id,new.owner_profile_id,new.id,'authorized');
 end if;
 if new.status = 'disconnected' or new.drive_status <> 'connected'
    or not ('https://www.googleapis.com/auth/drive.file' = any(new.granted_scopes)) then
  delete from public.external_document_segments where source_id in (
    select id from public.external_document_sources where connection_id = new.id);
  -- Do not run owner-membership triggers during credential cleanup after membership loss.
  update public.external_document_sources set state = 'access_revoked', content_hash = null, revision = revision + 1
    where connection_id = new.id and state <> 'removed';
  if old.drive_status = 'connected' then
   insert into public.external_document_audit(business_id,actor_profile_id,connection_id,event)
    values(new.business_id,new.owner_profile_id,new.id,'access_revoked');
  end if;
 end if;
 return new;
end;
$$;
-- Membership check needed on ownership changes; transactional writes separately validate current actor.
create trigger external_document_sources_validate_owner before insert or update of business_id,owner_profile_id,connection_id
 on public.external_document_sources for each row execute function public.validate_external_context_owner();
create trigger external_drive_access_changed after update of drive_status,status,granted_scopes on public.external_connections
 for each row execute function public.external_drive_access_changed();
revoke all on function public.external_drive_access_changed() from public, anon, authenticated;

alter table public.external_document_sources enable row level security;
alter table public.external_document_segments enable row level security;
alter table public.external_document_audit enable row level security;
-- Existing opportunity documents use business membership, not record-level privacy.
create policy external_document_sources_business_select on public.external_document_sources for select to authenticated
 using (public.can_access_business(business_id) and state <> 'removed');
create policy external_document_segments_business_select on public.external_document_segments for select to authenticated
 using (public.can_access_business(business_id) and exists (
  select 1 from public.external_document_sources s where s.id = source_id and s.business_id = external_document_segments.business_id and s.state = 'synced'));
create policy external_document_audit_business_select on public.external_document_audit for select to authenticated
 using (public.can_access_business(business_id));
-- Server loaders project fields. No direct browser mutation or credential access.
revoke all on table public.external_document_sources, public.external_document_segments, public.external_document_audit from public, anon, authenticated;
grant select,insert,update,delete on table public.external_document_sources, public.external_document_segments, public.external_document_audit to service_role;
comment on table public.external_document_segments is 'Untrusted external data only. Never instructions or autonomous workflow input.';
commit;
