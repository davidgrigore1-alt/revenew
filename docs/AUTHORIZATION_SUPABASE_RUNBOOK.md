# ReveNew Authorization Supabase Runbook

Use the raw `.sql` files in `docs/sql/authorization-final/`. Copy only the raw SQL contents. Do not copy Markdown fences.

Do not run usage migrations during the core role rollout. Stop immediately on SQL errors. Do not run fragments after a failed transaction. Do not run multiple scripts in the same Supabase query tab unless this runbook explicitly says to do so.

## Execution Order

0. Create a Git checkpoint.
1. Run `docs/sql/authorization-final/00_AUTHORIZATION_PREFLIGHT.sql`.
2. Review the expected results.
3. Run `docs/sql/authorization-final/01_APPLY_CORE_AUTHORIZATION.sql` exactly once.
4. Run `docs/sql/authorization-final/02_AUTHORIZATION_VERIFY.sql`.
5. Run `docs/sql/authorization-final/04_AUTHORIZATION_RLS_REGRESSION.sql`.
6. Run `docs/sql/authorization-final/03_GRANT_PLATFORM_ADMIN_PAWZOO24.sql`.
7. Verify the role from the result rows.
8. Restart Next.js.
9. Log out and log back in.
10. Test Admin using Pawzoo24.
11. Test a normal business-owner account.
12. Test direct unauthorized Admin access.
13. Run lint, build and tests.
14. Commit.
15. Deploy only after every check succeeds.

## Expected Preflight State

- `platform_user_roles_exists`: `false`
- `role_audit_log_exists`: `false`
- `current_profile_id_function_exists`: `true`
- `has_platform_role_function_exists`: `false`
- `audit_platform_user_roles_function_exists`: `false`
- `audit_trigger_exists`: `false`
- `business_member_role_conflicts`: `0`
- `duplicate_normalized_profile_emails`: `0`
- `pawzoo24_profile_count`: `1`
- `usage_counters_exists`: `false`
- `usage_events_exists`: `false`
- `usage_overrides_exists`: `false`
- `businesses_owner_id_absent`: `true`
- `businesses_owner_profile_id_exists`: `true`

`current_profile_id_function_exists = true` is expected and is not an error. The core script replaces it with the reviewed fixed-search-path version.

## Expected Verification State

All rows in `02_AUTHORIZATION_VERIFY.sql` should return `PASS`. The RLS runtime row intentionally points to `04_AUTHORIZATION_RLS_REGRESSION.sql`; SQL Editor owner sessions cannot fully simulate authenticated user JWT behavior.

## Role Operations

- Grant or reactivate Pawzoo24: `03_GRANT_PLATFORM_ADMIN_PAWZOO24.sql`
- Revoke Pawzoo24: `05_REVOKE_PLATFORM_ADMIN_PAWZOO24.sql`
- Reactivate Pawzoo24: `06_REACTIVATE_PLATFORM_ADMIN_PAWZOO24.sql`
- Disable all platform roles in an emergency: `07_AUTHORIZATION_EMERGENCY_DISABLE.sql`

These scripts do not modify Auth users, businesses, memberships or `profiles.role`.

## Schema Cache

If the migration verifies successfully but PostgREST temporarily reports that `platform_user_roles` is missing from the schema cache, run this reviewed command in its own query:

`notify pgrst, 'reload schema';`

Do not use schema-cache reload as a substitute for applying or verifying the migration.
