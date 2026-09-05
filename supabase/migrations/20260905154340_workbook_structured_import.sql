-- Phase 3.3: bounded workbook evidence and transactional structured import.
begin;
alter table public.local_document_versions add column workbook jsonb;
alter table public.local_document_versions drop constraint local_document_versions_check;
alter table public.local_document_versions add constraint local_version_ready_evidence check(state <> 'ready' or (byte_size is not null and content_hash is not null and finalized_at is not null and parser_version is not null and ((format='csv' and headers is not null and row_count is not null and column_count is not null) or (format='xlsx' and workbook is not null))));
-- safety-justification: extends the existing authenticated reservation to two formats; same live permissions and immutable object key.
create or replace function public.reserve_local_document(p_business uuid,p_filename text,p_source uuid default null) returns public.local_document_versions language plpgsql security definer set search_path=pg_catalog,public as $$
declare s public.local_document_sources; v public.local_document_versions; vid uuid:=gen_random_uuid();
begin
 if not public.can_write_local_documents(p_business) then raise exception 'document_forbidden'; end if;
 if length(p_filename) not between 1 and 240 or p_filename !~* '\.(csv|xlsx)$' or p_filename ~ '[[:cntrl:]/\\]' then raise exception 'document_format'; end if;
 if p_source is null then
  insert into public.local_document_sources(business_id,created_by_profile_id) values(p_business,public.current_profile_id()) returning * into s;
 else
  select * into s from public.local_document_sources where id=p_source and business_id=p_business and state='active' for update;
  if not found or not public.can_read_local_document(s.id) then raise exception 'document_forbidden'; end if;
 end if;
 insert into public.local_document_versions(id,source_id,business_id,uploader_profile_id,original_filename,object_key,format,mime_type)
 values(vid,s.id,p_business,public.current_profile_id(),p_filename,s.id::text||'/'||vid::text,case when p_filename ~* '\.xlsx$' then 'xlsx' else 'csv' end,case when p_filename ~* '\.xlsx$' then 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' else 'text/csv' end) returning * into v;
 insert into public.local_document_audit(source_id,business_id,actor_profile_id,event) values(s.id,p_business,public.current_profile_id(),'reserved');
 return v;
end; $$;
-- safety-justification: service-only verified workbook projection; same source-first lock order as CSV finalization and deletion.
create function public.finalize_local_workbook(p_version uuid,p_size integer,p_hash text,p_workbook jsonb) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare v public.local_document_versions; s public.local_document_sources;
begin
 select * into v from public.local_document_versions where id=p_version;
 select * into s from public.local_document_sources where id=v.source_id for update;
 select * into v from public.local_document_versions where id=p_version for update;
 if s.state <> 'active' or v.id is null or v.format <> 'xlsx' then raise exception 'document_unavailable'; end if;
 if v.state='ready' then
  if v.content_hash<>p_hash or v.byte_size<>p_size then raise exception 'immutable_document'; end if; return;
 end if;
 if v.state not in ('reserved','verifying','unavailable') then raise exception 'document_state'; end if;
 if p_workbook is null or jsonb_typeof(p_workbook) is distinct from 'object' or octet_length(p_workbook::text)>2200000 or jsonb_typeof(p_workbook->'sheets') is distinct from 'array' or jsonb_array_length(p_workbook->'sheets') not between 1 and 64 or p_workbook->>'parser' is distinct from 'sheetjs-ce-0.20.3-projection-v1' then raise exception 'document_bounds'; end if;
 update public.local_document_versions set state='ready',byte_size=p_size,content_hash=p_hash,workbook=p_workbook,parser_version=p_workbook->>'parser',finalized_at=now(),failure_code=null where id=v.id;
 insert into public.local_document_audit(source_id,business_id,actor_profile_id,event) values(s.id,s.business_id,v.uploader_profile_id,'ready');
end; $$;
create function public.guard_local_workbook() returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if old.state='ready' and new.state='ready' and new.workbook is distinct from old.workbook then raise exception 'immutable_document'; end if;
 if new.state in ('deletion_pending','deleted') then new.workbook:=null; end if;
 return new;
end; $$;
create trigger local_workbook_guard before update on public.local_document_versions for each row execute function public.guard_local_workbook();
revoke all on function public.finalize_local_workbook(uuid,integer,text,jsonb),public.guard_local_workbook() from public,anon,authenticated;
grant execute on function public.finalize_local_workbook(uuid,integer,text,jsonb) to service_role;
update storage.buckets set allowed_mime_types=array['text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] where id='commercial-document-originals';

alter table public.data_import_batches add column confirmed_transaction_at timestamptz, add column document_version_id uuid references public.local_document_versions(id), add column sheet_index integer, add column import_mapping jsonb, add column updated_rows integer not null default 0 check(updated_rows between 0 and 1000);
-- safety-justification: isolated normalization of Romanian commercial names; no authority or side effects.
create function public.structured_import_name(p_text text) returns text language sql immutable set search_path=pg_catalog as $$
 select lower(regexp_replace(regexp_replace(btrim(normalize(coalesce(p_text,''),NFKD)), U&'[\0300-\036f]', '', 'g'),'\s+',' ','g'));
$$;

-- safety-justification: live canonical working-role check; serialized per-workspace import, tenant-qualified records, fixed column allowlists, records and receipt in one transaction.
create function public.import_crm_batch_atomic(p_business uuid,p_target text,p_rows jsonb,p_mode text,p_version uuid default null,p_sheet integer default null,p_mapping jsonb default null,p_actor uuid default null) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
 actor uuid:=p_actor; fingerprint text; batch public.data_import_batches; row_data jsonb; row_index integer:=0;
 created_count integer:=0; updated_count integer:=0; skipped_count integer:=0; rejected_count integer:=0; errors jsonb:='[]'; outcomes jsonb:='[]';
 existing_id uuid; matched_organization uuid; name_value text; normalized_value text; email_value text; website_value text; value_text text; currency_value text; owner_value uuid; record_id uuid;
begin
 perform set_config('request.jwt.claim.sub',coalesce((select user_id::text from public.profiles where id=p_actor),''),true);
 if actor is null or not public.can_write_local_documents(p_business) then raise exception 'import_forbidden'; end if;
 if p_target not in ('organizations','contacts','opportunities') or p_mode not in ('skip','update','create') or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 1000 or octet_length(p_rows::text)>2000000 then raise exception 'import_bounds'; end if;
 if p_mapping is not null and (jsonb_typeof(p_mapping)<>'object' or octet_length(p_mapping::text)>8000) then raise exception 'import_mapping'; end if;
 if p_version is not null and not exists(select 1 from public.local_document_versions v where v.id=p_version and v.business_id=p_business and v.state='ready' and public.can_read_local_document(v.source_id) and (v.format='csv' and p_sheet is null or v.format='xlsx' and p_sheet between 0 and jsonb_array_length(v.workbook->'sheets')-1)) then raise exception 'import_source'; end if;
 perform pg_advisory_xact_lock(hashtextextended('structured-import:'||p_business::text,0));
 fingerprint:=encode(sha256(convert_to(jsonb_build_object('rows',p_rows,'target',p_target,'mode',p_mode,'version',p_version,'sheet',p_sheet,'mapping',p_mapping)::text,'UTF8')),'hex');
 select * into batch from public.data_import_batches where business_id=p_business and profile_id=actor and entity_type=p_target and source_fingerprint=fingerprint;
 if found then
  if batch.status not in ('completed','partial') or batch.confirmed_transaction_at is null then raise exception 'import_prior_unconfirmed'; end if;
  return jsonb_build_object('ok',true,'batchId',batch.id,'created',batch.created_rows,'updated',batch.updated_rows,'skipped',batch.skipped_rows,'rejected',batch.rejected_rows,'errors',coalesce(batch.summary->'errors','[]'),'duplicate',true);
 end if;
 insert into public.data_import_batches(business_id,profile_id,entity_type,source_fingerprint,total_rows,document_version_id,sheet_index,import_mapping) values(p_business,actor,p_target,fingerprint,jsonb_array_length(p_rows),p_version,p_sheet,p_mapping) returning * into batch;
 for row_data in select value from jsonb_array_elements(p_rows) loop
  row_index:=row_index+1; existing_id:=null; matched_organization:=null; record_id:=null;
  if jsonb_typeof(row_data)<>'object' or exists(select 1 from jsonb_each_text(row_data) e where length(e.value)>1200 or e.value ~ '[<>[:cntrl:]]') then raise exception 'import_invalid_row'; end if;
  name_value:=btrim(coalesce(nullif(row_data->>'name',''),nullif(row_data->>'full_name',''),nullif(row_data->>'title',''),nullif(row_data->>'company',''),nullif(row_data->>'opportunity',''),''));
  normalized_value:=public.structured_import_name(name_value);
  if length(name_value) not between 1 and 200 then
   rejected_count:=rejected_count+1; errors:=errors||jsonb_build_array(jsonb_build_object('row',row_index+1,'message','Numele sau titlul este obligatoriu.')); continue;
  end if;
  if p_target='organizations' then
   website_value:=nullif(btrim(coalesce(row_data->>'website',row_data->>'domain','')),'');
   if website_value is not null and website_value !~* '^https?://' then website_value:='https://'||website_value; end if;
   if website_value is not null and (website_value !~* '^https?://[a-z0-9][a-z0-9.-]*(:[0-9]+)?(/[^[:space:]]*)?$' or website_value ~ '@') then
    rejected_count:=rejected_count+1; errors:=errors||jsonb_build_array(jsonb_build_object('row',row_index+1,'message','Website-ul nu este valid.')); continue;
   end if;
   select id into existing_id from public.crm_organizations where business_id=p_business and normalized_name=normalized_value limit 1;
   if existing_id is null and website_value is not null and exists(select 1 from public.crm_organizations where business_id=p_business and regexp_replace(lower(website),'^https?://(www\.)?|/.*$','','g')=regexp_replace(lower(website_value),'^https?://(www\.)?|/.*$','','g')) then
    rejected_count:=rejected_count+1; errors:=errors||jsonb_build_array(jsonb_build_object('row',row_index+1,'message','Domeniul corespunde altei companii. Revizuiește potrivirea; nu am unit datele.')); continue;
   end if;
   if existing_id is null then
    insert into public.crm_organizations(business_id,name,normalized_name,website,industry,phone,city,county,country,relationship_status,is_archived) values(p_business,name_value,normalized_value,website_value,nullif(row_data->>'industry',''),nullif(row_data->>'phone',''),nullif(row_data->>'city',''),nullif(row_data->>'county',''),nullif(row_data->>'country',''),'prospect',false) returning id into record_id;
   elsif p_mode='update' then
    update public.crm_organizations set name=name_value,website=case when p_mapping is null or p_mapping->>'website' is not null then website_value else website end,industry=case when p_mapping is null or p_mapping->>'industry' is not null then nullif(row_data->>'industry','') else industry end,phone=case when p_mapping is null or p_mapping->>'phone' is not null then nullif(row_data->>'phone','') else phone end,city=case when p_mapping is null or p_mapping->>'city' is not null then nullif(row_data->>'city','') else city end,county=case when p_mapping is null or p_mapping->>'county' is not null then nullif(row_data->>'county','') else county end,country=case when p_mapping is null or p_mapping->>'country' is not null then nullif(row_data->>'country','') else country end where id=existing_id and business_id=p_business returning id into record_id;
   end if;
  elsif p_target='contacts' then
   email_value:=nullif(lower(btrim(coalesce(row_data->>'email',''))),'');
   if email_value is not null and email_value !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or nullif(row_data->>'phone','') is not null and row_data->>'phone' !~ '^\+[1-9][0-9]{7,14}$' then
    rejected_count:=rejected_count+1; errors:=errors||jsonb_build_array(jsonb_build_object('row',row_index+1,'message','Emailul sau telefonul internațional nu este valid.')); continue;
   end if;
   if nullif(coalesce(row_data->>'organization',row_data->>'company'),'') is not null then
    select id into matched_organization from public.crm_organizations where business_id=p_business and normalized_name=public.structured_import_name(coalesce(row_data->>'organization',row_data->>'company')) and not is_archived;
    if matched_organization is null then rejected_count:=rejected_count+1;errors:=errors||jsonb_build_array(jsonb_build_object('row',row_index+1,'message','Compania indicată nu există în acest spațiu.'));continue;end if;
   end if;
   select id into existing_id from public.crm_contacts where business_id=p_business and normalized_email=email_value limit 1;
   if existing_id is null then
    insert into public.crm_contacts(business_id,organization_id,full_name,normalized_name,email,normalized_email,phone,job_title,decision_role,is_active) values(p_business,matched_organization,name_value,normalized_value,email_value,email_value,nullif(row_data->>'phone',''),nullif(coalesce(row_data->>'job_title',row_data->>'role'),''),nullif(row_data->>'decision_role',''),true) returning id into record_id;
   elsif p_mode='update' then
    update public.crm_contacts set organization_id=case when p_mapping is null or p_mapping->>'organization' is not null then matched_organization else organization_id end,full_name=name_value,normalized_name=normalized_value,phone=case when p_mapping is null or p_mapping->>'phone' is not null then nullif(row_data->>'phone','') else phone end,job_title=nullif(coalesce(row_data->>'job_title',row_data->>'role'),''),decision_role=case when p_mapping is null or p_mapping->>'decision_role' is not null then nullif(row_data->>'decision_role','') else decision_role end where id=existing_id and business_id=p_business returning id into record_id;
   end if;
  else
   value_text:=coalesce(nullif(row_data->>'estimated_value',''),nullif(row_data->>'value',''),'0');currency_value:=upper(coalesce(nullif(row_data->>'currency',''),'RON'));owner_value:=null;
   if value_text !~ '^[0-9]{1,10}([.,][0-9]{1,2})?$' or currency_value !~ '^[A-Z]{3}$' then rejected_count:=rejected_count+1;errors:=errors||jsonb_build_array(jsonb_build_object('row',row_index+1,'message','Valoarea estimată sau moneda nu este validă.'));continue;end if;
   if nullif(row_data->>'owner_profile_id','') is not null then
    if row_data->>'owner_profile_id' !~ '^[a-f0-9-]{36}$' then raise exception 'import_owner'; end if;
    owner_value:=(row_data->>'owner_profile_id')::uuid;
    if not exists(select 1 from public.business_assignable_profiles(p_business) a where a.profile_id=owner_value) then raise exception 'import_owner'; end if;
   end if;
   select id into existing_id from public.opportunities where business_id=p_business and public.structured_import_name(title)=normalized_value limit 1;
   if existing_id is null or p_mode='create' then
    insert into public.opportunities(business_id,title,type,status,lifecycle_status,commercial_type,owner_profile_id,estimated_value_low,estimated_value_high,currency,summary,relevance,risks,recommended_action,fit_score,urgency_score,money_score,confidence_score) values(p_business,name_value,'manual','reviewed','open','commercial_recovery',owner_value,replace(value_text,',','.')::numeric,replace(value_text,',','.')::numeric,currency_value,coalesce(nullif(row_data->>'summary',''),'Oportunitate importată pentru verificare comercială.'),'[]','[]',coalesce(nullif(row_data->>'next_action',''),'Revizuiește oportunitatea și stabilește următoarea acțiune.'),0,0,0,0) returning id into record_id;
    existing_id:=null;
   elsif p_mode='update' then
    update public.opportunities set title=name_value,owner_profile_id=owner_value,estimated_value_low=replace(value_text,',','.')::numeric,estimated_value_high=replace(value_text,',','.')::numeric,currency=currency_value,summary=coalesce(nullif(row_data->>'summary',''),summary),recommended_action=coalesce(nullif(row_data->>'next_action',''),recommended_action) where id=existing_id and business_id=p_business returning id into record_id;
   end if;
  end if;
  if record_id is null then skipped_count:=skipped_count+1; elsif existing_id is null then created_count:=created_count+1;else updated_count:=updated_count+1;end if;
  outcomes:=outcomes||jsonb_build_array(jsonb_build_object('row',row_index+1,'id',coalesce(record_id,existing_id),'state',case when record_id is null then 'duplicate_existing' when existing_id is null then 'created' else 'updated' end));
 end loop;
 update public.data_import_batches set status=case when rejected_count>0 then 'partial' else 'completed' end,created_rows=created_count,updated_rows=updated_count,skipped_rows=skipped_count,duplicate_rows=skipped_count,rejected_rows=rejected_count,summary=jsonb_build_object('errors',errors,'outcomes',outcomes),completed_at=now(),confirmed_transaction_at=now() where id=batch.id;
 return jsonb_build_object('ok',true,'batchId',batch.id,'created',created_count,'updated',updated_count,'skipped',skipped_count,'rejected',rejected_count,'errors',errors,'duplicate',false);
end; $$;
revoke all on function public.import_crm_batch_atomic(uuid,text,jsonb,text,uuid,integer,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.import_crm_batch_atomic(uuid,text,jsonb,text,uuid,integer,jsonb,uuid) to service_role;
create function public.guard_structured_import_receipt() returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if current_user not in ('postgres','service_role','supabase_admin') and (new.entity_type in ('organizations','contacts','opportunities') or new.confirmed_transaction_at is not null or (tg_op='UPDATE' and old.confirmed_transaction_at is not null) or new.document_version_id is not null or (tg_op='UPDATE' and old.document_version_id is not null)) then raise exception 'receipt_server_only';end if;
 return new;
end; $$;
create trigger structured_import_receipt_guard before insert or update on public.data_import_batches for each row execute function public.guard_structured_import_receipt();
revoke all on function public.guard_structured_import_receipt() from public,anon,authenticated;
-- safety-justification: live source/workspace authorization before invoking the existing transactional signal importer; provenance and receipt committed in the same transaction.
alter table public.commercial_import_rows add column source_claims jsonb not null default '{}' check(jsonb_typeof(source_claims)='object' and octet_length(source_claims::text)<=12000);
-- safety-justification: service-only, verified actor and live membership; structured declarations remain row evidence, never operational state.
create function public.import_document_signal_batch(target_business_id uuid,source_file_name text,batch_fingerprint text,accepted_rows jsonb,rejected_rows jsonb,p_version uuid,p_sheet integer,p_mapping jsonb,p_actor uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare result jsonb; base_rows jsonb; source_row jsonb; base_keys text[]:=array['row_number','row_fingerprint','source_label','source_type','title','company','contact','email','phone','estimated_value','currency','last_interaction_at','requested_date','context','status_label','owner_label','owner_profile_id','source_reference','probable_signal_match','probable_company_match','probable_contact_match','probable_opportunity_match'];
begin
 perform set_config('request.jwt.claim.sub',coalesce((select user_id::text from public.profiles where id=p_actor),''),true);
 if not public.can_write_local_documents(target_business_id) or (p_version is not null and not exists(select 1 from public.local_document_versions v where v.id=p_version and v.business_id=target_business_id and v.state='ready' and public.can_read_local_document(v.source_id) and (v.format='csv' and p_sheet is null or v.format='xlsx' and p_sheet between 0 and jsonb_array_length(v.workbook->'sheets')-1))) then raise exception 'import_source'; end if;
 if p_mapping is null or jsonb_typeof(p_mapping)<>'object' or octet_length(p_mapping::text)>8000 then raise exception 'import_mapping'; end if;
 select coalesce(jsonb_agg((select jsonb_object_agg(key,value) from jsonb_each(row_value) where key=any(base_keys))),'[]') into base_rows from jsonb_array_elements(accepted_rows) row_value;
 result:=public.import_commercial_signal_batch(target_business_id,source_file_name,batch_fingerprint,base_rows,rejected_rows);
 if coalesce((result->>'duplicate_batch')::boolean,false) and not exists(select 1 from public.data_import_batches where id=(result->>'batch_id')::uuid and confirmed_transaction_at is not null and status in ('completed','partial')) then raise exception 'import_prior_unconfirmed';end if;
 update public.data_import_batches set confirmed_transaction_at=coalesce(confirmed_transaction_at,now()),document_version_id=p_version,sheet_index=p_sheet,import_mapping=p_mapping where id=(result->>'batch_id')::uuid and business_id=target_business_id and (document_version_id is null or document_version_id=p_version);
 if not found then raise exception 'import_receipt'; end if;
 if not coalesce((result->>'duplicate_batch')::boolean,false) then
  for source_row in select value from jsonb_array_elements(accepted_rows) loop
   update public.commercial_import_rows set source_claims=source_row-base_keys where business_id=target_business_id and batch_id=(result->>'batch_id')::uuid and row_number=(source_row->>'row_number')::integer;
  end loop;
 end if;
 return result;
end; $$;
revoke all on function public.import_document_signal_batch(uuid,text,text,jsonb,jsonb,uuid,integer,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.import_document_signal_batch(uuid,text,text,jsonb,jsonb,uuid,integer,jsonb,uuid) to service_role;
create function public.guard_import_source_claims() returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if current_user not in ('postgres','service_role','supabase_admin') and (new.source_claims<>'{}'::jsonb or (tg_op='UPDATE' and old.source_claims<>'{}'::jsonb)) then raise exception 'receipt_server_only';end if;return new;
end;$$;
create trigger import_source_claims_guard before insert or update on public.commercial_import_rows for each row execute function public.guard_import_source_claims();
revoke all on function public.guard_import_source_claims() from public,anon,authenticated;
commit;
