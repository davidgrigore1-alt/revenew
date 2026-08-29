begin;

-- Billing/subscription state must never be openly writable/readable.
alter table public.subscriptions
  enable row level security;

drop policy if exists subscriptions_select_accessible_business
  on public.subscriptions;

create policy subscriptions_select_accessible_business
  on public.subscriptions
  for select
  to authenticated
  using (
    public.can_access_business(business_id)
  );

revoke all
  on table public.subscriptions
  from anon, authenticated;

grant select
  on table public.subscriptions
  to authenticated;


-- Stable search_path for generic updated_at trigger function.
alter function public.set_updated_at()
  set search_path = pg_catalog, public;


-- Access helpers are allowed for authenticated application users,
-- but must not be reachable anonymously through RPC.
revoke execute
  on function public.can_access_business(uuid)
  from public, anon;

grant execute
  on function public.can_access_business(uuid)
  to authenticated, service_role;


revoke execute
  on function public.can_access_commercial_inbox_business(uuid)
  from public, anon;

grant execute
  on function public.can_access_commercial_inbox_business(uuid)
  to authenticated, service_role;


revoke execute
  on function public.commercial_inbox_current_profile_id()
  from public, anon;

grant execute
  on function public.commercial_inbox_current_profile_id()
  to authenticated, service_role;


revoke execute
  on function public.is_business_member(uuid)
  from public, anon;

grant execute
  on function public.is_business_member(uuid)
  to authenticated, service_role;


revoke execute
  on function public.is_business_owner(uuid)
  from public, anon;

grant execute
  on function public.is_business_owner(uuid)
  to authenticated, service_role;


revoke execute
  on function public.owns_business(uuid)
  from public, anon;

grant execute
  on function public.owns_business(uuid)
  to authenticated, service_role;


-- Preserve signed-in/server behaviour for now,
-- while removing anonymous RPC exposure.
revoke execute
  on function public.release_revenew_usage(
    uuid,
    text,
    text,
    text,
    boolean,
    integer,
    integer
  )
  from public, anon;

grant execute
  on function public.release_revenew_usage(
    uuid,
    text,
    text,
    text,
    boolean,
    integer,
    integer
  )
  to authenticated, service_role;


revoke execute
  on function public.reserve_revenew_usage(
    uuid,
    uuid,
    text,
    text,
    text,
    integer,
    integer,
    timestamptz,
    timestamptz,
    text,
    text,
    bigint,
    bigint
  )
  from public, anon;

grant execute
  on function public.reserve_revenew_usage(
    uuid,
    uuid,
    text,
    text,
    text,
    integer,
    integer,
    timestamptz,
    timestamptz,
    text,
    text,
    bigint,
    bigint
  )
  to authenticated, service_role;


-- Exact current signature:
-- (
--   p_event_id uuid,
--   p_provider text,
--   p_model text,
--   p_prompt_tokens integer,
--   p_completion_tokens integer,
--   p_total_tokens integer,
--   p_estimated_cost_micros bigint,
--   p_confirmed_cost_micros bigint,
--   p_cost_status text,
--   p_currency text,
--   p_pricing_version text,
--   p_retry_count integer,
--   p_latency_ms integer,
--   p_request_id text,
--   p_operation_type text,
--   p_provider_status_category text,
--   p_error_category text,
--   p_billable_failure boolean
-- )
revoke execute
  on function public.settle_revenew_usage(
    uuid,
    text,
    text,
    integer,
    integer,
    integer,
    bigint,
    bigint,
    text,
    text,
    text,
    integer,
    integer,
    text,
    text,
    text,
    text,
    boolean
  )
  from public, anon;

grant execute
  on function public.settle_revenew_usage(
    uuid,
    text,
    text,
    integer,
    integer,
    integer,
    bigint,
    bigint,
    text,
    text,
    text,
    integer,
    integer,
    text,
    text,
    text,
    text,
    boolean
  )
  to authenticated, service_role;

commit;