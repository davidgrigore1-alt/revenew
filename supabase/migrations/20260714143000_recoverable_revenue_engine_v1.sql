-- Recoverable Revenue Engine V1.
-- Additive only. This migration must be reviewed and applied manually.

begin;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'businesses' and column_name = 'owner_id'
  ) then
    raise exception 'Unsafe schema: public.businesses.owner_id exists unexpectedly.';
  end if;
end
$$;

alter table public.commercial_signals
  add column if not exists title text,
  add column if not exists source_reference text,
  add column if not exists last_interaction_at timestamptz,
  add column if not exists analysis_status text not null default 'not_started',
  add column if not exists review_status text not null default 'new',
  add column if not exists analysis_mode text,
  add column if not exists recoverability_score integer,
  add column if not exists confidence_level text,
  add column if not exists estimated_recoverable_value numeric(12, 2),
  add column if not exists urgency_level text,
  add column if not exists primary_recovery_reason text,
  add column if not exists analysis_explanation text,
  add column if not exists missing_information jsonb not null default '[]'::jsonb,
  add column if not exists uncertainty_notes jsonb not null default '[]'::jsonb,
  add column if not exists suggested_due_date date,
  add column if not exists suggested_owner_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists matched_organization_id uuid references public.crm_organizations(id) on delete set null,
  add column if not exists matched_contact_id uuid references public.crm_contacts(id) on delete set null,
  add column if not exists duplicate_risk boolean not null default false,
  add column if not exists duplicate_signal_id uuid references public.commercial_signals(id) on delete set null,
  add column if not exists review_due_at timestamptz,
  add column if not exists reviewed_draft text,
  add column if not exists dismissal_reason text,
  add column if not exists analyzed_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists approved_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists conversion_idempotency_key text;

update public.commercial_signals
set title = coalesce(
  nullif(btrim(extracted_summary), ''),
  nullif(btrim(detected_need), ''),
  nullif(btrim(contact_company), ''),
  nullif(btrim(contact_name), ''),
  'Semnal comercial'
)
where title is null or btrim(title) = '';

alter table public.commercial_signals
  alter column title set not null,
  drop constraint if exists commercial_signals_status_check,
  add constraint commercial_signals_status_check check (status in (
    'new', 'analyzing', 'ready_for_review', 'approved', 'dismissed',
    'duplicate', 'postponed', 'converted', 'failed',
    'reviewed', 'ignored', 'archived'
  )),
  add constraint commercial_signals_analysis_status_check check (
    analysis_status in ('not_started', 'analyzing', 'completed', 'failed')
  ),
  add constraint commercial_signals_review_status_check check (
    review_status in ('new', 'ready_for_review', 'approved', 'dismissed', 'duplicate', 'postponed', 'converted')
  ),
  add constraint commercial_signals_analysis_mode_check check (
    analysis_mode is null or analysis_mode in ('ai', 'deterministic_fallback')
  ),
  add constraint commercial_signals_recoverability_score_check check (
    recoverability_score is null or recoverability_score between 0 and 100
  ),
  add constraint commercial_signals_confidence_level_check check (
    confidence_level is null or confidence_level in ('low', 'medium', 'high')
  ),
  add constraint commercial_signals_recoverable_value_check check (
    estimated_recoverable_value is null or estimated_recoverable_value >= 0
  ),
  add constraint commercial_signals_urgency_level_check check (
    urgency_level is null or urgency_level in ('low', 'medium', 'high', 'critical')
  ),
  add constraint commercial_signals_missing_information_array_check check (
    jsonb_typeof(missing_information) = 'array'
  ),
  add constraint commercial_signals_uncertainty_notes_array_check check (
    jsonb_typeof(uncertainty_notes) = 'array'
  );

create unique index if not exists commercial_signals_conversion_idempotency_idx
  on public.commercial_signals(business_id, conversion_idempotency_key)
  where conversion_idempotency_key is not null;

create index if not exists commercial_signals_review_queue_idx
  on public.commercial_signals(
    business_id,
    review_status,
    urgency_level,
    recoverability_score desc,
    estimated_recoverable_value desc,
    last_interaction_at
  );

create index if not exists commercial_signals_match_idx
  on public.commercial_signals(business_id, matched_organization_id, matched_contact_id);

create or replace function public.approve_recoverable_signal(
  target_signal_id uuid,
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

  if v_signal.converted_opportunity_id is not null then
    return jsonb_build_object(
      'signal_id', v_signal.id,
      'opportunity_id', v_signal.converted_opportunity_id,
      'already_converted', true
    );
  end if;

  if v_signal.analysis_status <> 'completed' or v_signal.review_status not in ('ready_for_review', 'postponed') then
    raise exception 'Signal must be analyzed and ready for review before approval' using errcode = '22023';
  end if;

  if selected_owner_profile_id is not null and not exists (
    select 1
    from public.businesses b
    left join public.business_members bm
      on bm.business_id = b.id and bm.profile_id = selected_owner_profile_id
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
    v_signal.business_id,
    v_organization_id,
    v_title,
    'b2b_lead',
    'new',
    'commercial_recovery',
    selected_owner_profile_id,
    coalesce(v_signal.currency, 'RON'),
    v_signal.estimated_value_min,
    coalesce(v_signal.estimated_recoverable_value, v_signal.estimated_value_max, v_signal.estimated_value_min),
    coalesce(selected_due_at::date, v_signal.suggested_due_date),
    coalesce(v_signal.fit_score, v_signal.recoverability_score, 50),
    coalesce(v_signal.urgency_score, 50),
    coalesce(v_signal.recoverability_score, 50),
    coalesce(v_signal.confidence_score, 50),
    coalesce(v_signal.extracted_summary, v_signal.detected_need, v_signal.title),
    jsonb_build_array(coalesce(v_signal.primary_recovery_reason, 'Necesită verificare comercială')),
    v_signal.uncertainty_notes,
    v_action,
    v_signal.raw_message,
    v_signal.contact_name,
    v_signal.contact_email,
    v_signal.contact_phone,
    v_signal.analysis_explanation,
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
    v_signal.business_id,
    v_opportunity_id,
    'follow_up',
    left(v_action, 240),
    'Acțiune aprobată din semnalul comercial revizuit.',
    'pending',
    case when v_signal.urgency_level in ('high', 'critical') then 'high' when v_signal.urgency_level = 'low' then 'low' else 'medium' end,
    coalesce(selected_due_at, v_signal.suggested_due_date::timestamptz),
    selected_owner_profile_id
  ) returning id into v_action_id;

  if nullif(btrim(reviewed_draft), '') is not null then
    insert into public.opportunity_documents (
      business_id, opportunity_id, document_type, title, body, status, generation_mode, edited_at
    ) values (
      v_signal.business_id,
      v_opportunity_id,
      'follow_up_email',
      'Mesaj comercial revizuit',
      btrim(reviewed_draft),
      'edited',
      case when v_signal.analysis_mode = 'ai' then 'ai' else 'local_fallback' end,
      now()
    ) returning id into v_document_id;
  end if;

  update public.commercial_signals
  set status = 'converted',
      review_status = 'converted',
      converted_opportunity_id = v_opportunity_id,
      matched_organization_id = v_organization_id,
      matched_contact_id = v_contact_id,
      assigned_to_profile_id = selected_owner_profile_id,
      reviewed_draft = nullif(btrim(reviewed_draft), ''),
      reviewed_at = now(),
      approved_by_profile_id = v_actor_profile_id,
      conversion_idempotency_key = 'signal:' || id::text,
      updated_at = now()
  where id = v_signal.id;

  insert into public.commercial_signal_events (
    business_id, signal_id, event_type, description, metadata, created_by_profile_id
  ) values
    (v_signal.business_id, v_signal.id, 'signal_approved', 'Semnal aprobat de un membru al echipei.', jsonb_build_object('opportunity_id', v_opportunity_id), v_actor_profile_id),
    (v_signal.business_id, v_signal.id, 'signal_converted', 'Caz de recuperare creat tranzacțional.', jsonb_build_object('opportunity_id', v_opportunity_id, 'action_id', v_action_id, 'document_id', v_document_id), v_actor_profile_id);

  insert into public.opportunity_events (opportunity_id, event_type, label, description)
  values (v_opportunity_id, 'created_from_recoverable_signal', 'Creat din semnal aprobat', 'Oportunitatea a fost creată după revizuire umană explicită.');

  return jsonb_build_object(
    'signal_id', v_signal.id,
    'opportunity_id', v_opportunity_id,
    'action_id', v_action_id,
    'document_id', v_document_id,
    'organization_id', v_organization_id,
    'contact_id', v_contact_id,
    'already_converted', false
  );
end;
$$;

revoke all on function public.approve_recoverable_signal(uuid, uuid, uuid, text, text, text, text, uuid, timestamptz, text, text) from public, anon;
grant execute on function public.approve_recoverable_signal(uuid, uuid, uuid, text, text, text, text, uuid, timestamptz, text, text) to authenticated;

commit;

notify pgrst, 'reload schema';
