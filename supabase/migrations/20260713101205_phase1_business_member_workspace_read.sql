-- Accessible business members need the workspace row used by the protected shell.
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

drop policy if exists "businesses_select_member_or_owner" on public.businesses;
create policy "businesses_select_member_or_owner" on public.businesses
  for select to authenticated
  using (public.can_access_business(id));

commit;
