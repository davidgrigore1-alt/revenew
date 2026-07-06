-- Auth rebuild RLS regression guide.
-- These queries are safe metadata checks from SQL Editor. Full authenticated-user
-- RLS simulation must be done with Supabase local tests or a dedicated staging user.

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'businesses', 'business_members', 'platform_user_roles');

select policyname, tablename, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'businesses', 'business_members', 'platform_user_roles')
order by tablename, policyname;

-- Manual staging checks:
-- 1. Authenticated User A can read/update only User A profile fields allowed by policy.
-- 2. User A cannot read User B business unless owner_profile_id or business_members grants it.
-- 3. User A cannot mutate platform_user_roles.
-- 4. platform.admin.access remains resolved only from platform_user_roles.
