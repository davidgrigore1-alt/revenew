-- Grant or reactivate platform_admin for pawzoo24@gmail.com.
-- Manual database administration only. This script does not create profiles or alter Auth users.

begin;

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
end;
$$;

select
  p.id as profile_id,
  p.user_id,
  p.email,
  p.full_name,
  p.role as deprecated_profile_role,
  pur.role,
  pur.is_active,
  pur.granted_at,
  pur.expires_at,
  pur.revoked_at,
  pur.updated_at
from public.platform_user_roles pur
join public.profiles p on p.id = pur.profile_id
where lower(p.email) = lower('pawzoo24@gmail.com')
  and pur.role = 'platform_admin';

commit;
