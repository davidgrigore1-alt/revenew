-- Existing runs are not certified: old notification writes may lack receipts.
alter table public.commercial_workflow_runs
  add column effects_idempotent boolean not null default false,
  add column evaluation_action_indexes smallint[];

alter table public.communication_notifications
  add column workflow_effect_key uuid;

create unique index communication_notifications_workflow_effect_unique
  on public.communication_notifications(business_id, workflow_effect_key)
  where workflow_effect_key is not null;

-- Preserve normal updates while preventing browser changes to effect identity.
create function public.protect_workflow_notification_identity()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if new.workflow_effect_key is distinct from old.workflow_effect_key
     or (old.workflow_effect_key is not null and
       (new.id is distinct from old.id or new.business_id is distinct from old.business_id)) then
    raise exception 'workflow notification identity is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_workflow_notification_identity() from public, anon, authenticated;
create trigger communication_notifications_protect_workflow_identity
  before update on public.communication_notifications
  for each row execute function public.protect_workflow_notification_identity();

comment on column public.commercial_workflow_runs.effects_idempotent is
  'Server certifies database-idempotent effects. Do not backfill by assuming an old unreceipted notification never happened.';
comment on column public.commercial_workflow_runs.evaluation_action_indexes is
  'Permitted action positions checkpointed before effects. Null means evaluation is not checkpointed. Contains no private source content.';
comment on column public.communication_notifications.workflow_effect_key is
  'Deterministic run/action identity. Null for ordinary notifications. Immutable and unique within the business.';
