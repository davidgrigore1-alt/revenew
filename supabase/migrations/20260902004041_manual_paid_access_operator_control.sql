begin;

-- safety-justification: This operator-only function is required to record a reviewed manual paid-access decision while the browser retains read-only subscription access.
create or replace function public.set_manual_subscription_access(
  p_business_id uuid,
  p_plan text,
  p_status text,
  p_current_period_end timestamptz,
  p_reference text
)
returns table (
  subscription_id uuid,
  plan text,
  status text,
  current_period_end timestamptz,
  changed boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_subscription public.subscriptions%rowtype;
  v_previous_plan text;
  v_previous_status text;
  v_previous_period_end timestamptz;
  v_reference text;
begin
  if p_plan not in ('starter', 'growth', 'agency', 'enterprise') then
    raise exception 'Manual paid plan is invalid' using errcode = '22023';
  end if;

  if p_status not in ('active', 'past_due', 'cancelled') then
    raise exception 'Manual subscription status is invalid' using errcode = '22023';
  end if;

  v_reference := btrim(coalesce(p_reference, ''));
  if v_reference = '' or char_length(v_reference) > 160 or v_reference ~ '[[:cntrl:]]' then
    raise exception 'Manual subscription reference is invalid' using errcode = '22023';
  end if;

  if p_status = 'active' and (p_current_period_end is null or p_current_period_end <= now()) then
    raise exception 'Active manual access requires a future period end' using errcode = '22023';
  end if;

  -- The business lock serializes creation when no subscription row exists yet.
  perform 1
  from public.businesses
  where id = p_business_id
  for update;

  if not found then
    raise exception 'Business not found' using errcode = 'P0002';
  end if;

  select *
  into v_subscription
  from public.subscriptions
  where business_id = p_business_id
  order by updated_at desc, created_at desc, id desc
  limit 1
  for update;

  if found
    and v_subscription.plan = p_plan
    and v_subscription.status = p_status
    and v_subscription.current_period_end is not distinct from p_current_period_end then
    return query select v_subscription.id, v_subscription.plan, v_subscription.status, v_subscription.current_period_end, false;
    return;
  end if;

  v_previous_plan := v_subscription.plan;
  v_previous_status := v_subscription.status;
  v_previous_period_end := v_subscription.current_period_end;

  if found then
    update public.subscriptions
    set plan = p_plan,
        status = p_status,
        current_period_end = p_current_period_end,
        updated_at = now()
    where id = v_subscription.id
    returning * into v_subscription;
  else
    insert into public.subscriptions (
      business_id,
      plan,
      status,
      current_period_end,
      updated_at
    ) values (
      p_business_id,
      p_plan,
      p_status,
      p_current_period_end,
      now()
    )
    returning * into v_subscription;
  end if;

  insert into public.audit_logs (
    business_id,
    profile_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    p_business_id,
    null,
    'subscription.manual_access_changed',
    'subscription',
    v_subscription.id,
    jsonb_build_object(
      'previous_plan', v_previous_plan,
      'new_plan', v_subscription.plan,
      'previous_status', v_previous_status,
      'new_status', v_subscription.status,
      'previous_period_end', v_previous_period_end,
      'new_period_end', v_subscription.current_period_end,
      'reference', v_reference,
      'method', 'manual_operator'
    )
  );

  return query select v_subscription.id, v_subscription.plan, v_subscription.status, v_subscription.current_period_end, true;
end;
$$;

revoke execute on function public.set_manual_subscription_access(uuid, text, text, timestamptz, text)
  from public, anon, authenticated;

grant execute on function public.set_manual_subscription_access(uuid, text, text, timestamptz, text)
  to service_role;

commit;

notify pgrst, 'reload schema';
