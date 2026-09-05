# Phase 3.3 implementation plan

Status: recovery completed locally on 5 September 2026. PHASE 3 FINAL GO for the supported local scope, with verification limits recorded in the final report. Baseline branch: astra/product-transformation; recovery preserved the intentional dirty worktree. Phase 3.2 durable CSV implementation and browser detail verified present.

Recovery: continued the intentional dirty worktree on 5 September 2026 without reset, commit, push or remote migration. The existing synthetic business `[TEST] Phase 3.3 Workbook acceptance` was present but empty; it was reused. Final recovery evidence and decision are recorded in `phase-3-3-final-report.md`.

Recovery classification before edits: parser/vendor COMPLETE implementation but process-failure evidence UNTESTED; workbook UI PARTIAL visual acceptance; OI PARTIAL browser acceptance; source-linked import BROKEN for extra unmapped values and omitted-field updates; signal compatibility BROKEN for multiline normalized context and source-owner promotion; synthetic workspace COMPLETE creation / UNTESTED imports; final suite/build UNTESTED. Recovery patches stay within these boundaries.

Risk: HIGH, with final release evidence requested locally. No commit, push, deployment, remote migration, demo reset, new external scopes, formula execution or Phase 4 expansion.

## Ordered work

1. Vendor the approved official SheetJS CE 0.20.3 unchanged, retain Apache-2.0 attribution. Establish a server-only isolated parser, conservative ZIP/container and normalized projection limits; test hostile inputs before admission.
2. Extend existing immutable source/version storage through one additive migration. Keep CSV compatible; preserve live tenant checks, deletion and provenance. Test actual local SQL and Storage/RLS.
3. Build a read-only workbook viewer with sheet navigation, coordinate rails, cell inspector, formula/cache distinction and visible coverage. Extend the accepted upload state and bounded source retrieval.
4. Reproduce legacy CRM failure, then converge structured import on server-owned transactional confirmation, duplicate decisions, replay identity and durable receipts. Test failure rollback and retry in an isolated local workspace.
5. Create a synthetic corporate workbook. Verify native browser upload/save/reopen/Ask/import/receipt, keyboard, themes, desktop/mobile and reduced motion. Review security and product quality.
6. Stabilize with focused gates. Run the final full repository suite once and production build once only after implementation is complete. Report unproven acceptance explicitly.

## Architecture choices

Reuse version metadata for a bounded workbook projection rather than a parallel storage system; preserve actual sheet and cell coordinates. Parsing runs in a Node child process with a deadline and heap ceiling rather than the main request or client. ZIP metadata is checked before decompression; it is not malware scanning. A single database transaction owns each supported import target batch and receipt rather than attempting compensating client writes.

## Confirmed legacy P1

The recovered legacy implementation in `src/lib/imports/actions.ts` inserted a pending batch, then inserted and updated records in separate requests. A later failure could leave records persisted while returning zero created; final receipt errors were ignored and replay accepted any found batch. The replacement server-only transactional RPC includes duplicate mode in its fingerprint. Real PostgreSQL failure injection now proves complete rollback, retry and replay for all three CRM targets.

## Dependency inspection

Official tarball: https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
SHA-256: 8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8.
Installation adds one package. Existing Next.js nested PostCSS audit findings were outside this focused patch; no broad dependency upgrade was performed. This work does not claim a clean dependency audit or remote release approval.
