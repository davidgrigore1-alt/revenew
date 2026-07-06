-- Separate global ReveNew platform roles from business-scoped membership roles.
-- Core role infrastructure only. Additive; do not apply automatically from Codex.
-- Usage-metering policies are handled by a separate follow-up migration.

begin;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'businesses'
      and column_name = 'owner_id'
  ) then
    raise exception 'Unsafe schema: public.businesses.owner_id exists unexpectedly.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'businesses'
      and column_name = 'owner_profile_id'
  ) then
    raise exception 'Unsafe schema: public.businesses.owner_profile_id is missing.';
  end if;

  if exists (
    select 1
    from public.business_members
    where role not in ('owner', 'admin', 'member', 'viewer')
  ) then
    raise exception 'Unsupported business_members.role value found. Resolve before applying authorization rollout.';
  end if;
end;
$$;

create table if not exists public.platform_user_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('platform_admin', 'platform_operator', 'platform_developer')),
  is_active boolean not null default true,
  granted_at timestamptz not null default now(),
  granted_by_profile_id uuid null references public.profiles(id) on delete set null,
  expires_at timestamptz null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_user_roles_profile_role_key unique (profile_id, role)
);

create index if not exists platform_user_roles_profile_idx on public.platform_user_roles(profile_id);
create index if not exists platform_user_roles_active_idx on public.platform_user_roles(role, is_active, revoked_at, expires_at);

create table if not exists public.role_audit_log (
  id uuid primary key default gen_random_uuid(),
  target_profile_id uuid null references public.profiles(id) on delete set null,
  role_scope text not null check (role_scope in ('platform', 'business')),
  business_id uuid null references public.businesses(id) on delete set null,
  role text not null,
  action text not null check (action in ('granted', 'activated', 'revoked', 'expired', 'updated', 'deleted')),
  old_state jsonb null,
  new_state jsonb null,
  changed_by_database_user text null,
  changed_at timestamptz not null default now()
);

create index if not exists role_audit_log_target_idx on public.role_audit_log(target_profile_id, changed_at desc);
create index if not exists role_audit_log_scope_idx on public.role_audit_log(role_scope, changed_at desc);

alter table public.platform_user_roles enable row level security;
alter table public.role_audit_log enable row level security;

revoke all on public.platform_user_roles from anon;
revoke all on public.role_audit_log from anon;
revoke insert, update, delete on public.platform_user_roles from authenticated;
revoke insert, update, delete on public.role_audit_log from authenticated;
grant select on public.platform_user_roles to authenticated;
grant select on public.role_audit_log to authenticated;
revoke update(role, user_id, id) on public.profiles from authenticated;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.id
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1
$$;

revoke all on function public.current_profile_id() from public;
revoke all on function public.current_profile_id() from anon;
grant execute on function public.current_profile_id() to authenticated;

create or replace function public.has_platform_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.platform_user_roles pur
    join public.profiles p on p.id = pur.profile_id
    where p.user_id = auth.uid()
      and pur.role = required_role
      and pur.role in ('platform_admin', 'platform_operator', 'platform_developer')
      and pur.is_active = true
      and pur.revoked_at is null
      and (pur.expires_at is null or pur.expires_at > now())
  )
$$;

revoke all on function public.has_platform_role(text) from public;
revoke all on function public.has_platform_role(text) from anon;
grant execute on function public.has_platform_role(text) to authenticated;

drop policy if exists "platform_user_roles_read_own_or_platform_admin" on public.platform_user_roles;
drop policy if exists "platform_user_roles_read_own" on public.platform_user_roles;
create policy "platform_user_roles_read_own"
on public.platform_user_roles for select
using (profile_id = public.current_profile_id());

drop policy if exists "role_audit_log_read_platform_admin" on public.role_audit_log;
create policy "role_audit_log_read_platform_admin"
on public.role_audit_log for select
using (public.has_platform_role('platform_admin'));

create or replace function public.audit_platform_user_roles()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_action := 'granted';
    insert into public.role_audit_log(target_profile_id, role_scope, role, action, old_state, new_state, changed_by_database_user)
    values (new.profile_id, 'platform', new.role, v_action, null, to_jsonb(new), current_user);
    return new;
  elsif tg_op = 'UPDATE' then
    new.updated_at := now();

    if old.is_active = false and new.is_active = true then
      v_action := 'activated';
    elsif old.revoked_at is null and new.revoked_at is not null then
      v_action := 'revoked';
    elsif old.expires_at is distinct from new.expires_at and new.expires_at is not null and new.expires_at <= now() then
      v_action := 'expired';
    else
      v_action := 'updated';
    end if;

    insert into public.role_audit_log(target_profile_id, role_scope, role, action, old_state, new_state, changed_by_database_user)
    values (new.profile_id, 'platform', new.role, v_action, to_jsonb(old), to_jsonb(new), current_user);
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.role_audit_log(target_profile_id, role_scope, role, action, old_state, new_state, changed_by_database_user)
    values (old.profile_id, 'platform', old.role, 'deleted', to_jsonb(old), null, current_user);
    return old;
  end if;

  return null;
end;
$$;

revoke all on function public.audit_platform_user_roles() from public;
revoke all on function public.audit_platform_user_roles() from anon;
revoke all on function public.audit_platform_user_roles() from authenticated;

drop trigger if exists trg_audit_platform_user_roles on public.platform_user_roles;
create trigger trg_audit_platform_user_roles
before insert or update or delete on public.platform_user_roles
for each row execute function public.audit_platform_user_roles();

do $$
begin
  if exists (
    select 1
    from public.business_members
    where role not in ('owner', 'admin', 'member', 'viewer')
  ) then
    raise exception 'Unsupported business_members.role value found. Inspect and resolve before applying role constraint.';
  end if;
end;
$$;

alter table public.business_members
  drop constraint if exists business_members_role_check_revenew_new;

alter table public.business_members
  add constraint business_members_role_check_revenew_new check (role in ('owner', 'admin', 'member', 'viewer')) not valid;

alter table public.business_members
  validate constraint business_members_role_check_revenew_new;

alter table public.business_members
  drop constraint if exists business_members_role_check;

alter table public.business_members
  rename constraint business_members_role_check_revenew_new to business_members_role_check;

commit;
