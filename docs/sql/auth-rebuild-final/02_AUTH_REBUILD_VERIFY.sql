-- Auth rebuild verification.

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in ('user_id', 'role', 'personal_phone');

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'profiles'
  and indexname = 'profiles_user_id_key';

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.profiles'::regclass
  and conname in ('profiles_role_check', 'profiles_personal_phone_format_check');

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

select user_id, count(*) as profile_count
from public.profiles
where user_id is not null
group by user_id
having count(*) > 1;
