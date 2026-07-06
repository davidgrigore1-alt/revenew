# ReveNew Authorization Architecture

Authentication answers who the user is. Authorization answers what that user may do.

## Sources of Truth

- Platform roles: `public.platform_user_roles`.
- Business ownership: `public.businesses.owner_profile_id`.
- Business membership: `public.business_members.profile_id`, `public.business_members.business_id`, `public.business_members.role`.
- Opportunities: scoped by `public.opportunities.business_id`.

`profiles.role` is deprecated compatibility data. It must not grant platform access.

## Platform Roles

Allowed global ReveNew roles:

- `platform_admin`
- `platform_operator`
- `platform_developer`

Only active, non-revoked, non-expired rows count. Unknown database values are ignored defensively by application code and blocked by the database constraint after migration.

## Business Roles

Allowed database business-member roles:

- `owner`
- `admin`
- `member`
- `viewer`

Application permissions map these to internal business roles:

- `owner` -> `business_owner`
- `admin` -> `business_admin`
- `member` -> `business_member`
- `viewer` -> `business_viewer`

A business owner is not automatically a platform administrator. Preview Mode and Paid Access do not grant platform roles.

## Pre-Migration Behavior

The active database may not yet contain `platform_user_roles`. In that state:

- normal business workspace functionality continues;
- platform roles resolve to an empty list;
- Admin and internal platform permissions fail closed;
- no fallback is made to `profiles.role`, email, metadata, payment, cookies or browser state.

The application recognizes only exact missing-relation cases for the platform role table:

- PostgreSQL `42P01`;
- PostgREST `PGRST205` schema-cache miss.

Other database errors are logged safely on the server and are not swallowed.

## Post-Migration Behavior

After manual migration:

- platform roles come from `public.platform_user_roles`;
- business roles remain scoped to ownership and membership;
- inactive, revoked and expired platform roles do not grant permissions;
- Admin navigation and direct `/admin` access remain permission-gated by `platform.admin.access`.

## Centralized Permissions

The application checks permissions, not scattered raw role strings. Key permissions include:

- `platform.admin.access`
- `platform.usage.read_all`
- `platform.audit.read`
- `platform.technical_diagnostics.read`
- `workspace.read`
- `dashboard.read`
- `signals.*`
- `opportunities.*`
- `documents.*`
- `reports.*`
- `settings.*`

There is no website permission for platform-role assignment.

## RLS Strategy

RLS remains the database isolation layer. Application authorization is an additional server-side gate.

`platform_user_roles`:

- denies writes to `anon` and `authenticated` using privileges;
- has no insert/update/delete RLS policy for normal application users;
- allows authenticated users to read only their own platform-role row;
- avoids recursive policies by not calling `has_platform_role()` from its own table policy.

`role_audit_log`:

- is written by a trigger on `platform_user_roles`;
- is not updated or deleted by normal application users;
- preserves history even if a profile is deleted by using `on delete set null`.

## Security Definer Functions

The role migration introduces:

- `public.current_profile_id()`: returns the current authenticated profile id for RLS.
- `public.has_platform_role(text)`: returns whether the current authenticated user has an active platform role.
- `public.audit_platform_user_roles()`: trigger function that writes audit snapshots.

All use a fixed `search_path = pg_catalog, public`, fully qualified tables, no dynamic SQL and no role mutation RPC behavior.

## Service Role Policy

The service-role key remains server-only. It is not exposed to the client, not logged, and not used by any application endpoint to assign platform roles.

## Usage Metering Separation

The core role migration does not reference:

- `usage_counters`
- `usage_events`
- `usage_overrides`

Usage-table platform-admin policies live in `202606240003_usage_metering_platform_role_policies.sql` and must be applied only after both usage tables and platform-role infrastructure exist.

## Database-Only Assignment

ReveNew does not provide a website interface, API route, Server Action or browser-accessible RPC for assigning platform roles. Assignment is done manually by a database administrator using reviewed SQL.

## Manual Rollout

1. Review the local migration and docs.
2. Run `docs/sql/PLATFORM_ROLE_MIGRATION_PREFLIGHT.sql`.
3. Apply `supabase/migrations/202606240002_separate_platform_and_business_roles.sql` manually.
4. Run `docs/sql/PLATFORM_ROLE_MIGRATION_VERIFY.sql`.
5. Optionally reload PostgREST schema cache only if verification passes and PostgREST still reports a schema miss.
6. Run reviewed account SQL from `docs/sql/GRANT_PLATFORM_ADMIN_PAWZOO24.sql`.
7. Log out and back in.
8. Verify Admin access for the platform admin and denial for normal business users.
9. Apply optional usage policy migration only after usage tables exist.

## Emergency Revocation

Set `is_active = false`, `revoked_at = now()` and `updated_at = now()` for the target profile/role row. The database trigger records the change.

## Legacy Names

Some internal package metadata and old migration history may still mention MoneyHunter-era names. Visible product branding should use `ReveNew` and compact mark `RN`.
