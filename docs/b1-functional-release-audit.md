# B1 functional release audit

Status: **BLOCKED** · Local audit date: 2026-08-31

The audit used the repository-supported local demo process. The application process was verified to target `http://127.0.0.1:54321` before local authentication. No secret values are recorded here. Existing mutable demo data was preserved; no reset or reseed was performed.

## Release matrix

| Surface / flow | Status | Severity | Evidence | Fix / next step |
| --- | --- | --- | --- | --- |
| Local environment and authentication | PASS | — | Browser and server authenticated against the same canonical local Supabase instance; protected routes loaded. | Retain the explicit local demo startup path. |
| Logout | PASS | — | Local logout returned the session to the login boundary; protected access required authentication again. | None. |
| Dashboard / Control Center | PASS | P2 fixed | A valid unauthenticated redirect was previously caught and logged as `NEXT_REDIRECT`; the redirect is now rethrown and remains a 307. | Regression test protects the redirect boundary. |
| CRM companies / contacts | PASS | — | Authenticated lists and record detail loaded; required-field validation blocked an empty company create without persistence. | Full data lifecycle remains part of staging acceptance. |
| Opportunity / Pipeline / Recovery | PASS | P2 fixed | The same Vector opportunity and 76,000 RON estimate remained coherent; a duplicate React key in opportunity actions was reproduced and corrected. | Keep estimated and confirmed revenue separate. |
| Prepared | PASS | — | Real tenant-scoped items loaded; selected-item URL worked; the surface remained prepare-only and did not infer execution. | Browser back/forward history needs staging confirmation. |
| Approvals | PASS | — | Pending, applied and rejected states loaded. The already-applied Vector decision exposed no approve control and did not attribute the earlier application to the current visit. | Retain stale/replay contract tests. |
| Documents | PASS | — | List and authenticated route loaded; unavailable IDs produced the expected unavailable state rather than a server error. | Exercise provider-backed document reads in staging. |
| Meetings | PASS | — | Authenticated surface loaded without runtime error. | Calendar provider behavior is staging-only. |
| Sequences / communication signature | BLOCKED | P1 | `Salvează semnătura` produced `POST /sequences 500`; local PostgreSQL returned `42703` because the shared trigger reads a field absent from `communication_preferences`. No row was written. | Approve the additive migration described below, then run the focused database regressions. |
| Workflows | PASS | P2 fixture note | Authenticated list loaded; the only current draft has a test-like name. No run or retry was initiated. | Clean demo fixture data through an explicitly approved fixture change, not a reset during audit. |
| AI grounded request | PASS | — | Local deterministic response used three authorized workspace sources, showed provenance and performed no external action. | Verify configured provider failure/success modes in staging. |
| Google integrations | STAGING ONLY | P1 | Local Apps truthfully displayed an existing connected personal Google account. Canonical demo startup disables email and AI keys but can inherit stored Google connection/provider configuration. No send, sync, disconnect or OAuth mutation was triggered. | Isolate provider state for the canonical demo before release; provider-semantic change requires separate approval. |
| Reports | PASS | — | Reports and revenue-recovery audit loaded; values remained estimates, currencies remained separate and no recovery was claimed as confirmed revenue. | Print/export and provider-dependent evidence remain staging checks. |
| Settings save | PASS | P2 fixture note | A same-state local display save completed without runtime error. Existing browser-local display personalization can make shell naming inconsistent across the demo. | Define and clean the canonical local preference fixture separately; do not reset data for B1. |
| Foreign-tenant browser record | NOT REPRODUCIBLE | — | The current local fixture contains no second tenant record to address directly. Existing authorization and RLS contract tests cover the boundary. | Reproduce with a controlled multi-tenant staging fixture. |
| Vector pending approval story | NOT REPRODUCIBLE | — | Vector is already converted/applied in the mutable local fixture. | Preserve current data; use another legitimate record or report the fixture limitation. |

## Release blockers

### P1 — communication signature write fails

1. **Trigger name:** `communication_preferences_validate_scope`.
2. **Trigger function:** `public.validate_communication_os_scope()`.
3. **Origin:** `supabase/migrations/20260824122213_communication_os_v1.sql` created the function and attached all five triggers.
4. **Why `NEW.created_by` is evaluated:** the function assigns `scoped_profile` with one PL/pgSQL `CASE` that contains table-specific record-field references. PostgreSQL resolves those references against the concrete trigger record, so the branch containing `NEW.created_by` is invalid for a `communication_preferences` row even though the intended selected branch uses `NEW.profile_id`.
5. **Relevant schema:** `communication_preferences(profile_id uuid NOT NULL, business_id uuid NOT NULL, signature_text text NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL)`, primary key `(profile_id, business_id)`, signature length at most 4000 characters. There is no `created_by` column and the preference ownership contract does not require one.
6. **Other attachments:** the same function is attached to `communication_templates`, `communication_drafts`, `sequence_enrollments` and `communication_notifications`, using their respective validate-scope triggers.
7. **Safer repair:** repair the shared function because the five triggers enforce one common membership/scope invariant. Preserve its current checks, but obtain the table-specific profile field only after dispatching by `TG_TABLE_NAME` (for example through safe `to_jsonb(NEW)` extraction or separate table-specific branches). A preference-only replacement would leave the same record-shape hazard in the shared function.
8. **Smallest migration:** one additive migration containing only `CREATE OR REPLACE FUNCTION public.validate_communication_os_scope()` with the safe field dispatch and the existing membership/relationship checks unchanged. Do not add a column, recreate tables, alter RLS or change grants.
9. **Blast radius:** inserts and updates on the five attached communication tables. Reads and unrelated tables are unaffected. This is why every attached table needs a focused write regression.
10. **Rollback/recovery:** no data backfill is required and the failed preference write left no partial row. If recovery is needed, use another forward migration with the last known safe function body; restoring the defective body is not a safe rollback.
11. **Required regressions:** owner preference insert/update; foreign/non-member preference rejection; signature length rejection; authorized and foreign template writes; draft owner/connection/link scope; enrollment sequence/opportunity/contact scope; notification recipient scope; server-action success/error surface with no raw database error; unchanged grants and revoked browser mutation authority.
12. **Authority impact:** no broader grants, role changes, RLS changes or auth-architecture changes are required.

### P1 — canonical demo can inherit live Google provider state

The local demo startup prevents live email sending and AI-provider use, but an existing encrypted Google connection can still appear connected and provider-backed read operations can remain available. This audit did not mutate or disconnect it. A provider-isolation decision is required before release; it must be handled as a separately approved provider-semantic change and verified in staging.

## Targeted B1 fixes

- Preserve valid Next redirect errors in the Dashboard server boundary instead of logging them as workspace failures.
- Give opportunity secondary actions a stable composite React key when two actions legitimately share a URL.

No SQL, migration, RLS, grant, auth architecture, provider behavior, financial semantics or dependency changes were made by B1.
