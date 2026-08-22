-- Immutable commercial-execution pilot measurement V1.
-- Additive tenant-scoped pilot contracts and append-only baseline/final snapshots.

begin;

alter table public.business_audit_events drop constraint if exists business_audit_category_check;
alter table public.business_audit_events add constraint business_audit_category_check
  check (category in ('membership','invitation','assignment','governance','approval','outreach','outcome','security','pilot'));

create table public.pilot_engagements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  customer_facing_name text not null,
  status text not null default 'draft',
  scope_note text not null,
  starts_on date not null,
  expected_ends_on date not null,
  timezone text not null,
  cohort_opportunity_ids uuid[] not null,
  success_criteria jsonb not null,
  comparison_policy jsonb not null,
  definition_version text not null default 'commercial-state-v1',
  limitations text[] not null default '{}'::text[],
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  closed_by_profile_id uuid references public.profiles(id) on delete restrict,
  cancelled_by_profile_id uuid references public.profiles(id) on delete restrict,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  cancelled_at timestamptz,
  constraint pilot_name_check check (char_length(btrim(name)) between 3 and 120),
  constraint pilot_customer_name_check check (char_length(btrim(customer_facing_name)) between 2 and 160),
  constraint pilot_scope_check check (char_length(btrim(scope_note)) between 3 and 500),
  constraint pilot_status_check check (status in ('draft','active','final_frozen','closed','cancelled')),
  constraint pilot_period_check check (expected_ends_on >= starts_on and expected_ends_on <= starts_on + 90),
  constraint pilot_timezone_check check (char_length(btrim(timezone)) between 3 and 80),
  constraint pilot_cohort_check check (cardinality(cohort_opportunity_ids) between 1 and 200),
  constraint pilot_criteria_check check (jsonb_typeof(success_criteria) = 'array' and jsonb_array_length(success_criteria) between 1 and 12 and octet_length(success_criteria::text) <= 16384),
  constraint pilot_policy_check check (jsonb_typeof(comparison_policy) = 'object' and octet_length(comparison_policy::text) <= 8192),
  constraint pilot_limitations_check check (cardinality(limitations) <= 12),
  constraint pilot_cancel_reason_check check (cancellation_reason is null or char_length(btrim(cancellation_reason)) between 3 and 500)
);

create table public.pilot_snapshots (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  pilot_id uuid not null references public.pilot_engagements(id) on delete restrict,
  snapshot_kind text not null,
  snapshot_payload jsonb not null,
  integrity_hash text not null default repeat('0', 64),
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  captured_at timestamptz not null default now(),
  constraint pilot_snapshot_kind_check check (snapshot_kind in ('baseline','checkpoint','final')),
  constraint pilot_snapshot_payload_check check (jsonb_typeof(snapshot_payload) = 'object' and octet_length(snapshot_payload::text) <= 1048576),
  constraint pilot_snapshot_hash_check check (integrity_hash ~ '^[a-f0-9]{64}$'),
  unique (pilot_id, snapshot_kind)
);

create index pilot_engagements_business_created_idx on public.pilot_engagements(business_id, created_at desc);
create index pilot_engagements_business_status_idx on public.pilot_engagements(business_id, status, updated_at desc);
create index pilot_snapshots_business_pilot_idx on public.pilot_snapshots(business_id, pilot_id, captured_at);

create or replace function public.guard_pilot_contract_update()
returns trigger language plpgsql
-- safety-justification: The trigger enforces the immutable measurement contract and validated lifecycle on privileged server writes.
security definer set search_path = pg_catalog, public as $$
begin
  if cardinality(new.cohort_opportunity_ids) <> (select count(distinct opportunity_id) from unnest(new.cohort_opportunity_ids) as opportunity_id) then
    raise exception 'pilot cohort contains duplicates' using errcode = '23514';
  end if;
  if new.business_id <> old.business_id or new.created_by_profile_id <> old.created_by_profile_id then
    raise exception 'pilot identity is immutable' using errcode = '42501';
  end if;

  if old.status <> 'draft' and (
    new.cohort_opportunity_ids is distinct from old.cohort_opportunity_ids
    or new.success_criteria is distinct from old.success_criteria
    or new.comparison_policy is distinct from old.comparison_policy
    or new.definition_version is distinct from old.definition_version
    or new.timezone is distinct from old.timezone
    or new.starts_on is distinct from old.starts_on
    or new.expected_ends_on is distinct from old.expected_ends_on
  ) then
    raise exception 'active pilot measurement contract is immutable' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if old.status = 'draft' and new.status not in ('active','cancelled') then
      raise exception 'invalid pilot transition' using errcode = '23514';
    elsif old.status = 'active' and new.status not in ('final_frozen','cancelled') then
      raise exception 'invalid pilot transition' using errcode = '23514';
    elsif old.status = 'final_frozen' and new.status <> 'closed' then
      raise exception 'invalid pilot transition' using errcode = '23514';
    elsif old.status in ('closed','cancelled') then
      raise exception 'terminal pilot is read only' using errcode = '42501';
    end if;
  end if;

  if new.status = 'closed' and not exists (
    select 1 from public.pilot_snapshots ps where ps.pilot_id = old.id and ps.snapshot_kind = 'final'
  ) then
    raise exception 'final snapshot required before close' using errcode = '23514';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger pilot_contract_update_guard
before update on public.pilot_engagements
for each row execute function public.guard_pilot_contract_update();

create or replace function public.guard_immutable_pilot_snapshot()
returns trigger language plpgsql
-- safety-justification: Official snapshot integrity and lifecycle validation must run atomically inside PostgreSQL.
security definer set search_path = pg_catalog, public, extensions as $$
declare
  v_pilot public.pilot_engagements%rowtype;
begin
  if tg_op in ('UPDATE','DELETE') then
    raise exception 'pilot snapshots are immutable' using errcode = '42501';
  end if;

  select * into v_pilot from public.pilot_engagements where id = new.pilot_id for update;
  if v_pilot.id is null or v_pilot.business_id <> new.business_id then
    raise exception 'pilot snapshot tenant mismatch' using errcode = '42501';
  end if;
  if new.created_by_profile_id is null or not (
    v_pilot.created_by_profile_id = new.created_by_profile_id
    or exists (
      select 1 from public.business_members bm
      where bm.business_id = v_pilot.business_id and bm.profile_id = new.created_by_profile_id
        and bm.status = 'active' and bm.role in ('owner','admin','manager')
    )
    or exists (select 1 from public.businesses b where b.id = v_pilot.business_id and b.owner_profile_id = new.created_by_profile_id)
  ) then
    raise exception 'pilot snapshot actor is not authorized' using errcode = '42501';
  end if;
  if new.snapshot_payload->>'pilotId' <> new.pilot_id::text
    or new.snapshot_payload->>'businessId' <> new.business_id::text
    or new.snapshot_payload->>'snapshotKind' <> new.snapshot_kind
    or new.snapshot_payload->'cohortOpportunityIds' <> to_jsonb(v_pilot.cohort_opportunity_ids)
    or new.snapshot_payload->>'definitionVersion' <> v_pilot.definition_version
    or new.snapshot_payload->>'timezone' <> v_pilot.timezone then
    raise exception 'pilot snapshot contract mismatch' using errcode = '23514';
  end if;
  if new.snapshot_kind = 'baseline' and v_pilot.status <> 'draft' then
    raise exception 'baseline is unavailable for this pilot state' using errcode = '23505';
  end if;
  if new.snapshot_kind = 'final' and (v_pilot.status <> 'active' or not exists (
    select 1 from public.pilot_snapshots ps where ps.pilot_id = new.pilot_id and ps.snapshot_kind = 'baseline'
  )) then
    raise exception 'final snapshot requires an active pilot baseline' using errcode = '23514';
  end if;
  if new.snapshot_kind = 'checkpoint' and v_pilot.status <> 'active' then
    raise exception 'checkpoint requires an active pilot' using errcode = '23514';
  end if;

  new.integrity_hash := encode(extensions.digest(new.snapshot_payload::text, 'sha256'), 'hex');
  new.captured_at := now();
  return new;
end;
$$;

create trigger pilot_snapshot_immutable_guard
before insert or update or delete on public.pilot_snapshots
for each row execute function public.guard_immutable_pilot_snapshot();

create or replace function public.record_pilot_snapshot_lifecycle()
returns trigger language plpgsql
-- safety-justification: Snapshot insertion, lifecycle change and bounded audit evidence must commit or fail together.
security definer set search_path = pg_catalog, public as $$
begin
  if new.snapshot_kind = 'baseline' then
    update public.pilot_engagements set status = 'active' where id = new.pilot_id and status = 'draft';
    insert into public.business_audit_events(business_id,actor_profile_id,category,action,entity_type,entity_id,result,description,safe_metadata)
    values(new.business_id,new.created_by_profile_id,'pilot','pilot.baseline_frozen','pilot_engagement',new.pilot_id,'success','Baseline-ul pilotului a fost înghețat.',jsonb_build_object('snapshot_id',new.id,'snapshot_kind','baseline'));
    insert into public.business_audit_events(business_id,actor_profile_id,category,action,entity_type,entity_id,result,description)
    values(new.business_id,new.created_by_profile_id,'pilot','pilot.activated','pilot_engagement',new.pilot_id,'success','Pilotul a fost activat prin confirmare umană.');
  elsif new.snapshot_kind = 'final' then
    update public.pilot_engagements set status = 'final_frozen' where id = new.pilot_id and status = 'active';
    insert into public.business_audit_events(business_id,actor_profile_id,category,action,entity_type,entity_id,result,description,safe_metadata)
    values(new.business_id,new.created_by_profile_id,'pilot','pilot.final_frozen','pilot_engagement',new.pilot_id,'success','Situația finală a pilotului a fost înghețată.',jsonb_build_object('snapshot_id',new.id,'snapshot_kind','final'));
  end if;
  return new;
end;
$$;

create trigger pilot_snapshot_lifecycle
after insert on public.pilot_snapshots
for each row execute function public.record_pilot_snapshot_lifecycle();

create or replace function public.audit_pilot_lifecycle()
returns trigger language plpgsql
-- safety-justification: Pilot lifecycle audit is generated from trusted persisted transitions rather than browser payloads.
security definer set search_path = pg_catalog, public as $$
begin
  if tg_op = 'INSERT' then
    if cardinality(new.cohort_opportunity_ids) <> (select count(distinct opportunity_id) from unnest(new.cohort_opportunity_ids) as opportunity_id) then
      raise exception 'pilot cohort contains duplicates' using errcode = '23514';
    end if;
    insert into public.business_audit_events(business_id,actor_profile_id,category,action,entity_type,entity_id,result,description)
    values(new.business_id,new.created_by_profile_id,'pilot','pilot.created','pilot_engagement',new.id,'success','Pilotul comercial controlat a fost creat.');
  elsif new.status = 'closed' and old.status <> 'closed' then
    insert into public.business_audit_events(business_id,actor_profile_id,category,action,entity_type,entity_id,result,description)
    values(new.business_id,new.closed_by_profile_id,'pilot','pilot.closed','pilot_engagement',new.id,'success','Pilotul a fost închis după confirmarea situației finale.');
  elsif new.status = 'cancelled' and old.status <> 'cancelled' then
    insert into public.business_audit_events(business_id,actor_profile_id,category,action,entity_type,entity_id,result,description)
    values(new.business_id,new.cancelled_by_profile_id,'pilot','pilot.cancelled','pilot_engagement',new.id,'success','Pilotul a fost anulat prin decizie umană.');
  end if;
  return new;
end;
$$;

create trigger pilot_lifecycle_audit
after insert or update on public.pilot_engagements
for each row execute function public.audit_pilot_lifecycle();

create or replace function public.create_pilot_engagement(
  p_business_id uuid,
  p_name text,
  p_customer_facing_name text,
  p_scope_note text,
  p_starts_on date,
  p_expected_ends_on date,
  p_timezone text,
  p_cohort_opportunity_ids uuid[],
  p_success_criteria jsonb,
  p_comparison_policy jsonb,
  p_definition_version text,
  p_limitations text[]
)
returns uuid language plpgsql
-- safety-justification: Creates a pilot only after resolving the authenticated profile and verifying manager-level membership in the target business.
security definer set search_path = pg_catalog, public as $$
declare
  v_profile_id uuid := public.current_profile_id();
  v_pilot_id uuid;
begin
  if v_profile_id is null or not (
    exists (select 1 from public.businesses b where b.id = p_business_id and b.owner_profile_id = v_profile_id)
    or exists (
      select 1 from public.business_members bm
      where bm.business_id = p_business_id and bm.profile_id = v_profile_id
        and bm.status = 'active' and bm.role in ('owner','admin','manager')
    )
  ) then
    raise exception 'pilot management permission required' using errcode = '42501';
  end if;
  insert into public.pilot_engagements(
    business_id,name,customer_facing_name,scope_note,starts_on,expected_ends_on,timezone,
    cohort_opportunity_ids,success_criteria,comparison_policy,definition_version,limitations,created_by_profile_id
  ) values (
    p_business_id,p_name,p_customer_facing_name,p_scope_note,p_starts_on,p_expected_ends_on,p_timezone,
    p_cohort_opportunity_ids,p_success_criteria,p_comparison_policy,p_definition_version,p_limitations,v_profile_id
  ) returning id into v_pilot_id;
  return v_pilot_id;
end;
$$;

create or replace function public.freeze_pilot_snapshot(p_pilot_id uuid, p_snapshot_kind text, p_snapshot_payload jsonb)
returns uuid language plpgsql
-- safety-justification: Persists a server-rebuilt snapshot only for an authenticated manager in the pilot business; immutable triggers validate the full contract.
security definer set search_path = pg_catalog, public as $$
declare
  v_pilot public.pilot_engagements%rowtype;
  v_profile_id uuid := public.current_profile_id();
  v_snapshot_id uuid;
begin
  select * into v_pilot from public.pilot_engagements where id = p_pilot_id;
  if v_pilot.id is null or v_profile_id is null or not (
    exists (select 1 from public.businesses b where b.id = v_pilot.business_id and b.owner_profile_id = v_profile_id)
    or exists (
      select 1 from public.business_members bm
      where bm.business_id = v_pilot.business_id and bm.profile_id = v_profile_id
        and bm.status = 'active' and bm.role in ('owner','admin','manager')
    )
  ) then
    raise exception 'pilot management permission required' using errcode = '42501';
  end if;
  insert into public.pilot_snapshots(business_id,pilot_id,snapshot_kind,snapshot_payload,created_by_profile_id)
  values(v_pilot.business_id,v_pilot.id,p_snapshot_kind,p_snapshot_payload,v_profile_id)
  returning id into v_snapshot_id;
  return v_snapshot_id;
end;
$$;

create or replace function public.close_pilot_engagement(p_pilot_id uuid)
returns uuid language plpgsql
-- safety-justification: Closes only a final-frozen pilot after current manager authorization; the lifecycle trigger requires the final snapshot.
security definer set search_path = pg_catalog, public as $$
declare
  v_pilot public.pilot_engagements%rowtype;
  v_profile_id uuid := public.current_profile_id();
begin
  select * into v_pilot from public.pilot_engagements where id = p_pilot_id;
  if v_pilot.id is null or v_profile_id is null or not (
    exists (select 1 from public.businesses b where b.id = v_pilot.business_id and b.owner_profile_id = v_profile_id)
    or exists (
      select 1 from public.business_members bm
      where bm.business_id = v_pilot.business_id and bm.profile_id = v_profile_id
        and bm.status = 'active' and bm.role in ('owner','admin','manager')
    )
  ) then
    raise exception 'pilot management permission required' using errcode = '42501';
  end if;
  update public.pilot_engagements set status='closed',closed_at=now(),closed_by_profile_id=v_profile_id
  where id=v_pilot.id and status='final_frozen';
  if not found then raise exception 'final snapshot required before close' using errcode = '23514'; end if;
  return v_pilot.id;
end;
$$;

create or replace function public.cancel_pilot_engagement(p_pilot_id uuid, p_reason text)
returns uuid language plpgsql
-- safety-justification: Cancels only a draft or active pilot after current manager authorization and records the bounded human reason.
security definer set search_path = pg_catalog, public as $$
declare
  v_pilot public.pilot_engagements%rowtype;
  v_profile_id uuid := public.current_profile_id();
begin
  select * into v_pilot from public.pilot_engagements where id = p_pilot_id;
  if v_pilot.id is null or v_profile_id is null or not (
    exists (select 1 from public.businesses b where b.id = v_pilot.business_id and b.owner_profile_id = v_profile_id)
    or exists (
      select 1 from public.business_members bm
      where bm.business_id = v_pilot.business_id and bm.profile_id = v_profile_id
        and bm.status = 'active' and bm.role in ('owner','admin','manager')
    )
  ) then
    raise exception 'pilot management permission required' using errcode = '42501';
  end if;
  update public.pilot_engagements
  set status='cancelled',cancelled_at=now(),cancelled_by_profile_id=v_profile_id,cancellation_reason=p_reason
  where id=v_pilot.id and status in ('draft','active');
  if not found then raise exception 'pilot cannot be cancelled in this state' using errcode = '23514'; end if;
  return v_pilot.id;
end;
$$;

alter table public.pilot_engagements enable row level security;
alter table public.pilot_snapshots enable row level security;

create policy "pilot_engagements_member_read" on public.pilot_engagements for select to authenticated
  using (public.can_access_business(business_id));
create policy "pilot_snapshots_member_read" on public.pilot_snapshots for select to authenticated
  using (public.can_access_business(business_id));

revoke all on table public.pilot_engagements, public.pilot_snapshots from anon;
revoke all on table public.pilot_engagements, public.pilot_snapshots from authenticated;
grant select on table public.pilot_engagements, public.pilot_snapshots to authenticated;

revoke all on function public.create_pilot_engagement(uuid,text,text,text,date,date,text,uuid[],jsonb,jsonb,text,text[]) from public, anon;
revoke all on function public.freeze_pilot_snapshot(uuid,text,jsonb) from public, anon;
revoke all on function public.close_pilot_engagement(uuid) from public, anon;
revoke all on function public.cancel_pilot_engagement(uuid,text) from public, anon;
grant execute on function public.create_pilot_engagement(uuid,text,text,text,date,date,text,uuid[],jsonb,jsonb,text,text[]) to authenticated;
grant execute on function public.freeze_pilot_snapshot(uuid,text,jsonb) to authenticated;
grant execute on function public.close_pilot_engagement(uuid) to authenticated;
grant execute on function public.cancel_pilot_engagement(uuid,text) to authenticated;

revoke all on function public.guard_pilot_contract_update() from public, anon, authenticated;
revoke all on function public.guard_immutable_pilot_snapshot() from public, anon, authenticated;
revoke all on function public.record_pilot_snapshot_lifecycle() from public, anon, authenticated;
revoke all on function public.audit_pilot_lifecycle() from public, anon, authenticated;

comment on table public.pilot_engagements is 'Tenant-scoped commercial pilot contract; cohort, criteria, policy and timezone freeze when baseline is captured.';
comment on table public.pilot_snapshots is 'Append-only immutable server-generated pilot snapshots. Payloads contain bounded facts and evidence metadata, never full documents or emails.';
comment on column public.pilot_snapshots.integrity_hash is 'Database-generated SHA-256 fingerprint for accidental or tampered snapshot detection.';

commit;
