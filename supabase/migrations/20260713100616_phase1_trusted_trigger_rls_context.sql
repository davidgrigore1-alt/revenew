-- Trigger-internal tenant validation must not be distorted by caller-row RLS.
-- Each function still derives identity from auth.uid() and validates tenant scope.
begin;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'businesses' and column_name = 'owner_id'
  ) then
    raise exception 'Unsafe schema: public.businesses.owner_id exists unexpectedly.';
  end if;
end;
$$;

alter function public.validate_opportunity_profile_scope() security definer;
alter function public.validate_opportunity_action_profile_scope() security definer;
alter function public.set_trusted_opportunity_event_context() security definer;

revoke all on function public.validate_opportunity_profile_scope() from public, anon, authenticated;
revoke all on function public.validate_opportunity_action_profile_scope() from public, anon, authenticated;
revoke all on function public.set_trusted_opportunity_event_context() from public, anon, authenticated;

commit;
