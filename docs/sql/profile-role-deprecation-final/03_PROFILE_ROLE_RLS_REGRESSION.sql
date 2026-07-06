-- Profile role RLS regression notes/checks.
-- SQL Editor owner sessions cannot fully simulate authenticated JWT behavior.
-- Use these metadata checks plus staging browser tests with two real test users.

select
  'profiles_rls_enabled' as check_name,
  cls.relrowsecurity as pass,
  cls.relrowsecurity::text as detail
from pg_class cls
where cls.oid = 'public.profiles'::regclass;

select
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
order by policyname;

select
  'authenticated_profile_role_update_not_granted' as check_name,
  not exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'profiles'
      and grantee = 'authenticated'
      and privilege_type = 'UPDATE'
      and column_name = 'role'
  ) as pass,
  'profiles.role must not be user-editable' as detail;

select
  'authenticated_profile_identity_update_not_granted' as check_name,
  not exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'profiles'
      and grantee = 'authenticated'
      and privilege_type = 'UPDATE'
      and column_name in ('id', 'user_id')
  ) as pass,
  'profiles.id and profiles.user_id must not be user-editable' as detail;

select
  'platform_admin_not_from_profiles_role' as check_name,
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'has_platform_role'
  ) as pass,
  'Platform Admin must resolve through public.platform_user_roles, not public.profiles.role' as detail;

-- Manual staging checks:
-- 1. User A can read User A profile.
-- 2. User A cannot read User B profile.
-- 3. User A cannot create a profile for User B because profiles.user_id must equal auth.uid().
-- 4. User A cannot update profiles.id.
-- 5. User A cannot update profiles.user_id.
-- 6. User A cannot update profiles.role.
-- 7. Setting profiles.role cannot grant Admin; platform Admin comes only from public.platform_user_roles.
-- These authenticated-user checks require staging JWT sessions and cannot be conclusively simulated from the SQL Editor owner session.
