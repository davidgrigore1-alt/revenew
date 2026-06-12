-- MoneyHunter AI core schema for Supabase/Postgres.
-- RLS is intentionally not enabled in this first migration so local MVP development
-- can continue with mock data. Add policies when real authentication is connected.

create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key,
  full_name text not null,
  email text not null unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  legal_name text,
  cui text,
  website text,
  industry text,
  city text,
  county text,
  average_contract_value numeric(12, 2),
  current_sales_process text,
  notification_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  unique (business_id, profile_id)
);

create table public.business_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.business_targets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  target_type text not null check (target_type in ('customer', 'city', 'industry')),
  value text not null,
  created_at timestamptz not null default now()
);

create table public.opportunity_sources (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_type text not null check (source_type in ('manual', 'website', 'public_procurement', 'crm', 'invoice', 'external')),
  title text not null,
  url text,
  raw_text text,
  detected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_id uuid references public.opportunity_sources(id) on delete set null,
  title text not null,
  type text not null check (
    type in (
      'public_procurement',
      'b2b_lead',
      'grant',
      'partnership',
      'invoice_followup',
      'contract_renewal',
      'cold_outreach',
      'website_lead',
      'manual'
    )
  ),
  status text not null default 'new' check (
    status in (
      'new',
      'reviewed',
      'action_generated',
      'contacted',
      'follow_up_needed',
      'won',
      'lost',
      'ignored'
    )
  ),
  estimated_value_low numeric(12, 2),
  estimated_value_high numeric(12, 2),
  deadline date,
  city text,
  county text,
  fit_score int check (fit_score between 0 and 100),
  urgency_score int check (urgency_score between 0 and 100),
  money_score int check (money_score between 0 and 100),
  confidence_score int check (confidence_score between 0 and 100),
  summary text,
  relevance jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  recommended_action text,
  raw_source_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunity_actions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'done', 'cancelled')),
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunity_documents (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  document_type text not null check (document_type in ('email', 'call_script', 'offer', 'checklist', 'other')),
  title text not null,
  body text,
  status text not null default 'draft' check (status in ('draft', 'approved', 'sent', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunity_events (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  event_type text not null,
  label text not null,
  description text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.lead_contacts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  company_name text not null,
  industry text,
  city text,
  contact_name text,
  contact_role text,
  email text,
  phone text,
  lead_score int check (lead_score between 0 and 100),
  estimated_budget numeric(12, 2),
  need_signal text,
  recommended_angle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.outreach_sequences (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  name text not null,
  target text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.outreach_sequences(id) on delete cascade,
  lead_contact_id uuid references public.lead_contacts(id) on delete set null,
  subject text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sent', 'replied', 'failed')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  opportunities_found int not null default 0,
  estimated_pipeline_value numeric(12, 2) not null default 0,
  actions_completed int not null default 0,
  summary text,
  recommended_focus text,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  plan text not null default 'demo' check (plan in ('demo', 'starter', 'growth', 'agency', 'enterprise')),
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'cancelled')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_business_members_business on public.business_members(business_id);
create index idx_business_services_business on public.business_services(business_id);
create index idx_business_targets_business_type on public.business_targets(business_id, target_type);
create index idx_opportunities_business_status on public.opportunities(business_id, status);
create index idx_opportunities_business_type on public.opportunities(business_id, type);
create index idx_opportunities_deadline on public.opportunities(deadline);
create index idx_opportunity_actions_due on public.opportunity_actions(due_at, status);
create index idx_lead_contacts_business_score on public.lead_contacts(business_id, lead_score desc);
create index idx_outreach_sequences_business_status on public.outreach_sequences(business_id, status);
create index idx_weekly_reports_business_week on public.weekly_reports(business_id, week_start desc);
create index idx_audit_logs_business_created on public.audit_logs(business_id, created_at desc);

comment on table public.opportunities is 'Revenue opportunities detected or created for a business.';
comment on table public.opportunity_documents is 'Generated or manually drafted assets such as emails, scripts, offers, and checklists.';
comment on table public.audit_logs is 'Operational audit trail for sensitive actions and future admin review.';
