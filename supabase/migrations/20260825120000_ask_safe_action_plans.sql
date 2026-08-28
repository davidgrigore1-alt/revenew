create table if not exists public.ask_action_plans (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  action_type text not null check (action_type in ('create_task','update_next_action','assign_owner','add_note','prepare_email','update_opportunity_field')),
  risk_level text not null check (risk_level in ('low','review','external')),
  target_type text not null check (target_type in ('opportunity','organization','contact','email','meeting')),
  target_id uuid not null,
  target_label text not null check (char_length(target_label) between 1 and 180),
  status text not null default 'prepared' check (status in ('prepared','approved','executing','executed','rejected','expired','failed')),
  proposal jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  expected_target_updated_at timestamptz,
  idempotency_key uuid not null default gen_random_uuid(),
  approved_at timestamptz,
  approved_by_profile_id uuid references public.profiles(id) on delete set null,
  executed_at timestamptz,
  result_entity_type text,
  result_entity_id uuid,
  safe_failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ask_action_plans_idempotency_unique unique (idempotency_key),
  constraint ask_action_plans_proposal_object check (jsonb_typeof(proposal) = 'object'),
  constraint ask_action_plans_evidence_array check (jsonb_typeof(evidence) = 'array'),
  constraint ask_action_plans_approval_consistency check ((approved_at is null) = (approved_by_profile_id is null))
);

create index if not exists ask_action_plans_actor_recent_idx
  on public.ask_action_plans(business_id, created_by_profile_id, created_at desc);

alter table public.ask_action_plans enable row level security;

create policy "ask_action_plans_owner_read" on public.ask_action_plans
  for select to authenticated
  using (public.is_business_member(business_id) and created_by_profile_id = public.current_profile_id());

revoke all on table public.ask_action_plans from anon;
revoke all on table public.ask_action_plans from authenticated;
grant select on table public.ask_action_plans to authenticated;

comment on table public.ask_action_plans is
  'Server-created, human-approved Ask ReveNew action plans. Browser clients cannot insert or mutate plans directly.';
