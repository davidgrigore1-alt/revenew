select
  'usage_tables_rls_enabled' as check_name,
  bool_and(c.relrowsecurity) as ok
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('usage_events', 'usage_counters', 'usage_overrides');

select
  'anon_has_no_usage_table_privileges' as check_name,
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('usage_events', 'usage_counters', 'usage_overrides')
      and grantee = 'anon'
  ) as ok;

select
  'authenticated_has_no_usage_write_privileges' as check_name,
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('usage_events', 'usage_counters', 'usage_overrides')
      and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  ) as ok;

select
  'platform_usage_policy_present' as check_name,
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'usage_events'
      and policyname = 'platform admins can read usage events'
  ) as ok;

select
  'businesses_owner_id_absent' as check_name,
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'businesses'
      and column_name = 'owner_id'
  ) as ok;
