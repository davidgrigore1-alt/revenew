-- Stabilize MoneyHunter AI RLS after real onboarding.
-- Source of truth:
-- auth.users.id -> profiles.user_id
-- profiles.id -> businesses.owner_profile_id
-- business_members.profile_id -> profiles.id

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.business_services enable row level security;
alter table public.business_targets enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_actions enable row level security;
alter table public.opportunity_documents enable row level security;
alter table public.opportunity_events enable row level security;

alter table public.opportunity_actions
  add column if not exists business_id uuid references public.businesses(id) on delete cascade;

alter table public.opportunity_documents
  add column if not exists business_id uuid references public.businesses(id) on delete cascade;

update public.opportunity_actions oa
set business_id = o.business_id
from public.opportunities o
where oa.opportunity_id = o.id
  and oa.business_id is null;

update public.opportunity_documents od
set business_id = o.business_id
from public.opportunities o
where od.opportunity_id = o.id
  and od.business_id is null;

create index if not exists idx_opportunity_actions_business on public.opportunity_actions(business_id);
create index if not exists idx_opportunity_documents_business on public.opportunity_documents(business_id);

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.owns_business(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = target_business_id
      and b.owner_profile_id = public.current_profile_id()
  );
$$;

create or replace function public.is_business_member(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_id = target_business_id
      and bm.profile_id = public.current_profile_id()
  );
$$;

create or replace function public.can_access_business(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.owns_business(target_business_id) or public.is_business_member(target_business_id);
$$;

create or replace function public.is_business_owner(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.owns_business(target_business_id)
    or exists (
      select 1
      from public.business_members bm
      where bm.business_id = target_business_id
        and bm.profile_id = public.current_profile_id()
        and bm.role in ('owner', 'admin')
    );
$$;

drop policy if exists "business_members_select_self_or_business_owner" on public.business_members;
drop policy if exists "business_members_insert_self_or_business_owner" on public.business_members;
drop policy if exists "business_members_update_self_or_business_owner" on public.business_members;
drop policy if exists "business_services_select_owned_business" on public.business_services;
drop policy if exists "business_services_insert_owned_business" on public.business_services;
drop policy if exists "business_services_update_owned_business" on public.business_services;
drop policy if exists "business_targets_select_owned_business" on public.business_targets;
drop policy if exists "business_targets_insert_owned_business" on public.business_targets;
drop policy if exists "business_targets_update_owned_business" on public.business_targets;
drop policy if exists "opportunities_select_accessible_business" on public.opportunities;
drop policy if exists "opportunities_insert_accessible_business" on public.opportunities;
drop policy if exists "opportunities_update_accessible_business" on public.opportunities;
drop policy if exists "opportunity_actions_select_accessible_business" on public.opportunity_actions;
drop policy if exists "opportunity_actions_insert_accessible_business" on public.opportunity_actions;
drop policy if exists "opportunity_actions_update_accessible_business" on public.opportunity_actions;
drop policy if exists "opportunity_documents_select_accessible_business" on public.opportunity_documents;
drop policy if exists "opportunity_documents_insert_accessible_business" on public.opportunity_documents;
drop policy if exists "opportunity_documents_update_accessible_business" on public.opportunity_documents;
drop policy if exists "opportunity_events_select_accessible_opportunity" on public.opportunity_events;
drop policy if exists "opportunity_events_insert_accessible_opportunity" on public.opportunity_events;
drop policy if exists "opportunity_events_update_accessible_opportunity" on public.opportunity_events;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select using (user_id = auth.uid());

create policy "profiles_insert_own" on public.profiles
  for insert with check (user_id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "businesses_select_member" on public.businesses;
drop policy if exists "businesses_insert_owner" on public.businesses;
drop policy if exists "businesses_update_owner" on public.businesses;
drop policy if exists "businesses_select_member_or_owner" on public.businesses;
drop policy if exists "businesses_insert_owner_profile" on public.businesses;
drop policy if exists "businesses_update_owner_profile" on public.businesses;

create policy "businesses_select_member_or_owner" on public.businesses
  for select using (owner_profile_id = public.current_profile_id());

create policy "businesses_insert_owner_profile" on public.businesses
  for insert with check (owner_profile_id = public.current_profile_id());

create policy "businesses_update_owner_profile" on public.businesses
  for update using (owner_profile_id = public.current_profile_id())
  with check (owner_profile_id = public.current_profile_id());

drop policy if exists "business_members_read_member" on public.business_members;
drop policy if exists "business_members_insert_owner" on public.business_members;
drop policy if exists "business_members_update_owner" on public.business_members;
drop policy if exists "business_members_read_member_or_owner" on public.business_members;
drop policy if exists "business_members_insert_first_owner_or_owner" on public.business_members;

create policy "business_members_select_self_or_business_owner" on public.business_members
  for select using (profile_id = public.current_profile_id() or public.owns_business(business_id));

create policy "business_members_insert_self_or_business_owner" on public.business_members
  for insert with check (profile_id = public.current_profile_id() or public.owns_business(business_id));

create policy "business_members_update_self_or_business_owner" on public.business_members
  for update using (profile_id = public.current_profile_id() or public.owns_business(business_id))
  with check (profile_id = public.current_profile_id() or public.owns_business(business_id));

drop policy if exists "business_services_member_all" on public.business_services;
drop policy if exists "business_services_owner_all" on public.business_services;

create policy "business_services_select_owned_business" on public.business_services
  for select using (public.owns_business(business_id));

create policy "business_services_insert_owned_business" on public.business_services
  for insert with check (public.owns_business(business_id));

create policy "business_services_update_owned_business" on public.business_services
  for update using (public.owns_business(business_id))
  with check (public.owns_business(business_id));

drop policy if exists "business_targets_member_all" on public.business_targets;
drop policy if exists "business_targets_owner_all" on public.business_targets;

create policy "business_targets_select_owned_business" on public.business_targets
  for select using (public.owns_business(business_id));

create policy "business_targets_insert_owned_business" on public.business_targets
  for insert with check (public.owns_business(business_id));

create policy "business_targets_update_owned_business" on public.business_targets
  for update using (public.owns_business(business_id))
  with check (public.owns_business(business_id));

drop policy if exists "opportunities_member_select" on public.opportunities;
drop policy if exists "opportunities_member_insert" on public.opportunities;
drop policy if exists "opportunities_member_update" on public.opportunities;

create policy "opportunities_select_accessible_business" on public.opportunities
  for select using (public.can_access_business(business_id));

create policy "opportunities_insert_accessible_business" on public.opportunities
  for insert with check (public.can_access_business(business_id));

create policy "opportunities_update_accessible_business" on public.opportunities
  for update using (public.can_access_business(business_id))
  with check (public.can_access_business(business_id));

drop policy if exists "opportunity_actions_member_all" on public.opportunity_actions;

create policy "opportunity_actions_select_accessible_business" on public.opportunity_actions
  for select using (public.can_access_business(coalesce(business_id, (
    select o.business_id from public.opportunities o where o.id = opportunity_actions.opportunity_id
  ))));

create policy "opportunity_actions_insert_accessible_business" on public.opportunity_actions
  for insert with check (public.can_access_business(coalesce(business_id, (
    select o.business_id from public.opportunities o where o.id = opportunity_actions.opportunity_id
  ))));

create policy "opportunity_actions_update_accessible_business" on public.opportunity_actions
  for update using (public.can_access_business(coalesce(business_id, (
    select o.business_id from public.opportunities o where o.id = opportunity_actions.opportunity_id
  ))))
  with check (public.can_access_business(coalesce(business_id, (
    select o.business_id from public.opportunities o where o.id = opportunity_actions.opportunity_id
  ))));

drop policy if exists "opportunity_documents_member_all" on public.opportunity_documents;

create policy "opportunity_documents_select_accessible_business" on public.opportunity_documents
  for select using (public.can_access_business(coalesce(business_id, (
    select o.business_id from public.opportunities o where o.id = opportunity_documents.opportunity_id
  ))));

create policy "opportunity_documents_insert_accessible_business" on public.opportunity_documents
  for insert with check (public.can_access_business(coalesce(business_id, (
    select o.business_id from public.opportunities o where o.id = opportunity_documents.opportunity_id
  ))));

create policy "opportunity_documents_update_accessible_business" on public.opportunity_documents
  for update using (public.can_access_business(coalesce(business_id, (
    select o.business_id from public.opportunities o where o.id = opportunity_documents.opportunity_id
  ))))
  with check (public.can_access_business(coalesce(business_id, (
    select o.business_id from public.opportunities o where o.id = opportunity_documents.opportunity_id
  ))));

drop policy if exists "opportunity_events_member_all" on public.opportunity_events;

create policy "opportunity_events_select_accessible_opportunity" on public.opportunity_events
  for select using (
    exists (
      select 1
      from public.opportunities o
      where o.id = opportunity_events.opportunity_id
        and public.can_access_business(o.business_id)
    )
  );

create policy "opportunity_events_insert_accessible_opportunity" on public.opportunity_events
  for insert with check (
    exists (
      select 1
      from public.opportunities o
      where o.id = opportunity_events.opportunity_id
        and public.can_access_business(o.business_id)
    )
  );

create policy "opportunity_events_update_accessible_opportunity" on public.opportunity_events
  for update using (
    exists (
      select 1
      from public.opportunities o
      where o.id = opportunity_events.opportunity_id
        and public.can_access_business(o.business_id)
    )
  )
  with check (
    exists (
      select 1
      from public.opportunities o
      where o.id = opportunity_events.opportunity_id
        and public.can_access_business(o.business_id)
    )
  );
