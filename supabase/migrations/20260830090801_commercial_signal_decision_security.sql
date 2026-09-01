begin;

-- commercial_signals.updated_at is the canonical compare-and-set token. The
-- existing BEFORE UPDATE trigger refreshes it for every row mutation.
update public.commercial_signals
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.commercial_signals
  alter column updated_at set not null;

create or replace function public.has_business_capability(target_business_id uuid, requested_capability text)
returns boolean language sql stable
-- safety-justification: Capability evaluation is a bounded RLS helper that derives tenant membership and never trusts browser identity.
security definer set search_path = pg_catalog, public as $$
  with actor as (select public.business_role_for_current_user(target_business_id) as role)
  select case requested_capability
    when 'workspace.members.read' then role in ('owner','admin','manager')
    when 'workspace.members.manage' then role in ('owner','admin')
    when 'workspace.policies.read' then role in ('owner','admin','manager','member')
    when 'workspace.policies.manage' then role in ('owner','admin')
    when 'workspace.audit.read' then role in ('owner','admin','manager')
    when 'opportunities.assign' then role in ('owner','admin','manager')
    when 'actions.assign' then role in ('owner','admin','manager')
    when 'outreach.approve_live' then role in ('owner','admin','manager')
    when 'outcomes.approve' then role in ('owner','admin','manager')
    when 'revenue.confirm' then role in ('owner','admin','manager')
    when 'approvals.read' then role in ('owner','admin','manager','member')
    when 'approvals.decide' then role in ('owner','admin','manager')
    when 'signals.update' then role in ('owner','admin','manager','member')
    when 'signals.convert' then role in ('owner','admin','manager','member')
    when 'signals.archive' then role in ('owner','admin','manager','member')
    else false
  end from actor;
$$;

revoke all on function public.has_business_capability(uuid, text) from public, anon;
grant execute on function public.has_business_capability(uuid, text) to authenticated;

drop policy if exists "commercial_signals_update_accessible_business" on public.commercial_signals;
create policy "commercial_signals_update_authorized"
on public.commercial_signals for update to authenticated
using (public.has_business_capability(business_id, 'signals.update'))
with check (public.has_business_capability(business_id, 'signals.update'));

drop policy if exists "commercial_signal_events_insert_accessible_business" on public.commercial_signal_events;
create policy "commercial_signal_events_insert_authorized"
on public.commercial_signal_events for insert to authenticated
with check (public.has_business_capability(business_id, 'signals.update'));

create or replace function public.approve_recoverable_signal_v2(
  target_signal_id uuid,
  expected_updated_at timestamptz,
  selected_organization_id uuid default null,
  selected_contact_id uuid default null,
  new_organization_name text default null,
  new_contact_name text default null,
  new_contact_email text default null,
  new_contact_phone text default null,
  selected_owner_profile_id uuid default null,
  selected_due_at timestamptz default null,
  reviewed_action text default null,
  reviewed_draft text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_signal public.commercial_signals%rowtype;
  v_actor_profile_id uuid;
  v_organization_id uuid;
  v_contact_id uuid;
  v_opportunity_id uuid;
  v_association_id uuid;
  v_action_id uuid;
  v_document_id uuid;
  v_normalized_name text;
  v_normalized_email text;
  v_action text;
  v_title text;
begin
  v_actor_profile_id := public.current_profile_id();
  if v_actor_profile_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_signal
  from public.commercial_signals
  where id = target_signal_id
  for update;

  if not found or not public.can_access_business(v_signal.business_id) then
    raise exception 'Signal not found' using errcode = '42501';
  end if;
  if not public.has_business_capability(v_signal.business_id, 'signals.convert') then
    raise exception 'Signal approval is not authorized' using errcode = '42501';
  end if;

  if v_signal.converted_opportunity_id is not null then
    return jsonb_build_object(
      'outcome', 'already_applied',
      'signal_id', v_signal.id,
      'opportunity_id', v_signal.converted_opportunity_id,
      'already_converted', true
    );
  end if;

  if expected_updated_at is null then
    return jsonb_build_object('outcome', 'conflict', 'reason', 'missing_expected_version', 'signal_id', v_signal.id);
  end if;
  if v_signal.updated_at is distinct from expected_updated_at then
    return jsonb_build_object('outcome', 'conflict', 'reason', 'stale_version', 'signal_id', v_signal.id);
  end if;
  if v_signal.analysis_status <> 'completed' or v_signal.review_status not in ('ready_for_review', 'postponed') then
    return jsonb_build_object('outcome', 'conflict', 'reason', 'decision_not_pending', 'signal_id', v_signal.id);
  end if;

  if selected_owner_profile_id is not null and not exists (
    select 1
    from public.businesses b
    left join public.business_members bm
      on bm.business_id = b.id and bm.profile_id = selected_owner_profile_id and bm.status = 'active'
    where b.id = v_signal.business_id
      and (b.owner_profile_id = selected_owner_profile_id or bm.profile_id is not null)
  ) then
    raise exception 'Selected owner is not assignable in this workspace' using errcode = '42501';
  end if;

  v_organization_id := selected_organization_id;
  if v_organization_id is not null then
    if not exists (
      select 1 from public.crm_organizations
      where id = v_organization_id
        and business_id = v_signal.business_id
        and is_archived = false
    ) then
      raise exception 'Organization is unavailable in this workspace' using errcode = '42501';
    end if;
  elsif nullif(btrim(new_organization_name), '') is not null then
    v_normalized_name := lower(btrim(new_organization_name));
    select id into v_organization_id
    from public.crm_organizations
    where business_id = v_signal.business_id and normalized_name = v_normalized_name and is_archived = false;

    if v_organization_id is null then
      insert into public.crm_organizations (business_id, name, normalized_name)
      values (v_signal.business_id, btrim(new_organization_name), v_normalized_name)
      returning id into v_organization_id;
    end if;
  end if;

  v_contact_id := selected_contact_id;
  if v_contact_id is not null then
    if not exists (
      select 1 from public.crm_contacts
      where id = v_contact_id and business_id = v_signal.business_id and is_active = true
    ) then
      raise exception 'Contact is unavailable in this workspace' using errcode = '42501';
    end if;

    if v_organization_id is not null and exists (
      select 1 from public.crm_contacts
      where id = v_contact_id and organization_id is not null and organization_id <> v_organization_id
    ) then
      raise exception 'Contact belongs to another organization' using errcode = '22023';
    end if;
  elsif nullif(btrim(new_contact_name), '') is not null then
    v_normalized_email := nullif(lower(btrim(new_contact_email)), '');
    if v_normalized_email is not null then
      select id into v_contact_id
      from public.crm_contacts
      where business_id = v_signal.business_id and normalized_email = v_normalized_email and is_active = true;
    end if;

    if v_contact_id is null then
      insert into public.crm_contacts (
        business_id, organization_id, full_name, normalized_name,
        email, normalized_email, phone, is_primary_for_organization
      ) values (
        v_signal.business_id,
        v_organization_id,
        btrim(new_contact_name),
        lower(btrim(new_contact_name)),
        nullif(btrim(new_contact_email), ''),
        v_normalized_email,
        nullif(btrim(new_contact_phone), ''),
        v_organization_id is not null and not exists (
          select 1 from public.crm_contacts
          where organization_id = v_organization_id and is_primary_for_organization and is_active
        )
      ) returning id into v_contact_id;
    end if;
  end if;

  if v_contact_id is not null and v_organization_id is not null then
    update public.crm_contacts
    set is_primary_for_organization = false
    where business_id = v_signal.business_id
      and organization_id = v_organization_id
      and is_active = true;

    update public.crm_contacts
    set organization_id = v_organization_id,
        is_primary_for_organization = true
    where id = v_contact_id and business_id = v_signal.business_id;
  end if;

  v_action := coalesce(nullif(btrim(reviewed_action), ''), nullif(btrim(v_signal.recommended_action), ''), 'Verifică semnalul și stabilește următorul contact comercial.');
  v_title := coalesce(nullif(btrim(v_signal.title), ''), nullif(btrim(v_signal.contact_company), ''), 'Oportunitate de recuperare comercială');

  insert into public.opportunities (
    business_id, organization_id, title, type, status, commercial_type,
    owner_profile_id, currency, estimated_value_low, estimated_value_high,
    deadline, fit_score, urgency_score, money_score, confidence_score,
    summary, relevance, risks, recommended_action, raw_source_text,
    contact_name, contact_email, contact_phone, ai_summary, why_relevant, analysis_mode
  ) values (
    v_signal.business_id, v_organization_id, v_title, 'b2b_lead', 'new', 'commercial_recovery',
    selected_owner_profile_id, coalesce(v_signal.currency, 'RON'), v_signal.estimated_value_min,
    coalesce(v_signal.estimated_recoverable_value, v_signal.estimated_value_max, v_signal.estimated_value_min),
    coalesce(selected_due_at::date, v_signal.suggested_due_date),
    coalesce(v_signal.fit_score, v_signal.recoverability_score, 50), coalesce(v_signal.urgency_score, 50),
    coalesce(v_signal.recoverability_score, 50), coalesce(v_signal.confidence_score, 50),
    coalesce(v_signal.extracted_summary, v_signal.detected_need, v_signal.title),
    jsonb_build_array(coalesce(v_signal.primary_recovery_reason, 'Necesită verificare comercială')),
    v_signal.uncertainty_notes, v_action, v_signal.raw_message, v_signal.contact_name,
    v_signal.contact_email, v_signal.contact_phone, v_signal.analysis_explanation,
    v_signal.primary_recovery_reason,
    case when v_signal.analysis_mode = 'ai' then 'ai' else 'local_fallback' end
  ) returning id into v_opportunity_id;

  if v_contact_id is not null then
    insert into public.opportunity_contacts (business_id, opportunity_id, contact_id, role, is_primary)
    values (v_signal.business_id, v_opportunity_id, v_contact_id, 'contact_principal', true)
    returning id into v_association_id;
  end if;

  insert into public.opportunity_actions (
    business_id, opportunity_id, type, title, description, status, priority, due_at, assigned_to_profile_id
  ) values (
    v_signal.business_id, v_opportunity_id, 'follow_up', left(v_action, 240),
    'Acțiune aprobată din semnalul comercial revizuit.', 'pending',
    case when v_signal.urgency_level in ('high', 'critical') then 'high' when v_signal.urgency_level = 'low' then 'low' else 'medium' end,
    coalesce(selected_due_at, v_signal.suggested_due_date::timestamptz), selected_owner_profile_id
  ) returning id into v_action_id;

  if nullif(btrim($12), '') is not null then
    insert into public.opportunity_documents (
      business_id, opportunity_id, document_type, title, body, status, generation_mode, edited_at
    ) values (
      v_signal.business_id, v_opportunity_id, 'follow_up_email', 'Mesaj comercial revizuit',
      btrim($12), 'edited',
      case when v_signal.analysis_mode = 'ai' then 'ai' else 'local_fallback' end, now()
    ) returning id into v_document_id;
  end if;

  update public.commercial_signals
  set status = 'converted', review_status = 'converted', converted_opportunity_id = v_opportunity_id,
      matched_organization_id = v_organization_id, matched_contact_id = v_contact_id,
      assigned_to_profile_id = selected_owner_profile_id,
      reviewed_draft = nullif(btrim($12), ''), reviewed_at = now(),
      approved_by_profile_id = v_actor_profile_id,
      conversion_idempotency_key = 'signal:' || id::text, updated_at = now()
  where id = v_signal.id;

  insert into public.commercial_signal_events (
    business_id, signal_id, event_type, description, metadata, created_by_profile_id
  ) values
    (v_signal.business_id, v_signal.id, 'signal_approved', 'Semnal aprobat de un membru al echipei.', jsonb_build_object('opportunity_id', v_opportunity_id), v_actor_profile_id),
    (v_signal.business_id, v_signal.id, 'signal_converted', 'Caz de recuperare creat tranzacțional.', jsonb_build_object('opportunity_id', v_opportunity_id, 'action_id', v_action_id, 'document_id', v_document_id), v_actor_profile_id);

  insert into public.opportunity_events (opportunity_id, event_type, label, description)
  values (v_opportunity_id, 'created_from_recoverable_signal', 'Creat din semnal aprobat', 'Oportunitatea a fost creată după revizuire umană explicită.');

  return jsonb_build_object(
    'outcome', 'applied', 'signal_id', v_signal.id, 'opportunity_id', v_opportunity_id,
    'action_id', v_action_id, 'document_id', v_document_id,
    'organization_id', v_organization_id, 'contact_id', v_contact_id,
    'already_converted', false
  );
end;
$$;

create or replace function public.approve_detected_recoverable_signal_v2(
  target_signal_id uuid,
  expected_updated_at timestamptz,
  selected_owner_profile_id uuid default null,
  selected_due_at timestamptz default null,
  reviewed_action text default null,
  reviewed_draft text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_signal public.commercial_signals%rowtype;
  v_actor_profile_id uuid;
  v_opportunity_id uuid;
  v_action_id uuid;
  v_document_id uuid;
  v_action text;
begin
  v_actor_profile_id := public.current_profile_id();
  if v_actor_profile_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_signal from public.commercial_signals
  where id = target_signal_id for update;

  if not found or not public.can_access_business(v_signal.business_id) then
    raise exception 'Signal not found' using errcode = '42501';
  end if;
  if not public.has_business_capability(v_signal.business_id, 'signals.convert') then
    raise exception 'Signal approval is not authorized' using errcode = '42501';
  end if;
  if v_signal.converted_opportunity_id is not null then
    return jsonb_build_object(
      'outcome', 'already_applied', 'signal_id', v_signal.id,
      'opportunity_id', v_signal.converted_opportunity_id, 'already_converted', true
    );
  end if;
  if expected_updated_at is null then
    return jsonb_build_object('outcome', 'conflict', 'reason', 'missing_expected_version', 'signal_id', v_signal.id);
  end if;
  if v_signal.updated_at is distinct from expected_updated_at then
    return jsonb_build_object('outcome', 'conflict', 'reason', 'stale_version', 'signal_id', v_signal.id);
  end if;
  if v_signal.detected_from_opportunity_id is null
     or v_signal.analysis_status <> 'completed'
     or v_signal.review_status not in ('ready_for_review', 'postponed') then
    return jsonb_build_object('outcome', 'conflict', 'reason', 'decision_not_pending', 'signal_id', v_signal.id);
  end if;
  if selected_owner_profile_id is not null and not exists (
    select 1 from public.businesses b
    left join public.business_members bm
      on bm.business_id = b.id and bm.profile_id = selected_owner_profile_id and bm.status = 'active'
    where b.id = v_signal.business_id
      and (b.owner_profile_id = selected_owner_profile_id or bm.profile_id is not null)
  ) then
    raise exception 'Selected owner is not assignable in this workspace' using errcode = '42501';
  end if;

  select id into v_opportunity_id from public.opportunities
  where id = v_signal.detected_from_opportunity_id and business_id = v_signal.business_id
    and coalesce(lifecycle_status, 'open') = 'open'
  for update;
  if v_opportunity_id is null then
    return jsonb_build_object('outcome', 'conflict', 'reason', 'linked_opportunity_unavailable', 'signal_id', v_signal.id);
  end if;

  v_action := coalesce(nullif(btrim(reviewed_action), ''), nullif(btrim(v_signal.recommended_action), ''), 'Revizuiește oportunitatea și stabilește următorul pas comercial.');

  update public.opportunities set
    owner_profile_id = coalesce(selected_owner_profile_id, owner_profile_id),
    deadline = coalesce(selected_due_at::date, deadline),
    recommended_action = v_action,
    updated_at = now()
  where id = v_opportunity_id and business_id = v_signal.business_id;

  insert into public.opportunity_actions (
    business_id, opportunity_id, type, title, description, status, priority, due_at, assigned_to_profile_id
  ) values (
    v_signal.business_id, v_opportunity_id, 'follow_up', left(v_action, 240),
    'Acțiune aprobată din detectarea unei oportunități neglijate.', 'pending',
    case when v_signal.urgency_level in ('high', 'critical') then 'high' when v_signal.urgency_level = 'low' then 'low' else 'medium' end,
    coalesce(selected_due_at, v_signal.suggested_due_date::timestamptz), selected_owner_profile_id
  ) returning id into v_action_id;

  if nullif(btrim($6), '') is not null then
    insert into public.opportunity_documents (
      business_id, opportunity_id, document_type, title, body, status, generation_mode, edited_at
    ) values (
      v_signal.business_id, v_opportunity_id, 'follow_up_email', 'Mesaj comercial revizuit',
      btrim($6), 'edited',
      case when v_signal.analysis_mode = 'ai' then 'ai' else 'local_fallback' end, now()
    ) returning id into v_document_id;
  end if;

  update public.commercial_signals set
    status = 'converted', review_status = 'converted', converted_opportunity_id = v_opportunity_id,
    assigned_to_profile_id = selected_owner_profile_id,
    reviewed_draft = nullif(btrim($6), ''), reviewed_at = now(),
    approved_by_profile_id = v_actor_profile_id,
    conversion_idempotency_key = 'signal:' || id::text, updated_at = now()
  where id = v_signal.id;

  insert into public.commercial_signal_events (
    business_id, signal_id, event_type, description, metadata, created_by_profile_id
  ) values
    (v_signal.business_id, v_signal.id, 'signal_approved', 'Semnal detectat aprobat de un membru al echipei.', jsonb_build_object('opportunity_id', v_opportunity_id), v_actor_profile_id),
    (v_signal.business_id, v_signal.id, 'signal_converted', 'Oportunitatea existentă a primit următorul pas aprobat.', jsonb_build_object('opportunity_id', v_opportunity_id, 'action_id', v_action_id, 'document_id', v_document_id), v_actor_profile_id);

  insert into public.opportunity_events (opportunity_id, event_type, label, description)
  values (v_opportunity_id, 'recovery_signal_approved', 'Relansată din Inbox Comercial', 'Echipa a aprobat următorul pas pentru oportunitatea detectată.');

  return jsonb_build_object(
    'outcome', 'applied', 'signal_id', v_signal.id, 'opportunity_id', v_opportunity_id,
    'action_id', v_action_id, 'document_id', v_document_id,
    'already_converted', false, 'reused_opportunity', true
  );
end;
$$;

create or replace function public.reject_commercial_signal(
  target_signal_id uuid,
  expected_updated_at timestamptz,
  rejection_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_signal public.commercial_signals%rowtype;
  v_actor_profile_id uuid;
  v_reason text;
  v_updated_at timestamptz;
begin
  v_actor_profile_id := public.current_profile_id();
  if v_actor_profile_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  v_reason := nullif(btrim(rejection_reason), '');
  if v_reason is null then
    raise exception 'Rejection reason is required' using errcode = '22023';
  end if;
  v_reason := left(v_reason, 500);

  select * into v_signal from public.commercial_signals
  where id = target_signal_id for update;

  if not found or not public.can_access_business(v_signal.business_id) then
    raise exception 'Signal not found' using errcode = '42501';
  end if;
  if not public.has_business_capability(v_signal.business_id, 'signals.archive') then
    raise exception 'Signal rejection is not authorized' using errcode = '42501';
  end if;
  if v_signal.converted_opportunity_id is not null or v_signal.review_status = 'converted' then
    return jsonb_build_object('outcome', 'conflict', 'reason', 'already_applied', 'signal_id', v_signal.id);
  end if;
  if expected_updated_at is null then
    return jsonb_build_object('outcome', 'conflict', 'reason', 'missing_expected_version', 'signal_id', v_signal.id);
  end if;
  if v_signal.updated_at is distinct from expected_updated_at then
    return jsonb_build_object('outcome', 'conflict', 'reason', 'stale_version', 'signal_id', v_signal.id);
  end if;
  if v_signal.review_status not in ('ready_for_review', 'postponed') or v_signal.analysis_status <> 'completed' then
    return jsonb_build_object('outcome', 'conflict', 'reason', 'decision_not_pending', 'signal_id', v_signal.id);
  end if;

  update public.commercial_signals
  set status = 'dismissed', review_status = 'dismissed', dismissal_reason = v_reason,
      review_due_at = null, reviewed_at = now(), approved_by_profile_id = null,
      updated_at = now()
  where id = v_signal.id
  returning updated_at into v_updated_at;

  insert into public.commercial_signal_events (
    business_id, signal_id, event_type, description, metadata, created_by_profile_id
  ) values (
    v_signal.business_id, v_signal.id, 'signal_dismissed', v_reason,
    jsonb_build_object(
      'preparation_mode', coalesce(v_signal.analysis_mode, 'reguli_locale'),
      'feedback_state', 'rejected',
      'recommendation_summary', left(coalesce(v_signal.analysis_explanation, v_signal.extracted_summary, ''), 800),
      'original_recommended_action', left(coalesce(v_signal.recommended_action, ''), 500),
      'reason', v_reason
    ),
    v_actor_profile_id
  );

  return jsonb_build_object(
    'outcome', 'applied', 'signal_id', v_signal.id, 'updated_at', v_updated_at
  );
end;
$$;

revoke all on function public.approve_recoverable_signal(
  uuid, uuid, uuid, text, text, text, text, uuid, timestamptz, text, text
) from public, anon, authenticated;
revoke all on function public.approve_detected_recoverable_signal(
  uuid, uuid, timestamptz, text, text
) from public, anon, authenticated;

revoke all on function public.approve_recoverable_signal_v2(
  uuid, timestamptz, uuid, uuid, text, text, text, text, uuid, timestamptz, text, text
) from public, anon;
revoke all on function public.approve_detected_recoverable_signal_v2(
  uuid, timestamptz, uuid, timestamptz, text, text
) from public, anon;
revoke all on function public.reject_commercial_signal(uuid, timestamptz, text) from public, anon;

grant execute on function public.approve_recoverable_signal_v2(
  uuid, timestamptz, uuid, uuid, text, text, text, text, uuid, timestamptz, text, text
) to authenticated;
grant execute on function public.approve_detected_recoverable_signal_v2(
  uuid, timestamptz, uuid, timestamptz, text, text
) to authenticated;
grant execute on function public.reject_commercial_signal(uuid, timestamptz, text) to authenticated;

commit;

notify pgrst, 'reload schema';
