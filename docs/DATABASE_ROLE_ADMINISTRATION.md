# ReveNew Database Role Administration

ReveNew does not provide a website interface for assigning platform roles.

Platform role changes are deliberate database-administration actions. Do not run them from the application, an API route, a Server Action, a browser-accessible RPC or a migration that hardcodes a user.

## Manual Rollout

1. Review `supabase/migrations/202606240002_separate_platform_and_business_roles.sql`.
2. Run `docs/sql/PLATFORM_ROLE_MIGRATION_PREFLIGHT.sql` in Supabase SQL Editor.
3. Confirm unsupported business role rows are `0`.
4. Confirm `businesses.owner_id` is absent.
5. Apply `202606240002_separate_platform_and_business_roles.sql` manually.
6. Run `docs/sql/PLATFORM_ROLE_MIGRATION_VERIFY.sql`.
7. If verification passes but PostgREST still reports a schema-cache miss, optionally run `notify pgrst, 'reload schema';`.
8. Inspect and grant `pawzoo24@gmail.com` with `docs/sql/GRANT_PLATFORM_ADMIN_PAWZOO24.sql`.
9. Log out and log in again before verifying Admin access.
10. Apply `202606240003_usage_metering_platform_role_policies.sql` only after the usage tables exist and the role migration is verified.

## Pawzoo24 Account Operations

The exact SQL for inspection, grant/reactivation, verification, revocation, expiration changes and audit history is in:

```text
docs/sql/GRANT_PLATFORM_ADMIN_PAWZOO24.sql
```

The script:

- finds `pawzoo24@gmail.com` case-insensitively;
- fails if no profile exists;
- fails if more than one profile exists;
- never creates a profile;
- preserves `profiles.role`;
- preserves business ownership and `business_members`;
- does not modify `auth.users`;
- relies on the database trigger to write audit history.

## Confirm Role Is Not Coming From `profiles.role`

```sql
select email, role as deprecated_profile_role
from public.profiles
where lower(email) = lower('pawzoo24@gmail.com');
```

The application ignores this value for platform authorization. Platform roles come only from `public.platform_user_roles`.

## Schema Cache

If the migration has been applied and verified but PostgREST still reports that `platform_user_roles` is missing from the schema cache, request a schema cache reload:

```sql
notify pgrst, 'reload schema';
```

Do not use a schema-cache reload as a substitute for applying or verifying the migration.

## Emergency Revocation

```sql
update public.platform_user_roles pur
set is_active = false,
    revoked_at = now(),
    updated_at = now()
from public.profiles p
where p.id = pur.profile_id
  and lower(p.email) = lower('pawzoo24@gmail.com')
  and pur.role = 'platform_admin';
```

## Rollback / Disable Guidance

To disable all platform access without dropping tables:

```sql
update public.platform_user_roles
set is_active = false,
    revoked_at = now(),
    updated_at = now()
where is_active = true;
```

Dropping role tables is not recommended while application code references them. If rollback is required, deploy code that no longer queries `platform_user_roles` before removing database objects.
