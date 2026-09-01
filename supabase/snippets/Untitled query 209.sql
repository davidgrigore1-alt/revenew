create or replace function public.validate_external_context_owner()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
begin
  if not exists (
    select 1
    from public.businesses business
    left join public.business_members member
      on member.business_id = business.id
     and member.profile_id = new.owner_profile_id
     and member.status = 'active'
    where business.id = new.business_id
      and (
        business.owner_profile_id = new.owner_profile_id
        or member.profile_id is not null
      )
  ) then
    raise exception 'external context owner must belong to the business'
      using errcode = '42501';
  end if;

  if tg_table_name <> 'external_connections' then
    if not exists (
      select 1
      from public.external_connections connection
      where connection.id = new.connection_id
        and connection.business_id = new.business_id
        and connection.owner_profile_id = new.owner_profile_id
    ) then
      raise exception 'external context connection scope mismatch'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$function$;