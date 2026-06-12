-- Phase 8: Commercial Inbox & Signal Intake for MoneyHunter AI.
-- Identity flow:
-- auth.users.id -> profiles.user_id
-- profiles.id -> businesses.owner_profile_id
-- business_members.profile_id -> profiles.id

create table if not exists public.commercial_signals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source text not null default 'manual' check (
    source in (
      'manual',
      'email',
      'phone',
      'missed_call',
      'website_form',
      'whatsapp',
      'instagram',
      'csv_import',
      'ai_receptionist',
      'referral',
      'other'
    )
  ),
  source_label text,
  status text not null default 'new' check (status in ('new', 'reviewed', 'converted', 'ignored', 'archived')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  contact_name text,
  contact_company text,
  contact_email text,
  contact_phone text,
  contact_role text,
  raw_message text,
  extracted_summary text,
  detected_need text,
  service_interest text,
  location text,
  requested_date timestamptz,
  estimated_value_min numeric,
  estimated_value_max numeric,
  currency text not null default 'EUR',
  urgency_score integer default 50 check (urgency_score between 0 and 100),
  fit_score integer default 50 check (fit_score between 0 and 100),
  confidence_score integer default 50 check (confidence_score between 0 and 100),
  recommended_action text,
  next_step text,
  notes text,
  converted_opportunity_id uuid references public.opportunities(id) on delete set null,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  assigned_to_profile_id uuid references public.profiles(id) on delete set null,
  occurred_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_commercial_signals_business on public.commercial_signals(business_id);
create index if not exists idx_commercial_signals_status on public.commercial_signals(status);
create index if not exists idx_commercial_signals_source on public.commercial_signals(source);
create index if not exists idx_commercial_signals_priority on public.commercial_signals(priority);
create index if not exists idx_commercial_signals_occurred_at on public.commercial_signals(occurred_at desc);
create index if not exists idx_commercial_signals_converted_opportunity on public.commercial_signals(converted_opportunity_id);

create table if not exists public.commercial_signal_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  signal_id uuid not null references public.commercial_signals(id) on delete cascade,
  event_type text not null,
  description text,
  metadata jsonb default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_commercial_signal_events_signal on public.commercial_signal_events(signal_id);
create index if not exists idx_commercial_signal_events_business on public.commercial_signal_events(business_id);
create index if not exists idx_commercial_signal_events_created_at on public.commercial_signal_events(created_at desc);
create index if not exists idx_commercial_signal_events_type on public.commercial_signal_events(event_type);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists commercial_signals_set_updated_at on public.commercial_signals;
create trigger commercial_signals_set_updated_at
before update on public.commercial_signals
for each row
execute function public.set_updated_at();

create or replace function public.commercial_inbox_current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_access_commercial_inbox_business(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = target_business_id
      and b.owner_profile_id = public.commercial_inbox_current_profile_id()
  )
  or exists (
    select 1
    from public.business_members bm
    where bm.business_id = target_business_id
      and bm.profile_id = public.commercial_inbox_current_profile_id()
  );
$$;

alter table public.commercial_signals enable row level security;
alter table public.commercial_signal_events enable row level security;

drop policy if exists "commercial_signals_select_accessible_business" on public.commercial_signals;
drop policy if exists "commercial_signals_insert_accessible_business" on public.commercial_signals;
drop policy if exists "commercial_signals_update_accessible_business" on public.commercial_signals;

create policy "commercial_signals_select_accessible_business" on public.commercial_signals
  for select using (public.can_access_commercial_inbox_business(business_id));

create policy "commercial_signals_insert_accessible_business" on public.commercial_signals
  for insert with check (public.can_access_commercial_inbox_business(business_id));

create policy "commercial_signals_update_accessible_business" on public.commercial_signals
  for update using (public.can_access_commercial_inbox_business(business_id))
  with check (public.can_access_commercial_inbox_business(business_id));

drop policy if exists "commercial_signal_events_select_accessible_business" on public.commercial_signal_events;
drop policy if exists "commercial_signal_events_insert_accessible_business" on public.commercial_signal_events;

create policy "commercial_signal_events_select_accessible_business" on public.commercial_signal_events
  for select using (public.can_access_commercial_inbox_business(business_id));

create policy "commercial_signal_events_insert_accessible_business" on public.commercial_signal_events
  for insert with check (public.can_access_commercial_inbox_business(business_id));
