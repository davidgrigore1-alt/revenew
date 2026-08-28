begin;

-- Workspace notes are collaborative business context. They remain distinct from
-- private connector content and are always scoped to one accessible business.
create table public.workspace_notes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  author_profile_id uuid not null references public.profiles(id) on delete restrict,
  target_type text not null check (target_type in ('company', 'contact', 'opportunity')),
  target_id uuid not null,
  content text not null check (char_length(btrim(content)) between 1 and 5000),
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workspace_notes_target_created_idx
  on public.workspace_notes (business_id, target_type, target_id, is_pinned desc, created_at desc);
create index workspace_notes_author_created_idx
  on public.workspace_notes (author_profile_id, created_at desc);

create trigger workspace_notes_touch_updated_at
before update on public.workspace_notes
for each row execute function public.phase2_touch_updated_at();

create or replace function public.validate_workspace_note_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.author_profile_id <> public.current_profile_id() then
    raise exception 'workspace note author must match current profile' using errcode = '42501';
  end if;

  if new.target_type = 'company' and not exists (
    select 1 from public.crm_organizations record
    where record.id = new.target_id and record.business_id = new.business_id and record.is_archived = false
  ) then
    raise exception 'workspace note company scope mismatch' using errcode = '42501';
  elsif new.target_type = 'contact' and not exists (
    select 1 from public.crm_contacts record
    where record.id = new.target_id and record.business_id = new.business_id and record.is_active = true
  ) then
    raise exception 'workspace note contact scope mismatch' using errcode = '42501';
  elsif new.target_type = 'opportunity' and not exists (
    select 1 from public.opportunities record
    where record.id = new.target_id and record.business_id = new.business_id
  ) then
    raise exception 'workspace note opportunity scope mismatch' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger workspace_notes_validate_scope
before insert or update on public.workspace_notes
for each row execute function public.validate_workspace_note_scope();

alter table public.workspace_notes enable row level security;

create policy workspace_notes_member_read on public.workspace_notes
for select to authenticated
using (public.can_access_business(business_id));

create policy workspace_notes_own_insert on public.workspace_notes
for insert to authenticated
with check (
  author_profile_id = (select public.current_profile_id())
  and public.can_access_business(business_id)
);

create policy workspace_notes_own_update on public.workspace_notes
for update to authenticated
using (
  author_profile_id = (select public.current_profile_id())
  and public.can_access_business(business_id)
)
with check (
  author_profile_id = (select public.current_profile_id())
  and public.can_access_business(business_id)
);

create policy workspace_notes_own_delete on public.workspace_notes
for delete to authenticated
using (
  author_profile_id = (select public.current_profile_id())
  and public.can_access_business(business_id)
);

revoke all on table public.workspace_notes from anon, authenticated;
grant select on table public.workspace_notes to authenticated;
grant insert (business_id, author_profile_id, target_type, target_id, content, is_pinned)
  on table public.workspace_notes to authenticated;
grant update (content, is_pinned)
  on table public.workspace_notes to authenticated;
grant delete on table public.workspace_notes to authenticated;

revoke all on function public.validate_workspace_note_scope() from public, anon, authenticated;

comment on table public.workspace_notes is
  'Tenant-scoped collaborative notes. Content is untrusted business data when used by AI.';

commit;