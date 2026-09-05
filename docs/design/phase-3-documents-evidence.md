# Phase 3 — Documents and structured evidence

## Plan and boundaries

HIGH validation. Continue clean `astra/product-transformation` at `45f658d`.
Sequence: 3A capability/provenance model and negative tests; 3B registry/detail;
3C bounded CSV preview/mapping/review using the existing commercial-signal RPC;
3D existing Company/Opportunity evidence links and responsive acceptance.
No frozen-surface redesign, dependency installation, migration, RLS, ownership,
provider-scope change, upload storage, external execution or autonomous ingestion.

## Audit and decision

The registry unions explicitly selected Drive sources and internal commercial
documents with server permission and business/context guards. Drive metadata is
workspace-visible by the existing explicit source-sharing contract. Owner-only
sync/removal remains on existing server paths.

Internal text is saved prepared work; status does not prove a provider send.
Google Docs/plain text have bounded extraction. Sheets exports the first sheet
only, storing JSON-string cells separated by pipes; a decoder for this existing
representation can provide a grid without a workbook parser. PDF has metadata
and an original link only. Word/PowerPoint/Excel have no approved parser.

Source records already retain provider version, content hash, revision, source
modified time, selection creation time, synchronization time and location-based
segments. `last_synced_at` is updated on failed attempts too: call it the last
attempt, never the last successful verification. Stored text is a historical
copy, not proof of current Drive access or unchanged provider version. Selection
time is not content verification. Missing metadata remains unknown.

The legacy direct CRM importer uses separate record and receipt writes; it cannot
be claimed atomic. New CSV work uses `import_commercial_signal_batch`, the
existing transactional, authorized RPC with duplicate identity and durable row
receipts. Imported names/emails remain source context: no automatic creation,
linking or update of canonical companies, contacts or opportunities. Direct CRM
atomic import needs a separately approved migration/contract. No such change is
made in this phase. Mapping is session information; persisted receipt contains
source filename, batch identity, normalized rows and counts, not the source file.

## Capability matrix

| Source | Original | Read-only preview | Text/evidence | Grid | Record import |
|---|---|---|---|---|---|
| Internal document | Saved text | Saved text | Prepared result, not source proof | No | No |
| Google Docs / text | Safe Drive link | Stored normalized text, if extraction succeeded | Authorized stored segments | No | No |
| Google Sheets | Safe Drive link | First exported sheet, if extraction succeeded | Authorized stored segments; partial workbook | Bounded saved cells | No |
| PDF | Safe Drive link | No embedded viewer | No parser | No | No |
| Local CSV | Local file, not uploaded | Bounded strings | Not automatically AI evidence | Bounded read-only grid | Selected commercial signals only |
| XLSX / XLS / Word / PowerPoint | Existing provider link where present | No parser | Unsupported | No | No |

Capability flags are independent of MIME. No edit, formula execution, macros,
remote links, inferred financial confirmation or background import. Existing
Drive limits remain unchanged: 500 rows, 40 columns, 10,000 cells, first sheet,
200,000 text characters, 128 segments, 8,000 characters per segment; bounded
download/export sizes and timeouts remain on the provider path.

## Acceptance record

Initial real route: authenticated local demo `/documents`, one internal Vector
offer, no selected Drive sources. Provider-specific states require fixtures;
do not claim real Drive/PDF/Sheets acceptance from this local data.

3A: 44 tests passed, one existing PostgreSQL gate skipped. No authority or parser
limit changes. 3B: typecheck and lint passed; registry/internal detail now use
readable record/provenance layouts. Historical tests requiring a six-metric bar
or duplicated responsive DOM were updated to assert table semantics and truthful
state separation instead. 3C: bounded CSV parsing/mapping and server-wrapper
contract fixtures pass; 35 focused tests plus four import contract tests passed.
The fixture RPC proves client/server routing and receipt handling, not PostgreSQL
atomicity. Real demo preview returned one accepted and two invalid/repeated rows;
no confirmation was submitted and no records were inserted.

## Dependency decision: Excel stopped

Candidate for a separate approval: SheetJS CE `xlsx` 0.20.3, pinned to the official
distribution with integrity recorded. The official installation guide identifies
that version and says the npm registry is stale at 0.18.5. The CE license is
Apache-2.0 with attribution. Official docs and security-contact pages are current;
this does not establish a maintenance SLA or an independent security clearance.

Proposed integration: dynamically loaded, isolated browser worker, bounded file
size/time/output and explicit sheet choice; send only reviewed mapped strings
to the existing server validation. No HTML exporter, executable hyperlinks,
formula calculation, macros, external resources or automatic persistence. XLSX
archive expansion and memory limits require verification before enabling input;
a timeout alone is not a hard memory bound. If this cannot be enforced with the
approved package, stop again for a bounded archive reader or isolated server
process design. Browser bundle impact is unmeasured because nothing is installed;
keep the parser out of registry/detail initial bundles and measure before closure.

Alternative chosen now: user-exported UTF-8 CSV with explicit source preview.
Existing Papa Parse handles delimited text, not OOXML ZIP/XML, styles, dates,
merged cells or multiple sheets. Hand-written XLSX decoding is not acceptable.
No dependency was installed, downloaded into the repo, or added to the lockfile.

Sources inspected 2026-09-05:
- https://docs.sheetjs.com/docs/getting-started/installation/nodejs/
- https://docs.sheetjs.com/docs/miscellany/license/
- https://docs.sheetjs.com/docs/miscellany/security/

## Migration decision: direct CRM import stopped

A future additive RPC must bind actor/business permission, normalized batch
fingerprint, selected row fingerprints and mapping version; validate all rows;
lock/check duplicate identities; apply creates/updates and receipt/audit in one
transaction. Preserve original IDs and distinguish created/updated/skipped/
failed. Use existing RLS and explicit ownership, not service-role client input.
Potential schema additions: mapping/source-version receipt metadata and a durable
per-row outcome if existing CRM receipts cannot represent updates. Unique batch
and row indexes must be scoped to business; do not broaden table grants. Exact
DDL and rollback plan require a separate reviewed proposal against the current
schema. Rollback should disable the new entry point, retaining truthful receipts;
never delete imported business data to simulate rollback. Required tests include
cross-tenant rejection, late-row failure rollback, concurrent replay, ambiguous
matches, unauthorized owner and receipt-write failure. Blast radius is direct
Companies/Contacts/Opportunities ingestion; excluded from this patch.
