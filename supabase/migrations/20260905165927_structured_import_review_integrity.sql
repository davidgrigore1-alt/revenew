-- Phase 3.3 recovery: preserve omitted fields and reject ambiguous identities.
begin;
-- safety-justification: replaces the service-only transactional import with the same live tenant authorization, fixed columns and receipt transaction; no grants broadened.
create or replace function public.import_crm_batch_atomic(p_business uuid,p_target text,p_rows jsonb,p_mode text,p_version uuid default null,p_sheet integer default null,p_mapping jsonb default null,p_actor uuid default null) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
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
   if (select count(*) from public.crm_organizations where business_id=p_business and normalized_name=normalized_value)>1 then raise exception 'import_ambiguous_identity'; end if;
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
   if (select count(*) from public.crm_contacts where business_id=p_business and normalized_email=email_value)>1 then raise exception 'import_ambiguous_identity'; end if;
   select id into existing_id from public.crm_contacts where business_id=p_business and normalized_email=email_value limit 1;
   if existing_id is null then
    insert into public.crm_contacts(business_id,organization_id,full_name,normalized_name,email,normalized_email,phone,job_title,decision_role,is_active) values(p_business,matched_organization,name_value,normalized_value,email_value,email_value,nullif(row_data->>'phone',''),nullif(coalesce(row_data->>'job_title',row_data->>'role'),''),nullif(row_data->>'decision_role',''),true) returning id into record_id;
   elsif p_mode='update' then
    update public.crm_contacts set organization_id=case when p_mapping is null or p_mapping->>'organization' is not null then matched_organization else organization_id end,full_name=name_value,normalized_name=normalized_value,phone=case when p_mapping is null or p_mapping->>'phone' is not null then nullif(row_data->>'phone','') else phone end,job_title=case when p_mapping is null or p_mapping->>'job_title' is not null then nullif(coalesce(row_data->>'job_title',row_data->>'role'),'') else job_title end,decision_role=case when p_mapping is null or p_mapping->>'decision_role' is not null then nullif(row_data->>'decision_role','') else decision_role end where id=existing_id and business_id=p_business returning id into record_id;
   end if;
  else
   value_text:=coalesce(nullif(row_data->>'estimated_value',''),nullif(row_data->>'value',''),'0');currency_value:=upper(coalesce(nullif(row_data->>'currency',''),'RON'));owner_value:=null;
   if value_text !~ '^[0-9]{1,10}([.,][0-9]{1,2})?$' or currency_value !~ '^[A-Z]{3}$' then rejected_count:=rejected_count+1;errors:=errors||jsonb_build_array(jsonb_build_object('row',row_index+1,'message','Valoarea estimată sau moneda nu este validă.'));continue;end if;
   if nullif(row_data->>'owner_profile_id','') is not null then
    if row_data->>'owner_profile_id' !~ '^[a-f0-9-]{36}$' then raise exception 'import_owner'; end if;
    owner_value:=(row_data->>'owner_profile_id')::uuid;
    if not exists(select 1 from public.business_assignable_profiles(p_business) a where a.profile_id=owner_value) then raise exception 'import_owner'; end if;
   end if;
   if (select count(*) from public.opportunities where business_id=p_business and public.structured_import_name(title)=normalized_value)>1 then raise exception 'import_ambiguous_identity'; end if;
   select id into existing_id from public.opportunities where business_id=p_business and public.structured_import_name(title)=normalized_value limit 1;
   if existing_id is null or p_mode='create' then
    insert into public.opportunities(business_id,title,type,status,lifecycle_status,commercial_type,owner_profile_id,estimated_value_low,estimated_value_high,currency,summary,relevance,risks,recommended_action,fit_score,urgency_score,money_score,confidence_score) values(p_business,name_value,'manual','reviewed','open','commercial_recovery',owner_value,replace(value_text,',','.')::numeric,replace(value_text,',','.')::numeric,currency_value,coalesce(nullif(row_data->>'summary',''),'Oportunitate importată pentru verificare comercială.'),'[]','[]',coalesce(nullif(row_data->>'next_action',''),'Revizuiește oportunitatea și stabilește următoarea acțiune.'),0,0,0,0) returning id into record_id;
    existing_id:=null;
   elsif p_mode='update' then
    update public.opportunities set title=name_value,owner_profile_id=case when p_mapping is null or p_mapping->>'owner_profile_id' is not null then owner_value else owner_profile_id end,estimated_value_low=case when p_mapping is null or p_mapping->>'estimated_value' is not null then replace(value_text,',','.')::numeric else estimated_value_low end,estimated_value_high=case when p_mapping is null or p_mapping->>'estimated_value' is not null then replace(value_text,',','.')::numeric else estimated_value_high end,currency=case when p_mapping is null or p_mapping->>'currency' is not null then currency_value else currency end,summary=coalesce(nullif(row_data->>'summary',''),summary),recommended_action=coalesce(nullif(row_data->>'next_action',''),recommended_action) where id=existing_id and business_id=p_business returning id into record_id;
   end if;
  end if;
  if record_id is null then skipped_count:=skipped_count+1; elsif existing_id is null then created_count:=created_count+1;else updated_count:=updated_count+1;end if;
  outcomes:=outcomes||jsonb_build_array(jsonb_build_object('row',row_index+1,'id',coalesce(record_id,existing_id),'state',case when record_id is null then 'duplicate_existing' when existing_id is null then 'created' else 'updated' end));
 end loop;
 outcomes:=outcomes||coalesce((select jsonb_agg(jsonb_build_object('row',e->'row','state','rejected','message',e->'message')) from jsonb_array_elements(errors) e),'[]'::jsonb);
 update public.data_import_batches set status=case when rejected_count>0 then 'partial' else 'completed' end,created_rows=created_count,updated_rows=updated_count,skipped_rows=skipped_count,duplicate_rows=skipped_count,rejected_rows=rejected_count,summary=jsonb_build_object('errors',errors,'outcomes',outcomes),completed_at=now(),confirmed_transaction_at=now() where id=batch.id;
 return jsonb_build_object('ok',true,'batchId',batch.id,'created',created_count,'updated',updated_count,'skipped',skipped_count,'rejected',rejected_count,'errors',errors,'duplicate',false);
end; $$;
revoke all on function public.import_crm_batch_atomic(uuid,text,jsonb,text,uuid,integer,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.import_crm_batch_atomic(uuid,text,jsonb,text,uuid,integer,jsonb,uuid) to service_role;
commit;
