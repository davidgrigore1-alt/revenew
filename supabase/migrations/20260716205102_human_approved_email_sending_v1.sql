-- Human-approved email sending V1.
-- Additive only: persistent approval revision and delivery state on tenant-scoped documents.

alter table public.opportunity_documents
  add column if not exists approved_content_fingerprint text,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists send_status text not null default 'not_sent',
  add column if not exists sending_mode text,
  add column if not exists recipient_snapshot text,
  add column if not exists idempotency_key text,
  add column if not exists send_attempt_count integer not null default 0,
  add column if not exists send_started_at timestamptz,
  add column if not exists sent_by uuid references public.profiles(id) on delete set null,
  add column if not exists provider_message_id text,
  add column if not exists safe_failure_category text,
  add column if not exists last_send_result_at timestamptz;

alter table public.opportunity_documents
  add constraint opportunity_documents_send_status_check
  check (send_status in ('not_sent', 'sending', 'test_completed', 'sent', 'failed', 'disabled')) not valid,
  add constraint opportunity_documents_sending_mode_check
  check (sending_mode is null or sending_mode in ('disabled', 'test', 'live')) not valid,
  add constraint opportunity_documents_send_attempt_count_check
  check (send_attempt_count >= 0) not valid;

alter table public.opportunity_documents
  validate constraint opportunity_documents_send_status_check;
alter table public.opportunity_documents
  validate constraint opportunity_documents_sending_mode_check;
alter table public.opportunity_documents
  validate constraint opportunity_documents_send_attempt_count_check;

create unique index if not exists opportunity_documents_business_idempotency_uidx
  on public.opportunity_documents(business_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists opportunity_documents_business_send_metrics_idx
  on public.opportunity_documents(business_id, send_status, sending_mode, updated_at desc);

-- Document mutations are mediated by authenticated server actions. This prevents
-- browser clients from forging approval fingerprints, send state or provider results.
revoke update on table public.opportunity_documents from anon;
revoke update on table public.opportunity_documents from authenticated;
revoke update on table public.opportunity_documents from public;

create or replace function public.invalidate_follow_up_document_approval()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.title is distinct from old.title
    or new.body is distinct from old.body
    or new.opportunity_id is distinct from old.opportunity_id then
    new.approved_content_fingerprint := null;
    new.approved_at := null;
    new.approved_by := null;
    if old.send_status <> 'sent' then
      new.send_status := 'not_sent';
      new.sending_mode := null;
      new.recipient_snapshot := null;
      new.idempotency_key := null;
      new.send_started_at := null;
      new.provider_message_id := null;
      new.safe_failure_category := null;
      new.last_send_result_at := null;
    end if;
    if old.status in ('approved', 'ready_to_send') and new.status in ('approved', 'ready_to_send') then
      new.status := 'edited';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.invalidate_follow_up_document_approval() from public;
revoke all on function public.invalidate_follow_up_document_approval() from anon;
revoke all on function public.invalidate_follow_up_document_approval() from authenticated;

drop trigger if exists trg_invalidate_follow_up_document_approval on public.opportunity_documents;
create trigger trg_invalidate_follow_up_document_approval
before update of title, body, opportunity_id on public.opportunity_documents
for each row execute function public.invalidate_follow_up_document_approval();

comment on column public.opportunity_documents.approved_content_fingerprint is
  'SHA-256 fingerprint of server-derived workspace, document, opportunity, recipient, subject and body at approval.';
comment on column public.opportunity_documents.send_status is
  'Internal sending state. test_completed is never an external delivery; sent requires confirmed live provider success.';
comment on column public.opportunity_documents.provider_message_id is
  'Provider identifier only. Full provider responses and credentials are never persisted.';
