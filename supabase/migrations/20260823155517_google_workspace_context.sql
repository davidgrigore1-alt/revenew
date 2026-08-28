-- Google Workspace read-context connector.
-- Provider credentials and normalized private context are server-only. RLS is
-- retained as defense in depth, while Data API roles receive no table grants.
begin;

create table public.external_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('google_workspace')),
  external_account_id text not null,
  external_email text not null,
  granted_scopes text[] not null default '{}',
  status text not null default 'connected' check (status in ('connected', 'syncing', 'action_required', 'error', 'disconnected')),
  gmail_status text not null default 'not_connected' check (gmail_status in ('not_connected', 'connected', 'syncing', 'action_required', 'error')),
  calendar_status text not null default 'not_connected' check (calendar_status in ('not_connected', 'connected', 'syncing', 'action_required', 'error')),
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz,
  current_sync_started_at timestamptz,
  last_successful_sync_at timestamptz,
  last_sync_error text,
  gmail_last_sync_at timestamptz,
  gmail_last_error text,
  calendar_last_sync_at timestamptz,
  calendar_last_error text,
  gmail_history_id text,
  calendar_sync_token text,
  encrypted_refresh_credential text,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_connections_email_check check (external_email = lower(trim(external_email)) and external_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint external_connections_account_key unique (business_id, owner_profile_id, provider, external_account_id)
);

create table public.external_email_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  connection_id uuid not null references public.external_connections(id) on delete cascade,
  provider_message_id text not null,
  provider_thread_id text not null,
  sent_at timestamptz not null,
  sender_email text,
  sender_name text,
  recipients jsonb not null default '[]'::jsonb check (jsonb_typeof(recipients) = 'array'),
  cc_recipients jsonb not null default '[]'::jsonb check (jsonb_typeof(cc_recipients) = 'array'),
  subject text,
  normalized_text text,
  excerpt text,
  direction text not null check (direction in ('inbound', 'outbound')),
  provider_labels text[] not null default '{}',
  linked_contact_id uuid references public.crm_contacts(id) on delete set null,
  linked_organization_id uuid references public.crm_organizations(id) on delete set null,
  linked_opportunity_id uuid references public.opportunities(id) on delete set null,
  provider_updated_at timestamptz,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_email_messages_provider_key unique (connection_id, provider_message_id)
);

create table public.external_calendar_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  connection_id uuid not null references public.external_connections(id) on delete cascade,
  provider_event_id text not null,
  provider_calendar_id text not null default 'primary',
  title text,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at >= starts_at),
  time_zone text,
  participants jsonb not null default '[]'::jsonb check (jsonb_typeof(participants) = 'array'),
  organizer jsonb,
  normalized_description text,
  event_status text not null check (event_status in ('confirmed', 'tentative', 'cancelled')),
  visibility text not null default 'default' check (visibility in ('default', 'public', 'private', 'confidential', 'limited')),
  conference_url text,
  provider_created_at timestamptz,
  provider_updated_at timestamptz,
  linked_contact_id uuid references public.crm_contacts(id) on delete set null,
  linked_organization_id uuid references public.crm_organizations(id) on delete set null,
  linked_opportunity_id uuid references public.opportunities(id) on delete set null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_calendar_events_provider_key unique (connection_id, provider_calendar_id, provider_event_id)
);

create table public.external_sync_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  connection_id uuid not null references public.external_connections(id) on delete cascade,
  source text not null check (source in ('google_workspace', 'gmail', 'calendar')),
  mode text not null check (mode in ('initial', 'incremental', 'bounded_recovery', 'manual')),
  status text not null check (status in ('running', 'completed', 'partial', 'failed')),
  processed_count integer not null default 0,
  deleted_count integer not null default 0,
  safe_error_code text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint external_sync_runs_counts_check check (processed_count >= 0 and deleted_count >= 0)
);

create index external_connections_owner_idx on public.external_connections(owner_profile_id, business_id, provider, status);
create index external_email_messages_owner_recent_idx on public.external_email_messages(owner_profile_id, business_id, sent_at desc);
create index external_email_messages_org_recent_idx on public.external_email_messages(owner_profile_id, business_id, linked_organization_id, sent_at desc);
create index external_email_messages_opportunity_recent_idx on public.external_email_messages(owner_profile_id, business_id, linked_opportunity_id, sent_at desc);
create index external_calendar_events_owner_time_idx on public.external_calendar_events(owner_profile_id, business_id, starts_at);
create index external_calendar_events_org_time_idx on public.external_calendar_events(owner_profile_id, business_id, linked_organization_id, starts_at);
create index external_calendar_events_opportunity_time_idx on public.external_calendar_events(owner_profile_id, business_id, linked_opportunity_id, starts_at);
create index external_sync_runs_owner_recent_idx on public.external_sync_runs(owner_profile_id, business_id, started_at desc);

create or replace function public.validate_external_context_owner()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if not exists (
    select 1 from public.businesses business
    left join public.business_members member on member.business_id = business.id
      and member.profile_id = new.owner_profile_id and member.status = 'active'
    where business.id = new.business_id
      and (business.owner_profile_id = new.owner_profile_id or member.profile_id is not null)
  ) then
    raise exception 'external context owner must belong to the business' using errcode = '42501';
  end if;
  if tg_table_name <> 'external_connections' and not exists (
    select 1 from public.external_connections connection
    where connection.id = new.connection_id and connection.business_id = new.business_id
      and connection.owner_profile_id = new.owner_profile_id
  ) then
    raise exception 'external context connection scope mismatch' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_external_context_owner() from public, anon, authenticated;

create trigger external_connections_validate_owner before insert or update of business_id, owner_profile_id on public.external_connections for each row execute function public.validate_external_context_owner();
create trigger external_email_messages_validate_owner before insert or update of business_id, owner_profile_id, connection_id on public.external_email_messages for each row execute function public.validate_external_context_owner();
create trigger external_calendar_events_validate_owner before insert or update of business_id, owner_profile_id, connection_id on public.external_calendar_events for each row execute function public.validate_external_context_owner();
create trigger external_sync_runs_validate_owner before insert or update of business_id, owner_profile_id, connection_id on public.external_sync_runs for each row execute function public.validate_external_context_owner();

create or replace function public.touch_external_context_updated_at()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.touch_external_context_updated_at() from public, anon, authenticated;
create trigger external_connections_touch_updated_at before update on public.external_connections for each row execute function public.touch_external_context_updated_at();
create trigger external_email_messages_touch_updated_at before update on public.external_email_messages for each row execute function public.touch_external_context_updated_at();
create trigger external_calendar_events_touch_updated_at before update on public.external_calendar_events for each row execute function public.touch_external_context_updated_at();

alter table public.external_connections enable row level security;
alter table public.external_email_messages enable row level security;
alter table public.external_calendar_events enable row level security;
alter table public.external_sync_runs enable row level security;

create policy external_connections_owner_select on public.external_connections for select to authenticated
using (public.can_access_business(business_id) and owner_profile_id = public.current_profile_id());
create policy external_email_messages_owner_select on public.external_email_messages for select to authenticated
using (public.can_access_business(business_id) and owner_profile_id = public.current_profile_id());
create policy external_calendar_events_owner_select on public.external_calendar_events for select to authenticated
using (public.can_access_business(business_id) and owner_profile_id = public.current_profile_id());
create policy external_sync_runs_owner_select on public.external_sync_runs for select to authenticated
using (public.can_access_business(business_id) and owner_profile_id = public.current_profile_id());

revoke all on table public.external_connections from public, anon, authenticated;
revoke all on table public.external_email_messages from public, anon, authenticated;
revoke all on table public.external_calendar_events from public, anon, authenticated;
revoke all on table public.external_sync_runs from public, anon, authenticated;
-- Reviewed backend-only privileges: this role bypasses RLS but still requires PostgreSQL ACLs.
-- Browser roles remain fully revoked and provider credentials are never exposed through Data API grants.
grant select, insert, update, delete on table public.external_connections to service_role;
grant select, insert, update, delete on table public.external_email_messages to service_role;
grant select, insert, update, delete on table public.external_calendar_events to service_role;
grant select, insert, update, delete on table public.external_sync_runs to service_role;

comment on column public.external_connections.encrypted_refresh_credential is 'AES-256-GCM envelope encrypted server-side; never returned to browser clients.';
comment on table public.external_email_messages is 'Minimized Gmail read context owned privately by the authorizing profile; no attachments or raw transport payloads.';
comment on table public.external_calendar_events is 'Minimized Google Calendar read context owned privately by the authorizing profile.';
comment on table public.external_sync_runs is 'Safe operational sync metadata only; provider payloads, bodies and credentials are never logged here.';

commit;
