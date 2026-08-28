alter table public.commercial_workflow_runs
  add column if not exists definition_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists definition_hash text not null default '',
  add column if not exists effect_records jsonb not null default '[]'::jsonb,
  add column if not exists retry_count smallint not null default 0 check (retry_count between 0 and 2),
  add column if not exists recovery_started_at timestamptz;

comment on column public.commercial_workflow_runs.definition_snapshot is
  'Declarative workflow definition evaluated for this run. It contains no source content or credentials.';
comment on column public.commercial_workflow_runs.effect_records is
  'Minimal idempotent effect receipt metadata: kind, deterministic key, status and safe internal identifier only.';
