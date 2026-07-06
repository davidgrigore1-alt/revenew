-- Harden business_members RLS against tenant self-join and self-promotion.
-- Authenticated clients may manage memberships only for businesses they own.

begin;

alter table public.business_members enable row level security;

drop policy if exists "business_members_select_self_or_business_owner" on public.business_members;
drop policy if exists "business_members_insert_self_or_business_owner" on public.business_members;
drop policy if exists "business_members_update_self_or_business_owner" on public.business_members;
drop policy if exists "business_members_read_member_or_owner" on public.business_members;
drop policy if exists "business_members_insert_first_owner_or_owner" on public.business_members;
drop policy if exists "business_members_update_owner" on public.business_members;

create or replace function public.prevent_business_members_tenant_reassignment()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.business_id is distinct from old.business_id then
    raise exception 'business_members.business_id cannot be changed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_business_members_tenant_reassignment() from public;
revoke all on function public.prevent_business_members_tenant_reassignment() from anon;
revoke all on function public.prevent_business_members_tenant_reassignment() from authenticated;

drop trigger if exists trg_prevent_business_members_tenant_reassignment on public.business_members;
create trigger trg_prevent_business_members_tenant_reassignment
before update of business_id on public.business_members
for each row execute function public.prevent_business_members_tenant_reassignment();

create policy "business_members_select_self_or_business_owner" on public.business_members
  for select using (profile_id = public.current_profile_id() or public.owns_business(business_id));

create policy "business_members_insert_business_owner_only" on public.business_members
  for insert with check (public.owns_business(business_id));

create policy "business_members_update_business_owner_only" on public.business_members
  for update using (public.owns_business(business_id))
  with check (public.owns_business(business_id));

commit;
