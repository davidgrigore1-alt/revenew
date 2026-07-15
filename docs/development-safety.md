# ReveNew development safety

## Before a commit

Run `npm run validate:quick` for a small, focused change. Run `npm run validate` before merging, pushing to `main`, or handing work to another computer. The full gate runs TypeScript, lint, all tests, migration and repository safety checks, a production build, and `git diff --check`.

CI repeats the serious gates on every pull request and every push to `main`. It does not deploy and uses the application's no-Supabase build fallback, so production secrets are not required.

## Before a remote migration

1. Create a new additive file in `supabase/migrations`; never rewrite a reviewed migration.
2. Run `npm run validate:migrations` and review the SQL manually, including RLS, grants, tenant predicates, idempotency, and rollback risk.
3. Obtain explicit approval before linking, pushing, or executing anything against remote Supabase.
4. Never use reset, truncate, seed upload, or destructive repair commands against remote data.

The migration gate verifies SHA-256 hashes for the reviewed history and scans every newer migration. `SECURITY DEFINER` requires a nearby `-- safety-justification: ...` comment, but that comment is not a substitute for review.

## Environment and secrets

Copy `.env.example` to `.env.local`. Keep all real URLs and keys only in ignored local environment files or approved secret stores. Never stage `.env*` runtime files. `npm run validate:security` reports file names only and checks committable files, ignore rules, obvious credentials, browser artifacts, logs, CSV diagnostics, `.next`, and `node_modules`.

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never expose it through `NEXT_PUBLIC_*`, client components, logs, screenshots, or CI variables that are not explicitly protected.

## Two-computer workflow

Start with a clean branch, fetch/pull the latest committed work, run `npm ci`, create a fresh `.env.local` from the template, and run `npm run validate:quick`. Commit or otherwise checkpoint work before changing computers; do not transfer `.next`, `node_modules`, browser profiles, or environment files.

Docker is required only for local Supabase commands such as `npx supabase start` and `npx supabase db reset --local`. It is not required when the app intentionally points to the remote development project. Verify `NEXT_PUBLIC_SUPABASE_URL` locally without printing keys before database work.

## Stale Next.js assets

If the UI becomes unstyled or static chunks return errors: stop the development server, confirm the target is the repository's `.next` directory, remove only that directory, then restart `npm run dev -- -p 3000` or `npm run dev -- -p 3001`. Always verify which port is active.