# REVENew ASTRA PHASE 3.1
# DOCUMENT-FIRST INGESTION & OPERATIONAL INTELLIGENCE FOUNDATION REPORT

5 September 2026 · `astra/product-transformation` · current uncommitted Phase 3 work preserved.

## A. Executive result

The independent product correction is implemented: Documents leads with **Adaugă document**, source inspection needs no mapping, and import requires two explicit choices: start import, then choose the supported record destination. Mapping now presents exceptions instead of a wall of selectors. Saved document detail opens the existing common intelligence conversation in its associated opportunity context.

**Phase 3.1 is not fully closed.** The final take-file → retain → reopen → ask-about-content journey is blocked by the explicitly unapproved storage and source-retrieval contracts. No substitute persistence was introduced. This report supersedes the earlier Phase 3 report's product hierarchy, not its implementation history.

| Required truth | Result |
| --- | --- |
| Original uploaded local files durably retained | **No.** Browser memory only; no upload endpoint or object is created. |
| Storage location | No ReveNew storage location for local originals. Drive originals remain in Google Drive; selected metadata/extracted segments are in Postgres. |
| Migration required | Required for the proposed durable local-source model; **none created or applied**. |
| Storage/RLS changed | **No.** No bucket, policy, grants, authorization or provider scopes changed. |
| Documents usable without mapping | **Yes.** Existing saved documents and temporary CSV inspection are independent of mapping. |
| Intelligence retrieves authorized local-file content | **No.** No durable local source or authorized local-content retrieval exists yet. |
| Document content triggers actions | Local cells remain inert and are not sent to intelligence. Existing deterministic document evaluation produces evidence/review signals, not execution. No new action path was added. See O for the existing AI preparation distinction. |
| Mapping optional | **Yes**, required only after choosing structured import. |
| Ambiguous mappings human-reviewed | **Yes.** Unresolved columns block validation until assigned or explicitly omitted. |
| Excel implemented | **No.** XLSX/XLS remain unsupported. |

## B. Product-model correction

Three distinct jobs are now visible:

1. Add a source: the existing authorized Drive selector; local durable save remains unavailable.
2. Inspect/use a source: saved detail or bounded temporary CSV table; no import configuration required.
3. Import records: optional, explicitly creating commercial signals for review through the existing transactional path.

The local preview is deliberately called temporary. There is no false Save button, localStorage archive, artificial document ID, fabricated timestamp or automatic CRM mutation.

## C. Durable local document storage audit

Repository search found no implemented `storage.from`, bucket creation, object policies or upload handler. `supabase/config.toml` enables the Storage service with a general 50 MiB service limit, but its bucket example is commented out. A running service is not an application upload contract.

Read-only queries against the running local `supabase_db_M` confirmed **zero `storage.buckets` rows and zero policies on `storage.objects`**. Existing internal document, external source, segment and import-row tables have RLS enabled. Remote infrastructure was not inspected or changed.

Current durable stores:

- `opportunity_documents`: prepared/generated internal text, document type/status and opportunity ownership. It is not an arbitrary file archive.
- `external_document_sources`: Google-only identity, connection owner, explicit opportunity association, provider filename/MIME/version, content hash, revision, selection and sync-attempt times. Its provider constraint is Google Drive; a live source must have an opportunity. It cannot safely stand in for a local upload.
- `external_document_segments`: bounded text, hash, ordinal, line/CSV-row location and mandatory untrusted-data classification. Composite source/business identity protects association.
- `external_document_audit`: actor, source, event and recorded event time.
- `data_import_batches` / `commercial_import_rows`: import receipts and outcomes, not original uploaded bytes. Signals hold reviewed normalized source data.

Drive sync/removal is owner-controlled. Removing a selected source clears segments and sensitive metadata and records removal; it does not delete the Google original. Disconnect/revocation clears extracted segments. A sync-attempt timestamp is not proof of successful extraction or current access. None of these contracts was repurposed.

## D. Files changed in Phase 3.1

All paths below are relative to `C:\Projects\ReveNew`. Other existing Phase 3 changes remain intact.

| File | Change |
| --- | --- |
| `src/app/(protected)/documents/page.tsx` | Document-first primary action, quiet optional import link. |
| `src/app/(protected)/documents/add/page.tsx` | New authorized source-selection route. |
| `src/app/(protected)/documents/import/page.tsx` | Optional import terminology and existing permissions. |
| `src/app/(protected)/documents/[id]/page.tsx` | Common intelligence entry through associated opportunity. |
| `src/app/(protected)/opportunities/[id]/sources/[sourceId]/page.tsx` | Same bounded intelligence entry on selected Drive detail. |
| `src/components/documents/DocumentCsvImport.tsx` | Inspection-first progression, explicit destination, temporary-state truth, precise file-read errors. |
| `src/components/documents/SourceMappingReview.tsx` | One active field editor, representative values, resolved/unknown/omitted disclosure. |
| `src/components/documents/DocumentContextualAsk.tsx` | Existing conversation and safe opportunity route; no document body payload. |
| `src/components/documents/Documents.module.css` | Source hierarchy, exception rows, responsive layout and reduced-motion-aware transition. |
| `src/lib/documents/source-review.ts` | Deterministic proposals, ambiguity grouping and qualified dataset description. |
| `src/lib/ai/copilot-instructions.ts` | Explicitly includes documents/table cells as untrusted data and rejects source-originated preparation intent. |
| `tests/documents-source-first.test.mjs` | Behavioral source/import state, errors, aliases and saved-document authorization coverage. |
| `docs/design/phase-3-1-document-first-report.md` | This result, architecture audit and decision request. |

## E. Documents primary action

**Adaugă document** leads to `/documents/add`. **Importă date în ReveNew** is a secondary text action and retains `/documents/import`. Drive is a source choice inside Add; it no longer competes as a registry-level primary action. Existing permission checks remain: document reading, Drive selection/generation and signal creation are distinct.

## F. Upload/save experience

The first screen presents Drive and local inspection. A compact file chooser/drop target replaces technical first-screen configuration. Format limits and pasted CSV are disclosed on demand. Durable local save is explicitly unavailable before selection and again in preview.

File access errors and invalid UTF-8 now have different messages. Browser testing exposed that the old combined catch misclassified an inaccessible file as an encoding error; this is corrected and tested. The original byte size is taken from the selected File; pasted content uses its encoded byte count. No upload-success state is shown.

## G. Document detail result

Existing internal document body, provenance and commercial association remain intact. Internal and Drive detail provide **Întreabă ReveNew** via a restrained, initially closed contextual section. The scope is visibly the associated opportunity. Existing context links remain available; no fake association button or unsupported structured import from Drive was added.

A saved local structured detail cannot exist until the storage decision is implemented. The temporary local preview does not pretend to be one.

## H. Structured preview result

The Phase 3 grid is preserved: original cell strings, row locations, counts, bounded pagination, sticky headings and controlled horizontal scrolling. Mapping is absent from initial inspection. Literal formulas are displayed as text. Existing stored Sheets decoding remains separate and read-only; XLSX parsing is absent.

## I. Optional import separation

After inspection, **Importă date în ReveNew** opens a destination explanation. Only **Aleg să creez semnale pentru revizuire** enters field review. Returning to the document preserves the table and does not require a complete mapping. No source selection, parsing or preview invokes an import action. Server validation and final confirmation remain separate, with no automatic row selection or confirmation.

## J. Mapping simplification

Known Romanian/English aliases generate proposals. Competing aliases and cross-field collisions remain unresolved. The user sees unresolved columns first, each with up to three representative values; only one native selector is active. Recognized/assigned fields are quietly expandable and editable. Explicit omissions have their own disclosure and remain in the original table.

Unknown fields must be assigned or omitted before server validation. An explicit signal title is required. Source status and approval declarations do not become canonical execution state. There is no AI confidence score.

## K. Dataset-intent result

Header evidence may suggest companies, contacts, opportunities, commercial signals, or unknown/mixed data. Labels are qualified, not asserted as verified content classification. Classification does not choose a destination.

Only the safe existing **commercial-signal** destination is offered. Companies/Contacts/Opportunities import is explicitly unavailable in this flow; their detected lists do not immediately receive signal-specific dropdowns. A user must choose signals deliberately before seeing those fields. The legacy direct-CRM machinery is preserved but not promoted as a safe alternative.

## L. Operational Intelligence architecture audit

The product already has substantial convergence:

| Entry | Common path / scope |
| --- | --- |
| Operational Intelligence `/ai` | `AskReveNew` → `CopilotConversation` → `/api/ai/copilot`. |
| Global Ask | `ContextualAssistant` → same conversation/endpoint; current route and selected email where applicable. |
| Company Ask | `CompanyContextualAsk` → same conversation with organization scope. |
| Contact Ask | Shared contextual assistant derives `contactId`; contact/external tools resolve associated authorized records. |
| Document entry, now | Same conversation, explicitly scoped to the associated opportunity route/ID. |

The endpoint checks paid access, authenticated workspace authority, request shape and concurrency. The orchestrator dispatches deterministic tools or existing providers. `getUniversalBusinessContext` unifies actor, workspace, active record, visibility and provider availability. Company, opportunity, execution, external context and commercial-truth tools use existing authorized loaders.

This is one common entry architecture, **not yet one complete retrieval contract**. Company snapshots, execution projections, owner-private Gmail/Calendar, Drive truth evaluation and general search still provide different bounded representations. Workflows/prepared plans use specialized contracts. Reports and connected Apps are not universally ingestible knowledge just because their surfaces exist. There is no arbitrary workspace dump, SQL tool or universal document-text index.

Convergence path: introduce an approved common source/version/location envelope; resolve authorization before retrieval; expose capability/coverage/freshness explicitly; retrieve relevant bounded records/segments; retain source facts separately from inference; surface disagreement without changing canonical records. Reuse this common layer from every entry. No Phase 5/7 redesign or global architecture rewrite was started.

## M. Document → Intelligence context result

The new entry uses a currently allowed opportunity route, not a fabricated `documentId` field or an overloaded selected-meeting ID. The browser does not pass document text as trusted context. Each downstream record remains server-authorized.

Existing commercial truth can inspect authorized synced Drive segments for bounded commercial comparisons: up to six sources, 144 segments and 48,000 evaluated characters, with coverage limits. This is not arbitrary question answering over every file. General opportunity context supplies canonical state/timeline evidence rather than a guarantee of complete document-body retrieval.

**Local content retrieval remains unavailable.** Exact selected-document/version retrieval and full local-file questions need the approved source model and an explicit retrieval contract. No misleading “summarize this local file” button was added.

## N. Provenance / source references

Local inspection shows filename (or the default name for pasted content), byte count, CSV rows/columns, original cells and row numbers. It has no persisted identity, version, upload time or saved citation. Existing saved internal detail retains real identity and modification time. Drive retains provider/selection/version metadata and segment locations where present.

Existing intelligence evidence distinguishes canonical records, recorded events and derived review findings. It validates source identifiers/routes and states missing coverage. It does not manufacture sheet/range citations. The general copilot route allowlist does not provide a universal document-detail citation contract; the new entry therefore uses the existing opportunity route. Source/version granularity must converge in the later approved retrieval work.

## O. Read-versus-act authorization boundary

This pass adds no write/execute tool. Local source contents are inert and stay in the browser until the user explicitly submits mapped rows for server review. Import only persists selected signals after a further confirmation. Document facts cannot send email, approve work or execute a workflow.

Important existing distinction: `prepareAskActionPlan` can insert a record into `ask_action_plans`; Ask preparation is not universally persistence-free. Application/confirmation remains a separate server-authorized path. Older `docs/real-ai-copilot.md` language describing every draft as memory-only is stale in this respect.

Audit risk to resolve before broadening untrusted retrieval: the general OpenAI tool loop accepts model-provided preparation arguments. The source-instruction policy is explicit, but it is not a substitute for a server gate tying preparation to direct user intent. This pass did not exploit-test or rewrite that global pathway. The deterministic document-truth path is separately tested as review-only. Do not interpret a passing prompt-policy test as proof that every possible model injection is prevented.

## P. Premium visual/UX result

The changed screens use typography and progressive disclosure: compact source choice, full source inspection, explicit import intent, exceptions prominent and resolved rows quiet. Source controls disappear once inspection starts. There is no mapping wall, fake confidence, decorative AI animation or new font system.

The inspected scope is materially improved, but **full visual/product closure is not claimed** while durable save and direct document reasoning are missing. The common intelligence UI is reused, not redesigned. Later cross-product typography work should align query/result, record detail and marketing hierarchy after a separate art-direction review; this pass keeps the established family and readable operational density.

## Q. Responsive result

Inspected 1440×1000 desktop preview/intent/mapping, 390×844 mobile confirmation and omitted-field editing, and 1024×900 dark tablet field review. The mobile/tablet document did not overflow horizontally; the original table has its own scroll region. The active field had visible keyboard focus. Reduced-motion emulation reported no fieldset animation. Temporary theme and viewport overrides were restored.

This is representative acceptance, not an exhaustive device/screen-reader audit. No global accessibility conformance claim is made.

## R. Security result

No migration, bucket, Storage policy, RLS, grant, permission, provider scope, dependency, privileged client logic or autonomous execution was introduced. Historical migration hashes pass. Live metadata inspection confirms the local storage stop condition. Tests cover document permission denial, foreign joined context, tenant predicates, untrusted cells, import separation, existing Drive/truth authorization and source-reference validation.

The proposed future storage work is HIGH risk because originals, access revocation, extraction and deletion must agree across object storage and Postgres. Approval of that contract is required; repository safety tests cannot substitute for RLS/object integration tests.

## S. Real-route acceptance

| Human-review state | Browser result |
| --- | --- |
| Documents Registry | Inspected; Adaugă document primary and import secondary. |
| Add Document | Inspected source choices, disclosed limits and local-save limitation. |
| Saved structured local document | **Blocked:** no durable storage contract. |
| Structured preview | Inspected using pasted fixture; original two-row/seven-column table without mapping. |
| Intelligence entry from saved document | Inspected on the real Vector internal document; shared opportunity scope and live deterministic answer. |
| Optional import entry | Inspected; separate destination decision before mapping. |
| Automatic mapping proposal | Inspected six alias matches, expanded readable samples and edit actions. |
| Ambiguous-field review | Inspected `segment` with sample values and explicit omission; no automatic destination. |
| Confirmation | Real server preview: one accepted row, one invalid-email rejection; no automatic selection. No commit submitted. |
| Error / partial state | Inspected inaccessible-file error and partial validation; behavior tests cover malformed encoding/CSV and Excel rejection. |

The live intelligence response cited two canonical/context sources, showed missing owner/overdue work and explicitly stated that no Drive text was available to confirm document terms. It did not claim to have read the visible document body. No browser error/warning appeared in the inspected document-intelligence console.

Automated local file selection remains **pending**: in-app browser file reading failed; Chrome's chooser returned an access denial. The fixture was independently verified as valid UTF-8. Chrome automation requires “Allow access to file URLs” for the ChatGPT extension. This is not presented as successful upload acceptance. Pasted-source acceptance does not replace file-picker acceptance.

The registry, import review/confirmation and saved-document intelligence tabs are left available. From confirmation, return to field review and then original inspection. No local source was saved, no records were committed and no new Drive source was selected. Drive saved-grid/provider acceptance remains unrun because the local registry has no selected Drive source.

## T. Tests / validation

- Focused Documents/import/Drive/truth/copilot/universal-context/Company/opportunity/operational regression run: **162 passed, 0 failed, 1 existing PostgreSQL integration skip** (163 tests).
- Final source-first tests after adding the distinct file-access/encoding regression: **9/9 passed**. This overlaps the source-first tests above; counts are not additive.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `git diff --check`: passed; only Windows line-ending notices.
- `npm run validate:security`: passed.
- `npm run validate:migrations`: passed, **51 reviewed / 0 new**.
- Read-only local Postgres storage inventory: passed; zero buckets/object policies.
- Browser acceptance: exact scope and blockers in S.

Full suite and production build deliberately omitted for this bounded, non-release follow-up: no dependency, DB, bundler, auth or provider implementation changed. The prior Phase 3 build is historical evidence, not a Phase 3.1 build claim. No live import commit, remote migration, provider sync, deployment or demo reset was performed.

## U. Migration/storage decision request — not implemented

**Decision requested:** approve the following CSV-only private local-source foundation for implementation and local-only validation. This does not request or imply permission to apply anything remotely.

**Missing contract.** There is no original-byte archive, local source identity, upload/finalization authority, object policy, safe download, storage lifecycle or local extraction/retrieval entitlement. Existing Google-only tables and prepared-document bodies cannot fulfill it without changing their meaning.

**Minimal proposed model.** Add dedicated source-file metadata, bounded source-file segments and metadata-only audit events, alongside the existing stores. A file version is immutable: ID, business, uploader profile, original filename, MIME, verified byte count, SHA-256, actual server creation/finalization time, parser version, extraction state/coverage, availability and optional same-business opportunity association. Replacing a file creates a new version identity linked to the previous one; no silent overwrite. Segments reference the exact source/version/business with ordinal, row range or text location, text hash and untrusted-data marker. Mapping/import state is not required for source retention.

**Bucket and object policies.** One private bucket, proposed name `commercial-document-originals`; CSV only initially, 2 MiB per original, random server-issued business/source/version object keys. Original filename is metadata, never a client-controlled storage path. No public reads, anonymous grants or overwrite/upsert. Upload requires a server-authorized pending source reservation. Download rechecks current membership/source visibility and serves an attachment; avoid long-lived public or signed links that outlive authorization. Object policies bind the exact reserved source, business and current actor rather than trusting a path prefix alone. Storage upload needs explicit object policies; enabling the service is insufficient. [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

**Authorization decision.** Introduce explicit upload/delete capabilities rather than treating file upload as document generation by accident. Proposed initial rule: current business members with upload permission may create; unassociated files are visible to their uploader and authorized business managers; after explicit association, access also requires the existing target-record visibility. Revoked members lose access. Intelligence must call the same source-visibility resolver and may not broaden it. This new local-source sharing model requires approval; existing Drive sharing does not change.

**Schema and RLS.** Additive reviewed migration only. RLS on all new exposed tables, least-privilege grants, immutable tenant/uploader/object identity, composite business/source foreign keys and same-business association checks. A member cannot reassign a source's tenant or uploader. Browser code receives no service credential. Finalization derives verified metadata/hash from stored bytes, not from submitted claims. Register migration integrity only after review; do not alter historical bytes.

**Upload and extraction lifecycle.** Reserve → bounded upload → server verification → retained source → bounded CSV extraction. Publish the source only after verifying the object; parser failure leaves the retained source honestly marked unavailable for structured use. Object storage and SQL do not form one transaction: use idempotent finalization, compensation for failed publication and an explicit, retryable orphan-cleanup operation. No scheduler/worker is implied. Source retention must survive cancelled mapping, rejected rows and no import at all.

**Deletion/retention.** Proposed default: retain accepted originals until explicit authorized deletion; no invented automatic expiry. Deletion immediately removes retrieval eligibility, then deletes originals through the Storage API and segments through the database, preserving a minimal audit tombstone. A failed physical deletion remains visibly pending/retryable. Membership loss blocks access but is not a claim of physical deletion. Specify backup retention separately before promising complete erasure. Deleting only SQL metadata can orphan bytes; object deletion must use the Storage API. [Supabase object deletion](https://supabase.com/docs/guides/storage/management/delete-objects).

**Provenance and intelligence.** After source storage is approved, implement a bounded read adapter in the common intelligence layer for explicitly selected authorized source IDs/versions. Reuse the same resolver and exact persisted segment locations; return coverage/freshness/unknowns. Do not place document bodies in the user's question or invent local citations. Preserve partial/conflicting evidence and explicit human execution. The new retrieval contract needs review before extending model context, even without adding a provider scope.

**Rollback.** Disable the new add/retrieval capability first, keep existing originals/metadata intact, and preserve old Documents/Drive/import behavior. Do not drop populated tables or delete objects automatically as rollback. Physical removal requires an explicit target-specific operation. Pending finalizations remain recoverable, not falsely successful.

**Required tests.** Real local Storage/Postgres cases for cross-tenant object/metadata/segment access, foreign association, wrong uploader, forged key/hash/size, revoked membership, viewer upload denial, download authorization, path traversal, MIME mismatch, immutable versions, retry/finalization races, incomplete upload cleanup, partial deletion and retention independent of import. Add malicious-document tests ensuring read-only analysis cannot cause even model-selected preparation without user intent, exact citation/version checks, bounded retrieval, stale/conflicting evidence and no external execution. Reopen the actual uploaded original across browser sessions and verify byte/hash identity.

**Security blast radius.** New durable tenant content, storage costs/quotas, sharing, deletion, extraction and provider-bound evidence. No changes to CRM ownership, existing Drive scopes or external execution are proposed. This is a separate HIGH-risk storage/retrieval foundation, not a UI toggle.

## V. Remaining P0/P1

- No new P0 identified in this scoped pass; no repository-wide security assurance is implied.
- **P1 product closure:** durable local originals and later local-content questions are unavailable pending U.
- **P1 existing importer risk:** the legacy direct-CRM path lacks the safe atomic record/receipt contract identified in Phase 3. It is preserved but not promoted here.
- **P1 prerequisite before expanded document AI:** selected-source/version retrieval and a server-enforced direct-user preparation-intent gate. The general provider preparation concern in O is an audit risk, not an exploit-validated new finding.
- Acceptance pending: real file chooser/drop with browser file access enabled, actual saved structured source, provider-specific states, local storage/RLS lifecycle and live import commit/receipt testing.

## W. Exact next Phase 3 closure steps

1. Approve or revise U's private bucket, new source schema, visibility/upload/delete rules, retention and local-only migration scope.
2. Implement and validate immutable originals, finalization/retry, authorized detail/download, deletion and bounded CSV extraction. Finish source-only save/reopen before touching import mapping.
3. Approve and implement the common selected-source/version retrieval adapter and direct-user preparation gate. Verify document-only and document-versus-CRM answers with exact citations, coverage and conflicts.
4. Enable browser automation file access or perform a human native file choice; complete the real add → retain → reopen → ask → optional import journey, including error/partial states.
5. Complete live local transactional receipt/RLS/provider acceptance appropriate to the approved scope, then repeat focused gates and human visual review. Run full suite/build when closing the broader storage/retrieval release scope.
6. Keep Excel behind its separate parser/dependency approval. Do not begin Phase 5/7 or publish capability claims before these contracts are demonstrated.

No commit, push or deployment was performed.
