-- ReveNew: final profile role deprecation and profile privilege repair.
-- Manual Supabase execution only.
-- Based on confirmed live schema:
-- role TEXT NOT NULL DEFAULT 'user'
-- existing roles: business_owner only
-- authenticated currently has table-level UPDATE on profiles.

begin;

do $$
begin
if to_regclass('public.profiles') is null then
raise exception 'ABORT: public.profiles is missing';
end if;

if not exists (
select 1
from information_schema.columns
where table_schema = 'public'
and table_name = 'profiles'
and column_name = 'role'
) then
raise exception 'ABORT: public.profiles.role is missing';
end if;

if exists (
select 1
from public.profiles
where role is not null
and role <> 'business_owner'
) then
raise exception 'ABORT: unexpected profiles.role value found. Only business_owner or NULL is supported.';
end if;

if exists (
select 1
from public.profiles
where user_id is not null
group by user_id
having count(*) > 1
) then
raise exception 'ABORT: duplicate non-null profiles.user_id groups found.';
end if;

if exists (
select 1
from information_schema.columns
where table_schema = 'public'
and table_name = 'businesses'
and column_name = 'owner_id'
) then
raise exception 'ABORT: public.businesses.owner_id must not exist.';
end if;

if not exists (
select 1
from information_schema.columns
where table_schema = 'public'
and table_name = 'businesses'
and column_name = 'owner_profile_id'
) then
raise exception 'ABORT: public.businesses.owner_profile_id is missing.';
end if;

if not exists (
select 1
from pg_class
where oid = 'public.profiles'::regclass
and relrowsecurity = true
) then
raise exception 'ABORT: RLS is not enabled on public.profiles.';
end if;

if not exists (
select 1
from pg_policies
where schemaname = 'public'
and tablename = 'profiles'
and policyname = 'profiles_select_own'
) then
raise exception 'ABORT: profiles_select_own policy is missing.';
end if;

if not exists (
select 1
from pg_policies
where schemaname = 'public'
and tablename = 'profiles'
and policyname = 'profiles_insert_own'
) then
raise exception 'ABORT: profiles_insert_own policy is missing.';
end if;

if not exists (
select 1
from pg_policies
where schemaname = 'public'
and tablename = 'profiles'
and policyname = 'profiles_update_own'
) then
raise exception 'ABORT: profiles_update_own policy is missing.';
end if;
end;
$$;

-- Remove the invalid database contract.
alter table public.profiles
alter column role drop default;

alter table public.profiles
alter column role drop not null;

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (
role is null
or role = 'business_owner'
)
not valid;

alter table public.profiles
validate constraint profiles_role_check;

-- Remove every direct table-level UPDATE privilege.
revoke update
on table public.profiles
from authenticated;

revoke update
on table public.profiles
from public;

-- Remove any existing column-level UPDATE grants, so the final permissions
-- are deterministic and are not inherited from old configuration mistakes.
do $$
declare
v_columns text;
begin
select string_agg(format('%I', column_name), ', ' order by ordinal_position)
into v_columns
from information_schema.columns
where table_schema = 'public'
and table_name = 'profiles';

if v_columns is not null then
execute format(
'revoke update (%s) on table public.profiles from authenticated',
v_columns
);

execute format(
  'revoke update (%s) on table public.profiles from public',
  v_columns
);

end if;
end;
$$;

-- Grant profile editing only for non-authoritative presentation/contact fields
-- that actually exist in the current schema.
do $$
declare
v_safe_columns text;
begin
select string_agg(format('%I', column_name), ', ' order by ordinal_position)
into v_safe_columns
from information_schema.columns
where table_schema = 'public'
and table_name = 'profiles'
and column_name in (
'full_name',
'avatar_url',
'phone'
);

if v_safe_columns is not null then
execute format(
'grant update (%s) on table public.profiles to authenticated',
v_safe_columns
);
end if;
end;
$$;

comment on column public.profiles.role is
'Deprecated compatibility metadata. Not an authorization source. Platform roles use public.platform_user_roles. Business roles use public.business_members and public.businesses.owner_profile_id.';

-- Fail closed: roll back the entire migration if effective privileges still
-- allow authenticated users to edit identity or authorization-sensitive fields.
do $$
declare
v_column text;
begin
if has_table_privilege(
'authenticated',
'public.profiles',
'UPDATE'
) then
raise exception 'ABORT: authenticated still has table-level UPDATE on public.profiles.';
end if;

if has_table_privilege(
'public',
'public.profiles',
'UPDATE'
) then
raise exception 'ABORT: PUBLIC still has table-level UPDATE on public.profiles.';
end if;

foreach v_column in array array[
'id',
'user_id',
'email',
'role',
'created_at'
]
loop
if exists (
select 1
from information_schema.columns
where table_schema = 'public'
and table_name = 'profiles'
and column_name = v_column
)
and has_column_privilege(
'authenticated',
'public.profiles',
v_column,
'UPDATE'
) then
raise exception
'ABORT: authenticated still has UPDATE on protected profiles column: %',
v_column;
end if;
end loop;

if has_column_privilege(
'public',
'public.profiles',
'role',
'UPDATE'
) then
raise exception 'ABORT: PUBLIC still has UPDATE on public.profiles.role.';
end if;
end;
$$;

commit;

notify pgrst, 'reload schema';
