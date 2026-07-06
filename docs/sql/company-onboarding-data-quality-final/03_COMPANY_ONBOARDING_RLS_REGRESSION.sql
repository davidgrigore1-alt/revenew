-- Metadata-only checks. Run after applying the reviewed migration.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('businesses', 'business_members', 'business_services', 'business_targets');

select
  'company_onboarding_expected_rls_policies_present' as check_name,
  count(*) = 24 as pass
from pg_policies
where schemaname = 'public'
  and tablename in ('businesses', 'business_members', 'business_services', 'business_targets');

select
  schemaname,
  tablename,
  policyname
from pg_policies
where schemaname = 'public'
  and tablename in ('businesses', 'business_members', 'business_services', 'business_targets')
order by tablename, policyname;
