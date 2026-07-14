-- Data Ingestion & Continuous Recovery V1.
-- Additive ingestion metadata, workspace idempotency and detected-opportunity approval.

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

alter table public.data_import_batches
  drop constraint if exists data_import_batches_entity_type_check;

alter table public.data_import_batches
  add constraint data_import_batches_entity_type_check
    check (entity_type in ('organizations', 'contacts', 'opportunities', 'commercial_signals')),
  add column if not exists source_type text not null default 'csv'
    check (source_type in ('csv', 'stale_detection')),
  add column if not exists file_name text
    check (file_name is null or char_length(file_name) between 1 and 240),
  add column if not exists duplicate_rows integer not null default 0
    check (duplicate_rows between 0 and 1000),
  add column if not exists failed_rows integer not null default 0
    check (failed_rows between 0 and 1000);

create unique index if not exists data_import_batches_workspace_fingerprint_idx
  on public.data_import_batches (business_id, entity_type, source_fingerprint)
  where entity_type = 'commercial_signals';

alter table public.commercial_signals
  add column if not exists import_batch_id uuid references public.data_import_batches(id) on delete set null,
  add column if not exists ingestion_fingerprint text
    check (ingestion_fingerprint is null or ingestion_fingerprint ~ '^[a-f0-9]{64}$'),
  add column if not exists ingestion_origin text not null default 'manual'
    check (ingestion_origin in ('manual', 'csv_import', 'stale_detection')),
  add column if not exists detected_from_opportunity_id uuid references public.opportunities(id) on delete set null;

create unique index if not exists commercial_signals_ingestion_fingerprint_idx
  on public.commercial_signals (business_id, ingestion_fingerprint)
  where ingestion_fingerprint is not null;

create index if not exists commercial_signals_import_batch_idx
  on public.commercial_signals (business_id, import_batch_id);

create index if not exists commercial_signals_detected_opportunity_idx
  on public.commercial_signals (business_id, detected_from_opportunity_id)
  where detected_from_opportunity_id is not null;

create table if not exists public.commercial_import_rows (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  batch_id uuid not null references public.data_import_batches(id) on delete cascade,
  row_number integer not null check (row_number between 2 and 1001),
  row_fingerprint text check (row_fingerprint is null or row_fingerprint ~ '^[a-f0-9]{64}$'),
  status text not null check (status in ('created', 'rejected', 'duplicate_file', 'duplicate_existing', 'failed')),
  signal_id uuid references public.commercial_signals(id) on delete set null,
  duplicate_signal_id uuid references public.commercial_signals(id) on delete set null,
  error_code text check (error_code is null or char_length(error_code) <= 80),
  error_message text check (error_message is null or char_length(error_message) <= 300),
  probable_company_match boolean not null default false,
  probable_contact_match boolean not null default false,
  probable_opportunity_match boolean not null default false,
  created_at timestamptz not null default now(),
  unique (batch_id, row_number)
);

create index if not exists commercial_import_rows_batch_idx
  on public.commercial_import_rows (business_id, batch_id, row_number);

alter table public.commercial_import_rows enable row level security;

create policy commercial_import_rows_workspace_read on public.commercial_import_rows
for select to authenticated
using (public.can_access_business(business_id));

create policy commercial_import_rows_own_insert on public.commercial_import_rows
for insert to authenticated
with check (
  public.can_access_business(business_id)
  and exists (
    select 1 from public.data_import_batches b
    where b.id = batch_id
      and b.business_id = commercial_import_rows.business_id
      and b.profile_id = (select public.current_profile_id())
  )
);

drop policy if exists data_import_batches_own_read on public.data_import_batches;
create policy data_import_batches_workspace_read on public.data_import_batches
for select to authenticated
using (public.can_access_business(business_id));

revoke all on public.commercial_import_rows from public, anon, authenticated;
grant select, insert on public.commercial_import_rows to authenticated;
grant select, insert, update on public.data_import_batches to authenticated;

create or replace function public.import_commercial_signal_batch(
  target_business_id uuid,
  source_file_name text,
  batch_fingerprint text,
  accepted_rows jsonb,
  rejected_rows jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_profile_id uuid;
  v_batch_id uuid;
  v_existing_batch public.data_import_batches%rowtype;
  v_row jsonb;
  v_signal_id uuid;
  v_duplicate_signal_id uuid;
  v_created integer := 0;
  v_rejected integer := 0;
  v_duplicates integer := 0;
begin
  v_profile_id := public.current_profile_id();
  if v_profile_id is null or not public.can_access_business(target_business_id) then
    raise exception 'Workspace access required' using errcode = '42501';
  end if;
  if batch_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid batch fingerprint' using errcode = '22023';
  end if;
  if jsonb_typeof(accepted_rows) <> 'array' or jsonb_typeof(rejected_rows) <> 'array'
     or jsonb_array_length(accepted_rows) + jsonb_array_length(rejected_rows) not between 1 and 1000 then
    raise exception 'Import row limit exceeded' using errcode = '22023';
  end if;

  insert into public.data_import_batches (
    business_id, profile_id, entity_type, source_type, file_name, source_fingerprint, total_rows
  ) values (
    target_business_id, v_profile_id, 'commercial_signals', 'csv',
    nullif(left(btrim(source_file_name), 240), ''), batch_fingerprint,
    jsonb_array_length(accepted_rows) + jsonb_array_length(rejected_rows)
  )
  on conflict (business_id, entity_type, source_fingerprint) where entity_type = 'commercial_signals' do nothing
  returning id into v_batch_id;

  if v_batch_id is null then
    select * into v_existing_batch
    from public.data_import_batches
    where business_id = target_business_id
      and entity_type = 'commercial_signals'
      and source_fingerprint = batch_fingerprint;
    return jsonb_build_object(
      'batch_id', v_existing_batch.id,
      'created', v_existing_batch.created_rows,
      'rejected', v_existing_batch.rejected_rows,
      'duplicates', v_existing_batch.duplicate_rows,
      'failed', v_existing_batch.failed_rows,
      'duplicate_batch', true
    );
  end if;

  for v_row in select value from jsonb_array_elements(rejected_rows)
  loop
    insert into public.commercial_import_rows (
      business_id, batch_id, row_number, row_fingerprint, status, error_code, error_message,
      probable_company_match, probable_contact_match, probable_opportunity_match
    ) values (
      target_business_id, v_batch_id, (v_row->>'row_number')::integer,
      nullif(v_row->>'row_fingerprint', ''),
      case when v_row->>'status' = 'duplicate_file' then 'duplicate_file' else 'rejected' end,
      left(nullif(v_row->>'error_code', ''), 80), left(nullif(v_row->>'error_message', ''), 300),
      coalesce((v_row->>'probable_company_match')::boolean, false),
      coalesce((v_row->>'probable_contact_match')::boolean, false),
      coalesce((v_row->>'probable_opportunity_match')::boolean, false)
    );
    if v_row->>'status' = 'duplicate_file' then v_duplicates := v_duplicates + 1;
    else v_rejected := v_rejected + 1;
    end if;
  end loop;

  for v_row in select value from jsonb_array_elements(accepted_rows)
  loop
    if coalesce(v_row->>'row_fingerprint', '') !~ '^[a-f0-9]{64}$'
       or char_length(btrim(coalesce(v_row->>'title', ''))) not between 1 and 240
       or coalesce(v_row->>'currency', 'RON') not in ('RON', 'EUR', 'USD', 'GBP', 'CHF') then
      raise exception 'Invalid normalized import row' using errcode = '22023';
    end if;
    if nullif(v_row->>'owner_profile_id', '') is not null and not exists (
      select 1 from public.businesses b
      left join public.business_members bm
        on bm.business_id = b.id and bm.profile_id = (v_row->>'owner_profile_id')::uuid
      where b.id = target_business_id
        and (b.owner_profile_id = (v_row->>'owner_profile_id')::uuid or bm.profile_id is not null)
    ) then
      raise exception 'Imported owner is not assignable' using errcode = '42501';
    end if;

    v_signal_id := null;
    insert into public.commercial_signals (
      business_id, source, source_label, status, priority, title, source_reference,
      last_interaction_at, contact_company, contact_name, contact_email, contact_phone,
      raw_message, notes, estimated_value_min, estimated_value_max, currency,
      assigned_to_profile_id, created_by_profile_id, import_batch_id,
      ingestion_fingerprint, ingestion_origin, duplicate_risk, occurred_at
    ) values (
      target_business_id, 'csv_import', left(nullif(v_row->>'source_label', ''), 120), 'new', 'medium',
      btrim(v_row->>'title'), left(nullif(v_row->>'source_reference', ''), 500),
      nullif(v_row->>'last_interaction_at', '')::timestamptz,
      left(nullif(v_row->>'company', ''), 240), left(nullif(v_row->>'contact', ''), 240),
      left(nullif(v_row->>'email', ''), 320), left(nullif(v_row->>'phone', ''), 80),
      left(nullif(v_row->>'context', ''), 6000), left(nullif(v_row->>'status_label', ''), 500),
      nullif(v_row->>'estimated_value', '')::numeric, nullif(v_row->>'estimated_value', '')::numeric,
      coalesce(nullif(v_row->>'currency', ''), 'RON'), nullif(v_row->>'owner_profile_id', '')::uuid,
      v_profile_id, v_batch_id, v_row->>'row_fingerprint', 'csv_import',
      coalesce((v_row->>'probable_signal_match')::boolean, false), now()
    )
    on conflict (business_id, ingestion_fingerprint) where ingestion_fingerprint is not null do nothing
    returning id into v_signal_id;

    if v_signal_id is null then
      select id into v_duplicate_signal_id from public.commercial_signals
      where business_id = target_business_id and ingestion_fingerprint = v_row->>'row_fingerprint';
      v_duplicates := v_duplicates + 1;
      insert into public.commercial_import_rows (
        business_id, batch_id, row_number, row_fingerprint, status, duplicate_signal_id,
        probable_company_match, probable_contact_match, probable_opportunity_match
      ) values (
        target_business_id, v_batch_id, (v_row->>'row_number')::integer, v_row->>'row_fingerprint',
        'duplicate_existing', v_duplicate_signal_id,
        coalesce((v_row->>'probable_company_match')::boolean, false),
        coalesce((v_row->>'probable_contact_match')::boolean, false),
        coalesce((v_row->>'probable_opportunity_match')::boolean, false)
      );
    else
      v_created := v_created + 1;
      insert into public.commercial_import_rows (
        business_id, batch_id, row_number, row_fingerprint, status, signal_id,
        probable_company_match, probable_contact_match, probable_opportunity_match
      ) values (
        target_business_id, v_batch_id, (v_row->>'row_number')::integer, v_row->>'row_fingerprint',
        'created', v_signal_id,
        coalesce((v_row->>'probable_company_match')::boolean, false),
        coalesce((v_row->>'probable_contact_match')::boolean, false),
        coalesce((v_row->>'probable_opportunity_match')::boolean, false)
      );
      insert into public.commercial_signal_events (
        business_id, signal_id, event_type, description, metadata, created_by_profile_id
      ) values (
        target_business_id, v_signal_id, 'signal_imported', 'Semnal comercial creat dintr-un import CSV confirmat.',
        jsonb_build_object('batch_id', v_batch_id), v_profile_id
      );
    end if;
  end loop;

  update public.data_import_batches set
    status = case when v_rejected > 0 then 'partial' else 'completed' end,
    created_rows = v_created,
    skipped_rows = v_duplicates,
    rejected_rows = v_rejected,
    duplicate_rows = v_duplicates,
    summary = jsonb_build_object('created_signals', v_created, 'duplicate_rows', v_duplicates, 'rejected_rows', v_rejected),
    completed_at = now()
  where id = v_batch_id and business_id = target_business_id and profile_id = v_profile_id;

  return jsonb_build_object(
    'batch_id', v_batch_id, 'created', v_created, 'rejected', v_rejected,
    'duplicates', v_duplicates, 'failed', 0, 'duplicate_batch', false
  );
end;
$$;

revoke all on function public.import_commercial_signal_batch(uuid, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.import_commercial_signal_batch(uuid, text, text, jsonb, jsonb) to authenticated;

create or replace function public.detect_stale_commercial_signals(
  target_business_id uuid,
  detection_fingerprint text,
  candidate_opportunity_ids uuid[]
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_profile_id uuid;
  v_batch_id uuid;
  v_existing_batch public.data_import_batches%rowtype;
  v_opportunity public.opportunities%rowtype;
  v_signal_id uuid;
  v_duplicate_signal_id uuid;
  v_row_number integer := 1;
  v_created integer := 0;
  v_duplicates integer := 0;
  v_row_fingerprint text;
begin
  v_profile_id := public.current_profile_id();
  if v_profile_id is null or not public.can_access_business(target_business_id) then
    raise exception 'Workspace access required' using errcode = '42501';
  end if;
  if detection_fingerprint !~ '^[a-f0-9]{64}$'
     or coalesce(array_length(candidate_opportunity_ids, 1), 0) not between 1 and 200 then
    raise exception 'Invalid detection request' using errcode = '22023';
  end if;

  insert into public.data_import_batches (
    business_id, profile_id, entity_type, source_type, source_fingerprint, total_rows
  ) values (
    target_business_id, v_profile_id, 'commercial_signals', 'stale_detection',
    detection_fingerprint, array_length(candidate_opportunity_ids, 1)
  )
  on conflict (business_id, entity_type, source_fingerprint) where entity_type = 'commercial_signals' do nothing
  returning id into v_batch_id;

  if v_batch_id is null then
    select * into v_existing_batch from public.data_import_batches
    where business_id = target_business_id and entity_type = 'commercial_signals'
      and source_fingerprint = detection_fingerprint;
    return jsonb_build_object(
      'batch_id', v_existing_batch.id, 'created', v_existing_batch.created_rows,
      'duplicates', v_existing_batch.duplicate_rows, 'duplicate_batch', true
    );
  end if;

  for v_opportunity in
    select o.* from public.opportunities o
    where o.business_id = target_business_id
      and o.id = any(candidate_opportunity_ids)
      and coalesce(o.lifecycle_status, 'open') = 'open'
    order by o.updated_at asc, o.id
  loop
    v_row_number := v_row_number + 1;
    v_row_fingerprint := md5('stale_opportunity:' || v_opportunity.id::text)
      || md5('revenew:' || v_opportunity.id::text);
    v_signal_id := null;

    insert into public.commercial_signals (
      business_id, source, source_label, status, priority, title, source_reference,
      last_interaction_at, contact_name, contact_email, contact_phone, raw_message,
      estimated_value_min, estimated_value_max, currency, assigned_to_profile_id,
      created_by_profile_id, import_batch_id, ingestion_fingerprint, ingestion_origin,
      detected_from_opportunity_id, occurred_at
    ) values (
      target_business_id, 'other', 'Detectare oportunitate neglijată', 'new', 'high',
      left('Recuperare: ' || v_opportunity.title, 240), 'opportunity:' || v_opportunity.id::text,
      v_opportunity.updated_at, v_opportunity.contact_name, v_opportunity.contact_email,
      v_opportunity.contact_phone,
      left(coalesce(v_opportunity.summary, v_opportunity.raw_source_text, v_opportunity.title), 6000),
      v_opportunity.estimated_value_low, v_opportunity.estimated_value_high,
      coalesce(v_opportunity.currency, 'RON'), v_opportunity.owner_profile_id,
      v_profile_id, v_batch_id, v_row_fingerprint, 'stale_detection',
      v_opportunity.id, now()
    )
    on conflict (business_id, ingestion_fingerprint) where ingestion_fingerprint is not null do nothing
    returning id into v_signal_id;

    if v_signal_id is null then
      select id into v_duplicate_signal_id from public.commercial_signals
      where business_id = target_business_id and ingestion_fingerprint = v_row_fingerprint;
      v_duplicates := v_duplicates + 1;
      insert into public.commercial_import_rows (
        business_id, batch_id, row_number, row_fingerprint, status, duplicate_signal_id,
        probable_opportunity_match
      ) values (
        target_business_id, v_batch_id, v_row_number, v_row_fingerprint,
        'duplicate_existing', v_duplicate_signal_id, true
      );
    else
      v_created := v_created + 1;
      insert into public.commercial_import_rows (
        business_id, batch_id, row_number, row_fingerprint, status, signal_id,
        probable_opportunity_match
      ) values (
        target_business_id, v_batch_id, v_row_number, v_row_fingerprint,
        'created', v_signal_id, true
      );
      insert into public.commercial_signal_events (
        business_id, signal_id, event_type, description, metadata, created_by_profile_id
      ) values (
        target_business_id, v_signal_id, 'stale_opportunity_detected',
        'Semnal creat prin detectarea explicită a unei oportunități neglijate.',
        jsonb_build_object('batch_id', v_batch_id, 'opportunity_id', v_opportunity.id), v_profile_id
      );
    end if;
  end loop;

  update public.data_import_batches set
    status = 'completed', created_rows = v_created, skipped_rows = v_duplicates,
    duplicate_rows = v_duplicates,
    summary = jsonb_build_object('created_signals', v_created, 'duplicate_rows', v_duplicates),
    completed_at = now()
  where id = v_batch_id and business_id = target_business_id and profile_id = v_profile_id;

  return jsonb_build_object(
    'batch_id', v_batch_id, 'created', v_created, 'duplicates', v_duplicates,
    'duplicate_batch', false
  );
end;
$$;

revoke all on function public.detect_stale_commercial_signals(uuid, text, uuid[]) from public, anon;
grant execute on function public.detect_stale_commercial_signals(uuid, text, uuid[]) to authenticated;

create or replace function public.approve_detected_recoverable_signal(
  target_signal_id uuid,
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
  if v_signal.converted_opportunity_id is not null then
    return jsonb_build_object('signal_id', v_signal.id, 'opportunity_id', v_signal.converted_opportunity_id, 'already_converted', true);
  end if;
  if v_signal.detected_from_opportunity_id is null then
    raise exception 'Detected opportunity link required' using errcode = '22023';
  end if;
  if v_signal.analysis_status <> 'completed' or v_signal.review_status not in ('ready_for_review', 'postponed') then
    raise exception 'Signal must be analyzed and ready for review before approval' using errcode = '22023';
  end if;
  if selected_owner_profile_id is not null and not exists (
    select 1 from public.businesses b
    left join public.business_members bm on bm.business_id = b.id and bm.profile_id = selected_owner_profile_id
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
    raise exception 'Linked opportunity is unavailable in this workspace' using errcode = '42501';
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

  if nullif(btrim($5), '') is not null then
    insert into public.opportunity_documents (
      business_id, opportunity_id, document_type, title, body, status, generation_mode, edited_at
    ) values (
      v_signal.business_id, v_opportunity_id, 'follow_up_email', 'Mesaj comercial revizuit',
      btrim($5), 'edited', case when v_signal.analysis_mode = 'ai' then 'ai' else 'local_fallback' end, now()
    ) returning id into v_document_id;
  end if;

  update public.commercial_signals set
    status = 'converted', review_status = 'converted', converted_opportunity_id = v_opportunity_id,
    assigned_to_profile_id = selected_owner_profile_id, reviewed_draft = nullif(btrim($5), ''),
    reviewed_at = now(), approved_by_profile_id = v_actor_profile_id,
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
    'signal_id', v_signal.id, 'opportunity_id', v_opportunity_id, 'action_id', v_action_id,
    'document_id', v_document_id, 'already_converted', false, 'reused_opportunity', true
  );
end;
$$;

revoke all on function public.approve_detected_recoverable_signal(uuid, uuid, timestamptz, text, text) from public, anon;
grant execute on function public.approve_detected_recoverable_signal(uuid, uuid, timestamptz, text, text) to authenticated;

commit;

notify pgrst, 'reload schema';
