-- Minimal, server-owned source facts. Existing event tables remain authoritative.
alter table public.commercial_workflow_runs
  add column source_event jsonb
  check (source_event is null or jsonb_typeof(source_event) = 'object');

comment on column public.commercial_workflow_runs.source_event is
  'Allowlisted source identity, timestamp, origin, actor and stage transition only. Never email bodies, subjects, recipients or external provider payloads.';
