alter table public.businesses
  add column if not exists country_code text,
  add column if not exists administrative_area_code text,
  add column if not exists company_phone_e164 text,
  add column if not exists postal_code text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.businesses'::regclass
      and conname = 'businesses_country_code_format'
  ) then
    alter table public.businesses
      add constraint businesses_country_code_format
      check (country_code is null or country_code ~ '^[A-Z]{2}$') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.businesses'::regclass
      and conname = 'businesses_phone_e164_format'
  ) then
    alter table public.businesses
      add constraint businesses_phone_e164_format
      check (company_phone_e164 is null or company_phone_e164 ~ '^\+[1-9][0-9]{7,14}$') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.businesses'::regclass
      and conname = 'businesses_postal_code_safe_format'
  ) then
    alter table public.businesses
      add constraint businesses_postal_code_safe_format
      check (postal_code is null or length(btrim(postal_code)) between 2 and 32) not valid;
  end if;
end
$$;

alter table public.businesses validate constraint businesses_country_code_format;
alter table public.businesses validate constraint businesses_phone_e164_format;
alter table public.businesses validate constraint businesses_postal_code_safe_format;
