-- Harden Source Intake at the database boundary. The RPC remains SECURITY INVOKER:
-- authenticated callers still need the existing table grants and pass every RLS policy.

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
  v_computed_fingerprint text;
  v_estimated_value numeric;
  v_text_value text;
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
  if source_file_name is null or char_length(btrim(source_file_name)) not between 1 and 240
     or source_file_name ~ '[[:cntrl:]]'
     or source_file_name ~ '^[[:space:]]*[=+@-]'
     or source_file_name ~ U&'[\200B-\200F\202A-\202E\2060-\206F\FEFF]' then
    raise exception 'Invalid source file name' using errcode = '22023';
  end if;
  if jsonb_typeof(accepted_rows) <> 'array' or jsonb_typeof(rejected_rows) <> 'array'
     or jsonb_array_length(accepted_rows) + jsonb_array_length(rejected_rows) not between 1 and 1000
     or pg_column_size(accepted_rows) + pg_column_size(rejected_rows) > 2097152 then
    raise exception 'Import payload limit exceeded' using errcode = '22023';
  end if;

  insert into public.data_import_batches (
    business_id, profile_id, entity_type, source_type, file_name, source_fingerprint, total_rows
  ) values (
    target_business_id, v_profile_id, 'commercial_signals', 'csv', btrim(source_file_name), batch_fingerprint,
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
      'batch_id', v_existing_batch.id, 'created', v_existing_batch.created_rows,
      'rejected', v_existing_batch.rejected_rows, 'duplicates', v_existing_batch.duplicate_rows,
      'failed', v_existing_batch.failed_rows, 'duplicate_batch', true
    );
  end if;

  for v_row in select value from jsonb_array_elements(rejected_rows)
  loop
    if jsonb_typeof(v_row) <> 'object'
       or v_row - array['row_number','row_fingerprint','status','error_code','error_message','probable_company_match','probable_contact_match','probable_opportunity_match'] <> '{}'::jsonb
       or jsonb_typeof(v_row->'row_number') <> 'number'
       or jsonb_typeof(v_row->'status') <> 'string'
       or exists (
         select 1 from jsonb_each(v_row) field
         where field.key in ('row_fingerprint','error_code','error_message')
           and jsonb_typeof(field.value) not in ('string','null')
       )
       or exists (
         select 1 from jsonb_each(v_row) field
         where field.key in ('probable_company_match','probable_contact_match','probable_opportunity_match')
           and jsonb_typeof(field.value) <> 'boolean'
       )
       or coalesce(v_row->>'row_number', '') !~ '^\d{1,4}$'
       or (v_row->>'row_number')::integer not between 2 and 1001
       or (nullif(v_row->>'row_fingerprint', '') is not null and v_row->>'row_fingerprint' !~ '^[a-f0-9]{64}$')
       or coalesce(v_row->>'status', '') not in ('rejected', 'duplicate_file')
       or char_length(coalesce(v_row->>'error_code', '')) > 80
       or char_length(coalesce(v_row->>'error_message', '')) > 300
       or concat_ws('', v_row->>'error_code', v_row->>'error_message') ~ '[[:cntrl:]]'
       or coalesce(v_row->>'error_code','') ~ '^[[:space:]]*[=+@-]'
       or coalesce(v_row->>'error_message','') ~ '^[[:space:]]*[=+@-]'
       or concat_ws('', v_row->>'error_code', v_row->>'error_message') ~ U&'[\200B-\200F\202A-\202E\2060-\206F\FEFF]'
       or coalesce(v_row->>'probable_company_match', 'false') not in ('true','false')
       or coalesce(v_row->>'probable_contact_match', 'false') not in ('true','false')
       or coalesce(v_row->>'probable_opportunity_match', 'false') not in ('true','false') then
      raise exception 'Invalid rejected import row' using errcode = '22023';
    end if;
    insert into public.commercial_import_rows (
      business_id, batch_id, row_number, row_fingerprint, status, error_code, error_message,
      probable_company_match, probable_contact_match, probable_opportunity_match
    ) values (
      target_business_id, v_batch_id, (v_row->>'row_number')::integer, nullif(v_row->>'row_fingerprint', ''),
      v_row->>'status', nullif(v_row->>'error_code', ''), nullif(v_row->>'error_message', ''),
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
    if jsonb_typeof(v_row) <> 'object'
       or v_row - array[
         'row_number','row_fingerprint','source_label','source_type','title','company','contact','email','phone',
         'estimated_value','currency','last_interaction_at','requested_date','context','status_label','owner_label',
         'owner_profile_id','source_reference','probable_signal_match','probable_company_match',
         'probable_contact_match','probable_opportunity_match'
       ] <> '{}'::jsonb
       or jsonb_typeof(v_row->'row_number') <> 'number'
       or exists (
         select 1 from jsonb_each(v_row) field
         where field.key in (
           'row_fingerprint','source_label','source_type','title','company','contact','email','phone','estimated_value',
           'currency','last_interaction_at','requested_date','context','status_label','owner_label','owner_profile_id','source_reference'
         ) and jsonb_typeof(field.value) not in ('string','null')
       )
       or exists (
         select 1 from jsonb_each(v_row) field
         where field.key in ('probable_signal_match','probable_company_match','probable_contact_match','probable_opportunity_match')
           and jsonb_typeof(field.value) <> 'boolean'
       )
       or coalesce(v_row->>'row_number', '') !~ '^\d{1,4}$'
       or (v_row->>'row_number')::integer not between 2 and 1001
       or char_length(btrim(coalesce(v_row->>'title', ''))) not between 1 and 240
       or char_length(coalesce(v_row->>'source_label', '')) > 120
       or char_length(coalesce(v_row->>'company', '')) > 240
       or char_length(coalesce(v_row->>'contact', '')) > 240
       or char_length(coalesce(v_row->>'email', '')) > 320
       or char_length(coalesce(v_row->>'phone', '')) > 80
       or char_length(coalesce(v_row->>'context', '')) > 6000
       or char_length(coalesce(v_row->>'status_label', '')) > 500
       or char_length(coalesce(v_row->>'owner_label', '')) > 240
       or char_length(coalesce(v_row->>'source_reference', '')) > 500
       or coalesce(v_row->>'currency', 'RON') not in ('RON','EUR','USD','GBP','CHF')
       or coalesce(nullif(v_row->>'source_type', ''), 'csv_import') not in ('manual','email','phone','whatsapp','csv_import','other')
       or (nullif(v_row->>'email', '') is not null and v_row->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
       or (nullif(v_row->>'phone', '') is not null and char_length(regexp_replace(v_row->>'phone', '[^0-9]', '', 'g')) not between 7 and 15)
       or (nullif(v_row->>'estimated_value', '') is not null and v_row->>'estimated_value' !~ '^\d{1,12}(\.\d{1,2})?$')
       or (nullif(v_row->>'last_interaction_at', '') is not null and v_row->>'last_interaction_at' !~ '^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$')
       or (nullif(v_row->>'requested_date', '') is not null and v_row->>'requested_date' !~ '^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$')
       or (nullif(v_row->>'owner_profile_id', '') is not null and v_row->>'owner_profile_id' !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$')
       or coalesce(v_row->>'probable_signal_match', 'false') not in ('true','false')
       or coalesce(v_row->>'probable_company_match', 'false') not in ('true','false')
       or coalesce(v_row->>'probable_contact_match', 'false') not in ('true','false')
       or coalesce(v_row->>'probable_opportunity_match', 'false') not in ('true','false') then
      raise exception 'Invalid normalized import row' using errcode = '22023';
    end if;

    foreach v_text_value in array array[
      coalesce(v_row->>'source_label',''), coalesce(v_row->>'title',''), coalesce(v_row->>'company',''),
      coalesce(v_row->>'contact',''), coalesce(v_row->>'email',''), coalesce(v_row->>'phone',''),
      coalesce(v_row->>'context',''), coalesce(v_row->>'status_label',''), coalesce(v_row->>'owner_label',''),
      coalesce(v_row->>'source_reference','')
    ] loop
      if v_text_value ~ '[[:cntrl:]]'
         or v_text_value ~ U&'[\200B-\200F\202A-\202E\2060-\206F\FEFF]'
         or v_text_value ~ '^[[:space:]]*[=+@-]' then
        raise exception 'Unsafe normalized import text' using errcode = '22023';
      end if;
    end loop;

    if nullif(v_row->>'last_interaction_at', '') is not null then
      perform (v_row->>'last_interaction_at')::timestamptz;
    end if;
    if nullif(v_row->>'requested_date', '') is not null then
      perform (v_row->>'requested_date')::timestamptz;
    end if;
    v_estimated_value := nullif(v_row->>'estimated_value', '')::numeric;
    if v_estimated_value is not null and (v_estimated_value < 0 or v_estimated_value > 1000000000000) then
      raise exception 'Invalid estimated value' using errcode = '22023';
    end if;

    v_computed_fingerprint := encode(extensions.digest(convert_to(concat_ws(chr(31),
      regexp_replace(lower(btrim(coalesce(v_row->>'source_label',''))), '[[:space:]]+', ' ', 'g'),
      coalesce(nullif(v_row->>'source_type',''), 'csv_import'),
      regexp_replace(lower(btrim(v_row->>'title')), '[[:space:]]+', ' ', 'g'),
      regexp_replace(lower(btrim(coalesce(v_row->>'company',''))), '[[:space:]]+', ' ', 'g'),
      regexp_replace(lower(btrim(coalesce(v_row->>'contact',''))), '[[:space:]]+', ' ', 'g'),
      lower(coalesce(v_row->>'email','')), regexp_replace(coalesce(v_row->>'phone',''), '[^+0-9]', '', 'g'),
      coalesce(v_row->>'estimated_value',''), coalesce(v_row->>'currency','RON'),
      left(coalesce(v_row->>'last_interaction_at',''), 10), left(coalesce(v_row->>'requested_date',''), 10),
      regexp_replace(lower(btrim(coalesce(v_row->>'context',''))), '[[:space:]]+', ' ', 'g'),
      regexp_replace(lower(btrim(coalesce(v_row->>'source_reference',''))), '[[:space:]]+', ' ', 'g')
    ), 'UTF8'), 'sha256'), 'hex');
    if coalesce(v_row->>'row_fingerprint', '') <> v_computed_fingerprint then
      raise exception 'Invalid row fingerprint' using errcode = '22023';
    end if;

    if nullif(v_row->>'owner_profile_id', '') is not null and not exists (
      select 1 from public.businesses b
      left join public.business_members bm on bm.business_id = b.id and bm.profile_id = (v_row->>'owner_profile_id')::uuid
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
      ingestion_fingerprint, ingestion_origin, duplicate_risk, occurred_at, analysis_status, review_status
    ) values (
      target_business_id, coalesce(nullif(v_row->>'source_type',''), 'csv_import'), nullif(v_row->>'source_label',''),
      'new', 'medium', btrim(v_row->>'title'), nullif(v_row->>'source_reference',''),
      nullif(v_row->>'last_interaction_at','')::timestamptz, nullif(v_row->>'requested_date','')::timestamptz,
      nullif(v_row->>'company',''), nullif(v_row->>'contact',''), nullif(v_row->>'email',''), nullif(v_row->>'phone',''),
      nullif(v_row->>'context',''), nullif(v_row->>'status_label',''), v_estimated_value, v_estimated_value,
      coalesce(nullif(v_row->>'currency',''), 'RON'), nullif(v_row->>'owner_profile_id','')::uuid,
      v_profile_id, v_batch_id, v_computed_fingerprint, 'csv_import',
      coalesce((v_row->>'probable_signal_match')::boolean, false), now(), 'not_started', 'new'
    )
    on conflict (business_id, ingestion_fingerprint) where ingestion_fingerprint is not null do nothing
    returning id into v_signal_id;

    if v_signal_id is null then
      select id into v_duplicate_signal_id from public.commercial_signals
      where business_id = target_business_id and ingestion_fingerprint = v_computed_fingerprint;
      v_duplicates := v_duplicates + 1;
      insert into public.commercial_import_rows (
        business_id, batch_id, row_number, row_fingerprint, status, duplicate_signal_id,
        probable_company_match, probable_contact_match, probable_opportunity_match
      ) values (
        target_business_id, v_batch_id, (v_row->>'row_number')::integer, v_computed_fingerprint,
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
        target_business_id, v_batch_id, (v_row->>'row_number')::integer, v_computed_fingerprint, 'created', v_signal_id,
        coalesce((v_row->>'probable_company_match')::boolean, false),
        coalesce((v_row->>'probable_contact_match')::boolean, false),
        coalesce((v_row->>'probable_opportunity_match')::boolean, false)
      );
      insert into public.commercial_signal_events (
        business_id, signal_id, event_type, description, metadata, created_by_profile_id
      ) values (
        target_business_id, v_signal_id, 'signal_imported', 'Semnal comercial creat dintr-un import controlat confirmat.',
        jsonb_build_object('batch_id', v_batch_id, 'source_type', coalesce(nullif(v_row->>'source_type',''), 'csv_import')),
        v_profile_id
      );
    end if;
  end loop;

  update public.data_import_batches set
    status = case when v_rejected > 0 then 'partial' else 'completed' end,
    created_rows = v_created, skipped_rows = v_duplicates, rejected_rows = v_rejected,
    duplicate_rows = v_duplicates, failed_rows = 0,
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

-- Remove legacy default privileges that are not used by any application path.
-- Functional SELECT/INSERT/column-scoped UPDATE access remains protected by RLS.
revoke all on table public.commercial_signals, public.commercial_signal_events from anon;
revoke truncate, references, trigger on table public.commercial_signals, public.commercial_signal_events from authenticated;

commit;

notify pgrst, 'reload schema';
