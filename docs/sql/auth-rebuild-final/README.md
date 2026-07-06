# Auth Rebuild SQL Package

This package is for manual Supabase review only. Do not run it automatically.

Purpose:
- confirm the auth/profile/business schema used by the rebuilt application flow;
- add an optional `profiles.personal_phone` column for canonical personal contact phone storage;
- preserve all existing Auth users, profiles, businesses, memberships, platform roles and RLS policies;
- verify that `businesses.owner_id` does not exist.

Run order in Supabase SQL Editor after review:
1. `00_AUTH_REBUILD_PREFLIGHT.sql`
2. `01_APPLY_AUTH_REBUILD.sql`
3. `02_AUTH_REBUILD_VERIFY.sql`
4. `03_AUTH_REBUILD_RLS_REGRESSION.sql`

`04_AUTH_REBUILD_ROLLBACK.sql` is intentionally conservative and does not drop user data.
