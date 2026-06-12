-- Phase 6 workflow polish: editable document and follow-up metadata.
-- Safe additive migration: no table drops, no data deletion.

alter table public.opportunity_documents
  add column if not exists edited_at timestamptz,
  add column if not exists copied_at timestamptz,
  add column if not exists ready_at timestamptz,
  add column if not exists sent_at timestamptz;

alter table public.opportunity_documents
  drop constraint if exists opportunity_documents_status_check,
  add constraint opportunity_documents_status_check check (status in ('placeholder', 'draft', 'edited', 'copied', 'ready_to_send', 'sent', 'approved', 'archived'));

alter table public.opportunity_actions
  add column if not exists priority text not null default 'medium',
  add column if not exists completed_at timestamptz,
  add column if not exists cancelled_at timestamptz;

alter table public.opportunity_actions
  drop constraint if exists opportunity_actions_priority_check,
  add constraint opportunity_actions_priority_check check (priority in ('low', 'medium', 'high'));

alter table public.opportunity_actions
  drop constraint if exists opportunity_actions_status_check,
  add constraint opportunity_actions_status_check check (status in ('pending', 'done', 'cancelled'));
