-- Phase 4: a canonical owner can read their own prepared plan even when no
-- redundant business_members row exists. Other actors' plans remain private.
-- No new write grants, tables, provider permissions or execution capability.
begin;
alter policy "ask_action_plans_owner_read" on public.ask_action_plans
  using (
    created_by_profile_id = public.current_profile_id()
    and (public.is_business_owner(business_id) or public.is_business_member(business_id))
  );
commit;
