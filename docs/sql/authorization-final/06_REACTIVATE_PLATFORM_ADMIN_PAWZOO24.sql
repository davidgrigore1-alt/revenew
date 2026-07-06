-- Reactivate the canonical platform_admin row for pawzoo24@gmail.com.
-- This clears revoked_at and keeps any existing expiration unchanged.

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

  update public.platform_user_roles
  set is_active = true,
      revoked_at = null,
      updated_at = now()
  where profile_id = v_profile_id
    and role = 'platform_admin';

  if not found then
    raise exception 'No canonical platform_admin row exists for pawzoo24@gmail.com. Run 03_GRANT_PLATFORM_ADMIN_PAWZOO24.sql first.';
  end if;
end;
$$;

select
  p.email,
  p.role as deprecated_profile_role,
  pur.role,
  pur.is_active,
  pur.expires_at,
  pur.revoked_at,
  pur.updated_at
from public.platform_user_roles pur
join public.profiles p on p.id = pur.profile_id
where lower(p.email) = lower('pawzoo24@gmail.com')
  and pur.role = 'platform_admin';

commit;
