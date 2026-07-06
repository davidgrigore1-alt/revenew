select
  'company_onboarding_columns_exist' as check_name,
  count(*) = 5 as pass
from information_schema.columns
where table_schema = 'public'
  and table_name = 'businesses'
  and column_name in (
    'country_code',
    'administrative_area_code',
    'company_phone_e164',
    'postal_code',
    'cui'
  );

select
  'company_onboarding_constraints_validated' as check_name,
  count(*) = 4
  and bool_and(convalidated) as pass
from pg_constraint
where conrelid = 'public.businesses'::regclass
  and conname in (
    'businesses_country_code_format',
    'businesses_phone_e164_format',
    'businesses_postal_code_safe_format',
    'businesses_cui_normalized_format'
  );

select
  conname as constraint_name,
  convalidated as validated
from pg_constraint
where conrelid = 'public.businesses'::regclass
  and conname in (
    'businesses_country_code_format',
    'businesses_phone_e164_format',
    'businesses_postal_code_safe_format',
    'businesses_cui_normalized_format'
  )
order by conname;

select
  'businesses_owner_id_absent' as check_name,
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'businesses'
      and column_name = 'owner_id'
  ) as pass;
