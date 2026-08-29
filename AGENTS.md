# AGENTS.md — ReveNew repository instructions

## What ReveNew is

ReveNew is a production-grade B2B SaaS for revenue recovery and opportunity management. It helps teams identify, prioritize and track recoverable commercial opportunities with explicit ownership, next actions, evidence, auditability and human control.

The repository may retain the legacy name `moneyhunter-ai`; use **ReveNew** in product UI, user-facing copy, metadata and current documentation. User-facing copy is Romanian-first, professional and specific. Avoid hype, guaranteed-result language, fake ROI claims and generic AI marketing copy.

## What must never be broken

Preserve the canonical ownership chain:

`auth.users.id` → `profiles.user_id` → `profiles.id` → `businesses.owner_profile_id`

Never introduce or rely on `businesses.owner_id`. Workspace identity, roles, permissions, ownership and approval state must be derived and verified server-side.

Preserve:

- Supabase Auth, protected routes and Row Level Security;
- strict tenant and owner isolation;
- server/client privilege boundaries and least privilege;
- auditability, provenance and human approval flows;
- the distinction between estimates, recoverable value and confirmed revenue;
- the distinction between prepared, approved and executed actions;
- safe deterministic behavior when an AI or external provider is unavailable.

Never expose service-role credentials, API keys, OAuth tokens, environment values or raw internal errors. Never move privileged logic into client components. Never claim an external action occurred without provider confirmation.

Do not hardcode fake data into authenticated production flows. Use explicit empty states or clearly isolated demo fixtures.

## Which document is authoritative

Read only the documents relevant to the task, then verify them against code and tests when they describe runtime behavior.

- Repository and product context: `docs/CODEX_CONTEXT.md`
- Current capability truth: `docs/product-truth-matrix.md`
- Engineering workflow and Definition of Done: `docs/engineering-operating-system.md`
- Current execution state: the single checkpoint in `docs/exec-plans/active/`
- Authorization model: `docs/AUTHORIZATION_ARCHITECTURE.md`
- Authorization inventories: `docs/FUNCTION_AUTHORIZATION_MATRIX.md`, `docs/ROUTE_AUTHORIZATION_MATRIX.md`, `docs/TABLE_RLS_MATRIX.md`
- Database and local safety: `docs/development-safety.md`
- Product information architecture: `docs/product-information-architecture.md`
- Current design system: `docs/design/revenew-design-system-v4.md`
- Current surface structure: `docs/design/redesign-v4-structure.md`
- Product claims and copy boundaries: `docs/BRAND_MESSAGE_HOUSE.md`
- AI architecture: `docs/real-ai-copilot.md`
- Google Workspace integration: `docs/google-workspace-connector.md`
- Local buyer-safe demo: `docs/local-demo.md`

`DESIGN.md`, completed G3 documents and historical Codex prompts are background records, not the current source of truth when a document above covers the task.

Capability status is evidence-only. Do not infer that a feature is live from a route, component, filename, roadmap or partial implementation. Establish the runtime path, authority boundary, provider mode, side effects, approval contract and test evidence before changing capability claims.

## Workflow

Use the risk model in `docs/engineering-operating-system.md`:

1. Inspect the relevant code, tests, instructions and current worktree.
2. Plan proportionally to risk and state assumptions and non-goals.
3. Implement the smallest coherent patch authorized by the user.
4. Perform adversarial review when permissions, tenants, persistence, money, AI, integrations, migrations or release behavior are involved.
5. Validate proportionally and report exact results, skips and residual risk.

Do not mix opportunistic refactors into focused work. Preserve unrelated user changes. Do not rename routes, files or exported functions casually.

Parallel work is appropriate only for independent read-only investigations or clearly separated file domains after interfaces are fixed. Avoid concurrent edits to shared auth, migrations, schemas, design primitives or canonical documents.

## Change-specific rules

### UI and UX

Read the current design and information-architecture documents before frontend changes. Preserve operational density, accessible focus, keyboard behavior, responsive states and real data semantics. Do not copy historical templates or reformat production code merely to satisfy brittle source-shape tests.

### AI and integrations

Keep AI grounded in tenant-authorized evidence. Generated content remains a recommendation or draft until explicitly approved. External integrations must use minimal scopes, encrypted credentials, revocation, idempotency and safe audit data. Provider failure must not silently become success or fabricated context.

### Database and migrations

Read `docs/development-safety.md` and the authorization architecture first. Treat historical migration bytes as immutable after successful deployment. Prefer additive migrations. Do not weaken RLS or broaden grants for convenience.

Never apply migrations remotely, reset Supabase or perform destructive database operations without explicit user authorization for that exact action and target.

### Environment and repository safety

Do not expose `.env` contents. Do not commit backup files, generated debris or local credentials. Do not run destructive cleanup, commit, push or deploy unless the user explicitly requests it. Respect the package manager and scripts already declared by the repository.

## Validation level

Select LOW, MEDIUM, HIGH or RELEASE Definition of Done from `docs/engineering-operating-system.md`.

Available repository gates include:

```text
npm run typecheck
npm run lint
npm run validate:migrations
npm run validate:security
npm test
npm run build
git diff --check
```

Run only the proportionate subset unless the user requests a full gate. Build and full-suite execution are required for release closure, not automatically for a documentation-only patch. Never hide skipped tests or claim unrun validation.

At handoff, report changed files, behavioral impact, validation performed, validation deliberately omitted and remaining risk.
