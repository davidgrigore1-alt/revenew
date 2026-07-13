-- Phase 2: activation, private views, auditable CSV imports and bounded search support.
-- Additive only. All workspace ownership is derived from profiles/business membership.

create extension if not exists pg_trgm with schema extensions;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'businesses' and column_name = 'owner_id'
  ) then
    raise exception 'Forbidden legacy column public.businesses.owner_id exists';
  end if;
end
$$;

create or replace function public.phase2_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.onboarding_drafts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  current_step integer not null default 0 check (current_step between 0 and 4),
  entry_mode text not null default 'manual' check (entry_mode in ('manual', 'import')),
  draft jsonb not null default '{}'::jsonb check (jsonb_typeof(draft) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  target_page text not null check (target_page in ('opportunities', 'pipeline', 'companies', 'contacts', 'activities')),
  filter_state jsonb not null default '{}'::jsonb check (jsonb_typeof(filter_state) = 'object'),
  sort_state jsonb not null default '{}'::jsonb check (jsonb_typeof(sort_state) = 'object'),
  display_state jsonb not null default '{}'::jsonb check (jsonb_typeof(display_state) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, profile_id, target_page, name)
);

create table public.data_import_batches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  entity_type text not null check (entity_type in ('organizations', 'contacts', 'opportunities')),
  source_fingerprint text not null check (source_fingerprint ~ '^[a-f0-9]{64}$'),
  status text not null default 'processing' check (status in ('processing', 'completed', 'partial', 'failed')),
  total_rows integer not null default 0 check (total_rows between 0 and 1000),
  created_rows integer not null default 0 check (created_rows between 0 and 1000),
  skipped_rows integer not null default 0 check (skipped_rows between 0 and 1000),
  rejected_rows integer not null default 0 check (rejected_rows between 0 and 1000),
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (business_id, profile_id, entity_type, source_fingerprint)
);

create table public.product_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  event_name text not null check (event_name in (
    'onboarding_started', 'workspace_setup_completed', 'first_company_created',
    'first_contact_created', 'first_opportunity_created', 'first_owner_assigned',
    'first_next_action_created', 'first_opportunity_reviewed', 'csv_import_started',
    'csv_import_completed', 'global_search_used', 'saved_view_created'
  )),
  metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 2048
  ),
  created_at timestamptz not null default now()
);

create trigger onboarding_drafts_touch_updated_at before update on public.onboarding_drafts
for each row execute function public.phase2_touch_updated_at();
create trigger saved_views_touch_updated_at before update on public.saved_views
for each row execute function public.phase2_touch_updated_at();
create trigger data_import_batches_touch_updated_at before update on public.data_import_batches
for each row execute function public.phase2_touch_updated_at();

create index saved_views_profile_page_idx on public.saved_views (profile_id, target_page, updated_at desc);
create index data_import_batches_profile_created_idx on public.data_import_batches (profile_id, created_at desc);
create index product_events_user_created_idx on public.product_events (user_id, created_at desc);
create index product_events_business_name_created_idx on public.product_events (business_id, event_name, created_at desc);

create index crm_organizations_name_search_idx on public.crm_organizations using gin (normalized_name extensions.gin_trgm_ops) where is_archived = false;
create index crm_contacts_name_search_idx on public.crm_contacts using gin (normalized_name extensions.gin_trgm_ops) where is_active = true;
create index crm_contacts_email_search_idx on public.crm_contacts using gin (normalized_email extensions.gin_trgm_ops) where is_active = true;
create index opportunities_title_search_idx on public.opportunities using gin (lower(title) extensions.gin_trgm_ops);
create index opportunity_actions_title_search_idx on public.opportunity_actions using gin (lower(title) extensions.gin_trgm_ops);
create index opportunity_documents_title_search_idx on public.opportunity_documents using gin (lower(title) extensions.gin_trgm_ops);

alter table public.onboarding_drafts enable row level security;
alter table public.saved_views enable row level security;
alter table public.data_import_batches enable row level security;
alter table public.product_events enable row level security;

create policy onboarding_drafts_own_all on public.onboarding_drafts
for all to authenticated
using (profile_id = (select public.current_profile_id()))
with check (profile_id = (select public.current_profile_id()));

create policy saved_views_own_read on public.saved_views
for select to authenticated
using (
  profile_id = (select public.current_profile_id())
  and public.can_access_business(business_id)
);
create policy saved_views_own_insert on public.saved_views
for insert to authenticated
with check (
  profile_id = (select public.current_profile_id())
  and public.can_access_business(business_id)
);
create policy saved_views_own_update on public.saved_views
for update to authenticated
using (
  profile_id = (select public.current_profile_id())
  and public.can_access_business(business_id)
)
with check (
  profile_id = (select public.current_profile_id())
  and public.can_access_business(business_id)
);
create policy saved_views_own_delete on public.saved_views
for delete to authenticated
using (
  profile_id = (select public.current_profile_id())
  and public.can_access_business(business_id)
);

create policy data_import_batches_own_read on public.data_import_batches
for select to authenticated
using (
  profile_id = (select public.current_profile_id())
  and public.can_access_business(business_id)
);
create policy data_import_batches_own_insert on public.data_import_batches
for insert to authenticated
with check (
  profile_id = (select public.current_profile_id())
  and public.can_access_business(business_id)
);
create policy data_import_batches_own_update on public.data_import_batches
for update to authenticated
using (
  profile_id = (select public.current_profile_id())
  and public.can_access_business(business_id)
)
with check (
  profile_id = (select public.current_profile_id())
  and public.can_access_business(business_id)
);

create policy product_events_own_insert on public.product_events
for insert to authenticated
with check (
  user_id = auth.uid()
  and (business_id is null or public.can_access_business(business_id))
);
create policy product_events_own_read on public.product_events
for select to authenticated
using (
  user_id = auth.uid()
  and (business_id is null or public.can_access_business(business_id))
);

revoke all on public.onboarding_drafts, public.saved_views, public.data_import_batches, public.product_events from anon;
revoke all on public.onboarding_drafts, public.saved_views, public.data_import_batches, public.product_events from authenticated;
grant select, insert, update, delete on public.onboarding_drafts to authenticated;
grant select, insert, update, delete on public.saved_views to authenticated;
grant select, insert, update on public.data_import_batches to authenticated;
grant select, insert on public.product_events to authenticated;
grant usage, select on sequence public.product_events_id_seq to authenticated;

revoke all on function public.phase2_touch_updated_at() from public, anon, authenticated;
