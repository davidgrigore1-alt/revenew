-- Manual migration for first-class company onboarding fields.
-- Reviewed against the current production schema and existing CUI data.
-- Production note: David manually applied and verified this migration. Do not run it again without explicit approval.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Add the missing onboarding columns.
-- public.businesses.cui already exists and is preserved.
alter table public.businesses
  add column if not exists country_code text,
  add column if not exists administrative_area_code text,
  add column if not exists company_phone_e164 text,
  add column if not exists postal_code text;

-- Normalize existing Romanian CUI values such as RO12345678.
update public.businesses
set cui = substring(upper(btrim(cui)) from 3)
where cui is not null
  and upper(btrim(cui)) ~ '^RO[0-9]{2,10}$';

-- Remove the confirmed placeholder value "da".
-- This also handles invisible spaces or punctuation around the value.
update public.businesses
set cui = null
where cui is not null
  and regexp_replace(lower(cui), '[^a-z0-9]', '', 'g') = 'da';

-- Normalize blank values to NULL.
update public.businesses
set cui = null
where cui is not null
  and btrim(cui) = '';

-- Stop and roll back if any other invalid CUI remains.
do $$
begin
  if exists (
    select 1
    from public.businesses
    where cui is not null
      and cui !~ '^[0-9]{2,10}$'
  ) then
    raise exception
      'Migration stopped: an unexpected invalid CUI value remains.';
  end if;
end
$$;

-- Recreate only the constraints controlled by this package.
alter table public.businesses
  drop constraint if exists businesses_country_code_format,
  drop constraint if exists businesses_phone_e164_format,
  drop constraint if exists businesses_postal_code_safe_format,
  drop constraint if exists businesses_cui_normalized_format;

alter table public.businesses
  add constraint businesses_country_code_format
  check (
    country_code is null
    or country_code ~ '^[A-Z]{2}$'
  ) not valid;

alter table public.businesses
  add constraint businesses_phone_e164_format
  check (
    company_phone_e164 is null
    or company_phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
  ) not valid;

alter table public.businesses
  add constraint businesses_postal_code_safe_format
  check (
    postal_code is null
    or length(btrim(postal_code)) between 2 and 32
  ) not valid;

alter table public.businesses
  add constraint businesses_cui_normalized_format
  check (
    cui is null
    or cui ~ '^[0-9]{2,10}$'
  ) not valid;

alter table public.businesses
  validate constraint businesses_country_code_format;

alter table public.businesses
  validate constraint businesses_phone_e164_format;

alter table public.businesses
  validate constraint businesses_postal_code_safe_format;

alter table public.businesses
  validate constraint businesses_cui_normalized_format;

commit;

notify pgrst, 'reload schema';
