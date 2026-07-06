-- ReveNew CRM contacts foundation.
-- Additive only. Manual execution required; do not apply automatically from Codex.

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

create table if not exists public.crm_organizations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  website text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_organizations_name_not_blank check (length(trim(name)) > 0),
  constraint crm_organizations_normalized_name_not_blank check (length(trim(normalized_name)) > 0),
  constraint crm_organizations_business_normalized_name_key unique (business_id, normalized_name)
);

create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  organization_id uuid references public.crm_organizations(id) on delete set null,
  full_name text not null,
  normalized_name text not null,
  job_title text,
  email text,
  normalized_email text,
  phone text,
  professional_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_contacts_full_name_not_blank check (length(trim(full_name)) > 0),
  constraint crm_contacts_normalized_name_not_blank check (length(trim(normalized_name)) > 0),
  constraint crm_contacts_email_shape check (normalized_email is null or normalized_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint crm_contacts_professional_url_shape check (professional_url is null or professional_url ~* '^https?://')
);

create unique index if not exists crm_contacts_business_email_unique
  on public.crm_contacts(business_id, normalized_email)
  where normalized_email is not null;

create table if not exists public.opportunity_contacts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  role text,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunity_contacts_unique_contact unique (opportunity_id, contact_id)
);

create unique index if not exists opportunity_contacts_one_primary_idx
  on public.opportunity_contacts(opportunity_id)
  where is_primary;

create index if not exists crm_organizations_business_idx on public.crm_organizations(business_id, name);
create index if not exists crm_contacts_business_idx on public.crm_contacts(business_id, full_name);
create index if not exists crm_contacts_organization_idx on public.crm_contacts(organization_id);
create index if not exists opportunity_contacts_business_idx on public.opportunity_contacts(business_id, opportunity_id);
create index if not exists opportunity_contacts_contact_idx on public.opportunity_contacts(contact_id);

alter table public.crm_organizations enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.opportunity_contacts enable row level security;

create or replace function public.crm_touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.crm_touch_updated_at() from public;
revoke all on function public.crm_touch_updated_at() from anon;
revoke all on function public.crm_touch_updated_at() from authenticated;

drop trigger if exists trg_crm_organizations_touch_updated_at on public.crm_organizations;
create trigger trg_crm_organizations_touch_updated_at
before update on public.crm_organizations
for each row execute function public.crm_touch_updated_at();

drop trigger if exists trg_crm_contacts_touch_updated_at on public.crm_contacts;
create trigger trg_crm_contacts_touch_updated_at
before update on public.crm_contacts
for each row execute function public.crm_touch_updated_at();

drop trigger if exists trg_opportunity_contacts_touch_updated_at on public.opportunity_contacts;
create trigger trg_opportunity_contacts_touch_updated_at
before update on public.opportunity_contacts
for each row execute function public.crm_touch_updated_at();

create or replace function public.crm_validate_contact_scope()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.organization_id is not null and not exists (
    select 1
    from public.crm_organizations organization
    where organization.id = new.organization_id
      and organization.business_id = new.business_id
  ) then
    raise exception 'crm_contacts.organization_id must belong to the same business'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.crm_validate_contact_scope() from public;
revoke all on function public.crm_validate_contact_scope() from anon;
revoke all on function public.crm_validate_contact_scope() from authenticated;

drop trigger if exists trg_crm_contacts_validate_scope on public.crm_contacts;
create trigger trg_crm_contacts_validate_scope
before insert or update of business_id, organization_id on public.crm_contacts
for each row execute function public.crm_validate_contact_scope();

create or replace function public.crm_validate_opportunity_contact_scope()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1
    from public.opportunities opportunity
    where opportunity.id = new.opportunity_id
      and opportunity.business_id = new.business_id
  ) then
    raise exception 'opportunity_contacts.opportunity_id must belong to the same business'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.crm_contacts contact
    where contact.id = new.contact_id
      and contact.business_id = new.business_id
  ) then
    raise exception 'opportunity_contacts.contact_id must belong to the same business'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.crm_validate_opportunity_contact_scope() from public;
revoke all on function public.crm_validate_opportunity_contact_scope() from anon;
revoke all on function public.crm_validate_opportunity_contact_scope() from authenticated;

drop trigger if exists trg_opportunity_contacts_validate_scope on public.opportunity_contacts;
create trigger trg_opportunity_contacts_validate_scope
before insert or update of business_id, opportunity_id, contact_id on public.opportunity_contacts
for each row execute function public.crm_validate_opportunity_contact_scope();

drop policy if exists "crm_organizations_select_accessible_business" on public.crm_organizations;
drop policy if exists "crm_organizations_insert_accessible_business" on public.crm_organizations;
drop policy if exists "crm_organizations_update_accessible_business" on public.crm_organizations;
drop policy if exists "crm_organizations_delete_accessible_business" on public.crm_organizations;

create policy "crm_organizations_select_accessible_business" on public.crm_organizations
  for select using (public.can_access_business(business_id));
create policy "crm_organizations_insert_accessible_business" on public.crm_organizations
  for insert with check (public.can_access_business(business_id));
create policy "crm_organizations_update_accessible_business" on public.crm_organizations
  for update using (public.can_access_business(business_id))
  with check (public.can_access_business(business_id));
create policy "crm_organizations_delete_accessible_business" on public.crm_organizations
  for delete using (public.can_access_business(business_id));

drop policy if exists "crm_contacts_select_accessible_business" on public.crm_contacts;
drop policy if exists "crm_contacts_insert_accessible_business" on public.crm_contacts;
drop policy if exists "crm_contacts_update_accessible_business" on public.crm_contacts;
drop policy if exists "crm_contacts_delete_accessible_business" on public.crm_contacts;

create policy "crm_contacts_select_accessible_business" on public.crm_contacts
  for select using (public.can_access_business(business_id));
create policy "crm_contacts_insert_accessible_business" on public.crm_contacts
  for insert with check (public.can_access_business(business_id));
create policy "crm_contacts_update_accessible_business" on public.crm_contacts
  for update using (public.can_access_business(business_id))
  with check (public.can_access_business(business_id));
create policy "crm_contacts_delete_accessible_business" on public.crm_contacts
  for delete using (public.can_access_business(business_id));

drop policy if exists "opportunity_contacts_select_accessible_business" on public.opportunity_contacts;
drop policy if exists "opportunity_contacts_insert_accessible_business" on public.opportunity_contacts;
drop policy if exists "opportunity_contacts_update_accessible_business" on public.opportunity_contacts;
drop policy if exists "opportunity_contacts_delete_accessible_business" on public.opportunity_contacts;

create policy "opportunity_contacts_select_accessible_business" on public.opportunity_contacts
  for select using (public.can_access_business(business_id));
create policy "opportunity_contacts_insert_accessible_business" on public.opportunity_contacts
  for insert with check (public.can_access_business(business_id));
create policy "opportunity_contacts_update_accessible_business" on public.opportunity_contacts
  for update using (public.can_access_business(business_id))
  with check (public.can_access_business(business_id));
create policy "opportunity_contacts_delete_accessible_business" on public.opportunity_contacts
  for delete using (public.can_access_business(business_id));

commit;
