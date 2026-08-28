create table public.ask_multi_record_result_sets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  query_text text not null check (char_length(query_text) between 2 and 3000),
  filters jsonb not null default '{}'::jsonb,
  sort_spec jsonb not null default '{}'::jsonb,
  records jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'expired')),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  constraint ask_multi_record_filters_object check (jsonb_typeof(filters) = 'object'),
  constraint ask_multi_record_sort_object check (jsonb_typeof(sort_spec) = 'object'),
  constraint ask_multi_record_records_array check (jsonb_typeof(records) = 'array' and jsonb_array_length(records) <= 100)
);

create index ask_multi_record_result_sets_actor_recent_idx
  on public.ask_multi_record_result_sets(business_id, created_by_profile_id, created_at desc);

create index ask_multi_record_result_sets_active_expiry_idx
  on public.ask_multi_record_result_sets(expires_at)
  where status = 'active';

alter table public.ask_multi_record_result_sets enable row level security;

create policy "ask_multi_record_result_sets_owner_read" on public.ask_multi_record_result_sets
  for select to authenticated
  using (public.is_business_member(business_id) and created_by_profile_id = public.current_profile_id());

revoke all on table public.ask_multi_record_result_sets from anon;
revoke all on table public.ask_multi_record_result_sets from authenticated;
grant select on table public.ask_multi_record_result_sets to authenticated;
grant select, insert on table public.ask_multi_record_result_sets to service_role;

comment on table public.ask_multi_record_result_sets is
  'Short-lived, owner-private Ask result sets. Browser clients cannot create or mutate selections.';

alter table public.ask_action_plans drop constraint ask_action_plans_action_type_check;
alter table public.ask_action_plans add constraint ask_action_plans_action_type_check
  check (action_type in ('create_task','update_next_action','assign_owner','add_note','prepare_email','update_opportunity_field','create_notification'));
