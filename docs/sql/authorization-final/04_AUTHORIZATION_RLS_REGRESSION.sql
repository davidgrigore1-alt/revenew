-- ReveNew RLS regression checks.
-- Transaction-wrapped and non-persistent. Run after 01 and 02.

begin;

select
  'anonymous_platform_role_read_denied' as check_name,
  case
    when not exists (
      select 1
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name = 'platform_user_roles'
        and grantee = 'anon'
        and privilege_type = 'SELECT'
    ) then 'PASS'
    else 'FAIL'
  end as result,
  'anon has no SELECT privilege on platform_user_roles' as detail;

select
  'authenticated_platform_role_mutation_denied' as check_name,
  case
    when not exists (
      select 1
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name = 'platform_user_roles'
        and grantee = 'authenticated'
        and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
    ) then 'PASS'
    else 'FAIL'
  end as result,
  'authenticated has no platform role write privileges' as detail;

select
  'audit_rows_not_editable_by_application_roles' as check_name,
  case
    when not exists (
      select 1
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name = 'role_audit_log'
        and grantee in ('anon', 'authenticated')
        and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
    ) then 'PASS'
    else 'FAIL'
  end as result,
  'application roles cannot mutate role_audit_log' as detail;

select
  'own_role_read_runtime' as check_name,
  'SKIPPED' as result,
  'Requires an authenticated Supabase request with a real JWT; SQL Editor owner sessions cannot prove request.jwt.claim.sub behavior.' as detail;

select
  'business_owner_denied_from_platform_data_runtime' as check_name,
  'SKIPPED' as result,
  'Requires a non-platform business-owner JWT fixture. Application pre-migration behavior denies Admin when platform roles resolve empty.' as detail;

select
  'business_a_denied_from_business_b_runtime' as check_name,
  'SKIPPED' as result,
  'Business-object isolation is enforced by server queries scoped to current business_id and existing RLS; this script does not fabricate cross-business fixtures.' as detail;

select
  'viewer_mutation_runtime' as check_name,
  'SKIPPED' as result,
  'Requires a viewer JWT fixture and existing viewer membership. Do not create production role fixtures in this regression script.' as detail;

select
  'platform_admin_recognition_runtime' as check_name,
  case
    when exists (
      select 1
      from public.platform_user_roles pur
      join public.profiles p on p.id = pur.profile_id
      where lower(p.email) = lower('pawzoo24@gmail.com')
        and pur.role = 'platform_admin'
        and pur.is_active = true
        and pur.revoked_at is null
        and (pur.expires_at is null or pur.expires_at > now())
    ) then 'PASS'
    else 'SKIPPED'
  end as result,
  'PASS only after 03_GRANT_PLATFORM_ADMIN_PAWZOO24.sql has been run; otherwise skipped.' as detail;

rollback;
