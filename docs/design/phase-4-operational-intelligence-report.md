# Phase 4 — Operational Intelligence implementation report

**PHASE 4 IMPLEMENTATION NO-GO.** Working local implementation, real authorization tests and a persisted preparation handoff exist. Required conflict/synthesis acceptance remains incomplete. The authorized limit of **20 application requests** is exhausted. No deployment, live Google acceptance or universal accuracy/security assurance is claimed.

Starting baseline: clean `astra/product-transformation` at `8aa5f52`, 2026-09-05. Current execution and restart instructions: [Phase 4 checkpoint](../exec-plans/active/phase-4-operational-intelligence.md).

## Architecture and source coverage

The existing `/api/ai/copilot` calls `runOperationalIntelligence`: current actor/workspace authority → three independently bounded read groups → deterministic calculations/comparison → existing provider synthesis → claim/citation validation → fresh authority/source checks → shared answer. No new assistant, context store, dependency, provider, service or model download. No commit, push, branch switch, reset or deployment. Phase 1–3 and frozen host layouts are preserved.

| Family | Authoritative adapter and visibility | Actual coverage and acceptance |
|---|---|---|
| Companies | Existing Copilot/universal context; current tenant and canonical organization ID | Explicit associations and existing notes/context. Narrowing test passes; Company Ask Q17 exercised, but relevant associated status evidence was absent. Rich positive synthesis unaccepted. |
| Contacts | Existing contact context and exact associations | No implicit workspace expansion. Narrowing test and real Contact Ask Q18; Google unavailable, no invented no-reply claim. |
| Opportunities | Existing tools/commercial truth/canonical intervention brief | Existing owner, urgency, next-step and exposure rules; no new score. Q11 useful briefing, Q12 comparison, Q19 real preparation target. |
| Internal Documents | `opportunity_documents`, `documents.read`, authorized opportunity IDs before body query | Up to 100 documents across 200 visible opportunities, eight matching excerpts. Explicit company/contact relations. Adapter and regressions; no live internal-document synthesis case. |
| Local CSV/XLSX | `getLocalDocument`, private immutable versions/retained projection | Metadata discovery: 2 pages/40 recent versions, latest per source. All retained rows/sheets searched before excerpts; two files concurrent, 12 excerpts/file and 16 total. Q4 unselected two-file discovery, Q5/6 late row, Q13 later sheet, Q3/14 sums. Real local document/workbook checks. |
| Drive / Docs / Sheets | `getDriveWorkspace`/`getDocumentSourceDetail`, own current provider connection | Selected files only, up to 10 sources/two segments each; explicit opportunity scope before body retrieval. Actual local owner/teammate RLS tests with synthetic provider rows; no Google network acceptance. |
| Gmail | Existing Google context/repository, owner-private account/grants | Bounded retained mail only. Real local two-owner/revocation tests; Q18 missing connection. Historical checkpoint problems remain; no absence-of-reply or exhaustive-history claim. |
| Meetings / Calendar | Existing meeting/external-context tools, private provider ownership | Bounded retained events. Bucharest next-week and DST tests pass. No live Google Calendar acceptance. |
| Activities | Existing universal/commercial-truth history | Bounded authorized events, current record destinations; existing regressions and brief runtime, not exhaustive history. |
| Commercial Inbox | Existing execution/context contracts | Reuses authorized signals and canonical ranking. Regressions and daily runtime; no independent inbox acceptance campaign/redesign. |
| Approvals | Existing canonical briefing/approval contracts | Pending remains pending; existing regressions. No new approval created in this task. |
| Prepared Work | Existing registry plus `getAskPreparedWork` | Own opportunity-target Ask plans in `/prepared`; organization-note plans not added to this projection. Q19 real handoff; concurrency/replay/owner tests. |
| Workflows | `getCommercialWorkflowWorkspace`, existing `settings.update` boundary | Loader bounds 50 definitions/50 recent runs, answer samples 8+8. Errors remain unavailable. Read-only; no worker/activation. Isolated workflow Postgres test skipped. |
| Reports | `getFollowUpWorkspaceSummary`, `reports.read` | Canonical follow-up metrics only: **partial Reports coverage**, not all revenue/impact calculators. Existing calculator tests, no live report synthesis case. |
| Apps | `getGoogleWorkspacePublicState` | Google connection/health metadata only, not content permission or all-provider health. Existing regressions. |

Adapters use bounded lexical routing, not universal semantic retrieval. They are queried when relevant; page opening makes no model call. A 12-second independent read budget preserves successful evidence when another source fails. Underlying read-only database promises may finish after abandonment.

New modules: `operational-intelligence`, `intelligence-{adapters,authority,documents,evidence,prompt,read-budget,validation}`, `ask-prepared-work`, `IntelligenceEvidence`. Narrow existing changes cover route/types/validation, planner, canonical evidence, Google dates/private Drive/local discovery, provider cancellation, workflow error propagation and `/prepared`. Existing source-shape tests follow moved citations/actual pending UI; planner mocks now exercise fresh permission and replay checks. No test was intentionally weakened to allow unauthorized behavior.

## Evidence, arithmetic and matching

Typed provenance carries family, record/source identity, version or observed revision, retrieval/analysis time, available modification time, locator, classification, visibility, coverage, independence key and optional explicit associations. Unknown revisions/times remain null. Complete created/modified timestamps are not available for every legacy source. Fresh checks cover current actor/role, local document lifecycle/hash, selected Drive revision, private email/calendar grants and canonical record existence; they do not prove every legacy field stayed unchanged during synthesis.

Stable source/version/row IDs map to at most eight model aliases and back. Same-version excerpts and identical retained content hashes count as one source. This is not general semantic deduplication of CRM/email/imported representations. Citation destinations are server-generated application routes. Full navigation with an inspection query re-enters route authorization even for the already-open document. Browser verified exact pinned version and `#structured-preview`; automatic cell highlighting was not added.

Server operations support sum, top per currency, missing next action and row count over the full supported retained projection, before excerpt selection. Exact money uses `sumImpactMoney`; no FX, arbitrary code, generated SQL or formula execution. Unknown filters never silently use an unfiltered total. Ambiguous monetary formats/missing currencies are excluded. Zero/false, leading-zero identifiers and cached formula values are preserved; unavailable formula caches are not missing next actions. Result includes definition, included row IDs, exclusions and partial flag, with row disclosure in the drawer.

The browser fixture has 36 Pipeline data rows: **660.30 RON and 3.00 EUR**, separately. București: **320.10 RON and 3.00 EUR**, separately. Production code contains none of these fixture amounts/names. Q14's headline mentioned only RON; its material claim and calculation showed both currencies, an incomplete-headline coverage weakness. LATE-031 is data item 31 but physical workbook **row 32**, since row 1 is headers. Frozen P4-05 says “Row 31”; that mismatch is documented, not silently changed after measurement. Later-sheet discovery succeeded in Q13.

Comparison exposes source and CRM values with timestamps and estimates clearly separated from revenue. Exact unique title matching creates review candidates, not identity proof. Q12 compared workbook 0.1 RON with CRM estimated 1200 RON and next-step differences, with explicit identity warning. Compatible statuses are not hard-coded as conflicts. However, complete genuine-conflict/compatible-detail/newer-update classification and ambiguous-candidate clarification are **not implemented/accepted**. Duplicate title candidates are omitted rather than interactively clarified. This remains a required-outcome gap.

Only previous user intent is reused for supported follow-up prefixes; assistant output is never fresh evidence. Repeated chains can lose earlier operation intent. Missing historical snapshots get an explicit no-trend limitation. This is bounded follow-up resolution, not a general conversation referent engine.

## Provider, validation and live evidence

Actual application provider: existing loopback Ollama **qwen3.5:9b**, independent of Codex. Contract `operational-intelligence/1`; complete JSON input below 5,800 characters, eight evidence entries, three short claims, two unknowns/two follow-ups, 100-word instruction. Runtime: 8,192 context, 480 output tokens, thinking disabled, 45-second timeout, at most one repair. No execution tools supplied. OpenAI alternative retains existing integration with SDK automatic retries disabled and abort signal wired.

Server checks schema, authorized citation membership, numeric/currency pairs, finite commercial outcomes, financial claims in claims/conclusion, plain text/unsafe URLs and internal alias prose. Lexical claim support is a conservative heuristic, **not semantic entailment proof**. Unknowns/follow-ups are bounded plain text, not independently verified facts. No universal prompt-injection immunity is claimed.

Q15 exposed accepted but misleading currency-inclusion wording and internal alias prose despite correct arithmetic. New regression guards reject those forms. Q16 then rejected both attempts and returned the correct separate-currency fallback. Safe rejection passed; model-backed scoped-follow-up usefulness did not. Final zero/false CSV excerpt and truthful no-evidence wording corrections were tested after browser inference without exceeding the request cap.

Exactly **20 application requests**, including deterministic preparation and cancelled analysis. Q17/18 had no evidence and invoked no model; Q19 used deterministic preparation. Q1–11 were development-mode iterations; Q12–20 used local production builds. These are not twenty successful inferences or twenty distinct manifest cases.

| Request | Actual outcome | Latency ms | Input/output tokens |
|---|---|---:|---:|
| Q1 daily | Timeout/limited | 45917 | unavailable |
| Q2 sum | Model failure/limited | 24264 | unavailable |
| Q3 sum | Accepted exact split totals | 4266 | 1447/97 |
| Q4 discovery | Accepted, two unselected documents | 4419 | 861/100 |
| Q5 late row | Retrieved, synthesis rejected | 6647 | 1631/218 |
| Q6 late row retry | Numeric-support rejection | 6264 | 1529/210 |
| Q7 comparison | Rejected; source ordering corrected | 10416 | 3067/371 |
| Q8 comparison | Numeric-pairing rejection | 10583 | 3083/375 |
| Q9 comparison | Claim-support rejection | 9760 | 3083/365 |
| Q10 daily | Unsupported headline rejected | 7672 | 1872/259 |
| Q11 daily | Accepted concrete canonical interventions | 5086 | 1108/163 |
| Q12 comparison | Accepted after repair, identity warning | 10428 | 3381/374 |
| Q13 hostile/later sheet | Accepted source analysis, no preparation | 4057 | 1511/103 |
| Q14 full sum | Accepted; EUR omitted only in headline | 4436 | 1525/118 |
| Q15 scoped follow-up | Prior validator accepted; editorial support review failed | 8139 | 3117/266 |
| Q16 filtered sum after fix | Two rejections, correct deterministic partial | 11030 | 3101/394 |
| Q17 Company statuses | Insufficient associated evidence; no inference | 1721 | 0/0 |
| Q18 Contact email | Own Google unavailable; no inference | 759 | 0/0 |
| Q19 explicit preparation | One prepared plan, no execution | 319 | 0/0 |
| Q20 global cancellation | Client discarded result; backend completed | 6948 | 1017/244 |

Reported usage including completed repairs: **31,333 input +3,657 output =34,990 tokens**. Q1/Q2 usage is unavailable, not zero. Local provider charge **USD 0**; no paid API/purchase. For 15 requests with reported model tokens, total latency min/median/max =4,057/6,948/11,030 ms. This selective iteration sample is not an SLO. Representative retrieval/synthesis-and-recheck: Q11 500/4422 ms; Q12 364/9916; Q13 165/3748; Q14 169/4116; Q15 176/7808; Q16 165/10676. Earlier cases predate stage instrumentation. Safe telemetry contains request IDs/counts/timing/model/categories, not source bodies/secrets. Local artifact `artifacts/phase4/live-metrics.json` holds the table.

Rubric: relevance, support, coverage, conflict handling, usefulness. Review was by the implementation agent, not independent user sign-off or LLM self-score. Q11/12/13 were useful supported examples; Q14 coverage imperfect; Q15 support failed; Q16 safe fallback but synthesis usefulness failed; Q17 did not establish false-conflict reasoning because associated evidence was missing. No aggregate accuracy score is justified.

## Preparation and adversarial boundaries

Analysis runs with request-local preparation intent false and no model execution tools. Document analysis remains read-only even with forged flags/history/source instructions. Explicit preparation opens a separate review and uses current actor/workspace/target/parameters and existing planner. Fresh role/target checks precede insert. Idempotency binds actor/workspace/target/revision/proposal/evidence; concurrent retries return the existing plan. Applying/sending stays behind the existing final confirmation.

After 18 analyses, fixture had **zero plans**, and three opportunities retained original `reviewed` status and creation-time `updated_at`. Q19 created plan **7ec59640-7340-4ba4-8eb0-6604b17d8d43**, `create_task`, target **e03e013b-1102-463c-91ec-b92757f1c2e1**, actor **a39908e5-def0-4a0f-bd71-185830464172**, status **prepared**. `/prepared` showed one item awaiting human review. “Aprobă și aplică” was never activated. After Q20 the same plan remained prepared and inspected opportunity fields were unchanged. This is scoped persistence evidence, not a claim about every metadata table.

`verify-phase4-boundaries.mjs`: **32 real local checks**, generated users/JWT clients, Auth/PostgREST/Storage/RLS; only Next request identity injected. Includes owner/provider positive controls, cross-tenant/teammate denials, direct browser insert denial, concurrent prepare/replay, stale-role demotion, membership revocation, deleted source, own Gmail/Drive and grant revocation, no opportunity execution. Random resources cleaned in finally. Synthetic provider rows are not live Google data. Pure orchestration tests additionally cover history laundering, forged citations/intent, mid-synthesis revocation, source failure, two-attempt repair and concurrent request-local analyze/prepare isolation. CSV/XLSX and synthetic email/Drive/notes/title text remain untrusted; live Q13 demonstrated useful hostile-source analysis without persistence.

Browser cancellation proves result discard/question retention and no business write. Its backend completed; therefore **end-to-end inference interruption is not proven** despite abort wiring and passing abort unit tests. No confirmed P0/P1 tenant bypass or unauthorized execution was reproduced. High-priority product acceptance gaps remain: semantic conflict/identity handling, unstable synthesis support/usefulness and partial Reports coverage. Schema validity does not remove semantic false-association risk.

## Migration and rollback

Additive `20260905200500_phase4_prepared_owner_visibility.sql` corrects `ask_action_plans_owner_read`: creator must equal current profile, plus canonical ownership OR active membership. Real positive testing found owners without redundant membership could create but not read their own plans. No new table, write grant, provider permission or ownership-chain change. Historical bytes unchanged; exact new hash/latest reviewed-through registered, **56 hashes** verified.

Applied only to existing local `supabase_db_M` using guarded `runLocalSql`; no remote migration and no new CLI ledger deployment. Non-destructive rollback: a new migration restoring `is_business_member(business_id) AND created_by_profile_id=current_profile_id()`, preserving plans. This also restores the owner-without-membership limitation. Application rollback must be a reviewed inverse Phase 4 patch/old route entrypoint, preserving Phase 1–3 and fixture data; no reset/restore was executed. Rollout and live provider acceptance need separate authorization.

## Browser and visual evidence

Real in-app browser at localhost:3001 in isolated synthetic workspace. `/ai`, global Ask, Company 360 Ask, Contact Ask, document Ask and Prepared were exercised. Shared canvas: main findings 15 px, supporting text computed 13 px, bounded reading measure, inline citations, collapsed coverage, native evidence Drawer. Agent corrected 10–11 px provenance labels and light muted/faint text. Secondary RGB 86/98/115 on white is approximately 6.2:1; earlier muted/faint values failed 4.5:1. This measures selected shared Ask text, not a WCAG certification or global shell audit.

| Screenshot | Evidence |
|---|---|
| [Comparison dark](../../artifacts/phase4/comparison-production-dark.png) | Q12 supported values + candidate limitation, before final text refinement |
| [Calculation drawer](../../artifacts/phase4/calculation-evidence-light.png) | Exact version, 36 rows/0 exclusions, source link |
| [Desktop light](../../artifacts/phase4/workbook-sum-light-1440.png) | Q14, 1440 px, before contrast correction |
| [Final initial 1440 light](../../artifacts/phase4/initial-final-light-1440.png) | Final build, no model call on opening |
| [Final 1024 light](../../artifacts/phase4/initial-final-light-1024.png) | Stable viewport simulation, document width 1024; not native zoom |
| [Corrected 390 partial](../../artifacts/phase4/followup-corrected-light-390.png) | Q16 fallback; document width 380 px, no horizontal page overflow |
| [390 evidence](../../artifacts/phase4/evidence-light-390.png) | Drawer/version wrapping and scrolling |
| [Hostile source dark](../../artifacts/phase4/hostile-source-dark.png) | Q13 later-sheet analysis |
| [Contact unavailable](../../artifacts/phase4/contact-private-unavailable-light.png) | Google absent, no no-reply conclusion |
| [Preparation review](../../artifacts/phase4/preparation-review-light.png) | Separate explicit confirmation |
| [Prepared handoff](../../artifacts/phase4/prepared-handoff-light.png) | One editable plan awaiting human approval, recaptured/inspected after an initial blank capture |
| [Final prepared dark](../../artifacts/phase4/prepared-final-dark.png) | Final build, original dark theme restored; the same plan is still unexecuted |

Native evidence Drawer Escape/restored citation focus and exact full source navigation passed. Shift+Enter inserted newline; cancellation preserved question. Existing IME guard/reduced-motion CSS retained and regressions pass. Native IME, OS reduced-motion emulation and native zoom were **not** manually exercised; viewport simulation is not native zoom. Earlier `intelligence-desktop-light.png` is actually dark and is not light evidence. Screenshots were agent-reviewed; user visual sign-off is not claimed.

## Frozen evaluation coverage

Manifest `tests/fixtures/phase4-evaluation.json` froze 28 questions before final measurement; its original baseline/final placeholder strings remain frozen input. Results live here. IDs/amounts bind to checkpoint fixture. Test counts are not case acceptance counts.

| Cases | Final status/evidence |
|---|---|
| 01 | Q11 useful canonical briefing; richer approvals/meetings fixture not live-scored |
| 02–03 | Scope tests pass; UI Q17/18 missing-source controls; rich positive synthesis incomplete |
| 04–06 | Discovery/late row/later sheet pass; late-row synthesis rejected; physical-row discrepancy documented |
| 07–10 | Arithmetic/top/partial/currency deterministic tests pass; sums live, top/partial fixture-only |
| 11 | Same version/content-copy independence tests pass; UI counts inspected |
| 12 | No silent merge; interactive ambiguous-candidate clarification incomplete |
| 13–14 | Candidate comparison Q12 useful; genuine/compatible semantic conflict acceptance incomplete |
| 15 | Pin/forged-old-version denial tests pass, exact version opened; no live historical synthesis |
| 16 | Bucharest next-week/DST tests pass; no live Calendar acceptance |
| 17 | Missing-history caveat implemented, no live trend case |
| 18–20 | Real local private/cross-tenant positive/negative controls pass; Q18 unavailable UI; no live Google |
| 21 | Local deletion/revocation and orchestration stale-evidence rejection pass |
| 22 | Hostile fixture tests and useful Q13 pass; not universal immunity |
| 23 | Q19 persisted one plan; real concurrent/replay positive/negative controls pass; no execution |
| 24 | Explicit broadening with pinned version Q12; implicit-broadening denial tests pass |
| 25 | Arithmetic/filter pass; Q15 wording failed; Q16 safe fallback; model synthesis fails acceptance |
| 26 | Renamed entities/changed values deterministic pass; no independent live paraphrase campaign |
| 27 | Unsupported IDs/money/HTML/outcomes rejected in tests; Q15 guard regression added; semantic residual remains |
| 28 | Abort unit tests + browser discard/no-write pass; backend inference interruption unproven |

Retrospective baseline: `node scripts/validation/evaluate-phase4-baseline.mjs` executes original `8aa5f52` selected-document code with an authorized synthetic loader, without checkout/reset/model calls. Five paired cases ran, **zero model calls**. Baseline already found late rows, capped evidence at 12 and had no typed calculation. Current core computes full sums/top/filter across its separate 40-row fixture: 814.30 RON +3 EUR, intentionally different from the 36-row browser fixture. This is not a contemporaneous 28-case baseline or model-uplift benchmark.

## Validation and remaining decision

Final exact commands/results are synchronized in the checkpoint after the last implementation edit: focused tests, full repository suite (including existing Phase 1–3), typecheck, full lint, migration integrity, repository safety, production build, diff check and local database harnesses. Three conditional suite skips require separately named isolated Postgres containers (workflow fencing, Drive database boundaries, impact concurrency/append-only). Existing general local Supabase must not be substituted into isolated-only harnesses. No new services were started. Complementary real Phase 4 tests do not erase those skips.

Final implementation gates: `node --test tests/phase4-intelligence.test.mjs tests/phase4-orchestration.test.mjs` **53/53 pass**; `npm.cmd test` **1230 total /1227 pass /0 fail /3 skips**, 15.605s; `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run validate:migrations` (**56 hashes**), `npm.cmd run validate:security` (**940 committable files**) and `git diff --check` pass. `node scripts/validation/run-phase4-local.mjs build` passes the installed production Next build using existing guarded loopback Supabase/preview/no-send environment. Local harnesses: document memory **41**, workbook **21**, Phase 4 boundaries **32** pass; workbook SQL import/receipt/isolation checks pass. HTTP security gate and final process identity are recorded in the checkpoint. No remote-configured build was served. Exploratory failed tests/builds were corrected and broad gates repeated; their earlier results are not substituted for these final counts.

Gmail initial-sync/checkpoint, bounded incremental pages/changes and oversized-history handling remain production-critical coverage prerequisites. A briefing does not repair these gaps. No mailbox completeness or absence-of-reply claim is permitted.

Required remaining implementation: genuine/compatible conflict classification with explicit identity/time, candidate clarification, positive rich company/contact and broader canonical Reports coverage, and reliable supported synthesis for scoped follow-ups. After those fixes, a separately authorized campaign of at most ten synthetic requests on the same local provider, zero paid spend, can establish the missing live evidence. Deployment/provider scope expansion is not needed for that decision. **NO-GO** until required acceptance passes.

## Reproducible five-minute CEO demo

Use the existing synthetic Phase 4 workspace and pinned file in the checkpoint. The saved plan/screenshots are inspectable without inference. New demo inference requires fresh authorization because this task reached 20 requests.

1. `/ai`: ask what matters today. Inspect canonical urgency, owner/next-step evidence and limits; values are estimates.
2. Open the named opportunity from the answer; inspect its current owner and missing scheduled action in the unchanged host.
3. Open Intelligence.xlsx, choose **Versiune + CRM autorizat**, compare the currently named contract with CRM. Use current fixture names/values; show candidate-identity limits.
4. Open the evidence drawer and authorized source. Verify version and physical row; calculations come from retained server data, separately by currency.
5. On the opportunity, describe a supported future task, choose **Pregătește propunerea descrisă**, review and **Confirmă pregătirea**. Show `/prepared` awaiting human review. Do not activate **Aprobă și aplică**. The existing saved item can be shown instead of creating another; replay requires unchanged actor/target/revision/proposal/evidence.
