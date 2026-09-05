# REVENew ASTRA PHASE 3 MASTER REPORT

Date: 2026-09-05. Branch: `astra/product-transformation`. Started clean at
`45f658d`; changes remain uncommitted. The user’s Phase 3 brief supersedes the
older phase ordering in historical checkpoints.

## A. Executive result

Implemented the Documents evidence presentation, source-aware detail, bounded
read-only grid and a new controlled CSV-to-commercial-signals flow. Kept source
copy, prepared work, declarations, approvals and financial outcomes distinct.
Excel parsing and atomic direct CRM imports remain stopped at the user’s
dependency/migration boundaries. This is a qualified delivery, not unrestricted
Phase 3 or release closure.

## B. Original Documents capability audit

The original registry combined internal commercial documents and explicitly
selected Drive sources, but six equally weighted counters and conflated timestamps
obscured provenance. Internal detail repeated summary cards. Sheets stored
structured cells as line text. PDF already had metadata only. No Excel/Office/PDF
parser was installed. The legacy direct CRM importer wrote records and receipts
separately; the commercial-signal importer already used a transactional RPC.

## C. Final capability matrix

| Source | Select/read | Preview | Extracted evidence | Structured grid | Import |
|---|---|---|---|---|---|
| Internal commercial document | Existing authorized record | Saved plain text | Prepared result; not independent source proof | No | No |
| Google Docs / plain text | Existing explicit Drive selection | Stored normalized text after successful extraction | Existing authorized segments | No | No |
| Google Sheets | Existing explicit Drive selection | First exported sheet only | Stored segments, partial workbook coverage | Saved cells, read-only | No |
| PDF | Existing explicit Drive selection | Original-source link; no embedded viewer | No parser | No | No |
| Local CSV | Explicit file or paste | Exact bounded strings before normalization | Does not automatically become AI evidence | Read-only preview | Selected commercial signals |
| Excel / Word / PowerPoint | No new selection or upload support | Unsupported locally | No parser | No | No |

Edit, formula evaluation, macro execution and export were not added. Selection,
management authority, original links, text availability and grid capability are
separate checks. MIME alone never grants extraction or preview.

## D. Evidence/provenance architecture

Existing source identity, source version, revision/hash, modified time, selection
creation time, synchronization attempt and segment location remain the provenance
chain. The detail exposes selection and provider version; shared Drive evidence
may carry a bounded version label. Segments retain their existing anchors.
`last_synced_at` changes on failed attempts too, so the UI labels it an attempt.
There is no invented independent verification date or current-version guarantee.

## E. Security model and limits

Existing server permissions, business/context joins, owner-only management,
RLS and service/client boundaries remain intact. No tokens or raw database
messages are displayed; registry logging now retains only the error code.
Source content is React-escaped text. No HTML/iframe/file execution, remote
hyperlink fetching, formula calculation or automatic record linking is added.

Drive limits are unchanged: 5 MB download, 1 MB export, 200,000 characters,
128 segments, 8,000 characters/segment, first sheet, 500 rows, 40 columns,
10,000 cells and 15-second requests. CSV accepts UTF-8, 2 MB, 1,000 rows,
30 columns, 80-character unique nonempty headers and 6,000 characters/cell;
mapped validation payloads are capped at 512 KB. Excess data is rejected.

## F. Files changed

Production files, all under `C:/Projects/ReveNew/`:

- `src/app/(protected)/documents/page.tsx`
- `src/app/(protected)/documents/[id]/page.tsx`
- `src/app/(protected)/documents/error.tsx` (new)
- `src/app/(protected)/documents/import/page.tsx` (new)
- `src/app/(protected)/opportunities/[id]/sources/[sourceId]/page.tsx`
- `src/app/(protected)/opportunities/[id]/sources/[sourceId]/error.tsx` (new)
- `src/components/documents/DocumentTypeIcon.tsx`
- `src/components/documents/Documents.module.css` (new)
- `src/components/documents/StructuredGrid.tsx` (new)
- `src/components/documents/DocumentCsvImport.tsx` (new)
- `src/components/evidence/EvidenceList.tsx`
- `src/lib/documents/capabilities.ts` (new)
- `src/lib/documents/csv.ts` (new)
- `src/lib/commercial-documents.ts`
- `src/lib/company-intelligence.ts` (document link projection only)
- `src/lib/evidence-reference.ts`
- `src/lib/google-workspace/drive.ts`

Tests:

- `tests/documents-phase3.test.mjs` (new)
- `tests/documents-import-contract.test.mjs` (new)
- `tests/google-drive-evidence-g3a.test.mjs`
- `tests/a4-revenue-execution-system.test.mjs`
- `tests/operational-surfaces-convergence-a3-2.test.mjs`

Documentation: this report and `docs/design/phase-3-documents-evidence.md`.
Historical source-shape tests were revised only where the requested layout and
timestamp changes intentionally superseded their old assertions.

## G. Documents Registry result

Semantic table, compact page count, source filters, query search, real context
links, clear internal/Drive state, type identity and original action menus.
Mobile retains identity/context/state in a single row structure. Empty search
results offer filter reset; storage failure offers retry without implying deletion.

## H. Document Detail result

Internal detail separates readable saved content from a provenance/context rail.
It exposes the document identity and modification time. “Marcat ca trimis” is
explicitly an internal state, not provider confirmation. The return action opens
the existing opportunity workflow document section.

## I. Source-aware previews

Drive detail keeps its server loader, management actions, commercial mentions
and segment evidence. A capability notice explains available content and coverage.
Unsupported or failed content has an explicit state; known stored text is never
described as a fresh provider verification. No source is fetched just by previewing
its saved text.

## J. PDF result

Metadata and a safe original-source link remain available. No embedded preview,
text extraction or PDF-derived AI evidence is claimed. A parser/viewer addition
would require a separate dependency and safety decision.

## K. Google Docs result

Existing normalized text export is presented with source version, timestamps,
segment locations and original access. Original layout, headings and pagination
are not reconstructed. Browser provider acceptance is pending: local demo has no
selected Drive document.

## L. Google Sheets result

A bounded decoder reads ReveNew’s existing JSON-string cell representation;
it is not an XLSX parser. Escaped quotes, embedded pipes/newlines, leading zeros,
blank cells and literal formulas are preserved. First-sheet/partial coverage is
explicit. Malformed stored representations fall back to escaped stored text.

## M. CSV result

Implemented file chooser and paste paths; strict UTF-8 decoding for files;
bounded, non-coercing Papa Parse; malformed/binary/duplicate-header/ragged-row
rejection; original grid; explicit mapping and normalized review. File chooser,
original zeros, multiline content, invalid email and same-file duplicate review
were exercised on the real authenticated route without submitting confirmation.

## N. Excel result

Not implemented: no approved parser exists in the current stack. No dependency
was installed. The scoped decision record proposes SheetJS CE `xlsx` 0.20.3,
official pinned distribution, Apache-2.0 attribution, a deferred isolated worker,
and verified archive/memory limits before enabling input. Bundle size remains
unmeasured. Papa Parse cannot safely implement OOXML/ZIP/workbook semantics.
CSV export is the available alternative. See the architecture document for the
maintenance, security, integration and alternative analysis.

## O. Word / PowerPoint truth state

Format labels can identify these MIME types, but no new parser, selection scope,
preview, extraction or import capability is enabled.

## P. Structured grid UX

Sticky column headers and row numbers, contained horizontal/vertical scrolling,
explicit empty cells, optional wrapping and 50-row display pages. Tables are
read-only; captions and a keyboard-focusable scroll region explain interaction.
The same grid renders CSV preview and decodable stored sheet segments.

## Q. Import pipeline

Local source → complete bounded preview → explicit field mapping → server
normalization and duplicate checks → row selection → review acknowledgement →
existing confirmation action/RPC → server-reported receipt. Changing the source
or returning to mapping clears downstream selection/confirmation state.

## R. Field mapping

Map each source column to one existing commercial field or omit it. Ambiguous
aliases remain unmapped; duplicate assignments and missing title are rejected.
Source strings and normalized values can be compared per row. Defaults such as
RON are disclosed before confirmation. Mapping is session-only and visible in
the result disclosure; the original file is not archived.

## S. Duplicate/conflict review

Exact existing duplicates cannot be selected; repeated rows and validation errors
are listed. Probable company/contact/opportunity/signal matches request review,
without automatic linking. No row is preselected. Existing matching searches are
bounded at 2,000 records per registry; the UI explicitly limits uniqueness claims.

## T. Confirmation / persistence result

New UI uses existing `signals.create` server actions and
`import_commercial_signal_batch`; it does not write canonical CRM records.
The SQL transaction and durable row/batch identity were inspected. Mocked server
contract tests exercise denied access, tenant filters, no-write preview, selected
rows, RPC failure and replay receipts. No live demo import was committed; these
fixtures are not a replacement for a real PostgreSQL rollback/concurrency test.

## U. Import receipt

Displays the server-reported batch ID, filename, created/rejected/duplicate/failed/
unselected counts, repeated-batch outcome, history and Inbox links. Existing DB
tables retain row outcomes, identity and signal references; normalized data lives
on created signals. Uncertain transport failure explicitly asks the user to check
history before retrying. It does not claim that zero rows were created.

## V. Failure / partial / stale states

Unsupported format, metadata-only, too large, failed extraction, inaccessible or
unavailable source and stored text are distinguished. Cached text is historical;
current access and version are unknown until verified. Storage failures now render
a retry state instead of a false missing-document result. Partial import counts
and rejected rows stay visible. No new stale-age heuristic or provider-rate-limit
state was invented.

## W. Company evidence integration

Existing authorized Company snapshot document links now point directly to
supported internal document details. Other types and archived documents keep the
existing opportunity route. Company layout, queries, relationships and matching
are unchanged. Real Vector Company 360 exposed both canonical document links;
keyboard navigation reached the document.

## X. Opportunity evidence integration

External source links and `segment-{id}` anchors remain intact. Internal document
backlinks open `?tab=workflow#opportunity-documents`; the live route was checked
and the document section was visible. The frozen opportunity surface was not
redesigned. No new inferred document/company relationship was introduced.

## Y. Ask / AI security boundaries

No document content can trigger autonomous behavior through this work. Existing
authorized segment ingestion and AI boundaries remain unchanged; new CSV data
does not automatically become document evidence. No prompts, executors, provider
scopes, approvals or financial-truth logic were modified. Drive injection and
authorization regression tests pass. A live provider-backed Ask answer was not
generated for this acceptance pass.

## Z. Responsive result

Observed 1440 desktop, 1024 tablet and 390 mobile. Mobile registry/detail/review
showed no document-level horizontal overflow (380px content at a 390px viewport).
Tablet grid was contained (747px region, 1342px scroll content); mobile grid was
contained (346px region, 576px scroll content). Light registry/grid, dark tablet
grid and dark internal detail were visually inspected. This is not every provider state at
every breakpoint.

## AA. Accessibility result

Semantic table headers/row headers/captions, labeled file chooser and selects,
explicit checkboxes, alert/status feedback, focus moved to the active stage and
native disclosures. Keyboard company-link navigation and Enter search worked.
Tab navigation from the grid reached the labeled mapping select. Reduced-motion
preference was enabled and checked; no new animation was added.
No automated accessibility scanner or screen-reader session was run.

## AB. Performance observations

Registry remains metadata-only and paginated at 25 items. The parser is loaded
only on the import route; no new dependency enters the registry. Grid renders at
most 50 rows/page and review at most 25 candidates/page. The existing bounded
server duplicate search is unchanged. No formal latency/memory benchmark was run.
Production build reported route/first-load JavaScript: registry 3.89/131 kB,
internal detail 1.39/112 kB, CSV import 8.88/127 kB, external detail 3.87/120 kB.

## AC. Real-route browser acceptance

Achieved for the local authenticated registry, internal document detail, CSV
upload/paste/preview/mapping/server review/confirmation gates, search reset and
Company-to-document-to-opportunity navigation. Original theme and viewport were
restored. No live confirmation, external sync, removal or send was performed.
Real Drive Docs/Sheets/PDF and provider failure acceptance remains pending because
the local registry contained zero selected Drive sources; those contracts were
fixture-tested instead.

## AD. Tests / full-suite / build / safety result

- Full suite run once: **1,141 total, 1,138 passed, 0 failed, 3 existing skips**.
- Final Company/Opportunity/Documents/import focused run: **71 passed**.
- Final Drive source run after the new storage-failure test: **41 passed, 1 existing skip**.
- Typecheck passed after fixing an optional document-type link projection.
- Lint passed. Repository safety gate passed. Diff check passed.
- Production build passed; local development server was stopped to avoid `.next`
  contention and then restarted successfully on port 3001.
- Migration validation passed: 51 reviewed migrations, zero new migrations.
- Final repository safety check passed (865 tracked/committable files); diff check passed.
- PostgreSQL environment-gated tests remain unexecuted. No live DB import,
  rollback, concurrency, provider-backed extraction or automated a11y claim.

## AE. Dependencies requested/added

Added: **none**. Excel candidate and approval boundary documented; no install,
lockfile edit or parser bundle introduced. Existing Papa Parse is reused.

## AF. Migrations requested/added

Added: **none**. Schema changed: **no**. RLS changed: **no**. Existing authorization
policy changed: **no**; the new route checks existing documents/read and signal/
create permissions. External provider permissions changed: **no**. A separate
atomic direct-CRM contract/migration proposal is outlined, not implemented.

## AG. Remaining P0/P1

No P0 identified in this scoped review. Existing direct CRM importer has a P1
atomicity/receipt risk and is outside the new signal-import flow; do not claim
direct CRM import safety closure. No new P1 found in the implemented path through
the performed checks. Outstanding acceptance risks: live transactional import,
provider-specific preview states and parser-dependent Excel support.

## AH. Phase 3 GO / NO-GO

**GO for review of the implemented Documents/CSV scope. NO-GO for unconditional
Phase 3/release closure.** Excel and direct CRM import remain intentionally
stopped; live provider and PostgreSQL acceptance is not claimed. No commit, push,
deployment or demo reset was performed.

## AI. Phase 4 recommendations

Reporting should consume persisted receipt outcomes and preserve currency,
estimated/confirmed and source-coverage distinctions. Resolve the direct CRM
atomicity issue before using its receipts as reliable operational totals. Do not
combine imported source declarations with confirmed revenue.

## AJ. Phase 5–7 follow-up findings

Phase 5 Execution: preserve prepared/approved/executed boundaries and provider
confirmation. Phase 6 Apps: consider explicit selected-source access and quota
states without claiming every 403 means revoked access. Phase 7 Landing: show
only the implemented CSV and source capabilities; Excel/PDF extraction remain
unsupported until approved, implemented and verified. No frozen surface was
redesigned as part of this phase.
