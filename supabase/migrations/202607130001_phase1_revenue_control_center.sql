-- ReveNew Phase 1: canonical commercial lifecycle, ownership, outcomes and auditable work.
-- Additive and deployment-order safe: the legacy opportunities.status field remains available.

alter table public.opportunities
  add column if not exists commercial_type text,
  add column if not exists lifecycle_status text,
  add column if not exists owner_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists currency text not null default 'RON',
  add column if not exists actual_outcome_amount numeric(12, 2),
  add column if not exists outcome_date date,
  add column if not exists outcome_reason text,
  add column if not exists outcome_note text,
  add column if not exists outcome_recorded_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists outcome_recorded_at timestamptz;

-- The backfill is deterministic and does not fabricate commercial amounts or reasons.
update public.opportunities
set lifecycle_status = case status
  when 'won' then 'won'
  when 'lost' then 'lost'
  when 'ignored' then 'disqualified'
  else 'open'
end
where lifecycle_status is null;

alter table public.opportunities
  alter column lifecycle_status set default 'open',
  alter column lifecycle_status set not null,
  drop constraint if exists opportunities_commercial_type_check,
  add constraint opportunities_commercial_type_check check (
    commercial_type is null or commercial_type in (
      'new_business', 'stalled_pipeline', 'reactivation', 'expansion',
      'renewal', 'commercial_recovery', 'other'
    )
  ),
  drop constraint if exists opportunities_lifecycle_status_check,
  add constraint opportunities_lifecycle_status_check check (
    lifecycle_status in ('open', 'won', 'lost', 'disqualified', 'archived')
  ),
  drop constraint if exists opportunities_status_lifecycle_consistency_check,
  add constraint opportunities_status_lifecycle_consistency_check check (
    lifecycle_status = 'archived'
    or (lifecycle_status = 'open' and status not in ('won', 'lost', 'ignored'))
    or (lifecycle_status = 'won' and status = 'won')
    or (lifecycle_status = 'lost' and status = 'lost')
    or (lifecycle_status = 'disqualified' and status = 'ignored')
  ),
  drop constraint if exists opportunities_currency_check,
  add constraint opportunities_currency_check check (currency ~ '^[A-Z]{3}$'),
  drop constraint if exists opportunities_actual_outcome_amount_check,
  add constraint opportunities_actual_outcome_amount_check check (
    actual_outcome_amount is null or actual_outcome_amount >= 0
  ),
  drop constraint if exists opportunities_outcome_reason_check,
  add constraint opportunities_outcome_reason_check check (
    outcome_reason is null or outcome_reason in (
      'won', 'recovered', 'expanded', 'renewed',
      'customer_selected_other', 'no_budget', 'no_response', 'timing',
      'not_qualified', 'duplicate', 'cancelled', 'other'
    )
  ),
  drop constraint if exists opportunities_terminal_outcome_check,
  add constraint opportunities_terminal_outcome_check check (
    lifecycle_status not in ('won', 'lost', 'disqualified')
    or (
      outcome_date is not null
      and outcome_reason is not null
      and outcome_recorded_by_profile_id is not null
      and outcome_recorded_at is not null
      and (lifecycle_status <> 'won' or actual_outcome_amount is not null)
      and (lifecycle_status not in ('lost', 'disqualified') or actual_outcome_amount is null)
    )
  ) not valid;

-- Existing terminal legacy rows remain readable until a human records a truthful outcome.
-- New and corrected terminal transitions are validated by the application and this constraint.

alter table public.opportunity_actions
  add column if not exists assigned_to_profile_id uuid references public.profiles(id) on delete set null;

alter table public.opportunity_events
  add column if not exists business_id uuid references public.businesses(id) on delete cascade,
  add column if not exists actor_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.opportunity_events oe
set business_id = o.business_id
from public.opportunities o
where oe.opportunity_id = o.id
  and oe.business_id is null;

alter table public.opportunity_events
  alter column business_id set not null;

create or replace function public.validate_opportunity_profile_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  trusted_actor_profile_id uuid;
begin
  if new.owner_profile_id is not null and not exists (
    select 1
    from public.businesses b
    left join public.business_members bm
      on bm.business_id = b.id and bm.profile_id = new.owner_profile_id
    where b.id = new.business_id
      and (b.owner_profile_id = new.owner_profile_id or bm.profile_id is not null)
  ) then
    raise exception 'opportunity owner must belong to the same business';
  end if;

  if new.lifecycle_status in ('won', 'lost', 'disqualified') and auth.uid() is not null then
    trusted_actor_profile_id := public.current_profile_id();
    if trusted_actor_profile_id is null then
      raise exception 'authenticated outcome actor profile is unavailable';
    end if;
    new.outcome_recorded_by_profile_id := trusted_actor_profile_id;
    new.outcome_recorded_at := pg_catalog.now();
  end if;

  if new.outcome_recorded_by_profile_id is not null and not exists (
    select 1
    from public.businesses b
    left join public.business_members bm
      on bm.business_id = b.id and bm.profile_id = new.outcome_recorded_by_profile_id
    where b.id = new.business_id
      and (b.owner_profile_id = new.outcome_recorded_by_profile_id or bm.profile_id is not null)
  ) then
    raise exception 'outcome actor must belong to the same business';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_opportunities_validate_profile_scope on public.opportunities;
create trigger trg_opportunities_validate_profile_scope
before insert or update of business_id, owner_profile_id, lifecycle_status,
  actual_outcome_amount, outcome_date, outcome_reason, outcome_note,
  outcome_recorded_by_profile_id, outcome_recorded_at
on public.opportunities
for each row execute function public.validate_opportunity_profile_scope();

create or replace function public.touch_opportunity_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.touch_opportunity_updated_at() from public;
revoke all on function public.touch_opportunity_updated_at() from anon;
revoke all on function public.touch_opportunity_updated_at() from authenticated;

drop trigger if exists trg_opportunities_touch_updated_at on public.opportunities;
create trigger trg_opportunities_touch_updated_at
before update on public.opportunities
for each row execute function public.touch_opportunity_updated_at();

create or replace function public.validate_opportunity_action_profile_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  target_business_id uuid;
begin
  select o.business_id into target_business_id
  from public.opportunities o
  where o.id = new.opportunity_id;

  if target_business_id is null or (new.business_id is not null and new.business_id <> target_business_id) then
    raise exception 'opportunity action must belong to the same business';
  end if;

  if new.assigned_to_profile_id is not null and not exists (
    select 1
    from public.businesses b
    left join public.business_members bm
      on bm.business_id = b.id and bm.profile_id = new.assigned_to_profile_id
    where b.id = target_business_id
      and (b.owner_profile_id = new.assigned_to_profile_id or bm.profile_id is not null)
  ) then
    raise exception 'action assignee must belong to the same business';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_opportunity_actions_validate_profile_scope on public.opportunity_actions;
create trigger trg_opportunity_actions_validate_profile_scope
before insert or update of business_id, opportunity_id, assigned_to_profile_id
on public.opportunity_actions
for each row execute function public.validate_opportunity_action_profile_scope();

create or replace function public.set_trusted_opportunity_event_context()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  target_business_id uuid;
  trusted_actor_profile_id uuid;
begin
  select o.business_id into target_business_id
  from public.opportunities o
  where o.id = new.opportunity_id;

  if target_business_id is null then
    raise exception 'opportunity event must reference an existing opportunity';
  end if;

  new.business_id := target_business_id;

  if auth.uid() is not null then
    trusted_actor_profile_id := public.current_profile_id();
    if trusted_actor_profile_id is null then
      raise exception 'authenticated event actor profile is unavailable';
    end if;
    new.actor_profile_id := trusted_actor_profile_id;
  elsif new.actor_profile_id is null then
    raise exception 'non-user event writes require an explicit trusted actor';
  end if;

  if not exists (
    select 1
    from public.businesses b
    left join public.business_members bm
      on bm.business_id = b.id and bm.profile_id = new.actor_profile_id
    where b.id = target_business_id
      and (b.owner_profile_id = new.actor_profile_id or bm.profile_id is not null)
  ) then
    raise exception 'event actor must belong to the same business';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_opportunity_events_set_trusted_context on public.opportunity_events;
create trigger trg_opportunity_events_set_trusted_context
before insert on public.opportunity_events
for each row execute function public.set_trusted_opportunity_event_context();

drop policy if exists "opportunity_events_update_accessible_opportunity" on public.opportunity_events;
revoke update, delete on public.opportunity_events from authenticated;

create index if not exists opportunities_business_lifecycle_updated_idx
  on public.opportunities(business_id, lifecycle_status, updated_at desc);
create index if not exists opportunities_business_owner_open_idx
  on public.opportunities(business_id, owner_profile_id, updated_at desc)
  where lifecycle_status = 'open';
create index if not exists opportunities_business_commercial_type_idx
  on public.opportunities(business_id, commercial_type);
create index if not exists opportunity_actions_business_assignee_due_idx
  on public.opportunity_actions(business_id, assigned_to_profile_id, due_at)
  where status = 'pending';
create index if not exists opportunity_events_business_occurred_idx
  on public.opportunity_events(business_id, occurred_at desc);

create or replace function public.business_assignable_profiles(target_business_id uuid)
returns table(profile_id uuid, full_name text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select candidates.profile_id, p.full_name
  from (
    select b.owner_profile_id as profile_id
    from public.businesses b
    where b.id = target_business_id
    union
    select bm.profile_id
    from public.business_members bm
    where bm.business_id = target_business_id
  ) candidates
  join public.profiles p on p.id = candidates.profile_id
  where public.can_access_business(target_business_id)
    and candidates.profile_id is not null
  order by p.full_name, candidates.profile_id;
$$;

revoke all on function public.business_assignable_profiles(uuid) from public;
revoke all on function public.business_assignable_profiles(uuid) from anon;
grant execute on function public.business_assignable_profiles(uuid) to authenticated;

comment on column public.opportunities.status is
  'Legacy commercial process status retained for compatibility; lifecycle_status is authoritative for open/terminal state.';
comment on column public.opportunities.actual_outcome_amount is
  'Human-recorded actual won/recovered amount. Never derived from estimated_value_low/high.';
comment on column public.opportunity_actions.assigned_to_profile_id is
  'Responsible profile for this task. The earliest incomplete due task is the canonical primary next action.';

alter table public.opportunities enable row level security;
alter table public.opportunity_actions enable row level security;
alter table public.opportunity_events enable row level security;
