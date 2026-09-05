# Phase 3.3 local migration review

Migration: `20260905154340_workbook_structured_import.sql`. One additive migration; no historical migration bytes changed.

## Authority and persistence

Existing source/version tables, private bucket and live Storage read predicates remain canonical. Workbook extraction occupies its own bounded JSON column. Ready evidence cannot be changed; deletion clears the projection before physical byte deletion. CSV readiness retains its original contract.

New import RPCs are service-role-only. Server actions first require the existing business permission and derive the actor from the authenticated session. Saved-source imports compare every mapped value with authorized retained rows. RPCs independently derive the user from the server-supplied profile and recheck live working membership and source access. They use fixed writable columns, same-business references and transaction-local actor identity. No browser profile or workspace parameter is trusted by server actions.

CRM imports serialize by business within the transaction. Fingerprints include rows, target, duplicate mode, source/version/sheet and mapping. Writes, row outcomes and the terminal receipt commit together. Exceptions roll back all writes. Replay requires a completed transaction receipt; an old processing or unverified receipt cannot be presented as success. Receipt mutation guards reject authenticated table writes to the new confirmed receipts.

Signal imports reuse the existing validated transaction. Additional structured declarations are kept in bounded row source claims; they do not set operational approval, execution, lifecycle or confirmed-revenue state. A real local test exposed the previous TypeScript/SQL payload incompatibility and now proves the wrapper and replay.

## Evidence

`node scripts/validation/verify-workbook-sql.mjs` executes the migration and fixtures inside a transaction ending in rollback. It verifies all three CRM targets, update counts, replay, cross-tenant denial, receipt tampering, injected second-row failure, complete rollback, successful retry, workbook readiness/immutability/deletion, source-linked receipt and real signal persistence/replay. Storage HTTP evidence is a separate required check, still pending at this review point.

## Rollback

Do not drop workbook metadata or receipt columns after data has been created. Preserve the originals and new receipt evidence. A rollback of application code should disable new uploads/imports and leave downloads and immutable versions available. The old direct CRM importer must not be restored: its writes and receipts were separate. The safe recovery path is a forward fix. Local test fixtures are rolled back or deleted by exact synthetic identifiers; no demo reset or remote action is authorized.

## Residual boundaries

Import duplicate matching is deterministic and limited to documented keys; it is not fuzzy identity resolution. Import concurrency locking covers these import transactions, not every independent manual CRM write. Database constraints remain the final conflict guard. Server-role-only RPCs intentionally rely on the server authentication boundary; they are not a client API.

## Recovery correction, 5 September 2026

`20260905165927_structured_import_review_integrity.sql` is an additive replacement of the existing CRM function. Historical migration bytes remain unchanged. It preserves omitted contact job titles and opportunity amount/currency/owner fields, refuses ambiguous exact identities, and includes rejected rows in durable row outcomes. The service-only ACL, actor derivation, tenant predicates and transaction remain unchanged. Reviewed locally and executed only against the guarded localhost PostgreSQL helper.

The SQL verification now injects a failure after the first write for each of Companies, Contacts and Opportunities, checks that records and batches roll back, then proves retry and replay. It also verifies omitted-field preservation and rejected-row outcomes. Signal acceptance supplies nonempty next-action, approval and outcome declarations, verifies their durable source claims, and verifies that the resulting signal remains new and unassigned.

Two application corrections complete that contract: normalized audit-context lines use spaces, matching the existing fingerprint/RPC control-character contract, and declared source-owner names remain provenance rather than canonical assignments. Saved-source validation rejects additional nonempty values absent from the saved mapping.

Current real Storage/RLS evidence: 21 workbook checks and 41 CSV checks passed. The corporate workbook fixture is intentional test input under `tests/fixtures/`; repository verification no longer depends on temporary working files.

## Durable omission correction

`20260905173203_structured_signal_omission_receipt.sql` adds an invoker trigger scoped to confirmed source-linked signal receipts. It derives total source rows from the same-business ready version, records unselected logical row numbers, and persists total/skipped counts. It does not grant a new client write path. Function execution is revoked from public, anon and authenticated; existing receipt guards remain in force. This migration was applied only locally, after the application full-suite/build checkpoint; the compiled application was unchanged.

The final real SQL test proves omitted row numbers along with transactional rollback/retry/replay and claims boundaries. Production-browser acceptance selected one of two saved CSV rows: batch `a371d03c-b800-45ac-89b6-6106bd223422` persisted total 2, created 1, skipped 1 and `ignored_source_rows: [3]`. Reloaded document history displayed `1 omise`. No historical migration was edited or applied remotely.
