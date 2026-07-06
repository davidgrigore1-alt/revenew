-- ReveNew: final verification after profile role migration.
-- Read-only. Every core row must return PASS.

with role_column as (
select
c.is_nullable,
c.column_default
from information_schema.columns c
where c.table_schema = 'public'
and c.table_name = 'profiles'
and c.column_name = 'role'
),
role_constraint as (
select
pg_get_constraintdef(con.oid, true) as definition
from pg_constraint con
where con.conrelid = 'public.profiles'::regclass
and con.conname = 'profiles_role_check'
),
checks as (
select
'profiles_role_exists' as check_name,
exists (select 1 from role_column) as pass,
'public.profiles.role must exist' as detail

union all

select
'profiles_role_nullable',
exists (
select 1
from role_column
where is_nullable = 'YES'
),
coalesce(
(select is_nullable from role_column limit 1),
'missing'
)

union all

select
'profiles_role_default_removed',
exists (
select 1
from role_column
where column_default is null
),
coalesce(
(select column_default from role_column limit 1),
'<NULL>'
)

union all

select
'profiles_role_check_exists',
exists (select 1 from role_constraint),
coalesce(
(select definition from role_constraint limit 1),
'missing'
)

union all

select
'profiles_role_check_permits_null',
exists (
select 1
from role_constraint
where lower(definition) like '%role is null%'
),
coalesce(
(select definition from role_constraint limit 1),
'missing'
)

union all

select
'profiles_role_check_permits_business_owner',
exists (
select 1
from role_constraint
where definition like '%business_owner%'
),
coalesce(
(select definition from role_constraint limit 1),
'missing'
)

union all

select
'profiles_role_check_rejects_user',
not exists (
select 1
from role_constraint
where definition like '%''user''%'
),
coalesce(
(select definition from role_constraint limit 1),
'missing'
)

union all

select
'profiles_role_check_rejects_platform_admin',
not exists (
select 1
from role_constraint
where definition like '%platform_admin%'
),
coalesce(
(select definition from role_constraint limit 1),
'missing'
)

union all

select
'existing_business_owner_rows_preserved',
(select count(*) from public.profiles where role = 'business_owner') = 3,
(select count(*)::text from public.profiles where role = 'business_owner')

union all

select
'no_unexpected_profile_roles',
not exists (
select 1
from public.profiles
where role is not null
and role <> 'business_owner'
),
'only NULL or business_owner may exist'

union all

select
'duplicate_profile_user_ids_absent',
not exists (
select 1
from public.profiles
where user_id is not null
group by user_id
having count(*) > 1
),
'expected zero duplicate non-null user_id groups'

union all

select
'profiles_rls_enabled',
exists (
select 1
from pg_class
where oid = 'public.profiles'::regclass
and relrowsecurity = true
),
'RLS must remain enabled'

union all

select
'profiles_select_own_policy_present',
exists (
select 1
from pg_policies
where schemaname = 'public'
and tablename = 'profiles'
and policyname = 'profiles_select_own'
),
'profiles_select_own expected'

union all

select
'profiles_insert_own_policy_present',
exists (
select 1
from pg_policies
where schemaname = 'public'
and tablename = 'profiles'
and policyname = 'profiles_insert_own'
),
'profiles_insert_own expected'

union all

select
'profiles_update_own_policy_present',
exists (
select 1
from pg_policies
where schemaname = 'public'
and tablename = 'profiles'
and policyname = 'profiles_update_own'
),
'profiles_update_own expected'

union all

select
'authenticated_has_no_table_update',
not has_table_privilege(
'authenticated',
'public.profiles',
'UPDATE'
),
'authenticated must not have table-level UPDATE'

union all

select
'public_has_no_table_update',
not has_table_privilege(
'public',
'public.profiles',
'UPDATE'
),
'PUBLIC must not have table-level UPDATE'

union all

select
'authenticated_cannot_update_id',
not has_column_privilege(
'authenticated',
'public.profiles',
'id',
'UPDATE'
),
'profiles.id must be protected'

union all

select
'authenticated_cannot_update_user_id',
not has_column_privilege(
'authenticated',
'public.profiles',
'user_id',
'UPDATE'
),
'profiles.user_id must be protected'

union all

select
'authenticated_cannot_update_email',
not has_column_privilege(
'authenticated',
'public.profiles',
'email',
'UPDATE'
),
'profiles.email must follow the Auth identity flow'

union all

select
'authenticated_cannot_update_role',
not has_column_privilege(
'authenticated',
'public.profiles',
'role',
'UPDATE'
),
'profiles.role must be protected'

union all

select
'authenticated_can_update_full_name',
(
not exists (
select 1
from information_schema.columns
where table_schema = 'public'
and table_name = 'profiles'
and column_name = 'full_name'
)
or has_column_privilege(
'authenticated',
'public.profiles',
'full_name',
'UPDATE'
)
),
'full_name must remain editable when present'

union all

select
'authenticated_can_update_avatar_url',
(
not exists (
select 1
from information_schema.columns
where table_schema = 'public'
and table_name = 'profiles'
and column_name = 'avatar_url'
)
or has_column_privilege(
'authenticated',
'public.profiles',
'avatar_url',
'UPDATE'
)
),
'avatar_url must remain editable when present'

union all

select
'authenticated_can_update_phone',
(
not exists (
select 1
from information_schema.columns
where table_schema = 'public'
and table_name = 'profiles'
and column_name = 'phone'
)
or has_column_privilege(
'authenticated',
'public.profiles',
'phone',
'UPDATE'
)
),
'phone must remain editable when present'

union all

select
'platform_user_roles_table_present',
to_regclass('public.platform_user_roles') is not null,
coalesce(
to_regclass('public.platform_user_roles')::text,
'missing'
)

union all

select
'business_members_table_present',
to_regclass('public.business_members') is not null,
coalesce(
to_regclass('public.business_members')::text,
'missing'
)

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
)
select
check_name,
case when pass then 'PASS' else 'FAIL' end as status,
detail
from checks
order by check_name;
