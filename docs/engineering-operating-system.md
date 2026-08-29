# ReveNew Engineering Operating System

This document defines durable engineering policy for ReveNew. Current phase status, temporary defects and validation counts belong in the active execution plan, not here.

## Operating model

Every task follows four stages in proportion to risk:

1. **Plan** — establish the objective, evidence, contracts, risks and non-goals.
2. **Implement** — make the smallest coherent, authorized change.
3. **Adversarial review** — look for contract violations and failure paths.
4. **Validate** — run evidence-producing checks appropriate to the risk.

Read-only answers and obvious low-risk corrections may use a compact plan. A plan is mandatory for cross-cutting work and for changes involving authorization, tenant data, migrations, external effects, AI, money, framework boundaries or release behavior.

When multiple materially different designs remain plausible, compare two or three options against product contracts, operational risk, reversibility and validation cost before choosing. Parallel work is limited to independent investigations or separate file domains with stable interfaces; shared security and data boundaries must have one coherent owner.

## Non-negotiable contracts

- Tenant identity, roles and permissions are derived server-side.
- The canonical ownership chain and RLS isolation remain intact.
- Client input is never authority for workspace identity or approval state.
- Estimates, recoverable value and confirmed revenue remain distinct.
- Prepared, approved and executed actions remain distinct.
- AI output is grounded, bounded and human-controlled.
- External effects require explicit authority, least privilege and auditability.
- Capability claims require direct runtime evidence.
- Remote, destructive and deployment actions require explicit authorization.

The detailed contracts live in the canonical documents linked by `AGENTS.md`.

## Risk taxonomy

| Task | Default risk | Planning and evidence | Minimum validation |
|---|---|---|---|
| Discovery, research or planning | Low–Medium | Define scope; inspect current sources | Evidence-backed read-only findings |
| Focused product implementation | Medium | Acceptance criteria and affected contracts | Focused tests, typecheck and lint as relevant |
| Visual or UX change | Medium | Current design, IA, states and viewports | Browser, keyboard, responsive and a11y checks |
| Functional end-to-end audit | High | Roles, fixtures, data and full workflow | Browser → API → persistence, including failure |
| Security review | High | Threat boundary, auth model and data flow | Negative, tenant and security-gate checks |
| Database or migration change | High | Schema, migration and deployment history | Local DB plus migration/security validation |
| AI capability | High | Evidence, provider, permission and cost boundaries | Evals, fallback, authorization and provenance |
| External integration | High | Scopes, tokens, retention and idempotency | Sandbox/provider and failure-mode checks |
| Browser or accessibility QA | Medium–High | Routes, roles and viewport matrix | Keyboard, focus, semantics and automated a11y |
| Performance or reliability | High | Baseline, metric and hypothesis | Profiling, load, timeout, retry and recovery |
| Adversarial regression review | High | Diff, invariants and abuse cases | Targeted negative and security tests |
| Framework or dependency upgrade | High | Official support/migration evidence | Build, full suite, browser and security gates |
| Production incident | Critical | Contain first; preserve timeline and evidence | Recovery proof followed by post-incident review |
| Release gate | Release | Active plan, approvals and rollback | Complete gates and operational readiness |

## Definition of Done

### LOW

- Acceptance criterion is satisfied without changing unrelated contracts.
- The closest focused check passes.
- Typecheck or lint runs when the changed file type requires it.
- Visual changes receive an appropriate browser check.
- Diff hygiene is clean and limitations are reported.

### MEDIUM

Includes LOW, plus:

- a short plan and explicit non-goals;
- focused behavioral tests;
- loading, empty, error and accessibility states where relevant;
- verification of persistence and cache/invalidation effects;
- relevant security or migration gates;
- review against canonical product contracts.

### HIGH

Includes MEDIUM, plus:

- an explicit plan and adversarial review;
- negative and cross-tenant tests where applicable;
- verified server authority, RLS and privilege boundaries;
- retry, replay, idempotency and provider-failure behavior;
- audit and provenance for sensitive effects;
- full repository gates appropriate to the boundary;
- a real local database test for SQL or RLS changes;
- build verification for framework or bundling changes.

### RELEASE

Includes HIGH, plus:

- an understood, clean release diff;
- complete typecheck, lint, migration, security, test, build and diff gates;
- no unjustified environment-gated skips for release-critical behavior;
- critical browser journeys across relevant roles and viewports;
- accessibility verification;
- migration preflight and rollback readiness;
- staging smoke, observability and incident readiness;
- explicit deployment approval.

## Test philosophy

Use the lowest test layer that proves the contract, then add higher layers when a boundary crosses processes, providers or persistence:

1. static contract checks for cheap deterministic prohibitions;
2. unit tests for pure behavior;
3. integration tests for auth, RLS, persistence and provider boundaries;
4. browser E2E for critical user workflows;
5. adversarial tests for bypass, replay, injection and failure;
6. staging smoke for release confidence.

Source-shape tests are not substitutes for runtime behavior. RLS requires a real database check, and accessibility requires browser/assistive semantics beyond text matching. Environment-gated skips must be visible and must not silently satisfy a release requirement.

Every confirmed regression should receive a test at the closest useful layer. Provider-backed behavior must cover missing configuration, revoked authorization, timeouts, rate limits, malformed responses, duplicate requests and partial failure. AI tests must cover grounding, permission, refusal, fallback and evidence.

## Enforceable gates

Prefer executable gates over repeated prose. Preserve existing checks for tenant model invariants, route authorization, secret safety, migration integrity, unsafe SQL, narrow grants and CI validation.

Candidate gates should be introduced in separate, scoped work:

- client/server import-boundary enforcement;
- live Supabase RLS and cross-tenant integration tests;
- critical-route browser smoke and accessibility checks;
- consistency checks between capability truth and runtime registries;
- documentation link and active-plan schema checks;
- release exclusion of unsafe debug surfaces;
- bundle checks for secrets and server-only imports;
- dependency support-lifecycle monitoring;
- explicit allowlists for privileged SQL grants;
- release failure when required DB or browser tests are skipped.

## Change and handoff discipline

Inspect the worktree before editing and preserve unrelated user changes. Do not combine policy work with feature changes, dependency upgrades or cleanup. Never weaken a test solely to obtain a green result.

At handoff state:

- files and contracts changed;
- user-visible and operational impact;
- exact validation results and skips;
- checks deliberately not run;
- remaining ambiguity, risk and deferred work.
