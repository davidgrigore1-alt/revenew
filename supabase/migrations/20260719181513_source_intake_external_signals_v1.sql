-- Source Intake v1: persist controlled source metadata through the existing tenant-safe batch pipeline.
-- No table, RLS policy, or table grant changes are introduced.

begin;

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
       or coalesce(v_row->>'currency', 'RON') not in ('RON', 'EUR', 'USD', 'GBP', 'CHF')
       or coalesce(nullif(v_row->>'source_type', ''), 'csv_import') not in ('manual', 'email', 'phone', 'whatsapp', 'csv_import', 'other')
       or (nullif(v_row->>'requested_date', '') is not null and v_row->>'requested_date' !~ '^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$') then
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
      last_interaction_at, requested_date, contact_company, contact_name, contact_email, contact_phone,
      raw_message, notes, estimated_value_min, estimated_value_max, currency,
      assigned_to_profile_id, created_by_profile_id, import_batch_id,
      ingestion_fingerprint, ingestion_origin, duplicate_risk, occurred_at
    ) values (
      target_business_id, coalesce(nullif(v_row->>'source_type', ''), 'csv_import'),
      left(nullif(v_row->>'source_label', ''), 120), 'new', 'medium',
      btrim(v_row->>'title'), left(nullif(v_row->>'source_reference', ''), 500),
      nullif(v_row->>'last_interaction_at', '')::timestamptz,
      nullif(v_row->>'requested_date', '')::timestamptz,
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
        target_business_id, v_signal_id, 'signal_imported', 'Semnal comercial creat dintr-un import controlat confirmat.',
        jsonb_build_object('batch_id', v_batch_id, 'source_type', coalesce(nullif(v_row->>'source_type', ''), 'csv_import')),
        v_profile_id
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

commit;
