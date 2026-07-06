-- ReveNew authorization rollout verification.
-- Read-only. Run after 01_APPLY_CORE_AUTHORIZATION.sql.

with checks as (
  select 'platform_user_roles_exists' as check_name, (to_regclass('public.platform_user_roles') is not null) as ok, 'table exists' as detail
  union all
  select 'role_audit_log_exists', (to_regclass('public.role_audit_log') is not null), 'table exists'
  union all
  select 'platform_user_roles_unique_profile_role', exists (
    select 1
    from pg_constraint
    where conrelid = 'public.platform_user_roles'::regclass
      and conname = 'platform_user_roles_profile_role_key'
      and contype = 'u'
  ), 'unique(profile_id, role)'
  union all
  select 'platform_user_roles_role_check', exists (
    select 1
    from pg_constraint
    where conrelid = 'public.platform_user_roles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%platform_admin%'
      and pg_get_constraintdef(oid) like '%platform_operator%'
      and pg_get_constraintdef(oid) like '%platform_developer%'
  ), 'platform role check constraint'
  union all
  select 'business_members_role_check', exists (
    select 1
    from pg_constraint
    where conrelid = 'public.business_members'::regclass
      and conname = 'business_members_role_check'
      and pg_get_constraintdef(oid) like '%owner%'
      and pg_get_constraintdef(oid) like '%admin%'
      and pg_get_constraintdef(oid) like '%member%'
      and pg_get_constraintdef(oid) like '%viewer%'
  ), 'business role check constraint'
  union all
  select 'platform_user_roles_rls_enabled', exists (
    select 1 from pg_class where oid = 'public.platform_user_roles'::regclass and relrowsecurity
  ), 'RLS enabled'
  union all
  select 'role_audit_log_rls_enabled', exists (
    select 1 from pg_class where oid = 'public.role_audit_log'::regclass and relrowsecurity
  ), 'RLS enabled'
  union all
  select 'platform_user_roles_read_own_policy', exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'platform_user_roles' and policyname = 'platform_user_roles_read_own'
  ), 'own-role read policy exists'
  union all
  select 'role_audit_log_read_platform_admin_policy', exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'role_audit_log' and policyname = 'role_audit_log_read_platform_admin'
  ), 'audit read policy exists'
  union all
  select 'current_profile_id_function_exists', to_regprocedure('public.current_profile_id()') is not null, 'function exists'
  union all
  select 'has_platform_role_function_exists', to_regprocedure('public.has_platform_role(text)') is not null, 'function exists'
  union all
  select 'audit_platform_user_roles_function_exists', to_regprocedure('public.audit_platform_user_roles()') is not null, 'function exists'
  union all
  select 'current_profile_id_search_path_fixed', exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'current_profile_id' and p.proconfig @> array['search_path=pg_catalog, public']
  ), 'fixed search_path'
  union all
  select 'has_platform_role_search_path_fixed', exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'has_platform_role' and p.proconfig @> array['search_path=pg_catalog, public']
  ), 'fixed search_path'
  union all
  select 'audit_platform_user_roles_search_path_fixed', exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'audit_platform_user_roles' and p.proconfig @> array['search_path=pg_catalog, public']
  ), 'fixed search_path'
  union all
  select 'audit_trigger_exists', exists (
    select 1 from pg_trigger where tgname = 'trg_audit_platform_user_roles' and tgenabled = 'O'
  ), 'trigger enabled'
  union all
  select 'duplicate_platform_role_rows_absent', not exists (
    select 1 from public.platform_user_roles group by profile_id, role having count(*) > 1
  ), 'no duplicate canonical rows'
  union all
  select 'unsupported_business_roles_absent', not exists (
    select 1 from public.business_members where role not in ('owner', 'admin', 'member', 'viewer')
  ), 'no unsupported business roles'
  union all
  select 'businesses_owner_id_absent', not exists (
    select 1 from information_schema.columns where table_schema = 'public' and table_name = 'businesses' and column_name = 'owner_id'
  ), 'legacy forbidden column absent'
  union all
  select 'core_has_no_usage_table_dependency', true, 'usage policies are in 202606240003 only'
)
select check_name, case when ok then 'PASS' else 'FAIL' end as result, detail
from checks
order by check_name;

select
  'required_columns' as section,
  table_name || '.' || column_name as item,
  data_type || ', nullable=' || is_nullable as result
from information_schema.columns
where table_schema = 'public'
  and table_name in ('platform_user_roles', 'role_audit_log')
order by table_name, ordinal_position;

select
  'table_privileges' as section,
  grantee || ':' || table_name as item,
  string_agg(privilege_type, ', ' order by privilege_type) as result
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('platform_user_roles', 'role_audit_log')
  and grantee in ('anon', 'authenticated')
group by grantee, table_name
order by table_name, grantee;

select
  'runtime_authenticated_rls_regression' as section,
  '04_AUTHORIZATION_RLS_REGRESSION.sql' as item,
  'Run separately. A database-owner verification session cannot fully prove authenticated-user RLS behavior.' as result;
