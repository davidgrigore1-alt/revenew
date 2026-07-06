-- Profile role deprecation preflight.
-- Read-only. Run in Supabase SQL Editor before applying any migration.

select
  'profiles_role_column' as section,
  jsonb_build_object(
    'data_type', c.data_type,
    'udt_name', c.udt_name,
    'is_nullable', c.is_nullable,
    'column_default', c.column_default,
    'is_identity', c.is_identity,
    'is_generated', c.is_generated
  ) as result
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'profiles'
  and c.column_name = 'role'

union all

select
  'profiles_columns',
  jsonb_agg(
    jsonb_build_object(
      'column_name', c.column_name,
      'data_type', c.data_type,
      'is_nullable', c.is_nullable,
      'column_default', c.column_default
    )
    order by c.ordinal_position
  )
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'profiles'

union all

select
  'profiles_constraints',
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', con.conname,
        'type', con.contype,
        'validated', con.convalidated,
        'definition', pg_get_constraintdef(con.oid, true)
      )
      order by con.conname
    ),
    '[]'::jsonb
  )
from pg_constraint con
where con.conrelid = 'public.profiles'::regclass

union all

select
  'profiles_role_values',
  coalesce(
    jsonb_agg(jsonb_build_object('role', x.role, 'rows', x.rows) order by x.role nulls first),
    '[]'::jsonb
  )
from (
  select role, count(*) as rows
  from public.profiles
  group by role
) x

union all

select
  'duplicate_profile_user_ids',
  jsonb_build_object('duplicate_groups', count(*))
from (
  select user_id
  from public.profiles
  where user_id is not null
  group by user_id
  having count(*) > 1
) d

union all

select
  'duplicate_normalized_profile_emails',
  jsonb_build_object('duplicate_groups', count(*))
from (
  select lower(email)
  from public.profiles
  where email is not null
  group by lower(email)
  having count(*) > 1
) d

union all

select
  'profiles_rls',
  jsonb_build_object('rls_enabled', cls.relrowsecurity, 'force_rls', cls.relforcerowsecurity)
from pg_class cls
where cls.oid = 'public.profiles'::regclass

union all

select
  'profiles_policies',
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'policyname', p.policyname,
        'command', p.cmd,
        'roles', p.roles,
        'qual', p.qual,
        'with_check', p.with_check
      )
      order by p.policyname
    ),
    '[]'::jsonb
  )
from pg_policies p
where p.schemaname = 'public'
  and p.tablename = 'profiles'

union all

select
  'profiles_triggers',
  coalesce(
    jsonb_agg(jsonb_build_object('trigger', t.tgname, 'definition', pg_get_triggerdef(t.oid, true)) order by t.tgname),
    '[]'::jsonb
  )
from pg_trigger t
where t.tgrelid = 'public.profiles'::regclass
  and not t.tgisinternal

union all

select
  'auth_users_profile_triggers',
  coalesce(
    jsonb_agg(jsonb_build_object('trigger', t.tgname, 'definition', pg_get_triggerdef(t.oid, true)) order by t.tgname),
    '[]'::jsonb
  )
from pg_trigger t
where t.tgrelid = 'auth.users'::regclass
  and not t.tgisinternal

union all

select
  'business_owner_columns',
  jsonb_build_object(
    'owner_id_exists',
      exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'businesses'
          and column_name = 'owner_id'
      ),
    'owner_profile_id_exists',
      exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'businesses'
          and column_name = 'owner_profile_id'
      )
  );

select
  check_name,
  case when pass then 'PASS' else 'FAIL' end as status,
  detail
from (
  select
    'profiles_exists' as check_name,
    to_regclass('public.profiles') is not null as pass,
    coalesce(to_regclass('public.profiles')::text, 'missing') as detail

  union all

  select
    'profiles_role_exists',
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'role'
    ),
    'role column must exist before this compatibility migration'

  union all

  select
    'only_business_owner_role_values',
    not exists (
      select 1
      from public.profiles
      where role is not null
        and role <> 'business_owner'
    ),
    'expected live role values: business_owner only, 3 rows'

  union all

  select
    'duplicate_user_ids_absent',
    not exists (
      select 1
      from public.profiles
      where user_id is not null
      group by user_id
      having count(*) > 1
    ),
    'expected duplicate non-null profiles.user_id groups: 0'

  union all

  select
    'businesses_owner_id_absent',
    not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'businesses'
        and column_name = 'owner_id'
    ),
    'businesses.owner_id must remain absent'

  union all

  select
    'businesses_owner_profile_id_present',
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'businesses'
        and column_name = 'owner_profile_id'
    ),
    'businesses.owner_profile_id must exist'

  union all

  select
    'profiles_rls_enabled',
    exists (
      select 1
      from pg_class
      where oid = 'public.profiles'::regclass
        and relrowsecurity
    ),
    'expected profiles RLS enabled'
) checks
order by check_name;

-- Expected interpretation:
-- - profiles_role_column: data_type text, is_nullable NO, column_default 'user'::text.
-- - profiles_role_values: exactly business_owner only, currently 3 rows.
-- - duplicate_profile_user_ids.duplicate_groups must be 0.
-- - duplicate_normalized_profile_emails.duplicate_groups must be 0.
-- - profiles_rls.rls_enabled must be true.
-- - profiles_triggers result is [].
-- - auth_users_profile_triggers result is [].
-- - business_owner_columns.owner_id_exists must be false.
-- - business_owner_columns.owner_profile_id_exists must be true.
-- - every row in the PASS/FAIL blocker query must be PASS before running 01_APPLY_PROFILE_ROLE_FIX.sql.
