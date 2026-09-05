-- Phase 3.2: generic immutable local memory; only CSV admitted by the server in this release.
begin;
create table public.local_document_sources (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
 created_by_profile_id uuid not null references public.profiles(id), created_at timestamptz not null default now(),
 opportunity_id uuid references public.opportunities(id), state text not null default 'active' check(state in ('active','deletion_pending','deleted')),
 unique(id,business_id)
);
create table public.local_document_versions (
 id uuid primary key default gen_random_uuid(), source_id uuid not null, business_id uuid not null,
 uploader_profile_id uuid not null references public.profiles(id), original_filename text not null check(length(original_filename) between 1 and 240),
 object_key text not null unique, format text not null, mime_type text not null,
 state text not null default 'reserved' check(state in ('reserved','verifying','ready','parse_failed','unavailable','deletion_pending','deleted')),
 byte_size integer check(byte_size between 1 and 2097152), content_hash text check(content_hash ~ '^[a-f0-9]{64}$'),
 parser_version text, headers jsonb, row_count integer check(row_count between 1 and 1000), column_count integer check(column_count between 1 and 30),
 created_at timestamptz not null default now(), finalized_at timestamptz, failure_code text,
 foreign key(source_id,business_id) references public.local_document_sources(id,business_id), unique(id,business_id),
 check(state <> 'ready' or (byte_size is not null and content_hash is not null and finalized_at is not null and parser_version is not null and headers is not null and row_count is not null and column_count is not null))
);
create table public.local_document_segments (
 version_id uuid not null, business_id uuid not null, row_number integer not null check(row_number between 2 and 1001),
 cells jsonb not null check(jsonb_typeof(cells)='array' and jsonb_array_length(cells) between 1 and 30),
 content_trust text not null default 'untrusted' check(content_trust='untrusted'),
 primary key(version_id,row_number), foreign key(version_id,business_id) references public.local_document_versions(id,business_id)
);
create table public.local_document_audit (
 id uuid primary key default gen_random_uuid(), source_id uuid not null, business_id uuid not null,
 actor_profile_id uuid references public.profiles(id), event text not null check(event in ('reserved','ready','associated','deletion_pending','deleted')),
 occurred_at timestamptz not null default now(), foreign key(source_id,business_id) references public.local_document_sources(id,business_id)
);
create index local_document_sources_business on public.local_document_sources(business_id,created_at desc);
create index local_document_versions_source on public.local_document_versions(source_id,created_at desc);

-- safety-justification: narrow role predicate using current auth identity and active canonical membership, no mutations.
create function public.can_write_local_documents(target_business_id uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select auth.uid() is not null and (public.owns_business(target_business_id) or exists(select 1 from public.business_members where business_id=target_business_id and profile_id=public.current_profile_id() and status='active' and role in ('owner','admin','manager','member')));
$$;
-- safety-justification: avoids recursive source/version policies; checks live membership and canonical same-business opportunity.
create function public.can_read_local_document(target_source_id uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select auth.uid() is not null and exists(select 1 from public.local_document_sources s where s.id=target_source_id and s.state='active' and public.can_access_business(s.business_id)
 and (s.opportunity_id is null or exists(select 1 from public.opportunities o where o.id=s.opportunity_id and o.business_id=s.business_id and public.can_access_business(o.business_id))));
$$;
alter table public.local_document_sources enable row level security;
alter table public.local_document_versions enable row level security;
alter table public.local_document_segments enable row level security;
alter table public.local_document_audit enable row level security;
create policy local_sources_read on public.local_document_sources for select to authenticated using(public.can_access_business(business_id) and (opportunity_id is null or exists(select 1 from public.opportunities o where o.id=opportunity_id and o.business_id=business_id)));
create policy local_versions_read on public.local_document_versions for select to authenticated using(exists(select 1 from public.local_document_sources s where s.id=source_id and s.business_id=local_document_versions.business_id));
create policy local_segments_read on public.local_document_segments for select to authenticated using(exists(select 1 from public.local_document_versions v where v.id=version_id and v.business_id=local_document_segments.business_id and v.state='ready' and public.can_read_local_document(v.source_id)));
create policy local_audit_read on public.local_document_audit for select to authenticated using(public.can_access_business(business_id));
revoke all on public.local_document_sources,public.local_document_versions,public.local_document_segments,public.local_document_audit from anon,authenticated;
grant select on public.local_document_sources,public.local_document_versions,public.local_document_segments,public.local_document_audit to authenticated;
grant all on public.local_document_sources,public.local_document_versions,public.local_document_segments,public.local_document_audit to service_role;

-- safety-justification: authenticated reservation only; live working role, server UUID/key, no bytes or client verification claims accepted.
create function public.reserve_local_document(p_business uuid,p_filename text,p_source uuid default null) returns public.local_document_versions language plpgsql security definer set search_path=pg_catalog,public as $$
declare s public.local_document_sources; v public.local_document_versions; vid uuid:=gen_random_uuid();
begin
 if not public.can_write_local_documents(p_business) then raise exception 'document_forbidden'; end if;
 if length(p_filename) not between 1 and 240 or p_filename !~* '\.csv$' or p_filename ~ '[[:cntrl:]/\\]' then raise exception 'document_format'; end if;
 if p_source is null then
  insert into public.local_document_sources(business_id,created_by_profile_id) values(p_business,public.current_profile_id()) returning * into s;
 else
  select * into s from public.local_document_sources where id=p_source and business_id=p_business and state='active' for update;
  if not found or not public.can_read_local_document(s.id) then raise exception 'document_forbidden'; end if;
 end if;
 insert into public.local_document_versions(id,source_id,business_id,uploader_profile_id,original_filename,object_key,format,mime_type)
 values(vid,s.id,p_business,public.current_profile_id(),p_filename,s.id::text||'/'||vid::text,'csv','text/csv') returning * into v;
 insert into public.local_document_audit(source_id,business_id,actor_profile_id,event) values(s.id,p_business,public.current_profile_id(),'reserved');
 return v;
end; $$;

-- safety-justification: service-only verified extraction transaction; row/source locks prevent finalize/delete races and immutable ready replay.
create function public.finalize_local_document(p_version uuid,p_size integer,p_hash text,p_headers jsonb,p_rows jsonb,p_parser text) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare v public.local_document_versions; s public.local_document_sources;
begin
 select * into v from public.local_document_versions where id=p_version;
 select * into s from public.local_document_sources where id=v.source_id for update;
 select * into v from public.local_document_versions where id=p_version for update;
 if s.state <> 'active' or v.id is null then raise exception 'document_unavailable'; end if;
 if v.state='ready' then
  if v.content_hash<>p_hash or v.byte_size<>p_size then raise exception 'immutable_document'; end if; return;
 end if;
 if v.state not in ('reserved','verifying','unavailable') then raise exception 'document_state'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 1000 or jsonb_typeof(p_headers)<>'array' or jsonb_array_length(p_headers) not between 1 and 30 then raise exception 'document_bounds'; end if;
 if exists(select 1 from jsonb_array_elements(p_rows) r where jsonb_typeof(r)<>'array' or jsonb_array_length(r)<>jsonb_array_length(p_headers)) then raise exception 'document_shape'; end if;
 insert into public.local_document_segments(version_id,business_id,row_number,cells) select v.id,v.business_id,ordinality+1,value from jsonb_array_elements(p_rows) with ordinality;
 update public.local_document_versions set state='ready',byte_size=p_size,content_hash=p_hash,headers=p_headers,row_count=jsonb_array_length(p_rows),column_count=jsonb_array_length(p_headers),parser_version=p_parser,finalized_at=now(),failure_code=null where id=v.id;
 insert into public.local_document_audit(source_id,business_id,actor_profile_id,event) values(s.id,s.business_id,v.uploader_profile_id,'ready');
end; $$;

-- safety-justification: live writer permission and source lock; source becomes unreadable before physical deletion; audit contains no body.
create function public.begin_local_document_delete(p_source uuid) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare s public.local_document_sources;
begin
 select * into s from public.local_document_sources where id=p_source for update;
 if s.id is null or not public.can_write_local_documents(s.business_id) then raise exception 'document_forbidden'; end if;
 if s.state='deleted' then return; end if;
 update public.local_document_sources set state='deletion_pending' where id=s.id;
 update public.local_document_versions set state='deletion_pending' where source_id=s.id;
 delete from public.local_document_segments where version_id in(select id from public.local_document_versions where source_id=s.id);
 insert into public.local_document_audit(source_id,business_id,actor_profile_id,event) values(s.id,s.business_id,public.current_profile_id(),'deletion_pending');
end; $$;
-- safety-justification: service-only physical-deletion receipt; no destructive object operation is inferred from metadata deletion.
create function public.finish_local_document_delete(p_source uuid) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 perform 1 from public.local_document_sources where id=p_source and state='deletion_pending' for update;
 if not found then return; end if;
 update public.local_document_versions set state='deleted',headers=null,original_filename='Document șters',failure_code=null where source_id=p_source;
 update public.local_document_sources set state='deleted',opportunity_id=null where id=p_source;
 insert into public.local_document_audit(source_id,business_id,event) select id,business_id,'deleted' from public.local_document_sources where id=p_source;
end; $$;
-- safety-justification: source and target are checked in the same business; current writer required, no cross-business relation accepted.
create function public.associate_local_document(p_source uuid,p_opportunity uuid) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare s public.local_document_sources;
begin
 select * into s from public.local_document_sources where id=p_source and state='active' for update;
 if s.id is null or not public.can_write_local_documents(s.business_id) then raise exception 'document_forbidden'; end if;
 if p_opportunity is not null and not exists(select 1 from public.opportunities where id=p_opportunity and business_id=s.business_id) then raise exception 'document_forbidden'; end if;
 update public.local_document_sources set opportunity_id=p_opportunity where id=s.id;
 insert into public.local_document_audit(source_id,business_id,actor_profile_id,event) values(s.id,s.business_id,public.current_profile_id(),'associated');
end; $$;
-- Immutable version identity and finalized evidence; only lifecycle/redaction may change later.
create function public.guard_local_document_version() returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if (new.id,new.source_id,new.business_id,new.uploader_profile_id,new.object_key,new.format,new.mime_type,new.created_at) is distinct from (old.id,old.source_id,old.business_id,old.uploader_profile_id,old.object_key,old.format,old.mime_type,old.created_at) then raise exception 'immutable_document'; end if;
 if old.state='ready' and (new.byte_size,new.content_hash,new.parser_version,new.row_count,new.column_count,new.finalized_at) is distinct from (old.byte_size,old.content_hash,old.parser_version,old.row_count,old.column_count,old.finalized_at) then raise exception 'immutable_document'; end if;
 if old.state='ready' and new.state not in ('ready','deletion_pending') then raise exception 'immutable_document'; end if;
 if old.state='ready' and (new.headers,new.original_filename) is distinct from (old.headers,old.original_filename) then raise exception 'immutable_document'; end if;
 return new;
end; $$;
create trigger local_document_version_guard before update on public.local_document_versions for each row execute function public.guard_local_document_version();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('commercial-document-originals','commercial-document-originals',false,2097152,array['text/csv']);
-- safety-justification: precise immutable object/version binding; live membership; no path-prefix authorization or content mutation.
create function public.can_read_local_document_object(p_key text) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select auth.uid() is not null and exists(select 1 from public.local_document_versions v where v.object_key=p_key and v.state='ready' and public.can_read_local_document(v.source_id));
$$;
create policy local_original_read on storage.objects for select to authenticated using(bucket_id='commercial-document-originals' and public.can_read_local_document_object(name));
-- Restrictive guards prevent a later broad permissive policy from granting client mutations to originals.
create policy local_original_read_guard on storage.objects as restrictive for select to authenticated using(bucket_id<>'commercial-document-originals' or public.can_read_local_document_object(name));
create policy local_original_insert_guard on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'commercial-document-originals');
create policy local_original_update_guard on storage.objects as restrictive for update to authenticated using(bucket_id<>'commercial-document-originals') with check(bucket_id<>'commercial-document-originals');
create policy local_original_delete_guard on storage.objects as restrictive for delete to authenticated using(bucket_id<>'commercial-document-originals');
create policy local_original_anon_guard on storage.objects as restrictive for all to anon using(bucket_id<>'commercial-document-originals') with check(bucket_id<>'commercial-document-originals');

revoke all on function public.can_write_local_documents(uuid),public.can_read_local_document(uuid),public.can_read_local_document_object(text),public.reserve_local_document(uuid,text,uuid),public.begin_local_document_delete(uuid),public.associate_local_document(uuid,uuid) from public,anon;
grant execute on function public.can_write_local_documents(uuid),public.can_read_local_document(uuid),public.can_read_local_document_object(text),public.reserve_local_document(uuid,text,uuid),public.begin_local_document_delete(uuid),public.associate_local_document(uuid,uuid) to authenticated;
revoke all on function public.finalize_local_document(uuid,integer,text,jsonb,jsonb,text),public.finish_local_document_delete(uuid),public.guard_local_document_version() from public,anon,authenticated;
grant execute on function public.finalize_local_document(uuid,integer,text,jsonb,jsonb,text),public.finish_local_document_delete(uuid) to service_role;
commit;
