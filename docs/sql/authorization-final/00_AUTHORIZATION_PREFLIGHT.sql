-- ReveNew authorization rollout preflight.
-- Read-only. Run before 01_APPLY_CORE_AUTHORIZATION.sql.

with checks as (
  select 'platform_user_roles_exists' as check_name, (to_regclass('public.platform_user_roles') is not null)::text as result, 'expected false before rollout' as detail
  union all
  select 'role_audit_log_exists', (to_regclass('public.role_audit_log') is not null)::text, 'expected false before rollout'
  union all
  select 'current_profile_id_function_exists', (to_regprocedure('public.current_profile_id()') is not null)::text, 'expected true in current database'
  union all
  select 'has_platform_role_function_exists', (to_regprocedure('public.has_platform_role(text)') is not null)::text, 'expected false before rollout'
  union all
  select 'audit_platform_user_roles_function_exists', (to_regprocedure('public.audit_platform_user_roles()') is not null)::text, 'expected false before rollout'
  union all
  select 'audit_trigger_exists', (exists (select 1 from pg_trigger where tgname = 'trg_audit_platform_user_roles'))::text, 'expected false before rollout'
  union all
  select 'business_member_role_conflicts', count(*)::text, 'must be 0'
  from public.business_members
  where role not in ('owner', 'admin', 'member', 'viewer')
  union all
  select 'duplicate_normalized_profile_emails', coalesce(sum(duplicate_count), 0)::text, 'must be 0'
  from (
    select count(*) as duplicate_count
    from public.profiles
    group by lower(email)
    having count(*) > 1
  ) duplicates
  union all
  select 'pawzoo24_profile_count', count(*)::text, 'must be 1 before grant'
  from public.profiles
  where lower(email) = lower('pawzoo24@gmail.com')
  union all
  select 'usage_counters_exists', (to_regclass('public.usage_counters') is not null)::text, 'expected false for core role rollout'
  union all
  select 'usage_events_exists', (to_regclass('public.usage_events') is not null)::text, 'expected false for core role rollout'
  union all
  select 'usage_overrides_exists', (to_regclass('public.usage_overrides') is not null)::text, 'expected false for core role rollout'
  union all
  select 'businesses_owner_id_absent', (not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'businesses'
      and column_name = 'owner_id'
  ))::text, 'must be true'
  union all
  select 'businesses_owner_profile_id_exists', (exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'businesses'
      and column_name = 'owner_profile_id'
  ))::text, 'must be true'
)
select check_name, result, detail
from checks
order by check_name;

select
  'business_members_role_values' as section,
  role as item,
  count(*)::text as result
from public.business_members
group by role
order by role;

select
  'existing_role_constraints' as section,
  c.conrelid::regclass::text as item,
  c.conname || ': ' || pg_get_constraintdef(c.oid) as result
from pg_constraint c
where c.conrelid in ('public.profiles'::regclass, 'public.business_members'::regclass)
  and lower(c.conname) like '%role%'
order by c.conrelid::regclass::text, c.conname;

select
  'existing_role_policies' as section,
  schemaname || '.' || tablename as item,
  policyname || ' / ' || cmd as result
from pg_policies
where schemaname = 'public'
  and tablename in ('platform_user_roles', 'role_audit_log', 'profiles', 'business_members')
order by schemaname, tablename, policyname;

select
  'existing_function' as section,
  n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as item,
  case when p.prosecdef then 'security_definer' else 'security_invoker' end || ' / ' || coalesce(array_to_string(p.proconfig, ','), 'no_config') as result
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('current_profile_id', 'has_platform_role', 'audit_platform_user_roles')
order by n.nspname, p.proname;

select
  'existing_rls_state' as section,
  n.nspname || '.' || c.relname as item,
  ('rls=' || c.relrowsecurity::text || ', force_rls=' || c.relforcerowsecurity::text) as result
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles', 'businesses', 'business_members', 'platform_user_roles', 'role_audit_log')
order by n.nspname, c.relname;
