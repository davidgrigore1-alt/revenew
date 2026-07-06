# ReveNew Authorization Route Matrix

This matrix reflects the current `src/app` tree. Protected workspace routes are wrapped by `src/app/(protected)/layout.tsx`, which requires authentication, a current business, workspace entitlement and `workspace.read`, then filters navigation through `src/lib/navigation.ts`.

| Route | Class | Auth | Current Business | Entitlement | Permission | Unauthorized Behavior | Indexing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | Public marketing | No | No | No | None | Public | Indexed |
| `/ghid` | Public guide | No | No | No | None | Public | Indexed |
| `/ghid/cum-functioneaza` | Public guide | No | No | No | None | Public | Indexed |
| `/ghid/documente-follow-up` | Public guide | No | No | No | None | Public | Indexed |
| `/ghid/integrari-date` | Public guide | No | No | No | None | Public | Indexed |
| `/ghid/oportunitati` | Public guide | No | No | No | None | Public | Indexed |
| `/ghid/planuri-utilizare` | Public guide | No | No | No | None | Public | Indexed |
| `/privacy` | Public legal | No | No | No | None | Public | Indexed |
| `/terms` | Public legal | No | No | No | None | Public | Indexed |
| `/login` | Authentication | Logged-out preferred | No | No | None | Logged-in users redirected by post-login destination | Noindex by layout behavior if configured |
| `/signup` | Authentication | Logged-out preferred | No | No | None | Logged-in users continue to setup/access flow | Public/noindex intent |
| `/onboarding` | Setup | Yes | No | No | None | Unauthenticated users redirect to `/login`; existing business redirects onward | Noindex |
| `/access` | Account/access | Yes | Yes | No | None | Missing auth/business redirects to login/onboarding | Noindex |
| `/billing` | Account/billing | Yes | Yes | Access context | `billing.read` intended | Missing auth/business redirects; billing mutation remains server-side | Noindex |
| `/dashboard` | Client workspace | Yes | Yes | Yes | `dashboard.read` | Redirect or authorization error | Noindex |
| `/recoverable` | Client workspace | Yes | Yes | Yes | `opportunities.read` | Redirect or authorization error | Noindex |
| `/today` | Client workspace | Yes | Yes | Yes | `actions.read` | Redirect or authorization error | Noindex |
| `/results` | Client workspace | Yes | Yes | Yes | `reports.read` | Redirect or authorization error | Noindex |
| `/tools` | Client workspace | Yes | Yes | Yes | `workspace.read` | Redirect or authorization error | Noindex |
| `/settings` | Client workspace | Yes | Yes | Yes | `settings.read` | Redirect or authorization error | Noindex |
| `/help` | Client workspace | Yes | Yes | Yes | `workspace.read` | Redirect or authorization error | Noindex |
| `/inbox` | Client workspace | Yes | Yes | Yes | `signals.read` | Redirect or authorization error | Noindex |
| `/opportunities` | Client workspace | Yes | Yes | Yes | `opportunities.read` | Redirect or authorization error | Noindex |
| `/opportunities/[id]` | Client workspace object | Yes | Yes | Yes | `opportunities.read` | Object not in current business returns not found/null behavior | Noindex |
| `/opportunities/analyze` | Provider-backed workspace | Yes | Yes | Yes | `opportunities.analyze` | Redirect or authorization error | Noindex |
| `/opportunities/import` | Workspace | Yes | Yes | Yes | `opportunities.read` currently inherited by prefix | Redirect or authorization error | Noindex |
| `/leads` | Client workspace | Yes | Yes | Yes | `workspace.read` via tools/navigation intent | Redirect or authorization error | Noindex |
| `/outreach` | Client workspace | Yes | Yes | Yes | `documents.read` via tools/navigation intent | Redirect or authorization error | Noindex |
| `/reports` | Client workspace | Yes | Yes | Yes | `reports.read` | Redirect or authorization error | Noindex |
| `/demo` | Client workspace | Yes | Yes | Yes | `workspace.read` | Redirect or authorization error | Noindex |
| `/admin` | Internal platform | Yes | Yes via protected shell | Yes | `platform.admin.access` | Forbidden state, no raw database details | Noindex |
| `/debug/supabase` | Debug/development | No in route file; environment-gated by implementation | No | No | None | `notFound()` when disabled | Noindex/development only |
| `/debug/repair-profile` | Debug/development | No in route file; environment-gated by implementation | No | No | None | `notFound()` when disabled | Noindex/development only |
| `/api/ai/analyze-opportunity` | API provider-backed | Yes | Yes | Yes + usage quota | `opportunities.analyze` | JSON 403/4xx/5xx with safe text | Not indexed |
| `/api/ai/generate-document` | API provider-backed object | Yes | Yes | Yes + usage quota | `documents.generate` | JSON 403/404/4xx/5xx with safe text | Not indexed |
| `/robots.txt` | Metadata | No | No | No | None | Public | Public |
| `/sitemap.xml` | Metadata | No | No | No | None | Public | Public |

## Route Policy Registry

Declared in `src/lib/authz/route-policies.ts`:

- `/admin`: `platform.admin.access`
- `/settings`: `settings.read`
- `/reports`: `reports.read`
- `/inbox`: `signals.read`
- `/opportunities/analyze`: `opportunities.analyze`
- `/opportunities`: `opportunities.read`
- `/today`: `actions.read`
- `/results`: `reports.read`
- `/recoverable`: `opportunities.read`
- `/leads`: `workspace.read`
- `/outreach`: `documents.read`
- `/demo`: `workspace.read`
- `/help`: `workspace.read`
- `/tools`: `workspace.read`
- `/dashboard`: `dashboard.read`

The current protected layout enforces `workspace.read` globally and navigation-specific permissions. The registry now explicitly covers the protected workspace routes currently present in `src/app/(protected)`.
