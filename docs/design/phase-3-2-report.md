# REVENew ASTRA PHASE 3.2
# DURABLE DOCUMENT MEMORY & OPERATIONAL INTELLIGENCE RETRIEVAL REPORT

Date: 2026-09-05. Repository: `C:\Projects\ReveNew`. Branch: `astra/product-transformation`.

**Decision: PHASE 3.2 FINAL GO.** The native-picker save/reopen/Ask/import-exit journey passes; the user confirmed manual drag/drop. The disabled-save visual correction is complete and behavior is unchanged. Exactly one newly authorized final full suite and one final production build passed after all product edits. No confirmed P0/P1 implementation defect remains from the checks performed. The three existing environment-gated tests remain explicitly disclosed below; this is Phase 3.2 local implementation closure, not deployment approval.

## Recovery classification

| Area recovered from the worktree | Initial classification | Current evidence |
| --- | --- | --- |
| Local source/version, private Storage and Postgres lifecycle | Implemented, required fresh verification | 41 real local Storage/Postgres checks passed |
| Immutable version identity and deletion eligibility | Implemented, required fresh verification | Cross-account original hash, overwrite denial, revocation, finalization/deletion retry checks passed |
| Selected local document retrieval | Implemented; truncation disclosure incomplete | Corrected coverage calculation; behavioral tests and real browser answer passed |
| Request preparation authority | Implemented; security tests partial | Real orchestrator, dispatcher and planner tests completed, including positive authorization control |
| Existing module bindings | Required fresh verification | Focused regressions passed without weakening assertions |
| Native browser selection | Broken in recovered local runtime | Two concurrent repository dev servers shared `.next`; after stopping both and starting one local server, the same native chooser worked before component replacement |
| Add Document presentation | User rejected initial quality | Narrow selected-file state, validation, replacement, secondary Drive treatment and responsive hierarchy completed |
| Repository gates | Untested at recovery | Results and timing below |

The old `docs/exec-plans/active/A3.2-closeout.md` describes a different operational-convergence checkpoint. It was not treated as evidence for this document-memory phase or overwritten.

## Data and authority contract

Exact migration: `supabase/migrations/20260905135710_local_document_memory.sql`.

Exact new tables:

- `public.local_document_sources`
- `public.local_document_versions`
- `public.local_document_segments`
- `public.local_document_audit`

Private bucket: `commercial-document-originals`, public access disabled, 2 MB object limit, `text/csv` admission. The source/version architecture is generic; this release admits CSV UTF-8 only. No Excel/PDF extraction claim is made.

All four tables have RLS. Authenticated clients receive SELECT only, scoped through current business access and the source/version relationship. Segments additionally require an active source and ready version. Metadata for pending/deleted lifecycle states remains available as appropriate for retry and audit. Reservation, association and deletion-start RPCs check current authenticated profile, canonical ownership or active writer membership. Client-supplied identifiers select records; they do not grant access.

Storage SELECT requires exact object-key/version binding, a ready version, active source and current workspace access. Restrictive policies deny client insert/update/delete even if another permissive policy is later introduced. Anonymous originals access is denied. The server-only service client stores new objects with `upsert:false`, downloads stored bytes for validation, and finalizes through a service-only transaction. The authenticated download path rechecks Storage RLS, including revocation with a still-live token.

Deletion removes source retrieval eligibility and extracted segments before physical object removal. A failed removal stays `deletion_pending`; explicit retry completes the physical removal and tombstone. Originals have no automatic expiry or dependency on the import wizard. Ready-version identity, hash and extraction metadata are guarded; new versions use distinct UUIDs/object keys. This is an application/client immutability contract, not a claim that a database administrator cannot change storage.

The SQL bytes were preserved. After reviewing the service-only grants and passing live negative tests, the exact normalized hash was registered in `scripts/validation/migration-integrity-baseline.json`, with `reviewedThrough` advanced. The scanner was not weakened. No migration was applied remotely in this recovery run.

## Retrieval and preparation security

Operational Intelligence retrieves the explicitly selected authorized source and version. It returns deterministic, bounded document excerpts, not an unrestricted agent or a whole-workspace semantic search. Coverage is at most 12 logical CSV rows and 1,000 characters per row, with partial coverage disclosed. Answers preserve source/version identity and logical row provenance in evidence identifiers, labels and links. Headers count toward excerpt truncation after the recovery fix.

The UI uses an explicit preparation checkbox for ordinary Ask. The request parser admits only a strict top-level boolean. The server establishes `AsyncLocalStorage` preparation capability before dispatch. Model tool arguments, source cells, nested context and conversation history cannot change it. Selected-document requests always run with preparation disabled, even if that top-level flag is true. The tool dispatcher rejects preparation tools and strips write-request fields from read tools; the persisted planner independently refuses calls without request-local capability. Normal server permissions and target authorization still apply when direct preparation is enabled.

Tests use malicious source text including instruction override, immediate plan creation, external spreadsheet sending, marking an opportunity won, account deletion and email preparation/sending. The real selected-source orchestrator does not invoke the provider or tools; dispatcher/planner tests prove no preparation writes without capability. A positive control reaches only the `ask_action_plans` persistence adapter when explicit intent and server permissions are both present. Removing permission prevents that write. Canonical record mutation, approval and external execution remain separate controlled flows. Document content cannot grant those capabilities.

## Actual browser acceptance

Chrome native file chooser used `C:\Users\david\AppData\Local\Temp\revenew-phase32-synthetic.csv`, containing three synthetic rows, including a literal injection instruction. No customer data was used.

Saved source: `8eb35c0c-650d-4d04-b549-2dd5861cea36`.
Saved immutable version: `5f0d7fd2-603c-407f-bc88-f6257407623c`.

Verified through the UI:

1. Native selection visibly displays filename, CSV type, byte size and `Pregătit pentru salvare`.
2. A malformed CSV visibly displays an error and disables saving; selecting a replacement works.
3. Save reaches the ready document detail and displays all three logical rows.
4. Navigate to Documents, locate the saved CSV and reopen it.
5. Ask about Meridian Synthetic. The answer displays saved facts, row evidence, the exact version and the source-trust caveat; no preparation is exposed.
6. Enter optional import and leave via the document link. The same original and preview remain.
7. Reload the document route. The same ready version and rows remain available.

The stored original was also downloaded through the local service test client and compared byte-for-byte by SHA-256 to the input: match; metadata state `ready`, three rows. Separate authenticated sessions/accounts in the live integration test confirmed original retention and authorized sharing. A full browser logout/login cycle was not performed.

Upload visual checks: 1440 desktop and 390 mobile, light/dark, visible keyboard focus, Enter-activated picker, valid/invalid states and replacement. No horizontal overflow at 390. Reduced-motion emulation showed no selected-state animations. Dark theme was restored and temporary viewport/media overrides cleared. Google Drive remains an alternative, with secondary styling only in selector mode; OAuth/domain behavior was not changed.

**Manual browser drag/drop confirmed by the user during final closure.** The user dragged `C:\Users\david\AppData\Local\Temp\revenew-phase32-replacement.csv`; Add Document visibly changed to the selected-file state and displayed `Pregătit pentru salvare`. This is human acceptance evidence, distinct from the passing component-level drop tests.

Final narrow visual correction: `Documents.module.css` now gives only the upload save button's native disabled state a neutral surface, muted text, 0.65 opacity, a subtle inset border and no action outline or hover color change. No component behavior, permissions or page structure changed. Browser verification confirmed the invalid CSV retains `disabled=true`, neutral background even while hovered, and is skipped by Tab. Replacing it with a valid CSV restored the champagne primary background, opacity 1 and keyboard focus.

## Validation results

| Check | Result |
| --- | --- |
| `node scripts/validation/verify-local-document-memory.mjs` | 41 passed, real local Storage/Postgres; random fixtures cleaned |
| Final focused storage/document/retrieval/security and Phase 3/OI regressions | 147 total: 146 passed, 0 failed, 1 existing environment-gated skip |
| Preparation/retrieval tests within that set | 8 passed |
| Upload component tests within that set | 3 passed; native event, drop, validation, race, replacement and selected-byte submission |
| `npm run typecheck` after UI refinement | Passed |
| Full `npm run lint` after UI refinement | Passed |
| `npm run validate:migrations` | Passed; 52 reviewed migrations verified |
| `npm run validate:security` | Passed |
| `git diff --check` | Passed; line-ending warnings only |
| Full repository suite, run ONCE | 1,159 total: 1,155 passed, 1 failed, 3 skipped |
| Failing full-suite test follow-up | Stale `DriveWorkspace` source-shape requirement replaced with actual registry/detail-link/permission assertions; file passed 4/4 and is included in final focused pass |
| Production build, run ONCE against local Supabase configuration | Passed, Next.js 15.5.24; completed before the additional user-requested upload UI refinement |

The initial full-suite result above is historical and is not relabeled green. The three skips concern existing workflow Postgres, Drive Postgres and commercial-impact Postgres harnesses requiring separate opt-in environments. They do not replace the separately executed 41 local-document checks. The user subsequently authorized exactly one additional full suite and one additional production build for final closure after the disabled-state correction.

Final closure upload test: 3 passed, 0 failed, 0 skipped. Final closure full suite: 1,162 total, 1,159 passed, 0 failed, 3 existing environment-gated skips. Final production build: passed, Next.js 15.5.24, including compilation, lint/type validation, page-data collection and static-page generation. These final runs occurred after the last product edit; no second final suite/build was run.

Local logs: `%TEMP%\revenew-phase32-full-tests.log`, `%TEMP%\revenew-phase32-focused-final.log`, `%TEMP%\revenew-phase32-build.log`.

Final closure logs: `%TEMP%\revenew-phase32-final-closure-suite.log`, `%TEMP%\revenew-phase32-final-closure-build.log`.

## Changes in this recovery turn

- `src/lib/ai/source-retrieval.ts`: correct truncation disclosure; remove synthetic-company-specific follow-up from production suggestions.
- `tests/local-document-memory.test.mjs`: complete real orchestration/dispatch/planner capability tests and coverage regression.
- `tests/buyer-demo-trust-repair.test.mjs`: update obsolete component-name assertion to current registry and permission contracts.
- `scripts/validation/migration-integrity-baseline.json`: register reviewed immutable migration bytes.
- `src/components/documents/LocalDocumentUpload.tsx`: validated selected-file state, native picker replacement, read race protection, drop validation and save of the verified local selection.
- `src/components/documents/Documents.module.css`, `src/app/(protected)/documents/add/page.tsx`: narrow hierarchy, professional Romanian copy, responsive and reduced-motion styling.
- `src/components/apps/DriveWorkspace.tsx`: secondary button style for `selectorOnly`; no integration behavior change.
- `tests/local-document-upload.test.mjs`: behavioral upload regressions.
- This report. All other recovered Phase 3/3.1/3.2 files remain in the intended dirty worktree.

No reset, restore, undo, commit, push, deployment or remote migration was performed. One local demo dev server remains running on localhost:3001. The synthetic saved document remains available for inspection.

## Final closure

- Manual native drag/drop: confirmed by the user.
- Invalid save visual state: neutral/dimmed, no primary hover/focus affordance; native disabled semantics preserved. Valid save remains primary.
- Proportional upload regression: 3/3 passed.
- One authorized final full repository suite: 1,159 passed, zero failures, three existing environment-gated skips.
- One authorized final production build after all product edits: passed.
- Diff hygiene: passed.

No confirmed P0/P1 defect from this pass. **PHASE 3.2 FINAL GO.** Remote rollout and the separate environment-gated legacy Postgres harnesses are not certified by this local closure. No commit, push, deployment or remote migration was performed.
