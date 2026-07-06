# ReveNew Usage Control Plane SQL Package

Manual execution only. Codex must not apply these scripts automatically.

Recommended run order:

1. `USAGE_CONTROL_PLANE_PREFLIGHT.sql`
2. Review and apply `supabase/migrations/202606240001_usage_metering.sql`
3. Review and apply `supabase/migrations/202606240003_usage_metering_platform_role_policies.sql` after platform roles exist
4. `USAGE_CONTROL_PLANE_VERIFY.sql`
5. `USAGE_CONTROL_PLANE_RLS_REGRESSION.sql`

This package is additive. It does not introduce `businesses.owner_id`, does not use `profiles.role` for authorization, and does not disable RLS.
