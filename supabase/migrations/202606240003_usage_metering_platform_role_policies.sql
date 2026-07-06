-- Optional follow-up: allow platform_admin to inspect usage-metering data.
-- Apply only after both:
-- 1. 202606240001_usage_metering.sql has created usage_counters, usage_events and usage_overrides.
-- 2. 202606240002_separate_platform_and_business_roles.sql has created public.has_platform_role(text).
-- Do not apply automatically from Codex.

do $$
begin
  if to_regclass('public.usage_counters') is null
    or to_regclass('public.usage_events') is null
    or to_regclass('public.usage_overrides') is null
  then
    raise exception 'Usage metering tables are missing. Apply usage metering migration before this policy migration.';
  end if;

  if to_regprocedure('public.has_platform_role(text)') is null then
    raise exception 'public.has_platform_role(text) is missing. Apply platform role migration before this policy migration.';
  end if;
end;
$$;

drop policy if exists "business members can read own usage counters" on public.usage_counters;
create policy "business members can read own usage counters"
on public.usage_counters for select
using (
  exists (
    select 1
    from public.business_members bm
    join public.profiles p on p.id = bm.profile_id
    where bm.business_id = usage_counters.business_id
      and p.user_id = auth.uid()
  )
  or public.has_platform_role('platform_admin')
);

drop policy if exists "platform admins can read usage events" on public.usage_events;
create policy "platform admins can read usage events"
on public.usage_events for select
using (public.has_platform_role('platform_admin'));

drop policy if exists "platform admins can read usage overrides" on public.usage_overrides;
create policy "platform admins can read usage overrides"
on public.usage_overrides for select
using (public.has_platform_role('platform_admin'));
