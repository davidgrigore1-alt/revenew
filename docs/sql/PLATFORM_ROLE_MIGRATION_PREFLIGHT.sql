-- ReveNew platform-role migration preflight.
-- Read-only. Do not modify data.

select 'platform_user_roles_exists' as check_name, to_regclass('public.platform_user_roles') is not null as ok;
select 'role_audit_log_exists' as check_name, to_regclass('public.role_audit_log') is not null as ok;

select
  'current_profile_id_function_exists' as check_name,
  to_regprocedure('public.current_profile_id()') is not null as ok;

select
  'has_platform_role_function_exists' as check_name,
  to_regprocedure('public.has_platform_role(text)') is not null as ok;

select
  'audit_platform_user_roles_function_exists' as check_name,
  to_regprocedure('public.audit_platform_user_roles()') is not null as ok;

select
  'audit_trigger_exists' as check_name,
  exists (select 1 from pg_trigger where tgname = 'trg_audit_platform_user_roles') as ok;

select
  'business_member_role_conflicts' as check_name,
  count(*) as unsupported_rows
from public.business_members
where role not in ('owner', 'admin', 'member', 'viewer');

select
  role,
  count(*) as rows
from public.business_members
group by role
order by role;

select
  'duplicate_profile_emails' as check_name,
  lower(email) as normalized_email,
  count(*) as matching_profiles
from public.profiles
group by lower(email)
having count(*) > 1
order by matching_profiles desc, normalized_email;

select
  'pawzoo24_profile_count' as check_name,
  count(*) as matching_profiles
from public.profiles
where lower(email) = lower('pawzoo24@gmail.com');

select
  'usage_counters_exists' as check_name,
  to_regclass('public.usage_counters') is not null as ok
union all
select
  'usage_events_exists' as check_name,
  to_regclass('public.usage_events') is not null as ok
union all
select
  'usage_overrides_exists' as check_name,
  to_regclass('public.usage_overrides') is not null as ok;

select
  schemaname,
  tablename,
  policyname
from pg_policies
where schemaname = 'public'
  and tablename in ('usage_counters', 'usage_events', 'usage_overrides', 'platform_user_roles', 'role_audit_log')
order by tablename, policyname;

select
  conname,
  conrelid::regclass as table_name,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in ('public.profiles'::regclass, 'public.business_members'::regclass)
order by 2, 1;

select
  'businesses_owner_id_absent' as check_name,
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'businesses'
      and column_name = 'owner_id'
  ) as ok;
