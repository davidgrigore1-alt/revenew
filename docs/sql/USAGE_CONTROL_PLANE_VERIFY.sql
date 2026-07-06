select 'usage_events_exists' as check_name, (to_regclass('public.usage_events') is not null) as ok;
select 'usage_counters_exists' as check_name, (to_regclass('public.usage_counters') is not null) as ok;
select 'usage_overrides_exists' as check_name, (to_regclass('public.usage_overrides') is not null) as ok;

select 'reserve_rpc_exists' as check_name, (to_regprocedure('public.reserve_revenew_usage(uuid,uuid,text,text,text,integer,integer,timestamptz,timestamptz,text,text,bigint,bigint)') is not null) as ok;
select 'settle_rpc_exists' as check_name, (to_regprocedure('public.settle_revenew_usage(uuid,text,text,integer,integer,integer,bigint,bigint,text,text,text,integer,integer,text,text,text,text,boolean)') is not null) as ok;
select 'release_rpc_exists' as check_name, (to_regprocedure('public.release_revenew_usage(uuid,text,text,text,boolean,integer,integer)') is not null) as ok;

select
  'usage_rls_enabled' as check_name,
  bool_and(c.relrowsecurity) as ok
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('usage_events', 'usage_counters', 'usage_overrides');

select
  'businesses_owner_id_absent' as check_name,
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'businesses'
      and column_name = 'owner_id'
  ) as ok;

select
  'no_duplicate_usage_idempotency' as check_name,
  not exists (
    select 1
    from public.usage_events
    group by business_id, feature_id, idempotency_key
    having count(*) > 1
  ) as ok;
