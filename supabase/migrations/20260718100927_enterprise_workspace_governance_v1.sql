-- Enterprise Workspace Governance & Team Operations V1.
-- Additive tenant-scoped governance, invitations, approvals, auditability and active membership.

begin;

alter table public.business_members
  add column if not exists status text not null default 'active',
  add column if not exists invited_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists deactivated_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.business_members drop constraint if exists business_members_role_check;
alter table public.business_members add constraint business_members_role_check
  check (role in ('owner', 'admin', 'manager', 'member', 'viewer')) not valid;
alter table public.business_members validate constraint business_members_role_check;
alter table public.business_members add constraint business_members_status_check
  check (status in ('active', 'inactive')) not valid;
alter table public.business_members validate constraint business_members_status_check;

create or replace function public.is_business_member(target_business_id uuid)
returns boolean language sql stable
-- safety-justification: RLS membership lookup must bypass recursive business_members policies and validates the authenticated profile.
security definer set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public.business_members bm
    where bm.business_id = target_business_id
      and bm.profile_id = public.current_profile_id()
      and bm.status = 'active'
  );
$$;

create or replace function public.business_role_for_current_user(target_business_id uuid)
returns text language sql stable
-- safety-justification: Central role lookup avoids recursive RLS and derives identity exclusively from the authenticated profile.
security definer set search_path = pg_catalog, public as $$
  select case
    when exists (select 1 from public.businesses b where b.id = target_business_id and b.owner_profile_id = public.current_profile_id()) then 'owner'
    else (select bm.role from public.business_members bm where bm.business_id = target_business_id and bm.profile_id = public.current_profile_id() and bm.status = 'active' limit 1)
  end;
$$;

create or replace function public.has_business_capability(target_business_id uuid, requested_capability text)
returns boolean language sql stable
-- safety-justification: Capability evaluation is a bounded RLS helper that derives tenant membership and never trusts browser identity.
security definer set search_path = pg_catalog, public as $$
  with actor as (select public.business_role_for_current_user(target_business_id) as role)
  select case requested_capability
    when 'workspace.members.read' then role in ('owner','admin','manager')
    when 'workspace.members.manage' then role in ('owner','admin')
    when 'workspace.policies.read' then role in ('owner','admin','manager','member')
    when 'workspace.policies.manage' then role in ('owner','admin')
    when 'workspace.audit.read' then role in ('owner','admin','manager')
    when 'opportunities.assign' then role in ('owner','admin','manager')
    when 'actions.assign' then role in ('owner','admin','manager')
    when 'outreach.approve_live' then role in ('owner','admin','manager')
    when 'outcomes.approve' then role in ('owner','admin','manager')
    when 'revenue.confirm' then role in ('owner','admin','manager')
    when 'approvals.read' then role in ('owner','admin','manager','member')
    when 'approvals.decide' then role in ('owner','admin','manager')
    else false
  end from actor;
$$;

revoke all on function public.business_role_for_current_user(uuid) from public, anon;
revoke all on function public.has_business_capability(uuid, text) from public, anon;
grant execute on function public.business_role_for_current_user(uuid) to authenticated;
grant execute on function public.has_business_capability(uuid, text) to authenticated;

create table if not exists public.business_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  normalized_email text not null,
  role text not null,
  token_hash text not null unique,
  status text not null default 'pending',
  delivery_mode text not null default 'disabled',
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  accepted_by_profile_id uuid references public.profiles(id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_invitations_email_check check (normalized_email = lower(btrim(normalized_email)) and position('@' in normalized_email) > 1 and char_length(normalized_email) <= 320),
  constraint business_invitations_role_check check (role in ('admin','manager','member','viewer')),
  constraint business_invitations_status_check check (status in ('pending','accepted','expired','revoked')),
  constraint business_invitations_delivery_check check (delivery_mode in ('disabled','test','live')),
  constraint business_invitations_expiry_check check (expires_at > created_at)
);

create unique index if not exists business_invitations_active_email_idx
  on public.business_invitations(business_id, normalized_email) where status = 'pending';
create index if not exists business_invitations_business_created_idx on public.business_invitations(business_id, created_at desc);

create table if not exists public.business_governance_policies (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  live_email_approval_policy text not null default 'existing_approval',
  outcome_approval_policy text not null default 'member_confirmation',
  confirmed_revenue_threshold numeric(14,2) not null default 0,
  assignment_policy text not null default 'members_self_assign',
  invitation_expiry_hours integer not null default 72,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint governance_live_email_check check (live_email_approval_policy in ('existing_approval','manager_required','dual_control')),
  constraint governance_outcome_check check (outcome_approval_policy in ('member_confirmation','manager_required','dual_control')),
  constraint governance_threshold_check check (confirmed_revenue_threshold >= 0),
  constraint governance_assignment_check check (assignment_policy in ('members_self_assign','managers_only')),
  constraint governance_expiry_check check (invitation_expiry_hours in (24,72,168,336))
);

insert into public.business_governance_policies(business_id)
select id from public.businesses on conflict (business_id) do nothing;

create table if not exists public.business_approval_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  action_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  requested_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  decided_by_profile_id uuid references public.profiles(id) on delete restrict,
  payload_fingerprint text not null,
  safe_summary text not null,
  safe_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  expires_at timestamptz not null,
  decided_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approval_action_check check (action_type in ('live_email_send','outcome_confirmation','revenue_confirmation')),
  constraint approval_entity_check check (entity_type in ('opportunity_document','opportunity')),
  constraint approval_status_check check (status in ('pending','approved','rejected','expired','cancelled','executed')),
  constraint approval_summary_check check (char_length(btrim(safe_summary)) between 3 and 500),
  constraint approval_payload_check check (jsonb_typeof(safe_payload) = 'object' and octet_length(safe_payload::text) <= 4096),
  constraint approval_fingerprint_check check (payload_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint approval_expiry_check check (expires_at > created_at)
);

create unique index if not exists business_approval_pending_fingerprint_idx
  on public.business_approval_requests(business_id, action_type, entity_id, payload_fingerprint)
  where status in ('pending','approved');
create index if not exists business_approval_business_status_idx on public.business_approval_requests(business_id, status, created_at desc);

create table if not exists public.business_audit_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  category text not null,
  action text not null,
  entity_type text,
  entity_id uuid,
  result text not null,
  description text not null,
  safe_metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint business_audit_category_check check (category in ('membership','invitation','assignment','governance','approval','outreach','outcome','security')),
  constraint business_audit_result_check check (result in ('success','blocked','pending','approved','rejected','executed')),
  constraint business_audit_description_check check (char_length(btrim(description)) between 3 and 500),
  constraint business_audit_metadata_check check (jsonb_typeof(safe_metadata) = 'object' and octet_length(safe_metadata::text) <= 2048)
);

create index if not exists business_audit_business_occurred_idx on public.business_audit_events(business_id, occurred_at desc);
create index if not exists business_audit_business_category_idx on public.business_audit_events(business_id, category, occurred_at desc);

create or replace function public.accept_business_invitation(invitation_token text)
returns table(business_id uuid, membership_id uuid)
language plpgsql
-- safety-justification: Atomic invitation acceptance must read auth identity, lock the token hash, and create exactly one membership.
security definer set search_path = pg_catalog, public, auth as $$
declare
  v_invitation public.business_invitations%rowtype;
  v_profile public.profiles%rowtype;
  v_membership_id uuid;
  v_email text;
begin
  if auth.uid() is null or invitation_token is null or char_length(invitation_token) < 32 or char_length(invitation_token) > 256 then
    raise exception 'invitation is invalid' using errcode = '42501';
  end if;
  select lower(btrim(email)) into v_email from auth.users where id = auth.uid();
  select * into v_profile from public.profiles where user_id = auth.uid() and lower(btrim(email)) = v_email limit 1;
  if v_profile.id is null then raise exception 'invitation is invalid' using errcode = '42501'; end if;
  select * into v_invitation from public.business_invitations
    where token_hash = encode(extensions.digest(invitation_token, 'sha256'), 'hex') for update;
  if v_invitation.id is null or v_invitation.status <> 'pending' or v_invitation.expires_at <= now()
     or v_invitation.normalized_email <> v_email or v_invitation.role = 'owner' then
    raise exception 'invitation is invalid or unavailable' using errcode = '42501';
  end if;
  if exists (select 1 from public.business_members bm where bm.business_id = v_invitation.business_id and bm.profile_id = v_profile.id) then
    raise exception 'invitation is invalid or unavailable' using errcode = '42501';
  end if;
  insert into public.business_members(business_id, profile_id, role, status, invited_by_profile_id)
    values(v_invitation.business_id, v_profile.id, v_invitation.role, 'active', v_invitation.created_by_profile_id)
    returning id into v_membership_id;
  update public.business_invitations set status='accepted', accepted_by_profile_id=v_profile.id, accepted_at=now(), updated_at=now()
    where id=v_invitation.id and status='pending';
  insert into public.business_audit_events(business_id,actor_profile_id,category,action,entity_type,entity_id,result,description)
    values(v_invitation.business_id,v_profile.id,'invitation','invitation.accepted','business_invitation',v_invitation.id,'success','Invitația în workspace a fost acceptată.');
  return query select v_invitation.business_id, v_membership_id;
end;
$$;

revoke all on function public.accept_business_invitation(text) from public, anon;
grant execute on function public.accept_business_invitation(text) to authenticated;

create or replace function public.business_assignable_profiles(target_business_id uuid)
returns table(profile_id uuid, full_name text)
language sql stable
-- safety-justification: Assignable-member lookup must cross profile RLS while enforcing current tenant access and active membership.
security definer set search_path = pg_catalog, public as $$
  select candidates.profile_id, p.full_name
  from (
    select b.owner_profile_id as profile_id from public.businesses b where b.id = target_business_id
    union
    select bm.profile_id from public.business_members bm where bm.business_id = target_business_id and bm.status = 'active'
  ) candidates join public.profiles p on p.id = candidates.profile_id
  where public.can_access_business(target_business_id) and candidates.profile_id is not null
  order by p.full_name, candidates.profile_id;
$$;
revoke all on function public.business_assignable_profiles(uuid) from public, anon;
grant execute on function public.business_assignable_profiles(uuid) to authenticated;

drop policy if exists "business_members_select_self_or_business_owner" on public.business_members;
drop policy if exists "business_members_insert_business_owner_only" on public.business_members;
drop policy if exists "business_members_update_business_owner_only" on public.business_members;
create policy "business_members_read_authorized" on public.business_members for select to authenticated
  using (profile_id = public.current_profile_id() or public.has_business_capability(business_id, 'workspace.members.read'));
create policy "business_members_insert_authorized" on public.business_members for insert to authenticated
  with check (
    (public.owns_business(business_id) and profile_id = public.current_profile_id() and role = 'owner')
    or (public.has_business_capability(business_id, 'workspace.members.manage') and role <> 'owner')
  );
create policy "business_members_update_authorized" on public.business_members for update to authenticated
  using (public.has_business_capability(business_id, 'workspace.members.manage') and role <> 'owner')
  with check (public.has_business_capability(business_id, 'workspace.members.manage') and role <> 'owner');

alter table public.business_invitations enable row level security;
alter table public.business_governance_policies enable row level security;
alter table public.business_approval_requests enable row level security;
alter table public.business_audit_events enable row level security;

create policy "business_invitations_elevated_read" on public.business_invitations for select to authenticated
  using (public.has_business_capability(business_id, 'workspace.members.read'));
create policy "business_governance_member_read" on public.business_governance_policies for select to authenticated
  using (public.has_business_capability(business_id, 'workspace.policies.read'));
create policy "business_approvals_authorized_read" on public.business_approval_requests for select to authenticated
  using (requested_by_profile_id = public.current_profile_id() or public.has_business_capability(business_id, 'approvals.read'));
create policy "business_audit_elevated_read" on public.business_audit_events for select to authenticated
  using (public.has_business_capability(business_id, 'workspace.audit.read'));

revoke all on table public.business_invitations, public.business_governance_policies, public.business_approval_requests, public.business_audit_events from anon;
revoke all on table public.business_invitations, public.business_governance_policies, public.business_approval_requests, public.business_audit_events from authenticated;
grant select on table public.business_invitations, public.business_governance_policies, public.business_approval_requests, public.business_audit_events to authenticated;

comment on column public.business_invitations.token_hash is 'SHA-256 hash only; raw invitation tokens are never persisted.';
comment on table public.business_audit_events is 'Append-only workspace audit events with bounded server-generated metadata.';

commit;
