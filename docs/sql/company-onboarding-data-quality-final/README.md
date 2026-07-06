# Company Onboarding Data Quality SQL Package

This package is intentionally manual. Do not apply it automatically.

Production status: David manually applied and verified this package against the connected production Supabase environment. Do not run it again, create another migration, or deploy from this package unless David explicitly requests it.

The app validates country, administrative area, city, company phone, optional Romanian CUI, website, average value, lead sources and primary problem before company creation. The applied migration added first-class nullable storage for `country_code`, `administrative_area_code`, `company_phone_e164` and `postal_code`, while preserving the existing `cui` column.

`cui` is Romanian-only application data. The app strips an optional `RO` prefix before persistence and stores only digits when a Romanian CUI is provided. Non-Romanian businesses do not receive a generic tax identifier field.

Recorded run order:

1. `00_COMPANY_ONBOARDING_PREFLIGHT.sql`
2. Review `01_APPLY_COMPANY_ONBOARDING_FIELDS.sql`
3. Apply only after approval. Completed manually by David.
4. `02_COMPANY_ONBOARDING_VERIFY.sql`
5. `03_COMPANY_ONBOARDING_RLS_REGRESSION.sql`

The production verification passed. The nine final checks returned true:

1. `country_code`, `administrative_area_code`, `company_phone_e164`, `postal_code` and `cui` exist.
2. All five onboarding columns are nullable `text` fields.
3. `businesses_country_code_format` is validated.
4. `businesses_phone_e164_format` is validated.
5. `businesses_postal_code_safe_format` is validated.
6. `businesses_cui_normalized_format` is validated.
7. Existing CUI values are normalized to digits only or `NULL`.
8. RLS remains enabled on `businesses`, `business_members`, `business_services` and `business_targets`, with the expected 24 policies present.
9. `businesses.owner_id` is absent.

The SQL files remain documentation and recovery artifacts for the manually applied change. They must not be automatically reapplied.

This local package does not modify RLS, does not modify grants, and does not introduce `businesses.owner_id`.
