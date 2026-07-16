-- Commercial Response & Outcome Loop V1.
-- Additive, tenant-scoped response persistence and controlled outreach restrictions.

create table if not exists public.commercial_responses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  source_document_id uuid references public.opportunity_documents(id) on delete set null,
  response_category text not null,
  channel text not null,
  response_summary text not null,
  responded_at timestamptz not null,
  next_action_type text,
  next_action_title text,
  next_action_due_at timestamptz,
  milestone text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_responses_category_check check (response_category in (
    'positive_interest', 'meeting_requested', 'information_requested', 'objection',
    'not_now', 'no_response', 'wrong_contact', 'unsubscribe', 'bounced', 'negative', 'other'
  )),
  constraint commercial_responses_channel_check check (channel in ('email', 'phone', 'linkedin', 'whatsapp', 'meeting', 'other')),
  constraint commercial_responses_next_action_check check (
    next_action_type is null or next_action_type in (
      'send_email', 'call_contact', 'prepare_offer', 'prepare_documents',
      'follow_up', 'apply_to_procurement', 'apply_to_grant', 'research_more'
    )
  ),
  constraint commercial_responses_milestone_check check (
    milestone is null or milestone in (
      'response_received', 'meeting_scheduled', 'qualification_completed',
      'proposal_requested', 'proposal_sent', 'negotiation_started'
    )
  ),
  constraint commercial_responses_summary_check check (char_length(btrim(response_summary)) between 3 and 1200),
  constraint commercial_responses_next_action_due_check check (
    (next_action_type is null and next_action_due_at is null)
    or (next_action_type is not null and next_action_due_at is not null)
  )
);

alter table public.opportunities
  add column if not exists outreach_restricted_at timestamptz,
  add column if not exists outreach_restriction_reason text,
  add constraint opportunities_outreach_restriction_reason_check
    check (outreach_restriction_reason is null or outreach_restriction_reason in ('unsubscribe', 'bounced')) not valid;

alter table public.opportunities validate constraint opportunities_outreach_restriction_reason_check;

create or replace function public.set_trusted_commercial_response_context()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  target_business_id uuid;
  trusted_profile_id uuid;
begin
  if tg_op = 'UPDATE' and new.opportunity_id is distinct from old.opportunity_id then
    raise exception 'commercial response cannot be moved between opportunities';
  end if;

  select o.business_id into target_business_id
  from public.opportunities o
  where o.id = new.opportunity_id;

  if target_business_id is null then
    raise exception 'commercial response must reference an existing opportunity';
  end if;

  trusted_profile_id := public.current_profile_id();
  if trusted_profile_id is null or not public.can_access_business(target_business_id) then
    raise exception 'commercial response actor is not authorized for this business';
  end if;

  if new.contact_id is not null and not exists (
    select 1 from public.opportunity_contacts oc
    where oc.opportunity_id = new.opportunity_id
      and oc.business_id = target_business_id
      and oc.contact_id = new.contact_id
  ) then
    raise exception 'commercial response contact must belong to the opportunity and business';
  end if;

  if new.source_document_id is not null and not exists (
    select 1 from public.opportunity_documents od
    where od.id = new.source_document_id
      and od.opportunity_id = new.opportunity_id
      and od.business_id = target_business_id
  ) then
    raise exception 'commercial response document must belong to the opportunity and business';
  end if;

  new.business_id := target_business_id;
  new.recorded_by := trusted_profile_id;
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.set_trusted_commercial_response_context() from public;
revoke all on function public.set_trusted_commercial_response_context() from anon;
revoke all on function public.set_trusted_commercial_response_context() from authenticated;

create trigger trg_commercial_responses_trusted_context
before insert or update on public.commercial_responses
for each row execute function public.set_trusted_commercial_response_context();

create or replace function public.apply_commercial_response_restriction()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.response_category in ('unsubscribe', 'bounced') then
    update public.opportunities
    set outreach_restricted_at = coalesce(outreach_restricted_at, pg_catalog.now()),
        outreach_restriction_reason = coalesce(outreach_restriction_reason, new.response_category)
    where id = new.opportunity_id and business_id = new.business_id;
  end if;
  return new;
end;
$$;

revoke all on function public.apply_commercial_response_restriction() from public;
revoke all on function public.apply_commercial_response_restriction() from anon;
revoke all on function public.apply_commercial_response_restriction() from authenticated;

create trigger trg_commercial_responses_apply_restriction
after insert or update of response_category on public.commercial_responses
for each row execute function public.apply_commercial_response_restriction();

alter table public.commercial_responses enable row level security;

create policy "commercial_responses_select_accessible_business"
on public.commercial_responses for select to authenticated
using (public.can_access_business(business_id));

create policy "commercial_responses_insert_accessible_business"
on public.commercial_responses for insert to authenticated
with check (
  public.can_access_business(business_id)
  and exists (
    select 1 from public.opportunities o
    where o.id = commercial_responses.opportunity_id
      and o.business_id = commercial_responses.business_id
  )
);

create policy "commercial_responses_update_accessible_business"
on public.commercial_responses for update to authenticated
using (public.can_access_business(business_id))
with check (
  public.can_access_business(business_id)
  and exists (
    select 1 from public.opportunities o
    where o.id = commercial_responses.opportunity_id
      and o.business_id = commercial_responses.business_id
  )
);

revoke all on table public.commercial_responses from anon;
grant select, insert, update on table public.commercial_responses to authenticated;
revoke delete on table public.commercial_responses from authenticated;

create index if not exists commercial_responses_business_responded_idx
  on public.commercial_responses(business_id, responded_at desc);
create index if not exists commercial_responses_opportunity_responded_idx
  on public.commercial_responses(opportunity_id, responded_at desc);
create index if not exists commercial_responses_business_category_idx
  on public.commercial_responses(business_id, response_category, responded_at desc);

comment on table public.commercial_responses is
  'Human-recorded commercial responses. No mailbox synchronization or autonomous external action.';
comment on column public.opportunities.outreach_restricted_at is
  'Persistent human-recorded restriction after unsubscribe or bounced-address classification.';
