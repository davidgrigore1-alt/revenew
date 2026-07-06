# Profile Role Deprecation Final

Manual Supabase runbook. Codex must not apply this SQL automatically.

## Confirmed Live Root Cause

`public.profiles.role` is `text not null default 'user'::text`, but the live `profiles_role_check` rejects `user`. When the application omits `role`, PostgreSQL applies the invalid default and rejects new profile rows with SQLSTATE `23514`.

## Selected Approach

Approach A: `public.profiles.role` becomes nullable deprecated compatibility metadata.

Final contract:

- new profiles omit `role` and store `NULL`;
- existing `business_owner` values are preserved;
- `user` is not permitted;
- `platform_admin` is not permitted;
- platform roles come only from `public.platform_user_roles`;
- business roles come only from `public.business_members`;
- business ownership comes from `public.businesses.owner_profile_id`.

Do not run the old migration version that permits `user` or `platform_admin` in `profiles.role`.

## Manual Execution Order

1. Create a Git checkpoint after reviewing local changes.
2. Open Supabase SQL Editor for the project configured by local environment.
3. Run `00_PROFILE_ROLE_PREFLIGHT.sql`.
4. Confirm the exact expected preflight state:
   - `role` is `text`;
   - `role` is nullable `NO`;
   - `role` default is `'user'::text`;
   - existing non-null role values are only `business_owner`, currently 3 rows;
   - duplicate non-null `profiles.user_id` groups are 0;
   - duplicate normalized profile email groups are 0;
   - RLS is enabled;
   - profile triggers are none;
   - `auth.users` profile triggers are none;
   - `businesses.owner_id` is absent;
   - `businesses.owner_profile_id` is present.
5. Stop on any unexpected result.
6. Run `01_APPLY_PROFILE_ROLE_FIX.sql` exactly once only after David approves it.
7. Run `02_PROFILE_ROLE_VERIFY.sql`.
8. Require all core checks to return `PASS`.
9. Run `03_PROFILE_ROLE_RLS_REGRESSION.sql` and complete the listed staging JWT checks.
10. Restart Next.js.
11. Open `/login`.
12. Click `Continuă cu acest cont`.
13. Confirm `/auth/bootstrap` creates exactly one profile.
14. Confirm `/onboarding` opens.
15. Complete company onboarding.
16. Confirm one business is created with `owner_profile_id = profile.id`.
17. Confirm `/dashboard`.

## Rollback Limitations

The apply migration is non-destructive and does not rewrite existing profile rows. Reintroducing `NOT NULL` or a narrower role check later requires proving every row has a compatible non-null value first. Do not restore the invalid `'user'::text` default.
