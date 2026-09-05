-- Phase 3.3: source omissions belong to the durable signal receipt.
begin;
create function public.complete_structured_signal_receipt() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
declare source_rows integer; omitted jsonb;
begin
 if new.entity_type<>'commercial_signals' or new.document_version_id is null or new.confirmed_transaction_at is null then return new; end if;
 select case when v.format='csv' then v.row_count else (v.workbook->'sheets'->new.sheet_index->>'previewRows')::integer-1 end
 into source_rows from public.local_document_versions v
 where v.id=new.document_version_id and v.business_id=new.business_id and v.state='ready';
 if source_rows is null or source_rows not between 1 and 1000 then raise exception 'import_source_receipt'; end if;
 select coalesce(jsonb_agg(n order by n),'[]'::jsonb) into omitted
 from generate_series(2,source_rows+1) n where not exists(
  select 1 from public.commercial_import_rows r where r.batch_id=new.id and r.business_id=new.business_id and r.row_number=n
 );
 new.total_rows:=source_rows;
 new.skipped_rows:=jsonb_array_length(omitted);
 new.summary:=coalesce(new.summary,'{}'::jsonb)||jsonb_build_object('ignored_source_rows',omitted,'source_total_rows',source_rows);
 return new;
end;$$;
revoke all on function public.complete_structured_signal_receipt() from public,anon,authenticated;
create trigger structured_signal_source_receipt before update on public.data_import_batches
for each row execute function public.complete_structured_signal_receipt();
commit;
