-- ReveNew usage metering, quota reservation and provider-cost accounting.
-- Additive only. Do not apply automatically from Codex.

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  feature_id text not null,
  plan_id text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  used_units integer not null default 0 check (used_units >= 0),
  reserved_units integer not null default 0 check (reserved_units >= 0),
  estimated_cost_micros bigint not null default 0 check (estimated_cost_micros >= 0),
  confirmed_cost_micros bigint not null default 0 check (confirmed_cost_micros >= 0),
  budget_micros bigint check (budget_micros is null or budget_micros >= 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, feature_id, period_start)
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  feature_id text not null,
  plan_id text not null,
  idempotency_key text not null,
  status text not null check (status in ('reserved', 'settled', 'released', 'failed')),
  reservation_status text not null default 'reserved' check (reservation_status in ('reserved', 'confirmed', 'released')),
  execution_status text not null default 'reserved' check (execution_status in ('reserved', 'provider_success', 'provider_failure', 'local_fallback', 'validation_rejected', 'authorization_rejected', 'budget_rejected', 'infrastructure_failure', 'released')),
  units integer not null default 1 check (units > 0),
  provider text,
  model text,
  operation_type text not null default 'unknown',
  request_id text,
  prompt_tokens integer not null default 0 check (prompt_tokens >= 0),
  completion_tokens integer not null default 0 check (completion_tokens >= 0),
  total_tokens integer not null default 0 check (total_tokens >= 0),
  estimated_cost_micros bigint not null default 0 check (estimated_cost_micros >= 0),
  confirmed_cost_micros bigint not null default 0 check (confirmed_cost_micros >= 0),
  cost_status text not null default 'estimated' check (cost_status in ('estimated', 'provider_confirmed', 'not_billable')),
  currency text not null default 'EUR' check (currency = 'EUR'),
  pricing_version text not null default 'unknown',
  retry_count integer not null default 0 check (retry_count >= 0),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  error_category text,
  provider_status_category text,
  billable_failure boolean not null default false,
  metadata_version integer not null default 1 check (metadata_version >= 1),
  error_reason text,
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  confirmed_at timestamptz,
  released_at timestamptz,
  unique (business_id, feature_id, idempotency_key)
);

create table if not exists public.usage_overrides (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  feature_id text not null,
  limit_units integer check (limit_units is null or limit_units >= 0),
  budget_micros bigint check (budget_micros is null or budget_micros >= 0),
  hard_limit boolean not null default false,
  enabled boolean not null default true,
  override_type text not null default 'feature_limit' check (override_type in ('feature_limit', 'budget', 'disable_feature', 'unlimited')),
  reason text not null,
  approved_by_profile_id uuid references public.profiles(id) on delete set null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists usage_counters_business_period_idx on public.usage_counters (business_id, period_start);
create index if not exists usage_events_business_created_idx on public.usage_events (business_id, created_at desc);
create index if not exists usage_events_feature_created_idx on public.usage_events (feature_id, created_at desc);
create index if not exists usage_events_period_provider_idx on public.usage_events (period_start, provider, model, feature_id);
create index if not exists usage_events_status_created_idx on public.usage_events (status, created_at desc);
create index if not exists usage_events_idempotency_idx on public.usage_events (business_id, feature_id, idempotency_key);
create index if not exists usage_overrides_business_feature_idx on public.usage_overrides (business_id, feature_id, starts_at desc);

alter table public.usage_counters enable row level security;
alter table public.usage_events enable row level security;
alter table public.usage_overrides enable row level security;

drop policy if exists "business members can read own usage counters" on public.usage_counters;
create policy "business members can read own usage counters"
on public.usage_counters for select
using (
  exists (
    select 1
    from public.business_members bm
    join public.profiles p on p.id = bm.profile_id
    where bm.business_id = usage_counters.business_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "platform admins can read usage events" on public.usage_events;
create policy "platform admins can read usage events"
on public.usage_events for select
using (false);

drop policy if exists "platform admins can read usage overrides" on public.usage_overrides;
create policy "platform admins can read usage overrides"
on public.usage_overrides for select
using (false);

create or replace function public.reserve_revenew_usage(
  p_business_id uuid,
  p_profile_id uuid,
  p_feature_id text,
  p_plan_id text,
  p_idempotency_key text,
  p_units integer,
  p_limit integer,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_request_id text,
  p_operation_type text,
  p_expected_cost_micros bigint,
  p_budget_micros bigint
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_event_id uuid;
  v_used integer;
begin
  if p_units <= 0 then
    raise exception 'invalid_units';
  end if;

  select id into v_event_id
  from public.usage_events
  where business_id = p_business_id
    and feature_id = p_feature_id
    and idempotency_key = p_idempotency_key
  limit 1;

  if v_event_id is not null then
    return v_event_id;
  end if;

  insert into public.usage_counters (business_id, feature_id, plan_id, period_start, period_end, used_units, reserved_units, budget_micros)
  values (p_business_id, p_feature_id, p_plan_id, p_period_start, p_period_end, 0, 0, greatest(coalesce(p_budget_micros, 0), 0))
  on conflict (business_id, feature_id, period_start) do nothing;

  select used_units + reserved_units into v_used
  from public.usage_counters
  where business_id = p_business_id
    and feature_id = p_feature_id
    and period_start = p_period_start
  for update;

  if p_limit is not null and v_used + p_units > p_limit then
    raise exception 'quota_exceeded';
  end if;

  update public.usage_counters
  set reserved_units = reserved_units + p_units,
      plan_id = p_plan_id,
      budget_micros = greatest(coalesce(p_budget_micros, 0), 0),
      updated_at = now()
  where business_id = p_business_id
    and feature_id = p_feature_id
    and period_start = p_period_start;

  insert into public.usage_events (
    business_id, profile_id, feature_id, plan_id, idempotency_key, status, reservation_status, execution_status, units,
    operation_type, request_id, estimated_cost_micros, period_start, period_end
  )
  values (
    p_business_id, p_profile_id, p_feature_id, p_plan_id, p_idempotency_key, 'reserved', 'reserved', 'reserved', p_units,
    left(coalesce(p_operation_type, p_feature_id), 120), left(coalesce(p_request_id, ''), 160), greatest(coalesce(p_expected_cost_micros, 0), 0), p_period_start, p_period_end
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function public.settle_revenew_usage(
  p_event_id uuid,
  p_provider text,
  p_model text,
  p_prompt_tokens integer,
  p_completion_tokens integer,
  p_total_tokens integer,
  p_estimated_cost_micros bigint,
  p_confirmed_cost_micros bigint,
  p_cost_status text,
  p_currency text,
  p_pricing_version text,
  p_retry_count integer,
  p_latency_ms integer,
  p_request_id text,
  p_operation_type text,
  p_provider_status_category text,
  p_error_category text,
  p_billable_failure boolean
) returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_event public.usage_events%rowtype;
begin
  select * into v_event
  from public.usage_events
  where id = p_event_id
  for update;

  if not found or v_event.status = 'settled' then
    return;
  end if;

  update public.usage_events
  set status = 'settled',
      reservation_status = 'confirmed',
      execution_status = 'provider_success',
      provider = p_provider,
      model = p_model,
      operation_type = left(coalesce(p_operation_type, v_event.operation_type), 120),
      request_id = left(coalesce(p_request_id, v_event.request_id), 160),
      prompt_tokens = greatest(coalesce(p_prompt_tokens, 0), 0),
      completion_tokens = greatest(coalesce(p_completion_tokens, 0), 0),
      total_tokens = greatest(coalesce(p_total_tokens, 0), 0),
      estimated_cost_micros = greatest(coalesce(p_estimated_cost_micros, 0), 0),
      confirmed_cost_micros = greatest(coalesce(p_confirmed_cost_micros, p_estimated_cost_micros, 0), 0),
      cost_status = case when p_cost_status in ('estimated', 'provider_confirmed', 'not_billable') then p_cost_status else 'estimated' end,
      currency = case when p_currency = 'EUR' then p_currency else 'EUR' end,
      pricing_version = left(coalesce(p_pricing_version, 'unknown'), 40),
      retry_count = greatest(coalesce(p_retry_count, 0), 0),
      latency_ms = greatest(coalesce(p_latency_ms, 0), 0),
      provider_status_category = left(coalesce(p_provider_status_category, 'success'), 80),
      error_category = nullif(left(coalesce(p_error_category, 'none'), 80), 'none'),
      billable_failure = coalesce(p_billable_failure, false),
      settled_at = now(),
      confirmed_at = now()
  where id = p_event_id;

  update public.usage_counters
  set reserved_units = greatest(reserved_units - v_event.units, 0),
      used_units = used_units + v_event.units,
      estimated_cost_micros = estimated_cost_micros + greatest(coalesce(p_estimated_cost_micros, 0), 0),
      confirmed_cost_micros = confirmed_cost_micros + greatest(coalesce(p_confirmed_cost_micros, p_estimated_cost_micros, 0), 0),
      updated_at = now()
  where business_id = v_event.business_id
    and feature_id = v_event.feature_id
    and period_start = v_event.period_start;
end;
$$;

create or replace function public.release_revenew_usage(
  p_event_id uuid,
  p_reason text,
  p_error_category text,
  p_provider_status_category text,
  p_billable_failure boolean,
  p_retry_count integer,
  p_latency_ms integer
) returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_event public.usage_events%rowtype;
begin
  select * into v_event
  from public.usage_events
  where id = p_event_id
  for update;

  if not found or v_event.status <> 'reserved' then
    return;
  end if;

  update public.usage_events
  set status = case when coalesce(p_billable_failure, false) then 'failed' else 'released' end,
      reservation_status = 'released',
      execution_status = case when coalesce(p_billable_failure, false) then 'provider_failure' else 'released' end,
      error_reason = left(coalesce(p_reason, 'released'), 120),
      error_category = left(coalesce(p_error_category, 'provider_error'), 80),
      provider_status_category = left(coalesce(p_provider_status_category, 'failure'), 80),
      billable_failure = coalesce(p_billable_failure, false),
      cost_status = case when coalesce(p_billable_failure, false) then cost_status else 'not_billable' end,
      retry_count = greatest(coalesce(p_retry_count, 0), 0),
      latency_ms = greatest(coalesce(p_latency_ms, 0), 0),
      settled_at = now(),
      released_at = now()
  where id = p_event_id;

  update public.usage_counters
  set reserved_units = greatest(reserved_units - v_event.units, 0),
      updated_at = now()
  where business_id = v_event.business_id
    and feature_id = v_event.feature_id
    and period_start = v_event.period_start;
end;
$$;
