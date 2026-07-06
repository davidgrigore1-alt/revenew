select 'usage_events_exists' as check_name, (to_regclass('public.usage_events') is not null)::text as result;
select 'usage_counters_exists' as check_name, (to_regclass('public.usage_counters') is not null)::text as result;
select 'usage_overrides_exists' as check_name, (to_regclass('public.usage_overrides') is not null)::text as result;

select
  'businesses_owner_id_absent' as check_name,
  (not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'businesses'
      and column_name = 'owner_id'
  ))::text as result;

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('usage_events', 'usage_counters', 'usage_overrides')
order by table_name, ordinal_position;

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('usage_events', 'usage_counters', 'usage_overrides')
order by tablename, policyname;

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('usage_events', 'usage_counters', 'usage_overrides')
order by tablename, indexname;

do $$
begin
  if to_regclass('public.usage_events') is not null then
    perform 1
    from public.usage_events
    group by business_id, feature_id, idempotency_key
    having count(*) > 1;
  end if;
end;
$$;
