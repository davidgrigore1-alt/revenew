# AGENTS.md — ReveNew

## Scope

These instructions apply to the entire ReveNew repository unless a deeper `AGENTS.md` overrides a local implementation detail.

## Project

- Product: ReveNew
- Previous name: MoneyHunterAI
- Primary local repository: `C:\Projects\M`
- Stack: Next.js App Router, TypeScript, Supabase/PostgreSQL/RLS, OpenAI with local fallback
- Product language: Romanian
- Implementation/task prompts: usually English

## Source of truth

1. The local working tree is primary.
2. GitHub is secondary committed history.
3. Live Supabase state is authoritative for current database contracts.
4. Never assume migration files were applied.
5. Inspect before editing:
   - `git status --short`
   - `git diff --stat`
   - `git diff --check`
   - relevant `AGENTS.md` files

Do not use `git reset --hard`. Do not discard unrelated work.

## External mutation policy

Without David's explicit approval, do not:

- apply SQL;
- push Supabase migrations;
- change RLS/policies/grants in the live DB;
- delete or change live Auth users/data;
- deploy;
- push/merge;
- send email;
- mutate Gmail/Calendar/Google data;
- create or alter external provider resources.

Read-only inspection is allowed when needed.

## Security invariants

- Security/privacy/compliance by design.
- Keep strict tenant isolation.
- RLS must remain enabled.
- Never expose service-role/API secrets in client code.
- Never log passwords, tokens, cookies, full provider payloads, raw commercial prompts or sensitive customer data.
- No email-based authorization.
- No autonomous message sending without human control.
- Validate redirects; no open redirects.
- Validate all server inputs.
- Derive ownership and identity server-side.
- Use transactions/idempotency for multi-write/costly workflows.

## Database invariants

Preserve:

- `auth.users.id -> profiles.user_id`
- `profiles.id -> businesses.owner_profile_id`
- `business_members.profile_id -> profiles.id`
- `business_members.business_id -> businesses.id`
- `opportunities.business_id -> businesses.id`

`businesses.owner_id` must never be introduced or referenced.

## Authorization invariants

Platform roles come only from:

- `public.platform_user_roles`

Business ownership comes from:

- `public.businesses.owner_profile_id`

Business membership comes from:

- `public.business_members`

`public.profiles.role` is deprecated compatibility metadata and must not authorize anything.

Never put platform roles into `profiles.role`.

## Auth state that must remain stable

- No persisted session -> anonymous.
- `session_not_found` without Auth cookies -> anonymous.
- Persisted invalid session -> stale session -> one recovery pass.
- Temporary provider failure -> retry state without destructive cleanup.
- `/login?reason=session_expired` renders; reason is presentation-only.
- `Continuă cu acest cont` navigates to `/auth/bootstrap`.
- Valid account:
  - profile + business -> `/dashboard`
  - profile + no business -> `/onboarding`
  - no profile -> create exactly one profile -> continue
- `Folosește alt cont` clears the old session/workspace context.

Do not perform another broad auth rewrite without a confirmed new root cause.

## Final profiles.role contract

Expected final live contract:

- nullable;
- no `user` default;
- new rows omit role / store NULL;
- historical `business_owner` may remain;
- `user` not permitted;
- `platform_admin` not permitted;
- no authorization reads this field.

Authenticated users must not effectively update:

- `profiles.id`
- `profiles.user_id`
- `profiles.email`
- `profiles.role`
- `profiles.created_at`

Normal editable fields may include only confirmed fields such as:

- `full_name`
- `avatar_url`
- `phone`

## New-account target lifecycle

```text
confirmed Auth user
-> exactly one personal profile
-> /onboarding when no accessible business
-> four-step company setup
-> exactly one correctly owned business
-> /dashboard
```

Onboarding must not require a pre-existing business, membership, platform role, plan or paid access.

## Product / UI principles

- Professional Romanian B2B interface.
- Clear, calm, premium, not flashy.
- Highly intuitive; explain what actions do.
- Dashboard: left navigation, central cards, responsive dark/light mode.
- No empty gaps for unauthorized tools.
- Admin/Demo/internal tools rendered only when centrally authorized.
- Green for success; red only for actual errors.
- No raw Supabase/PostgreSQL/JWT errors.
- Human-in-the-loop: “ReveNew recomandă. Echipa ta decide.”
- Estimations are not guarantees.
- Original data sources remain visible.
- Avoid PR hype and absolute revenue claims.

## Current next priorities

1. Verify and checkpoint the final auth/profile-role fix.
2. Complete and test end-to-end onboarding/business provisioning.
3. Implement/verify usage metering and redesign Admin cost analytics.
4. Then public guide, landing-page restructuring, SEO, Resend and staging.

## Validation

For code changes, run as applicable:

- `npm run lint`
- `npm run build`
- `npm run test --if-present`
- `git diff --check`
- `git status --short`

Do not run `npm audit fix --force`.

## Reporting

Final reports must include:

- confirmed root cause;
- files changed/created/removed;
- architecture decision;
- security impact;
- tests and exact results;
- SQL applied or not;
- migration applied or not;
- deployment performed or not;
- remaining risks;
- exact next manual step.

Never claim completion merely because an error page is hidden or a UI renders.
