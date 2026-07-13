-- ReveNew CRM workspace CRUD completion.
-- Manual execution required. Do not apply automatically from Codex.

begin;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'businesses'
      and column_name = 'owner_id'
  ) then
    raise exception 'Unsafe schema: public.businesses.owner_id exists unexpectedly.';
  end if;
end;
$$;

alter table public.crm_organizations
  add column if not exists industry text,
  add column if not exists phone text,
  add column if not exists city text,
  add column if not exists county text,
  add column if not exists country text,
  add column if not exists relationship_status text not null default 'prospect',
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz;

alter table public.crm_contacts
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists department text,
  add column if not exists decision_role text,
  add column if not exists is_active boolean not null default true,
  add column if not exists is_primary_for_organization boolean not null default false,
  add column if not exists archived_at timestamptz;

create unique index if not exists crm_contacts_one_primary_per_organization_idx
  on public.crm_contacts(organization_id)
  where is_primary_for_organization and organization_id is not null and is_active;

create index if not exists crm_organizations_active_idx
  on public.crm_organizations(business_id, is_archived, updated_at desc);

create index if not exists crm_contacts_active_idx
  on public.crm_contacts(business_id, organization_id, is_active, updated_at desc);

commit;
