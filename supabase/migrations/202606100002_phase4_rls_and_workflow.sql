-- Phase 4: authentication, workflow persistence, and simple RLS policies.

alter table public.profiles
  alter column id set default gen_random_uuid(),
  add column if not exists role text not null default 'user' check (role in ('user', 'platform_admin')),
  add column if not exists updated_at timestamptz not null default now();

alter table public.opportunity_actions
  add column if not exists type text not null default 'research_more';

alter table public.opportunity_actions
  drop constraint if exists opportunity_actions_type_check,
  add constraint opportunity_actions_type_check check (
    type in (
      'send_email',
      'call_contact',
      'prepare_offer',
      'prepare_documents',
      'follow_up',
      'apply_to_procurement',
      'apply_to_grant',
      'research_more'
    )
  );

alter table public.opportunity_documents
  drop constraint if exists opportunity_documents_document_type_check,
  add constraint opportunity_documents_document_type_check check (
    document_type in (
      'outreach_email',
      'follow_up_email',
      'offer_draft',
      'call_script',
      'procurement_checklist',
      'grant_summary',
      'linkedin_message',
      'whatsapp_message',
      'email',
      'offer',
      'checklist',
      'other'
    )
  );

create index if not exists idx_businesses_owner on public.businesses(owner_profile_id);
create index if not exists idx_businesses_created on public.businesses(created_at desc);
create index if not exists idx_opportunities_created on public.opportunities(created_at desc);
create index if not exists idx_opportunity_documents_opportunity on public.opportunity_documents(opportunity_id);
create index if not exists idx_opportunity_events_opportunity on public.opportunity_events(opportunity_id);
create index if not exists idx_lead_contacts_status on public.lead_contacts(business_id, lead_score desc);
create index if not exists idx_outreach_messages_sequence_status on public.outreach_messages(sequence_id, status);
create index if not exists idx_audit_logs_created on public.audit_logs(created_at desc);

create or replace function public.is_business_member(target_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_id = target_business_id
      and bm.profile_id = auth.uid()
  );
$$;

create or replace function public.is_business_owner(target_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_id = target_business_id
      and bm.profile_id = auth.uid()
      and bm.role in ('owner', 'admin')
  );
$$;

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.business_services enable row level security;
alter table public.business_targets enable row level security;
alter table public.opportunity_sources enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_actions enable row level security;
alter table public.opportunity_documents enable row level security;
alter table public.opportunity_events enable row level security;
alter table public.lead_contacts enable row level security;
alter table public.outreach_sequences enable row level security;
alter table public.outreach_messages enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "businesses_select_member" on public.businesses
  for select using (public.is_business_member(id) or owner_profile_id = auth.uid());

create policy "businesses_insert_owner" on public.businesses
  for insert with check (owner_profile_id = auth.uid());

create policy "businesses_update_owner" on public.businesses
  for update using (public.is_business_owner(id) or owner_profile_id = auth.uid())
  with check (public.is_business_owner(id) or owner_profile_id = auth.uid());

create policy "business_members_read_member" on public.business_members
  for select using (profile_id = auth.uid() or public.is_business_member(business_id));

create policy "business_members_insert_owner" on public.business_members
  for insert with check (profile_id = auth.uid() or public.is_business_owner(business_id));

create policy "business_members_update_owner" on public.business_members
  for update using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));

create policy "business_services_member_all" on public.business_services
  for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));

create policy "business_targets_member_all" on public.business_targets
  for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));

create policy "opportunity_sources_member_all" on public.opportunity_sources
  for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));

create policy "opportunities_member_select" on public.opportunities
  for select using (public.is_business_member(business_id));

create policy "opportunities_member_insert" on public.opportunities
  for insert with check (public.is_business_member(business_id));

create policy "opportunities_member_update" on public.opportunities
  for update using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));

create policy "opportunity_actions_member_all" on public.opportunity_actions
  for all using (
    exists (
      select 1 from public.opportunities o
      where o.id = opportunity_actions.opportunity_id
        and public.is_business_member(o.business_id)
    )
  ) with check (
    exists (
      select 1 from public.opportunities o
      where o.id = opportunity_actions.opportunity_id
        and public.is_business_member(o.business_id)
    )
  );

create policy "opportunity_documents_member_all" on public.opportunity_documents
  for all using (
    exists (
      select 1 from public.opportunities o
      where o.id = opportunity_documents.opportunity_id
        and public.is_business_member(o.business_id)
    )
  ) with check (
    exists (
      select 1 from public.opportunities o
      where o.id = opportunity_documents.opportunity_id
        and public.is_business_member(o.business_id)
    )
  );

create policy "opportunity_events_member_all" on public.opportunity_events
  for all using (
    exists (
      select 1 from public.opportunities o
      where o.id = opportunity_events.opportunity_id
        and public.is_business_member(o.business_id)
    )
  ) with check (
    exists (
      select 1 from public.opportunities o
      where o.id = opportunity_events.opportunity_id
        and public.is_business_member(o.business_id)
    )
  );

create policy "lead_contacts_member_all" on public.lead_contacts
  for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));

create policy "outreach_sequences_member_all" on public.outreach_sequences
  for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));

create policy "outreach_messages_member_all" on public.outreach_messages
  for all using (
    exists (
      select 1 from public.outreach_sequences os
      where os.id = outreach_messages.sequence_id
        and public.is_business_member(os.business_id)
    )
  ) with check (
    exists (
      select 1 from public.outreach_sequences os
      where os.id = outreach_messages.sequence_id
        and public.is_business_member(os.business_id)
    )
  );

create policy "weekly_reports_member_read" on public.weekly_reports
  for select using (public.is_business_member(business_id));

create policy "audit_logs_owner_read" on public.audit_logs
  for select using (public.is_business_owner(business_id));
