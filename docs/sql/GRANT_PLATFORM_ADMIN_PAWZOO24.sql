-- ReveNew manual database-administration SQL for pawzoo24@gmail.com.
-- Do not run from application code. Do not place in an automatic migration.
-- Run only after the platform-role migration has been manually applied and verified.

-- 1. Inspect the account. Stop if this returns zero rows or more than one row.
select
  id,
  user_id,
  email,
  full_name,
  role as deprecated_profile_role
from public.profiles
where lower(email) = lower('pawzoo24@gmail.com');

-- 2. Grant or reactivate platform_admin.
do $$
declare
  v_profile_id uuid;
  v_match_count integer;
begin
  select count(*), min(id)
  into v_match_count, v_profile_id
  from public.profiles
  where lower(email) = lower('pawzoo24@gmail.com');

  if v_match_count = 0 then
    raise exception 'No profile found for pawzoo24@gmail.com';
  end if;

  if v_match_count > 1 then
    raise exception 'Multiple profiles found for pawzoo24@gmail.com';
  end if;

  insert into public.platform_user_roles (
    profile_id,
    role,
    is_active,
    granted_at,
    granted_by_profile_id,
    expires_at,
    revoked_at
  )
  values (
    v_profile_id,
    'platform_admin',
    true,
    now(),
    null,
    null,
    null
  )
  on conflict (profile_id, role)
  do update set
    is_active = true,
    revoked_at = null,
    expires_at = null,
    updated_at = now();
end $$;

-- 3. Verify active roles.
select
  p.email,
  pur.role,
  pur.is_active,
  pur.granted_at,
  pur.expires_at,
  pur.revoked_at,
  pur.created_at,
  pur.updated_at
from public.platform_user_roles pur
join public.profiles p on p.id = pur.profile_id
where lower(p.email) = lower('pawzoo24@gmail.com')
order by pur.role;

-- 4. Revoke platform_admin.
do $$
declare
  v_profile_id uuid;
  v_match_count integer;
begin
  select count(*), min(id)
  into v_match_count, v_profile_id
  from public.profiles
  where lower(email) = lower('pawzoo24@gmail.com');

  if v_match_count = 0 then
    raise exception 'No profile found for pawzoo24@gmail.com';
  end if;

  if v_match_count > 1 then
    raise exception 'Multiple profiles found for pawzoo24@gmail.com';
  end if;

  update public.platform_user_roles
  set is_active = false,
      revoked_at = now(),
      updated_at = now()
  where profile_id = v_profile_id
    and role = 'platform_admin';
end $$;

-- 5. Reactivate platform_admin.
do $$
declare
  v_profile_id uuid;
  v_match_count integer;
begin
  select count(*), min(id)
  into v_match_count, v_profile_id
  from public.profiles
  where lower(email) = lower('pawzoo24@gmail.com');

  if v_match_count = 0 then
    raise exception 'No profile found for pawzoo24@gmail.com';
  end if;

  if v_match_count > 1 then
    raise exception 'Multiple profiles found for pawzoo24@gmail.com';
  end if;

  update public.platform_user_roles
  set is_active = true,
      revoked_at = null,
      updated_at = now()
  where profile_id = v_profile_id
    and role = 'platform_admin';
end $$;

-- 6. Add an expiration.
update public.platform_user_roles pur
set expires_at = now() + interval '30 days',
    updated_at = now()
from public.profiles p
where p.id = pur.profile_id
  and lower(p.email) = lower('pawzoo24@gmail.com')
  and pur.role = 'platform_admin';

-- 7. Remove expiration.
update public.platform_user_roles pur
set expires_at = null,
    updated_at = now()
from public.profiles p
where p.id = pur.profile_id
  and lower(p.email) = lower('pawzoo24@gmail.com')
  and pur.role = 'platform_admin';

-- 8. View role audit history.
select
  ral.role_scope,
  ral.role,
  ral.action,
  ral.old_state,
  ral.new_state,
  ral.changed_by_database_user,
  ral.changed_at
from public.role_audit_log ral
left join public.profiles p on p.id = ral.target_profile_id
where lower(p.email) = lower('pawzoo24@gmail.com')
   or ral.old_state ->> 'profile_id' in (
     select id::text from public.profiles where lower(email) = lower('pawzoo24@gmail.com')
   )
   or ral.new_state ->> 'profile_id' in (
     select id::text from public.profiles where lower(email) = lower('pawzoo24@gmail.com')
   )
order by ral.changed_at desc;
