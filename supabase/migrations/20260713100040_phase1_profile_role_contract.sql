-- Capture the reviewed final profiles.role contract in replayable migration history.
begin;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'businesses' and column_name = 'owner_id'
  ) then
    raise exception 'Unsafe schema: public.businesses.owner_id exists unexpectedly.';
  end if;
end;
$$;

alter table public.profiles alter column role drop default;
alter table public.profiles alter column role drop not null;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role is null or role = 'business_owner') not valid;
alter table public.profiles validate constraint profiles_role_check;

revoke update on table public.profiles from authenticated;
revoke update on table public.profiles from public;

do $$
declare
  v_columns text;
  v_safe_columns text;
begin
  select string_agg(format('%I', column_name), ', ' order by ordinal_position)
  into v_columns
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles';

  if v_columns is not null then
    execute format('revoke update (%s) on table public.profiles from authenticated', v_columns);
    execute format('revoke update (%s) on table public.profiles from public', v_columns);
  end if;

  select string_agg(format('%I', column_name), ', ' order by ordinal_position)
  into v_safe_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and column_name in ('full_name', 'avatar_url', 'phone');

  if v_safe_columns is not null then
    execute format('grant update (%s) on table public.profiles to authenticated', v_safe_columns);
  end if;
end;
$$;

comment on column public.profiles.role is
  'Deprecated compatibility metadata. Not an authorization source. Platform roles use public.platform_user_roles. Business roles use public.business_members and public.businesses.owner_profile_id.';

do $$
declare
  v_column text;
begin
  if has_table_privilege('authenticated', 'public.profiles', 'UPDATE') then
    raise exception 'authenticated still has table-level UPDATE on public.profiles';
  end if;

  foreach v_column in array array['id', 'user_id', 'email', 'role', 'created_at'] loop
    if has_column_privilege('authenticated', 'public.profiles', v_column, 'UPDATE') then
      raise exception 'authenticated still has UPDATE on protected profiles column: %', v_column;
    end if;
  end loop;
end;
$$;

commit;
notify pgrst, 'reload schema';
