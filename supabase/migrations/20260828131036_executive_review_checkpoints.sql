-- G3D: personal review cadence only.
-- No snapshots, commercial writes or external effects.

begin;

create table public.executive_review_checkpoints (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  reviewer_profile_id uuid not null references public.profiles(id) on delete restrict,
  scope text not null check (scope in ('business', 'owned')),
  reviewed_through timestamptz not null,
  created_at timestamptz not null default now(),
  request_id uuid not null,

  check (reviewed_through <= created_at),

  unique (business_id, reviewer_profile_id, request_id),
  unique (business_id, reviewer_profile_id, scope, reviewed_through)
);

create index executive_review_latest
  on public.executive_review_checkpoints (
    business_id,
    reviewer_profile_id,
    scope,
    reviewed_through desc
  );

alter table public.executive_review_checkpoints
  enable row level security;

create policy executive_review_own_read
  on public.executive_review_checkpoints
  for select
  to authenticated
  using (
    reviewer_profile_id = public.current_profile_id()
    and public.can_access_business(business_id)
  );

revoke all
  on public.executive_review_checkpoints
  from public, anon, authenticated, service_role;

grant select
  on public.executive_review_checkpoints
  to authenticated;

grant select, insert
  on public.executive_review_checkpoints
  to service_role;


create function public.executive_review_immutable()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'executive review is append-only';
end;
$$;

create trigger executive_review_no_rewrite
before update or delete
on public.executive_review_checkpoints
for each row
execute function public.executive_review_immutable();

revoke all
  on function public.executive_review_immutable()
  from public, anon, authenticated;


-- Caller supplies only actor/business values resolved from
-- the authenticated server context.
create function public.record_executive_review(
  p_business uuid,
  p_actor uuid,
  p_scope text,
  p_through timestamptz,
  p_request uuid
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  role_name text;
  expected_scope text;
  existing public.executive_review_checkpoints%rowtype;
  result uuid;
begin

  select
    case
      when b.owner_profile_id = p_actor then 'owner'
      else bm.role
    end
  into role_name
  from public.businesses b
  left join public.business_members bm
    on bm.business_id = b.id
   and bm.profile_id = p_actor
   and bm.status = 'active'
  where b.id = p_business;

  if role_name is null
     or role_name not in ('owner', 'admin', 'manager', 'member')
  then
    raise exception 'review actor forbidden';
  end if;

  if role_name in ('owner', 'admin', 'manager') then
    expected_scope := 'business';
  else
    expected_scope := 'owned';
  end if;

  if p_scope is null or p_scope <> expected_scope then
    raise exception 'review scope forbidden';
  end if;

  if p_through is null
     or p_through > now()
     or p_request is null
  then
    raise exception 'invalid review cutoff';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_business::text || ':' || p_actor::text,
      734
    )
  );

  select *
  into existing
  from public.executive_review_checkpoints
  where business_id = p_business
    and reviewer_profile_id = p_actor
    and request_id = p_request;

  if found then
    if existing.scope <> p_scope
       or existing.reviewed_through <> p_through
    then
      raise exception 'review replay mismatch';
    end if;

    return existing.id;
  end if;

  if p_through < now() - interval '30 minutes' then
    raise exception 'review expired';
  end if;

  insert into public.executive_review_checkpoints (
    business_id,
    reviewer_profile_id,
    scope,
    reviewed_through,
    request_id
  )
  values (
    p_business,
    p_actor,
    p_scope,
    p_through,
    p_request
  )
  on conflict (
    business_id,
    reviewer_profile_id,
    scope,
    reviewed_through
  )
  do nothing
  returning id into result;

  if result is null then
    select id
    into result
    from public.executive_review_checkpoints
    where business_id = p_business
      and reviewer_profile_id = p_actor
      and scope = p_scope
      and reviewed_through = p_through;
  end if;

  return result;
end;
$$;

revoke all
  on function public.record_executive_review(
    uuid,
    uuid,
    text,
    timestamptz,
    uuid
  )
  from public, anon, authenticated;

grant execute
  on function public.record_executive_review(
    uuid,
    uuid,
    text,
    timestamptz,
    uuid
  )
  to service_role;

commit;