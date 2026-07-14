-- ReveNew commercial workflow completion.
-- Additive only: link opportunities directly to CRM organizations while preserving
-- the existing opportunity-contact associations and tenant isolation.

alter table public.opportunities
  add column if not exists organization_id uuid references public.crm_organizations(id) on delete set null;

create index if not exists opportunities_business_organization_idx
  on public.opportunities(business_id, organization_id, updated_at desc)
  where organization_id is not null;

create or replace function public.validate_opportunity_organization_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.organization_id is not null and not exists (
    select 1
    from public.crm_organizations organization
    where organization.id = new.organization_id
      and organization.business_id = new.business_id
      and organization.is_archived = false
  ) then
    raise exception 'opportunity organization must belong to the same active business'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_opportunity_organization_scope() from public;
revoke all on function public.validate_opportunity_organization_scope() from anon;
revoke all on function public.validate_opportunity_organization_scope() from authenticated;

drop trigger if exists trg_opportunities_validate_organization_scope on public.opportunities;
create trigger trg_opportunities_validate_organization_scope
before insert or update of business_id, organization_id on public.opportunities
for each row execute function public.validate_opportunity_organization_scope();

comment on column public.opportunities.organization_id is
  'Tenant-scoped CRM organization linked directly to the commercial opportunity.';
