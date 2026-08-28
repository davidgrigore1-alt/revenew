-- Communication OS V1: owner-private communication execution, reusable workspace templates,
-- deterministic response-window configuration, and auditable sequence enrollment.
alter table public.businesses
  add column if not exists response_window_business_days integer not null default 3
  check (response_window_business_days between 1 and 20);

create table if not exists public.communication_preferences (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  signature_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, business_id),
  constraint communication_preferences_signature_length check (char_length(coalesce(signature_text, '')) <= 4000)
);

create table if not exists public.communication_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  subject text not null default '',
  body text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_templates_name_length check (char_length(trim(name)) between 1 and 120),
  constraint communication_templates_subject_length check (char_length(subject) <= 500),
  constraint communication_templates_body_length check (char_length(body) between 1 and 50000)
);

create table if not exists public.communication_drafts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  connection_id uuid not null references public.external_connections(id) on delete cascade,
  source_message_id uuid references public.external_email_messages(id) on delete set null,
  provider_thread_id text,
  linked_contact_id uuid references public.crm_contacts(id) on delete set null,
  linked_organization_id uuid references public.crm_organizations(id) on delete set null,
  linked_opportunity_id uuid references public.opportunities(id) on delete set null,
  to_recipients jsonb not null default '[]'::jsonb,
  cc_recipients jsonb not null default '[]'::jsonb,
  subject text not null default '',
  body text not null default '',
  status text not null default 'draft' check (status in ('draft', 'ready', 'sending', 'sent', 'discarded', 'failed')),
  prepared_by text not null default 'human' check (prepared_by in ('human', 'ai')),
  evidence jsonb not null default '[]'::jsonb,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  content_fingerprint text,
  idempotency_key text,
  provider_message_id text,
  send_attempt_count integer not null default 0 check (send_attempt_count >= 0),
  safe_failure_code text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_drafts_subject_length check (char_length(subject) <= 500),
  constraint communication_drafts_body_length check (char_length(body) <= 100000)
);

create unique index if not exists communication_drafts_idempotency_unique
  on public.communication_drafts(idempotency_key) where idempotency_key is not null;
create index if not exists communication_drafts_owner_status_idx
  on public.communication_drafts(business_id, owner_profile_id, status, updated_at desc);
create index if not exists communication_drafts_source_idx
  on public.communication_drafts(source_message_id) where source_message_id is not null;

alter table public.outreach_sequences drop constraint if exists outreach_sequences_status_check;
alter table public.outreach_sequences
  add constraint outreach_sequences_status_check check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  add column if not exists owner_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists description text,
  add column if not exists steps jsonb not null default '[]'::jsonb,
  add column if not exists exit_conditions jsonb not null default '{"on_reply":true,"on_meeting_booked":true,"on_opportunity_closed":true}'::jsonb,
  add column if not exists activated_at timestamptz,
  add column if not exists paused_at timestamptz;

create table if not exists public.sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.outreach_sequences(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  contact_id uuid references public.crm_contacts(id) on delete cascade,
  owner_profile_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'paused', 'exited', 'completed')),
  current_step integer not null default 0 check (current_step >= 0),
  next_step_at timestamptz,
  exit_reason text,
  enrolled_by uuid not null references public.profiles(id) on delete restrict,
  enrolled_at timestamptz not null default now(),
  exited_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint sequence_enrollments_target check (opportunity_id is not null or contact_id is not null)
);
create unique index if not exists sequence_enrollments_active_opportunity_unique
  on public.sequence_enrollments(sequence_id, opportunity_id) where status in ('active', 'paused') and opportunity_id is not null;
create index if not exists sequence_enrollments_due_idx
  on public.sequence_enrollments(business_id, status, next_step_at);

create table if not exists public.communication_notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('reply_received', 'send_failed', 'approval_needed', 'sequence_exit', 'meeting_upcoming')),
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists communication_notifications_recipient_idx
  on public.communication_notifications(business_id, recipient_profile_id, read_at, created_at desc);

create or replace function public.validate_communication_os_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  scoped_profile uuid;
begin
  scoped_profile := case
    when tg_table_name = 'communication_preferences' then new.profile_id
    when tg_table_name = 'communication_templates' then new.created_by
    when tg_table_name = 'communication_drafts' then new.owner_profile_id
    when tg_table_name = 'sequence_enrollments' then new.owner_profile_id
    when tg_table_name = 'communication_notifications' then new.recipient_profile_id
  end;

  if not exists (
    select 1 from public.businesses business
    left join public.business_members member on member.business_id = business.id
      and member.profile_id = scoped_profile and member.status = 'active'
    where business.id = new.business_id
      and (business.owner_profile_id = scoped_profile or member.profile_id is not null)
  ) then
    raise exception 'communication actor must belong to the business' using errcode = '42501';
  end if;

  if tg_table_name = 'communication_drafts' then
    if not exists (
      select 1 from public.external_connections connection
      where connection.id = new.connection_id and connection.business_id = new.business_id
        and connection.owner_profile_id = new.owner_profile_id
    ) then raise exception 'communication connection scope mismatch' using errcode = '42501'; end if;
    if new.source_message_id is not null and not exists (
      select 1 from public.external_email_messages message
      where message.id = new.source_message_id and message.business_id = new.business_id
        and message.owner_profile_id = new.owner_profile_id and message.connection_id = new.connection_id
    ) then raise exception 'communication source scope mismatch' using errcode = '42501'; end if;
    if new.linked_contact_id is not null and not exists (
      select 1 from public.crm_contacts item where item.id = new.linked_contact_id and item.business_id = new.business_id
    ) then raise exception 'communication contact scope mismatch' using errcode = '42501'; end if;
    if new.linked_organization_id is not null and not exists (
      select 1 from public.crm_organizations item where item.id = new.linked_organization_id and item.business_id = new.business_id
    ) then raise exception 'communication organization scope mismatch' using errcode = '42501'; end if;
    if new.linked_opportunity_id is not null and not exists (
      select 1 from public.opportunities item where item.id = new.linked_opportunity_id and item.business_id = new.business_id
    ) then raise exception 'communication opportunity scope mismatch' using errcode = '42501'; end if;
  elsif tg_table_name = 'sequence_enrollments' then
    if not exists (
      select 1 from public.outreach_sequences sequence
      where sequence.id = new.sequence_id and sequence.business_id = new.business_id
    ) then raise exception 'sequence enrollment scope mismatch' using errcode = '42501'; end if;
    if new.opportunity_id is not null and not exists (
      select 1 from public.opportunities item where item.id = new.opportunity_id and item.business_id = new.business_id
    ) then raise exception 'sequence opportunity scope mismatch' using errcode = '42501'; end if;
    if new.contact_id is not null and not exists (
      select 1 from public.crm_contacts item where item.id = new.contact_id and item.business_id = new.business_id
    ) then raise exception 'sequence contact scope mismatch' using errcode = '42501'; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.validate_communication_os_scope() from public, anon, authenticated;

create trigger communication_preferences_validate_scope before insert or update on public.communication_preferences
  for each row execute function public.validate_communication_os_scope();
create trigger communication_templates_validate_scope before insert or update on public.communication_templates
  for each row execute function public.validate_communication_os_scope();
create trigger communication_drafts_validate_scope before insert or update on public.communication_drafts
  for each row execute function public.validate_communication_os_scope();
create trigger sequence_enrollments_validate_scope before insert or update on public.sequence_enrollments
  for each row execute function public.validate_communication_os_scope();
create trigger communication_notifications_validate_scope before insert or update on public.communication_notifications
  for each row execute function public.validate_communication_os_scope();
alter table public.communication_preferences enable row level security;
alter table public.communication_templates enable row level security;
alter table public.communication_drafts enable row level security;
alter table public.sequence_enrollments enable row level security;
alter table public.communication_notifications enable row level security;

revoke all on table public.communication_preferences from public, anon, authenticated;
revoke all on table public.communication_templates from public, anon, authenticated;
revoke all on table public.communication_drafts from public, anon, authenticated;
revoke all on table public.sequence_enrollments from public, anon, authenticated;
revoke all on table public.communication_notifications from public, anon, authenticated;

grant select on table public.communication_preferences to authenticated;
grant select on table public.communication_templates to authenticated;
grant select on table public.communication_drafts to authenticated;
grant select on table public.sequence_enrollments to authenticated;
grant select, update on table public.communication_notifications to authenticated;

-- Reviewed backend-only privileges: server actions enforce actor and tenant scope; browser mutation grants remain revoked.
grant select, insert, update, delete on table public.communication_preferences to service_role;
grant select, insert, update, delete on table public.communication_templates to service_role;
grant select, insert, update, delete on table public.communication_drafts to service_role;
grant select, insert, update, delete on table public.sequence_enrollments to service_role;
grant select, insert, update, delete on table public.communication_notifications to service_role;

create policy "communication_preferences_owner_all" on public.communication_preferences
  for all to authenticated
  using (profile_id = public.current_profile_id() and public.is_business_member(business_id))
  with check (profile_id = public.current_profile_id() and public.is_business_member(business_id));

create policy "communication_templates_member_select" on public.communication_templates
  for select to authenticated using (public.is_business_member(business_id));
create policy "communication_templates_member_insert" on public.communication_templates
  for insert to authenticated with check (created_by = public.current_profile_id() and public.is_business_member(business_id));
create policy "communication_templates_member_update" on public.communication_templates
  for update to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "communication_templates_member_delete" on public.communication_templates
  for delete to authenticated using (public.is_business_member(business_id));

create policy "communication_drafts_owner_select" on public.communication_drafts
  for select to authenticated using (owner_profile_id = public.current_profile_id() and public.is_business_member(business_id));
create policy "communication_drafts_owner_insert" on public.communication_drafts
  for insert to authenticated with check (owner_profile_id = public.current_profile_id() and public.is_business_member(business_id));
create policy "communication_drafts_owner_update" on public.communication_drafts
  for update to authenticated using (owner_profile_id = public.current_profile_id() and public.is_business_member(business_id))
  with check (owner_profile_id = public.current_profile_id() and public.is_business_member(business_id));
create policy "communication_drafts_owner_delete" on public.communication_drafts
  for delete to authenticated using (owner_profile_id = public.current_profile_id() and public.is_business_member(business_id));

create policy "sequence_enrollments_member_all" on public.sequence_enrollments
  for all to authenticated using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "communication_notifications_owner_select" on public.communication_notifications
  for select to authenticated using (recipient_profile_id = public.current_profile_id() and public.is_business_member(business_id));
create policy "communication_notifications_owner_update" on public.communication_notifications
  for update to authenticated using (recipient_profile_id = public.current_profile_id() and public.is_business_member(business_id))
  with check (recipient_profile_id = public.current_profile_id() and public.is_business_member(business_id));

comment on table public.communication_drafts is
  'Owner-private prepared email work. Provider credentials and raw provider payloads are never stored here.';
comment on column public.communication_drafts.evidence is
  'Bounded safe internal references used to explain preparation; never OAuth credentials or raw provider payloads.';
comment on table public.sequence_enrollments is
  'Explicit, auditable sequence enrollment. V1 sequence steps prepare work and never autonomously send email.';