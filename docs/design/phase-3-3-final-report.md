# REVENew ASTRA PHASE 3.3 FINAL MASTER REPORT

EXCEL / XLSX BUSINESS WORKBOOK, UNIFIED IMPORT & PHASE 3 CLOSURE

5 September 2026. Repository: `C:\Projects\ReveNew`; branch: `astra/product-transformation`.

## A. Decision

**PHASE 3 FINAL GO for the supported local scope.** CSV/XLSX memory, bounded workbook viewing and OI, optional unified import, transactional CRM persistence and receipts passed the checks below. Known Phase-3 P0: **0**. Known supported-path Phase-3 P1: **0**. This is local engineering acceptance, not a claim that the user has signed off or that a remote release occurred.

## B. Recovery and scope

Continued the intentional dirty worktree and reused the existing empty `[TEST] Phase 3.3 Workbook acceptance` business. No reset, restore, stash, commit, push, deployment, remote migration or demo reset. Meridian and buyer-demo data were preserved. The original A–AQ template was not attached; this report adapts those labels to the recovery request.

## C. Recovered classification

Parser/vendor implementation was present, but child-process failures needed evidence. Workbook UI/OI were partially accepted. Source-linked imports had forged-extra-field and omitted-update risks. Signals had a multiline-context incompatibility and incorrectly treated declared owner names as assignments. The synthetic business existed without imports. Final suite/build evidence was initially absent. These gaps were corrected or verified without restarting the implementation.

## D. Dependency

SheetJS Community Edition **0.20.3**, installed as `file:vendor/xlsx-0.20.3.tgz`. The official archive remains unchanged. SHA-256: `8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8`. One package added; lockfile retained. Apache-2.0 license and attribution are in `vendor/SheetJS-LICENSE.txt`, `vendor/README.md` and the archive.

## E. Server boundary

XLSX parsing runs in a server-only Node child process with a minimal environment, 128 MB old-space ceiling, eight-second timeout and two concurrent parsers per server process. Timeout and synchronous launch failures release the admission slot and return sanitized errors. This is resource isolation, not an OS security sandbox or malware scanner.

## F. Formats

Supported structured local formats are CSV and ordinary OOXML `.xlsx`. Legacy XLS, XLSB, XLSM, encrypted workbooks and macro/binary/embedded-object containers are unsupported. Browser acceptance verified an XLSM rejection with saving disabled.

## G. Resource limits

XLSX admission: 2 MiB compressed, 32 MiB aggregate expanded ZIP, 1,024 entries, 64 sheet metadata entries, eight parsed sheets, 500 rows and 40 columns per parsed sheet, 20,000 inspected cells, 2,000 characters per cell, 800,000 retained text characters, and 2,000,000 serialized projection bytes. ZIP directory/span/size validation and bounded decompression precede workbook projection. XML DTD/entity declarations are rejected.

## H. Formula behavior

Formula text and cached value are separate evidence. No formula calculation occurs. A real child-process test retained cached `7` for formula `123456+1`. Browser inspection showed an uncached `=1+1` with `Rezultat memorat indisponibil`, not a fabricated result.

## I. Macro behavior

VBA/macro-enabled/binary/embedded content is rejected. VBA extraction is disabled. No supported execution path was introduced.

## J. External links

Cells retain only hyperlink-presence metadata; targets are not retained in the projection or fetched. A real parser process with a local HTTP listener caused zero requests. Workbook content is rendered as text, without SheetJS HTML output.

## K. Durable memory

Original bytes remain in private Storage under the existing source/version model. The bounded projection belongs to an immutable ready version. Existing authorized reads, deletion and evidence-clearing contracts remain canonical. Original download and exact-byte verification passed.

## L. Workbook viewer

Read-only workbook detail preserves the source identity and separates viewing/Ask from optional import. The recovered layout contains horizontal grid scrolling without page overflow. A fixed coordinate-column width corrected an oversized rail on short sheets; no global redesign was introduced.

## M. Sheets and coverage

Four-sheet corporate fixture: Pipeline, Companies, Contacts, and hidden Forecast and source assumptions. Sheet navigation and explicit hidden-sheet disclosure worked. A separate 601-row workbook displayed partial coverage of 500 rows and blocked import rather than claiming complete coverage.

## N. Grid and inspector

Column letters, row numbers, typed raw/display values and cell addresses remain inspectable. Cached C2 and uncached C3 were checked visually. ArrowDown moved selection from C2 to C3. Pagination bounds the rendered grid to 50 rows per page.

## O. Operational Intelligence

XLSX retrieval extends the existing selected-document answer path. It retrieves authorized retained evidence with sheet/row references; bounds include 12 rows, 1,000 characters per row and 16,000 total context characters. Browser answers retained source provenance and distinguished currencies instead of summing incompatible values.

## P. Canonical/source comparison

Workbook declarations remain separate from current ReveNew records. Browser comparison exposed source `In Negotiation` versus ReveNew `Revizuit` and different next actions without choosing a fabricated truth. Exact-title comparison rejects ambiguous matches; a 26-result sentinel prevents uniqueness claims from a truncated result set. No fuzzy identity-resolution claim.

## Q. Prompt-injection boundary

Hidden-sheet instructions were treated as quoted source content. Browser Ask did not create a prepared action. Local PostgreSQL confirmed zero Ask action plans; imported source owners, approvals, outcomes and statuses remained declarations, not canonical approval/execution/revenue facts. External AI/email effects were disabled in the local runtime.

## R. CSV regression

The existing five-row, 22-column client-audit CSV was uploaded, saved, reopened, queried and imported. All 41 real CSV Storage/PostgreSQL checks passed. A transient Ask failure during a development-server configuration restart was retried successfully; it was not represented as a passing first attempt.

## S. Optional import separation

Saving original evidence does not create CRM records or signals. The saved-source import page explicitly chooses destination, sheet, mapping, review and confirmation. Closing it preserves the original document. Partial XLSX evidence cannot be imported as complete data.

## T. Unified import

CSV/XLSX share the saved-document import flow and destination choices: Companies, Contacts, Opportunities and commercial signals. Workbook rows derive from the selected saved sheet. Automatic mapping is reviewable; ambiguous/unmapped columns need an explicit choice or omission. Pipeline acceptance mapped ten fields and omitted two.

## U. Source validation

Server confirmation checks authorized source/version/sheet and compares every mapped value against saved evidence. Extra nonempty values absent from the mapping, changed cells, duplicate mappings and unavailable/deleted sources fail closed. Client-provided normalized rows are not trusted as source evidence.

## V. Legacy direct CRM P1

The legacy importer wrote records and receipt state through separate requests. A later error could leave early writes committed, report misleading counts, and return success for an unfinished batch on retry. Its fingerprint also omitted duplicate mode. The implementation no longer uses that direct multi-request confirmation path.

## W. Atomicity fix

A service-only RPC owns permission/source rechecks, fixed-column writes, row outcomes and terminal receipt in one PostgreSQL transaction. Business-scoped advisory locking serializes these import transactions. Omitted fields preserve existing values; ambiguous exact identities are rejected. This does not serialize every independent manual CRM write.

## X. Retry and replay

Fingerprint identity includes destination, duplicate mode, source/version/sheet, mapping and reviewed rows. Completed replay returns the prior truthful receipt. Real PostgreSQL injected a second-row failure for each CRM target, proved records and batch rollback, then proved successful retry and replay. No exactly-once claim.

## Y. Durable receipts

Receipts retain source/version, sheet, mapping, actor, counts and row outcomes. Rejected CRM rows persist as outcomes. Signal receipts additionally retain unselected source-row numbers. Production-browser batch `a371d03c-b800-45ac-89b6-6106bd223422` persisted total 2, created 1, skipped 1 and omitted row `[3]`; reloaded document history showed `1 omise`.

## Z. Signals and provenance

Signals reuse the existing transactional ingestion path. Nonempty next-action/approval/outcome declarations persist in source claims. Audit-context normalization now uses spaces, matching the SQL control-character and fingerprint contract. Declared owner labels remain evidence and do not assign operational responsibility. Explicit CRM owner-ID mapping remains a separate authorized field.

## AA. Authorization review

Canonical ownership remains `auth.users.id → profiles.user_id → profiles.id → businesses.owner_profile_id`. Server actions derive actor/business from the session and require permissions. RPCs are service-only and recheck live tenant authority and same-business references. Storage/RLS, source deletion, forged source data and receipt tampering were exercised. No client privilege expansion or exposed credential was introduced.

## AB. Migrations

Three additive Phase-3.3 migrations: `20260905154340_workbook_structured_import.sql`, `20260905165927_structured_import_review_integrity.sql`, and `20260905173203_structured_signal_omission_receipt.sql`. Historical bytes remain unchanged. Integrity hashes and reviewed-through include all three. Applied only to the guarded localhost PostgreSQL instance. Forward-fix/rollback guidance is in `phase-3-3-migration-review.md`.

## AC. Real PostgreSQL and Storage

`node scripts/validation/verify-workbook-sql.mjs`: PASS, including all three targets, rollback/retry/replay, omitted-field preservation, rejected rows, tenant checks, receipt immutability, source lifecycle and source-claim/omission persistence. Disposable fixtures end in rollback. `verify-local-workbook.mjs`: 21 real checks PASS. `verify-local-document-memory.mjs`: 41 real checks PASS. Those scripts use guarded local services, not mocks or a remote database.

## AD. Browser import results

Synthetic workspace persisted Companies 6, Contacts 6, Opportunities 24, CSV signals 5, XLSX signals 24, then one additional selection-test signal. Company replay returned the same batch without duplicates. Workbook receipts: Companies `43652fda-e4cd-47cf-baae-4e651b83630a`; Contacts `c8bfe795-f1f3-4234-8135-639f5f8140b3`; Opportunities `2b18185d-73a0-47a8-8e0e-fcb0cdf7cac4`; signals `56b5e725-744b-4668-99cd-11a4eb2d1b57`. CSV signals receipt: `2a855dd1-8b8e-404b-8748-a1b54751bbf5`.

## AE. Visual acceptance

Agent-operated real browser acceptance covered light/dark with Champagne Gold, 1440px desktop, 1024px, and 390px mobile. Screenshots were inspected, not inferred from tests. No page overflow: measured scroll widths 1430/1014/380 respectively, with wide workbook scrolling contained in its grid. Sheet navigation, cached/missing formulas, hidden sheet, optional import, partial coverage, mapping/duplicate review, confirmation and receipts were inspected. User human sign-off remains distinct. No dedicated assistive-technology or reduced-motion audit is claimed.

## AF. Performance and bundle

Production output inspected: 161 client JS chunks contained no searched SheetJS parser markers. Server trace included SheetJS in upload and excluded the library from Documents registry/dashboard. Route sizes: Documents 3.37 kB / 120 kB first load; Add 8.24 / 142; workbook detail 8.56 / 174; workbook import 1.53 / 135; shared JS 102 kB. There was no pre-change production-build baseline, so an exact payload increase is unmeasured.

## AG. Focused validation

Focused run: 153 tests, 152 pass, zero failures, one environment-gated Google PostgreSQL skip. The subsequent retrieval sentinel run passed 4/4. Typecheck and full lint passed. Production HTTP security smoke passed `/`, `/login`, `/privacy`, `/auth/callback`. Parser tests include resource/malformed input, real child formula/link behavior, timeout and launch-failure recovery.

## AH. Full suite

One full repository invocation: **1,177 tests; 1,174 passed; zero failed; three skipped**. Existing skipped PostgreSQL environments cover workflow notification/CAS/fencing, Google Drive concurrency/identity/RLS, and verified-impact concurrency/append-only behavior. These are not represented as executed. XLSX and CSV real local integrations ran separately and passed.

## AI. Production build and sequence

One production build: **PASS**, Next.js 15.5.24, including build lint/type checks and static generation. The built app was started on localhost:3001 and HTTP/browser checks passed. The final SQL-only omission correction was made after this suite/build checkpoint and validated with the real SQL suite plus production-browser persistence; no compiled application code changed afterward. Full suite/build were not repeated. This timing is disclosed rather than describing all checks as occurring after the last SQL edit.

## AJ. Repository gates

Final handoff gates PASS: 55 reviewed migrations verified, zero new migrations unreviewed; repository security/safety checked 918 committable files; `git diff --check` exited zero (Windows line-ending warnings only). No generated build output, local credentials or temporary fixture paths are intentionally included. Corporate XLSX and vendor archive are deliberate test/dependency artifacts with provenance. Existing dependency-audit findings outside this patch remain outside this acceptance claim.

## AK. Changed runtime files

`next.config.mjs`, package/lock; document upload API and local detail/import pages; `LocalDocumentUpload`, `DocumentCsvImport`, `SavedDocumentImport`, `WorkbookViewer` and scoped document/workbook CSS; `CsvImportWizard`; workbook types/parser/import/source validation; local document core/service; shared AI retrieval/comparison; commercial-ingestion core/actions/service; CRM import actions/fields. Changes include recovered implementation plus the focused corrections described above.

## AL. Changed evidence files

Three migrations and integrity baseline; `scripts/documents/parse-workbook.cjs`; workbook SQL/Storage verification scripts; workbook parser/process/retrieval/import-integrity tests; existing CSV/document/import/positioning contract tests; corporate workbook fixture and explanation; vendor attribution/archive/license; this report, plan and migration review. The preserved workbook fixture hash is `3d495ac831b4b0286bff6a261bdddfa5abd6723bcad287a8eeeabfdfe3be8951`.

## AM. Limits and remaining risk

No known supported-path Phase-3 P0/P1 remains after the reviewed corrections. Unsupported formats, over-budget data and partial imports fail closed. No formula engine, fuzzy matching, remote provider acceptance, OS sandbox, comprehensive dependency audit, human visual sign-off, or global exactly-once guarantee is claimed. Live Google-provider behavior was not tested in this isolated business; fixture regressions passed, with the PostgreSQL skip explicitly listed above.

## AN. Handoff states

Local production app: [Documents](http://localhost:3001/documents). [Corporate workbook](http://localhost:3001/documents/local/5d0d6ea3-f526-426f-a301-b18af3cb9342/versions/122c9e9d-1247-4dae-92ee-df0dac2a2ef7) exposes four sheets, inspector, Ask and four durable imports. [CSV](http://localhost:3001/documents/local/18c66f8e-8201-47d7-b674-c3b1e7d974f6/versions/33ce3c37-eed3-4be5-ae79-04b40d6b1077) retains its answer/import. [Partial workbook](http://localhost:3001/documents/local/906fca38-174c-4b84-bf35-a5d382effbf4/versions/026bddbd-2132-4dda-8fed-89214044f77c) exposes coverage limits. [Selection receipt](http://localhost:3001/documents/local/e53088c0-e260-495c-9b20-7de2cac26d71/versions/4d79e9e0-8123-4843-82aa-fe339126190f) retains the omission. Browser tabs also retain unsupported upload and selected XLSX states. Theme and viewport states are reproducible; they are not eighteen independently persisted documents.

## AO. Phase-3 acceptance matrix

PASS locally: CSV memory; XLSX memory; workbook preview; server parsing; formula/macro non-execution; link non-resolution; OI retrieval/provenance; prompt-injection preparation boundary; optional import separation; unified import; CRM atomicity; retry/replay; durable receipts; tenant isolation; light/dark/mobile; full suite zero failures; production build. The caveats in AH–AM limit the interpretation of this matrix.

## AP. Phase 4 readiness

Ready to plan Phase 4 on this supported local baseline. No Phase 4 expansion was implemented. Any remote rollout still needs an explicitly authorized target, migration/release execution and environment-specific acceptance. Existing unrelated PostgreSQL skips should be run in their required environments before claiming those capabilities independently verified.

## AQ. Final control state

User changes and synthetic acceptance evidence remain available. Local production server is left running. No commit, push, deployment, remote migration, destructive cleanup or external customer action occurred.
