-- Phase 5: AI metadata for opportunity analysis and generated documents.
-- Safe additive migration: no table drops, no data deletion.

alter table public.opportunities
  add column if not exists source_url text,
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists ai_summary text,
  add column if not exists why_relevant text,
  add column if not exists analysis_mode text not null default 'local_fallback';

alter table public.opportunities
  drop constraint if exists opportunities_analysis_mode_check,
  add constraint opportunities_analysis_mode_check check (analysis_mode in ('ai', 'local_fallback'));

alter table public.opportunity_documents
  add column if not exists generation_mode text not null default 'local_fallback';

alter table public.opportunity_documents
  drop constraint if exists opportunity_documents_generation_mode_check,
  add constraint opportunity_documents_generation_mode_check check (generation_mode in ('ai', 'local_fallback'));
