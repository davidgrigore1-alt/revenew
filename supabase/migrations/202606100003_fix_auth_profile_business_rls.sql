-- Phase 4 stabilization: separate auth user id from profile id and fix RLS.
-- Source of truth after this migration:
-- profiles.user_id -> auth.users.id
-- businesses.owner_profile_id -> profiles.id
-- business_members.profile_id -> profiles.id

alter table public.profiles
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

update public.profiles
set user_id = id
where user_id is null
  and exists (select 1 from auth.users u where u.id = profiles.id);

create unique index if not exists profiles_user_id_key on public.profiles(user_id);
create index if not exists idx_profiles_user_id on public.profiles(user_id);

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'business_owner', 'platform_admin'));

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "businesses_select_member" on public.businesses;
drop policy if exists "businesses_insert_owner" on public.businesses;
drop policy if exists "businesses_update_owner" on public.businesses;
drop policy if exists "business_members_read_member" on public.business_members;
drop policy if exists "business_members_insert_owner" on public.business_members;
drop policy if exists "business_members_update_owner" on public.business_members;
drop policy if exists "business_services_member_all" on public.business_services;
drop policy if exists "business_targets_member_all" on public.business_targets;
drop policy if exists "opportunity_sources_member_all" on public.opportunity_sources;
drop policy if exists "opportunities_member_select" on public.opportunities;
drop policy if exists "opportunities_member_insert" on public.opportunities;
drop policy if exists "opportunities_member_update" on public.opportunities;
drop policy if exists "opportunity_actions_member_all" on public.opportunity_actions;
drop policy if exists "opportunity_documents_member_all" on public.opportunity_documents;
drop policy if exists "opportunity_events_member_all" on public.opportunity_events;
drop policy if exists "lead_contacts_member_all" on public.lead_contacts;
drop policy if exists "outreach_sequences_member_all" on public.outreach_sequences;
drop policy if exists "outreach_messages_member_all" on public.outreach_messages;
drop policy if exists "weekly_reports_member_read" on public.weekly_reports;
drop policy if exists "audit_logs_owner_read" on public.audit_logs;

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

create or replace function public.is_business_owner(target_business_id uuid)
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
      and bm.role in ('owner', 'admin')
  )
  or exists (
    select 1
    from public.businesses b
    where b.id = target_business_id
      and b.owner_profile_id = public.current_profile_id()
  );
$$;

create policy "profiles_select_own" on public.profiles
  for select using (user_id = auth.uid());

create policy "profiles_insert_own" on public.profiles
  for insert with check (user_id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "businesses_select_member_or_owner" on public.businesses
  for select using (owner_profile_id = public.current_profile_id() or public.is_business_member(id));

create policy "businesses_insert_owner_profile" on public.businesses
  for insert with check (owner_profile_id = public.current_profile_id());

create policy "businesses_update_owner_profile" on public.businesses
  for update using (owner_profile_id = public.current_profile_id() or public.is_business_owner(id))
  with check (owner_profile_id = public.current_profile_id() or public.is_business_owner(id));

create policy "business_members_read_member_or_owner" on public.business_members
  for select using (profile_id = public.current_profile_id() or public.is_business_owner(business_id));

create policy "business_members_insert_first_owner_or_owner" on public.business_members
  for insert with check (
    profile_id = public.current_profile_id()
    or public.is_business_owner(business_id)
  );

create policy "business_members_update_owner" on public.business_members
  for update using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

create policy "business_services_owner_all" on public.business_services
  for all using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

create policy "business_targets_owner_all" on public.business_targets
  for all using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

create policy "opportunity_sources_member_all" on public.opportunity_sources
  for all using (public.is_business_member(business_id) or public.is_business_owner(business_id))
  with check (public.is_business_member(business_id) or public.is_business_owner(business_id));

create policy "opportunities_member_select" on public.opportunities
  for select using (public.is_business_member(business_id) or public.is_business_owner(business_id));

create policy "opportunities_member_insert" on public.opportunities
  for insert with check (public.is_business_member(business_id) or public.is_business_owner(business_id));

create policy "opportunities_member_update" on public.opportunities
  for update using (public.is_business_member(business_id) or public.is_business_owner(business_id))
  with check (public.is_business_member(business_id) or public.is_business_owner(business_id));

create policy "opportunity_actions_member_all" on public.opportunity_actions
  for all using (
    exists (select 1 from public.opportunities o where o.id = opportunity_actions.opportunity_id and (public.is_business_member(o.business_id) or public.is_business_owner(o.business_id)))
  ) with check (
    exists (select 1 from public.opportunities o where o.id = opportunity_actions.opportunity_id and (public.is_business_member(o.business_id) or public.is_business_owner(o.business_id)))
  );

create policy "opportunity_documents_member_all" on public.opportunity_documents
  for all using (
    exists (select 1 from public.opportunities o where o.id = opportunity_documents.opportunity_id and (public.is_business_member(o.business_id) or public.is_business_owner(o.business_id)))
  ) with check (
    exists (select 1 from public.opportunities o where o.id = opportunity_documents.opportunity_id and (public.is_business_member(o.business_id) or public.is_business_owner(o.business_id)))
  );

create policy "opportunity_events_member_all" on public.opportunity_events
  for all using (
    exists (select 1 from public.opportunities o where o.id = opportunity_events.opportunity_id and (public.is_business_member(o.business_id) or public.is_business_owner(o.business_id)))
  ) with check (
    exists (select 1 from public.opportunities o where o.id = opportunity_events.opportunity_id and (public.is_business_member(o.business_id) or public.is_business_owner(o.business_id)))
  );

create policy "lead_contacts_member_all" on public.lead_contacts
  for all using (public.is_business_member(business_id) or public.is_business_owner(business_id))
  with check (public.is_business_member(business_id) or public.is_business_owner(business_id));

create policy "outreach_sequences_member_all" on public.outreach_sequences
  for all using (public.is_business_member(business_id) or public.is_business_owner(business_id))
  with check (public.is_business_member(business_id) or public.is_business_owner(business_id));

create policy "outreach_messages_member_all" on public.outreach_messages
  for all using (
    exists (select 1 from public.outreach_sequences os where os.id = outreach_messages.sequence_id and (public.is_business_member(os.business_id) or public.is_business_owner(os.business_id)))
  ) with check (
    exists (select 1 from public.outreach_sequences os where os.id = outreach_messages.sequence_id and (public.is_business_member(os.business_id) or public.is_business_owner(os.business_id)))
  );

create policy "weekly_reports_member_read" on public.weekly_reports
  for select using (public.is_business_member(business_id) or public.is_business_owner(business_id));

create policy "audit_logs_owner_read" on public.audit_logs
  for select using (public.is_business_owner(business_id));
