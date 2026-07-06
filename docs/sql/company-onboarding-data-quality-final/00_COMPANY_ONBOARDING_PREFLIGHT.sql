-- Read-only preflight for first-class company onboarding fields.
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'businesses'
  and column_name in (
    'country_code',
    'administrative_area_code',
    'company_phone_e164',
    'postal_code',
    'cui'
  )
order by column_name;

select
  'company_onboarding_columns_nullable_text' as check_name,
  count(*) = 5
  and bool_and(data_type = 'text')
  and bool_and(is_nullable = 'YES') as pass
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
  'businesses_owner_id_absent' as check_name,
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'businesses'
      and column_name = 'owner_id'
  ) as pass;
