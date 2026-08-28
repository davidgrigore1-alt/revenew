-- G3C: append-only impact assertions over existing opportunities/actions/events.
-- No outcome backfill, historical rewrite, autonomous action, FX or accounting ledger.
begin;
create table public.commercial_impact_cases (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 opportunity_id uuid not null references public.opportunities(id) on delete restrict,
 company_id uuid,
 title text not null,
 actor_profile_id uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now(),
 detected_amount numeric(12,2) check(detected_amount>=0),
 currency text check(currency ~ '^[A-Z]{3}$'),
 before_state jsonb not null,
 unique(business_id,opportunity_id),
 unique(id,business_id,opportunity_id)
);
create table public.commercial_impact_events (
 id uuid primary key default gen_random_uuid(),
 case_id uuid not null,
 business_id uuid not null,
 opportunity_id uuid not null,
 revision integer not null check(revision>=0),
 request_id uuid not null,
 kind text not null check(kind in ('detected','reviewed','action_prepared','action_confirmed','outcome_observed','protected','verified_recovered','invalidated','dismissed')),
 actor_profile_id uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now(),
 amount numeric(12,2) check(amount>=0),
 currency text check(currency ~ '^[A-Z]{3}$'),
 outcome_key text,
 reference_type text,
 reference_id uuid,
 after_state jsonb not null default '{}'::jsonb,
 evidence jsonb not null default '[]'::jsonb check(jsonb_typeof(evidence)='array'),
 note text not null default '' check(length(note)<=1000),
 supersedes_id uuid references public.commercial_impact_events(id) on delete restrict,
 foreign key(case_id,business_id,opportunity_id) references public.commercial_impact_cases(id,business_id,opportunity_id) on delete restrict,
 unique(case_id,revision), unique(business_id,request_id)
);
create index commercial_impact_cases_scope on public.commercial_impact_cases(business_id,created_at desc,id);
create index commercial_impact_events_scope on public.commercial_impact_events(business_id,case_id,revision desc);
-- Single lifetime outcome per opportunity matches the existing one-outcome contract.
-- Re-verification after invalidation is a new assertion in this SAME case, never a new monetary case.
create unique index commercial_impact_reference_once on public.commercial_impact_events(case_id,kind,reference_id)
 where kind in ('action_prepared','action_confirmed');
alter table public.commercial_impact_cases enable row level security;
alter table public.commercial_impact_events enable row level security;
create policy impact_cases_read on public.commercial_impact_cases for select to authenticated using (
 public.can_access_business(business_id) and exists(
  select 1 from public.opportunities o where o.id=opportunity_id and o.business_id=commercial_impact_cases.business_id
   and (o.owner_profile_id=public.current_profile_id() or public.has_business_capability(o.business_id,'revenue.confirm'))
 )
);
create policy impact_events_read on public.commercial_impact_events for select to authenticated using (
 exists(select 1 from public.commercial_impact_cases c where c.id=case_id and c.business_id=commercial_impact_events.business_id)
);
revoke all on public.commercial_impact_cases,public.commercial_impact_events from public,anon,authenticated,service_role;
grant select on public.commercial_impact_cases,public.commercial_impact_events to authenticated;
grant select,insert on public.commercial_impact_cases,public.commercial_impact_events to service_role;

create function public.impact_history_immutable() returns trigger language plpgsql
set search_path=pg_catalog,public as $$ begin raise exception 'impact history is append-only'; end $$;
create trigger impact_cases_immutable before update or delete on public.commercial_impact_cases
 for each row execute function public.impact_history_immutable();
create trigger impact_events_immutable before update or delete on public.commercial_impact_events
 for each row execute function public.impact_history_immutable();
revoke all on function public.impact_history_immutable() from public,anon,authenticated;

-- Server-only RPC: actor comes from the authenticated server session, never form data.
-- SECURITY INVOKER; live membership/ownership is rechecked inside the transaction.
create function public.record_commercial_impact(
 p_business uuid,p_actor uuid,p_opportunity uuid,p_kind text,p_request uuid,
 p_revision integer default -1,p_reference uuid default null,p_note text default '',p_confirm boolean default false
) returns uuid language plpgsql security invoker set search_path=pg_catalog,public as $$
declare
 o public.opportunities%rowtype; c public.commercial_impact_cases%rowtype;
 e public.opportunity_events%rowtype; d public.opportunity_documents%rowtype;
 previous public.commercial_impact_events%rowtype;
 plan_row public.ask_action_plans%rowtype; run_row public.commercial_workflow_runs%rowtype;
 last_assertion public.commercial_impact_events%rowtype;
 result uuid; role_name text; revision_now integer; ref_type text; evidence_value jsonb;
 current_state jsonb; missing_owner boolean; missing_next boolean; overdue boolean;
 resolved boolean; amount_value numeric; currency_value text; outcome text; superseded uuid;
begin
 if p_kind is null or p_kind not in ('detected','reviewed','action_prepared','action_confirmed','outcome_observed','protected','verified_recovered','invalidated','dismissed')
  or p_request is null or p_revision is null or p_note is null or length(p_note)>1000
  or (p_reference is not null and p_kind not in ('action_prepared','action_confirmed')) then raise exception 'invalid impact request'; end if;
 -- Serialize the whole opportunity, including duplicate signals and correction races.
 perform pg_advisory_xact_lock(hashtextextended(p_business::text||':'||p_opportunity::text,731));
 select * into o from public.opportunities where id=p_opportunity and business_id=p_business for share;
 if not found then raise exception 'impact scope forbidden'; end if;
 select case when b.owner_profile_id=p_actor then 'owner' else bm.role end into role_name
 from public.businesses b left join public.business_members bm on bm.business_id=b.id and bm.profile_id=p_actor and bm.status='active'
 where b.id=p_business;
 if role_name is null or role_name not in ('owner','admin','manager','member') or
 (role_name='member' and o.owner_profile_id is distinct from p_actor) then raise exception 'impact actor forbidden'; end if;
 if p_kind in ('protected','verified_recovered','invalidated','dismissed') and role_name not in ('owner','admin','manager') then
  raise exception 'impact verification forbidden';
 end if;
 select * into previous from public.commercial_impact_events where business_id=p_business and request_id=p_request;
 if found then
  if previous.opportunity_id<>p_opportunity or previous.kind<>p_kind or previous.reference_id is distinct from (case when p_kind in ('outcome_observed','verified_recovered') then p_opportunity else p_reference end)
   or previous.note<>p_note then raise exception 'impact idempotency conflict'; end if;
  return previous.id;
 end if;
 select * into c from public.commercial_impact_cases where business_id=p_business and opportunity_id=p_opportunity;
 missing_owner:=o.owner_profile_id is null;
 missing_next:=not exists(select 1 from public.opportunity_actions a where a.business_id=p_business and a.opportunity_id=p_opportunity and a.status='pending' and a.due_at>=now());
 overdue:=exists(select 1 from public.opportunity_actions a where a.business_id=p_business and a.opportunity_id=p_opportunity and a.status='pending' and a.due_at<now());
 current_state:=jsonb_build_object('status',o.status,'ownerId',o.owner_profile_id,'missingOwner',missing_owner,'missingNext',missing_next,'overdue',overdue);
 evidence_value:=jsonb_build_array(jsonb_build_object('sourceType','opportunity','sourceId',o.id,'title',o.title,'occurredAt',o.updated_at,'entityHref','/opportunities/'||o.id,'visibility','metadata'));
 if c.id is null then
  if p_kind<>'detected' or o.lifecycle_status<>'open' or not(missing_owner or missing_next or overdue) then raise exception 'grounded open risk required'; end if;
  insert into public.commercial_impact_cases(business_id,opportunity_id,company_id,title,actor_profile_id,detected_amount,currency,before_state)
   values(p_business,o.id,o.organization_id,o.title,p_actor,o.estimated_value_high,o.currency,current_state) returning * into c;
 elsif p_kind='detected' then
  select id into result from public.commercial_impact_events where case_id=c.id and kind='detected'; return result;
 end if;
 select coalesce(max(revision),-1) into revision_now from public.commercial_impact_events where case_id=c.id;
 if p_revision<>revision_now then raise exception 'impact revision changed'; end if;
 select * into last_assertion from public.commercial_impact_events where case_id=c.id and kind in ('verified_recovered','protected','invalidated','dismissed') order by revision desc limit 1;
 if last_assertion.kind='dismissed' and p_kind<>'invalidated' then raise exception 'dismissed impact requires invalidation'; end if;
 if p_kind in ('protected','verified_recovered') then
  if p_confirm is not true or length(trim(p_note))<20 then raise exception 'explicit human attribution required'; end if;
  if not exists(select 1 from public.commercial_impact_events where case_id=c.id and kind='action_confirmed') then raise exception 'confirmed intervention required'; end if;
 end if;
 if p_kind in ('action_prepared','action_confirmed') and p_reference is not null then
  select * into plan_row from public.ask_action_plans where id=p_reference and business_id=p_business and target_id=o.id and target_type='opportunity' and created_by_profile_id=p_actor;
 end if;
 if plan_row.id is not null then
  if plan_row.created_at<c.created_at or plan_row.status not in ('prepared','approved','executed') then raise exception 'usable plan required'; end if;
  if p_kind='action_confirmed' and (plan_row.status<>'executed' or plan_row.approved_by_profile_id is null or plan_row.executed_at is null
   or plan_row.executed_at>now() or plan_row.result_entity_id is null or plan_row.action_type not in ('create_task','update_next_action','assign_owner','update_opportunity_field'))
   then raise exception 'executed human approved intervention required'; end if;
  ref_type:='action_plan';
  select * into run_row from public.commercial_workflow_runs where business_id=p_business and target_id=o.id and plan_row.id=any(prepared_action_plan_ids) and not is_test_run order by id limit 1;
  current_state:=current_state||jsonb_build_object('confirmedActionAt',case when p_kind='action_confirmed' then plan_row.executed_at else null end,
   'provenance',jsonb_strip_nulls(jsonb_build_object('actionPlanId',plan_row.id,'approvalActorId',plan_row.approved_by_profile_id,'actionId',plan_row.result_entity_id,'workflowRunId',run_row.id,'workflowId',run_row.workflow_id)));
  evidence_value:=evidence_value||jsonb_build_array(jsonb_build_object('sourceType','action','sourceId',plan_row.id,'title',case when p_kind='action_confirmed' then 'Plan executat după aprobare umană' else 'Plan pregătit, neexecutat' end,'occurredAt',coalesce(plan_row.executed_at,plan_row.created_at),'entityHref','/opportunities/'||o.id||'?tab=context','visibility','metadata'));
 elsif p_kind='action_prepared' then
  select * into d from public.opportunity_documents where id=p_reference and business_id=p_business and opportunity_id=o.id and status<>'archived';
  if not found or d.created_at<c.created_at then raise exception 'prepared work required'; end if;
  ref_type:='document';
  evidence_value:=evidence_value||jsonb_build_array(jsonb_build_object('sourceType','document','sourceId',d.id,'title','Lucru pregătit în ReveNew','occurredAt',d.created_at,'entityHref','/opportunities/'||o.id||'?tab=workflow','visibility','metadata'));
 elsif p_kind='action_confirmed' then
  select * into e from public.opportunity_events where id=p_reference and business_id=p_business and opportunity_id=o.id;
  if not found or e.actor_profile_id is null or e.occurred_at<c.created_at or e.occurred_at>now() or
    e.event_type not in ('commercial_details_changed','next_action_created','next_action_completed','stage_changed','email_sent')
    then raise exception 'confirmed audit intervention required'; end if;
  if e.event_type='commercial_details_changed' and
   (e.metadata->>'owner_profile_id' is null or e.metadata->>'owner_profile_id' is not distinct from e.metadata->>'previous_owner_profile_id')
   then raise exception 'owner intervention not confirmed'; end if;
  ref_type:='event';
  current_state:=current_state||jsonb_build_object('confirmedActionAt',e.occurred_at);
  evidence_value:=evidence_value||jsonb_build_array(jsonb_build_object('sourceType','event','sourceId',e.id,'title',e.label,'occurredAt',e.occurred_at,'entityHref','/opportunities/'||o.id||'?tab=context','visibility','metadata'));
 elsif p_kind in ('outcome_observed','verified_recovered') then
  if o.lifecycle_status<>'won' or o.actual_outcome_amount is null or o.outcome_recorded_at is null or o.outcome_recorded_at>now() or o.outcome_recorded_by_profile_id is null or o.outcome_date is null or o.outcome_date<c.created_at::date or o.outcome_date>current_date then
   raise exception 'canonical won outcome required';
  end if;
  if not exists(select 1 from public.commercial_impact_events i
   where i.case_id=c.id and i.kind='action_confirmed' and (i.after_state->>'confirmedActionAt')::timestamptz<=o.outcome_recorded_at
    and (i.after_state->>'confirmedActionAt')::timestamptz::date<=o.outcome_date)
   then raise exception 'outcome must follow confirmed intervention'; end if;
  amount_value:=o.actual_outcome_amount;currency_value:=o.currency;outcome:=o.id::text||':won';
  ref_type:='outcome';p_reference:=o.id;
  evidence_value:=evidence_value||jsonb_build_array(jsonb_build_object('sourceType','outcome','sourceId',o.id,'title','Rezultat câștigat confirmat în CRM','occurredAt',o.outcome_recorded_at,'entityHref','/opportunities/'||o.id||'?tab=responsibility','visibility','metadata'));
  current_state:=current_state||jsonb_build_object('outcomeAt',o.outcome_recorded_at,'outcomeDate',o.outcome_date,'outcomeActorId',o.outcome_recorded_by_profile_id);
  if p_kind='verified_recovered' and last_assertion.kind='verified_recovered' then raise exception 'outcome already verified; invalidate before correction'; end if;
 elsif p_kind='protected' then
  resolved:= (coalesce((c.before_state->>'missingOwner')::boolean,false) and not missing_owner) or
   (coalesce((c.before_state->>'missingNext')::boolean,false) and not missing_next) or
   (coalesce((c.before_state->>'overdue')::boolean,false) and not overdue);
  if not resolved or o.lifecycle_status in ('lost','disqualified','archived') then raise exception 'grounded resolution required'; end if;
  if last_assertion.kind in ('protected','verified_recovered') then raise exception 'impact already asserted'; end if;
  amount_value:=c.detected_amount;currency_value:=c.currency;
 elsif p_kind in ('invalidated','dismissed') then
  if p_confirm is not true or length(trim(p_note))<20 then raise exception 'correction reason required'; end if;
 end if;
 if p_kind in ('invalidated','verified_recovered','protected') then
  select id into superseded from public.commercial_impact_events where case_id=c.id and kind in ('verified_recovered','protected','invalidated','dismissed') order by revision desc limit 1;
 end if;
 insert into public.commercial_impact_events(case_id,business_id,opportunity_id,revision,request_id,kind,actor_profile_id,amount,currency,outcome_key,reference_type,reference_id,after_state,evidence,note,supersedes_id)
 values(c.id,p_business,o.id,revision_now+1,p_request,p_kind,p_actor,amount_value,currency_value,outcome,ref_type,p_reference,current_state,evidence_value,p_note,superseded)
 returning id into result;
 return result;
end $$;
revoke all on function public.record_commercial_impact(uuid,uuid,uuid,text,uuid,integer,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.record_commercial_impact(uuid,uuid,uuid,text,uuid,integer,uuid,text,boolean) to service_role;
-- Existing source tables are read, never modified, by the server-only transaction.
grant select on public.opportunities,public.opportunity_actions,public.opportunity_events,public.opportunity_documents,public.businesses,public.business_members,public.ask_action_plans,public.commercial_workflow_runs to service_role;
grant update on public.opportunities to service_role; -- Required for the row share lock; no mutation in this RPC.
comment on table public.commercial_impact_events is 'Human reviewed impact assertions. Correlation is not causal proof. Corrections append; no financial ledger or FX.';
commit;
