-- Auth rebuild preflight. Read-only.

select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
order by ordinal_position;

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.profiles'::regclass
order by conname;

select user_id, count(*) as profile_count
from public.profiles
where user_id is not null
group by user_id
having count(*) > 1;

select trigger_name, event_manipulation, action_statement
from information_schema.triggers
where event_object_schema = 'auth'
  and event_object_table = 'users'
order by trigger_name;

select routine_schema, routine_name, routine_type
from information_schema.routines
where routine_schema in ('public', 'auth')
  and routine_name ilike '%profile%'
order by routine_schema, routine_name;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'businesses'
order by ordinal_position;

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'businesses'
  and column_name = 'owner_id';

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'businesses'
  and column_name = 'owner_profile_id';

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'businesses', 'business_members', 'platform_user_roles');

select policyname, tablename, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'businesses', 'business_members', 'platform_user_roles')
order by tablename, policyname;
