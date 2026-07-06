# ReveNew Table and RLS Matrix

| Object | Purpose | RLS / Privilege Posture | Notes |
| --- | --- | --- | --- |
| `profiles` | Auth-user profile data | Existing RLS retained; rollout revokes authenticated updates to `role`, `user_id`, `id` | `profiles.role` is deprecated and not an authorization source |
| `businesses` | Client business workspace | Existing RLS retained | Ownership uses `owner_profile_id`; `owner_id` must not exist |
| `business_members` | Business-scoped memberships | Existing RLS retained; rollout validates `owner/admin/member/viewer` constraint | Business role source of truth |
| `platform_user_roles` | Global platform role rows | RLS enabled; authenticated select only own rows; anon no access; authenticated no writes | Canonical unique `(profile_id, role)` |
| `role_audit_log` | Platform role history | RLS enabled; platform admin read policy; anon/authenticated no writes | Trigger-written audit snapshots |
| `usage_counters` | Usage quota counters | Created only by optional usage migration | Core authorization rollout does not reference it |
| `usage_events` | Provider usage events | Created only by optional usage migration | Admin page handles missing table safely |
| `usage_overrides` | Usage override records | Created only by optional usage migration | Role-based policies live in optional `202606240003` |
| `opportunities` | Business opportunities | Existing business-scoped RLS retained | App queries must scope by current business id |
| `commercial_signals` | Commercial inbox signals | Existing/optional table handling retained | Missing optional inbox tables are handled separately |

## Core Rollout Policies

- `platform_user_roles_read_own`: authenticated users may read only their own platform-role rows.
- `role_audit_log_read_platform_admin`: users with active `platform_admin` may read audit rows.

## Core Rollout Functions

- `current_profile_id()`: resolves `auth.uid()` to `profiles.id`.
- `has_platform_role(text)`: checks active, non-revoked, non-expired platform roles.
- `audit_platform_user_roles()`: trigger function that writes role audit snapshots.

All rollout functions use `security definer` with `search_path = pg_catalog, public` and no dynamic SQL.
