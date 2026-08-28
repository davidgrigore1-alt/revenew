create table public.commercial_workflows (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  status text not null default 'draft' check (status in ('draft','active','paused','archived')),
  trigger_type text not null check (trigger_type in ('opportunity_created','stage_changed','next_action_overdue','email_received','reply_received','meeting_upcoming','approval_completed','scheduled_review')),
  conditions jsonb not null default '[]'::jsonb check (jsonb_typeof(conditions) = 'array' and jsonb_array_length(conditions) <= 8),
  actions jsonb not null default '[]'::jsonb check (jsonb_typeof(actions) = 'array' and jsonb_array_length(actions) between 1 and 6),
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  activated_at timestamptz,
  paused_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index commercial_workflows_trigger_idx
  on public.commercial_workflows(business_id, status, trigger_type);

create table public.commercial_workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.commercial_workflows(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  triggered_by_profile_id uuid references public.profiles(id) on delete set null,
  trigger_type text not null check (trigger_type in ('opportunity_created','stage_changed','next_action_overdue','email_received','reply_received','meeting_upcoming','approval_completed','scheduled_review')),
  event_key text not null check (char_length(event_key) between 1 and 180),
  target_type text not null default 'opportunity' check (target_type = 'opportunity'),
  target_id uuid not null references public.opportunities(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','evaluating','blocked','prepared','completed','failed','cancelled')),
  condition_results jsonb not null default '[]'::jsonb check (jsonb_typeof(condition_results) = 'array'),
  commercial_state text,
  guard_decision text check (guard_decision is null or guard_decision in ('proceed','waiting','stop','blocked','conditions_not_met')),
  guard_reason text,
  prepared_action_plan_ids uuid[] not null default '{}'::uuid[],
  human_approval_required boolean not null default false,
  is_test_run boolean not null default false,
  attempt_count smallint not null default 1 check (attempt_count between 1 and 3),
  failure_category text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_workflow_runs_event_unique unique (workflow_id, event_key, target_id)
);

create index commercial_workflow_runs_history_idx
  on public.commercial_workflow_runs(business_id, created_at desc);
create index commercial_workflow_runs_target_idx
  on public.commercial_workflow_runs(business_id, target_id, created_at desc);

create function public.validate_commercial_workflow_run_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.commercial_workflows workflow
    where workflow.id = new.workflow_id and workflow.business_id = new.business_id
  ) then
    raise exception 'workflow run scope mismatch' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.opportunities opportunity
    where opportunity.id = new.target_id and opportunity.business_id = new.business_id
  ) then
    raise exception 'workflow target scope mismatch' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_commercial_workflow_run_scope() from public, anon, authenticated;
create trigger commercial_workflow_runs_validate_scope
  before insert or update on public.commercial_workflow_runs
  for each row execute function public.validate_commercial_workflow_run_scope();

alter table public.commercial_workflows enable row level security;
alter table public.commercial_workflow_runs enable row level security;

create policy "commercial_workflows_member_read" on public.commercial_workflows
  for select to authenticated
  using (public.is_business_member(business_id) or public.is_business_owner(business_id));
create policy "commercial_workflow_runs_member_read" on public.commercial_workflow_runs
  for select to authenticated
  using (public.is_business_member(business_id) or public.is_business_owner(business_id));

revoke all on table public.commercial_workflows from public, anon, authenticated;
revoke all on table public.commercial_workflow_runs from public, anon, authenticated;
grant select on table public.commercial_workflows to authenticated;
grant select on table public.commercial_workflow_runs to authenticated;

comment on table public.commercial_workflows is
  'Bounded commercial workflow definitions. Browser clients may inspect authorized rows but runtime mutations remain server controlled.';
comment on table public.commercial_workflow_runs is
  'Idempotent, explainable workflow evaluations. Runs prepare internal work and never autonomously send external communication.';