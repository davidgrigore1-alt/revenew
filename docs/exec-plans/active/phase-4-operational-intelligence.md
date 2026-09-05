# Phase 4 — current recovery checkpoint

Updated 2026-09-06 (Bucharest, after midnight) after local implementation, 20 application requests and final gates. **PHASE 4 IMPLEMENTATION NO-GO**: required conflict/entity clarification, complete source coverage and reliable supported synthesis remain incomplete. Working implementation and one prepared proposal are available for review. This checkpoint supersedes its earlier milestone snapshots; do not restart discovery or recreate fixtures blindly.

## Authority and preserved baseline

Repository `C:\Projects\ReveNew`; branch `astra/product-transformation`; HEAD **8aa5f52**, clean starting worktree. Prior commits inspected: 2eaa768, db5e2b5, 45f658d, af3de73. Current changes are uncommitted Phase 4 work. No branch switch, reset/restore/stash, commit/push/deploy, remote migration, external execution, dependency/service/model download or provider scope expansion. Preserve frozen host layouts, canonical ownership, RLS and existing Phase 1–3/Meridian data.

Risk HIGH. Relevant authority and Phase 3.3 report were inspected; [Phase 3.3](../../design/phase-3-3-final-report.md) is historical validation, not this candidate's validation. Two bounded read-only investigations completed; no concurrent shared edits. Next.js/Supabase/browser/React skills were applied. Browser verification used the in-app CUA browser after installed CLI absence.

## Milestones and complete evidence

- A: baseline and frozen 28-case manifest complete; baseline measured retrospectively, not a contemporaneous 28-case run.
- B: working bounded source adapters/discovery; explicit partial/unavailable coverage. Reports covers follow-up metrics, not all report families.
- C: server calculations, typed provenance, strict synthesis rejection, authority checks and explicit idempotent preparation implemented. General semantic conflict/candidate clarification and claim entailment remain incomplete.
- D: shared canvas/citations/native evidence drawer and scope controls implemented, real route screenshots inspected, mobile/light/dark tested; native zoom/IME/reduced-motion emulation and user visual sign-off pending.
- E: final automated gates and real local boundaries pass with three conditional skips. Live cap exhausted; Q15 exposed wording error, Q16 safely rejected it but did not establish successful scoped-follow-up synthesis. NO-GO.

The [complete report](../../design/phase-4-operational-intelligence-report.md) contains source-capability matrix, architecture/files, exact 20-request live table, deterministic versus live case mapping, screenshot links, remaining risks, migration rollback and five-minute demo. [Normative contract](../../design/phase-4-operational-intelligence-contract.md). Frozen expectations: `tests/fixtures/phase4-evaluation.json` (28 questions; do not relabel placeholders as measured results).

## Current local environment

Existing local Supabase `supabase_db_M`, API 54321 /Postgres 54322. Existing Ollama loopback 11434, **qwen3.5:9b**; no new model/provider. Application contract `operational-intelligence/1`; 8192 context, 480 output tokens, 45s timeout, at most one repair, eight evidence entries/complete JSON below 5800 chars. Local provider charge USD 0.

Current **production** server: `http://localhost:3001`, launcher **22332**, listener **23188**. Logs `.codex-phase4-review.log` /`.codex-phase4-review-error.log`. Verify process path/parent again before stopping; never kill unrelated processes. The identified earlier listeners 31696, 44236, 26548, 33556 and 45908 were stopped before conflicting builds. One server per build directory was maintained.

Restart/build helper is tracked: `node scripts/validation/run-phase4-local.mjs build` or `start`. It uses existing guarded local environment, loopback Supabase, preview access, external sending disabled and paid OpenAI key cleared. Do not serve an ordinary build using `.env.local` public backend configuration: its URL was found not to be loopback without exposing its value. All browser acceptance used local configuration. No secrets are stored in this checkpoint or fixture artifact.

In-app tab 1 is authenticated as the established synthetic actor, last opened `/prepared` without inference after final build. Original dark theme restored using existing Settings UI after light acceptance; viewport 1440 px. CUA viewport simulation is not native zoom. Some earlier immediate screenshots were blank/transient; report links identify inspected usable images.

## Persistent synthetic fixture — inspect before mutation

Local manifest `artifacts/phase4/fixture.json`, ready=true. Creator `scripts/validation/phase4-fixture.mjs`; reuse only after checking existing state. Interrupted partial creation needs inspection before rerun. Meridian and Phase 3 fixtures remain present.

| Object | ID |
|---|---|
| Business | 5925fbd1-ba2e-4f91-a105-2fba8096f53b |
| Owner profile | a39908e5-def0-4a0f-bd71-185830464172 |
| Organization | c14e352c-5f89-4688-b105-c43041c078c2 |
| Contact | 14341800-289f-4bcf-82f3-549085c14b80 |
| Opportunity 1 | e03e013b-1102-463c-91ec-b92757f1c2e1 |
| Opportunity 2 | e6f68617-9f3b-48c5-9aa3-ea429919f37d |
| Opportunity 3 | 0d2d3e05-15d8-4fdc-bb80-3a2322fa205a |
| Workbook source | e51754d0-9e81-4ddd-a0c9-5375b7e68ae8 |
| Workbook version | 24cebe85-4e21-4aad-b3d9-0587d4882d2a |
| CSV source | 561bfb3a-6136-4de9-bf20-bd87948379c3 |
| CSV version | e23c5f3e-fb30-4a96-8b2b-34e0862031b4 |
| Prepared plan | 7ec59640-7340-4ba4-8eb0-6604b17d8d43 |

The fixture workbook has Pipeline 36 data rows and Note sheet; full totals 660.30 RON and 3.00 EUR, București 320.10 RON and 3.00 EUR, separate currencies. LATE-031 is physical row 32 (data item 31); frozen manifest wording row31 is acknowledged, not rewritten. CRM opportunity estimates 1200 RON /900 RON /400 EUR. Local files have no explicit company/opportunity association; selected workspace comparison uses exact-title review candidates only. Contact has no linked opportunity, despite explicit organization membership. Do not infer those links from names.

Plan is `create_task` on opportunity1, **prepared**, never approved/applied. `inspect-phase4-effects.mjs` snapshots show zero plans after 18 analyses, exactly one after Q19 and Q20; all opportunity statuses/updated_at remained unchanged. Run read-only `node scripts/validation/inspect-phase4-effects.mjs current` before further preparation. Do not recreate the plan for screenshots. Existing prepared deadline was tomorrow 10:00 Bucharest at creation; it is not an evergreen future deadline.

## Migration state

`20260905200500_phase4_prepared_owner_visibility.sql` applied **local only** through guarded SQL. It permits a canonical owner to read their own plan without a redundant membership row, still requiring creator=current actor. No write grants or foreign plan access. Historical migration bytes unchanged; exact hash and latest reviewedThrough registered (56 hashes). Local CLI migration ledger was not advanced by the direct policy test application; do not infer remote deployment.

Non-destructive rollback requires a new migration restoring the former member-and-creator predicate, retaining data. No rollback executed. Remote application/deployment remain unauthorized.

## Final validation — after last implementation edits

| Command | Exact outcome |
|---|---|
| `node --test tests/phase4-intelligence.test.mjs tests/phase4-orchestration.test.mjs` | 53 pass, 0 fail |
| `npm.cmd test` | 1230 total, **1227 pass**, 0 fail, **3 skip**, 15.605s |
| `npm.cmd run typecheck` | pass |
| `npm.cmd run lint` | pass |
| `npm.cmd run validate:migrations` | 56 reviewed immutable hashes, pass |
| `npm.cmd run validate:security` | 940 committable files checked, pass |
| `node scripts/validation/run-phase4-local.mjs build` | production build pass, guarded local config |
| `npm.cmd run validate:http-security` | pass /, /login, /privacy, /auth/callback; temporary server ended |
| `git diff --check` | pass; Git reports existing LF/CRLF conversion notices, not whitespace failures |
| `node scripts/validation/verify-phase4-boundaries.mjs` | **32 real local checks pass**, final rerun, generated resources cleaned |
| `node scripts/validation/verify-local-document-memory.mjs` | **41 pass**, local resources cleaned |
| `node scripts/validation/verify-local-workbook.mjs` | **21 pass**, local resources cleaned |
| `node scripts/validation/verify-workbook-sql.mjs` | transactional import/receipt/isolation checks pass |
| `node scripts/validation/evaluate-phase4-baseline.mjs` | five retrospective cases executed, zero model calls |

Logs: `.codex-phase4-final-suite.log`, `.codex-phase4-focused.log`, `.codex-phase4-build-final.log`, `.codex-phase4-boundaries-final.log`, `.codex-phase4-http-final.log`. The full suite includes existing Phase 1–3 regressions. Three skips: isolated workflow fencing/concurrency, isolated Drive database boundaries, isolated revenue-impact append-only/concurrency. They require separate named containers; no extra services were started or target safety checks bypassed. An exploratory 1205-test run had six failures; focused fixes and final full passes supersede it. One local build failed on retrospective `.ts` artifacts; snapshots were renamed `.ts.txt` and final builds passed.

## Inference budget and residual acceptance

**20/20 application requests consumed; zero remaining.** Includes Q17/18 no-evidence/no-model, Q19 deterministic preparation and Q20 client-cancelled analysis. Known reported tokens including completed repairs: 31,333 input/3,657 output/34,990 total; Q1/2 usage unavailable (logged zeros are not zero consumption). Local provider USD0. Do not run another inference without explicit new authorization.

Live table/artifacts: report and `artifacts/phase4/live-metrics.json`; logs `.codex-phase4-dev.log`, `.codex-phase4-production.log`, `.codex-phase4-production-final.log`, `.codex-phase4-acceptance.log`. Q11 daily/Q12 comparison/Q13 hostile/Q14 sum accepted; Q15 misworded mixed-currency relation was fixed in validation; Q16 fell back correctly. Q17/18 unavailable states passed restraint but do not establish rich synthesis. Q20 cancelled display; backend completed, so actual provider interruption remains unproven. UI/persistence observation is not universal prompt-injection immunity.

Gmail history blockers remain: initial-sync checkpoint race, bounded incremental pages/500 changes and oversized-history handling. No exhaustive history or no-reply claims. Source freshness/claim support remains bounded and heuristic. Needed before GO: conflict classification and ambiguity clarification, richer positive company/contact and Reports coverage, useful supported scoped-follow-up synthesis, remaining manual accessibility/provider acceptance. No confirmed tested tenant bypass or unauthorized execution; no categorical absence-of-vulnerability claim.

## Next concrete step

Read report and inspect current fixture/worktree, not another reconnaissance/reset. Read-only starting commands: `git status --short`; `node scripts/validation/inspect-phase4-effects.mjs current`; verify listener path/parent before any build. Complete outstanding deterministic implementation gaps with focused tests. A separately authorized campaign of at most ten synthetic requests on the same local provider/zero paid spend is proposed for missing acceptance; this task's cap must not be silently reset. No remote action, new scope/service or final business execution is needed. Saved screenshots and `/prepared` can be reviewed immediately without inference.
