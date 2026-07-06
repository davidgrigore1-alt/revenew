-- EMERGENCY ONLY: disable every active platform role without deleting history.
-- This does not modify profiles, Auth users, businesses, memberships, opportunities or business roles.

begin;

with disabled as (
  update public.platform_user_roles
  set is_active = false,
      revoked_at = coalesce(revoked_at, now()),
      updated_at = now()
  where is_active = true
     or revoked_at is null
  returning id, profile_id, role, is_active, revoked_at, updated_at
)
select
  count(*) as affected_rows
from disabled;

select
  p.email,
  pur.role,
  pur.is_active,
  pur.expires_at,
  pur.revoked_at,
  pur.updated_at
from public.platform_user_roles pur
left join public.profiles p on p.id = pur.profile_id
order by pur.updated_at desc, pur.role;

commit;
