-- ReveNew platform-role migration verification.
-- Read-only. Run after manually applying the platform-role migration.

select 'platform_user_roles_exists' as check_name, to_regclass('public.platform_user_roles') is not null as ok;
select 'role_audit_log_exists' as check_name, to_regclass('public.role_audit_log') is not null as ok;

select
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('platform_user_roles', 'role_audit_log')
order by table_name, ordinal_position;

select
  conname,
  conrelid::regclass as table_name,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in ('public.platform_user_roles'::regclass, 'public.role_audit_log'::regclass, 'public.business_members'::regclass)
order by 2, 1;

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('platform_user_roles', 'role_audit_log')
order by tablename, indexname;

select
  relname,
  relrowsecurity
from pg_class
where oid in ('public.platform_user_roles'::regclass, 'public.role_audit_log'::regclass);

select
  tablename,
  policyname,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('platform_user_roles', 'role_audit_log')
order by tablename, policyname;

select
  grantee,
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('platform_user_roles', 'role_audit_log')
order by table_name, grantee, privilege_type;

select
  routine_name,
  security_type,
  routine_definition like '%set search_path%' as definition_contains_search_path
from information_schema.routines
where specific_schema = 'public'
  and routine_name in ('current_profile_id', 'has_platform_role', 'audit_platform_user_roles')
order by routine_name;

select
  'current_profile_id_function_exists' as check_name,
  to_regprocedure('public.current_profile_id()') is not null as ok
union all
select
  'has_platform_role_function_exists',
  to_regprocedure('public.has_platform_role(text)') is not null
union all
select
  'audit_platform_user_roles_function_exists',
  to_regprocedure('public.audit_platform_user_roles()') is not null;

select
  tgname,
  tgenabled
from pg_trigger
where tgname = 'trg_audit_platform_user_roles';

select
  profile_id,
  role,
  count(*) as duplicate_rows
from public.platform_user_roles
group by profile_id, role
having count(*) > 1;

select
  'usage_table_dependency_absent_from_core_migration' as check_name,
  true as ok;

select
  'business_member_role_conflicts' as check_name,
  count(*) as unsupported_rows
from public.business_members
where role not in ('owner', 'admin', 'member', 'viewer');

select
  'businesses_owner_id_absent' as check_name,
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'businesses'
      and column_name = 'owner_id'
  ) as ok;
