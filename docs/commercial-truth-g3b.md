# ReveNew — G3B Commercial Truth

## Scope delivered
A deterministic, request-local Commercial Truth evaluation over structured Opportunity state, explicitly labeled fields in existing normalized Drive segments, and minimal metadata from the actor-owned Gmail/Calendar context. No migration, persistent claim store, model calls, external mutations, new connector, worker, or scheduler was added.

## Contracts and conservative rules
- Facts and interpretations are distinct typed contracts with the existing EvidenceReference provenance.
- Produced claim types: commercial_value (amount + currency), offer_exists, offer_deadline, next_step, next_step_due_at, owner, primary_contact, customer_identity, meeting_commitment, client_response_state, deadline.
- Value differences require a selected offer, an explicit commercial-total field, and an exact normalized match to the linked CRM company's name. Arbitrary numbers are not compared.
- A different explicitly labeled customer creates a possible association mismatch; it never relinks a source or declares the CRM incorrect.
- Missing owner/contact/future dated action, offer without a confirmed next step, past deadlines, and a matching past Calendar/action pair are review signals. A past Calendar time is not proof of attendance.
- Sources over 30 days old or with unknown timestamps remain reviewable observations, never an override of newer CRM data.
- Only complete ISO or day/month/year dates are parsed. Yearless/natural-language dates are not guessed.
- The unchanged G3A ingestion, revision fences, prompt-injection boundary, and persistent Google credential model remain authoritative.

## Bounded source access
Opportunity reads retain the existing RLS-backed loader and explicit current-business check. Drive segments require documents.read and current synced source state. Private Google metadata is loaded through the existing actor-owned repository and only used when the relevant stored capability is connected and granted. No raw source body is copied into the truth output.
Per opportunity: up to 6 Drive sources, 144 normalized segments, 48,000 characters, 32 claims, 8 issues, and 5 default facts. Workspace/company evaluation is explicitly limited to 8 recently updated authorized opportunities; non-manager candidate lists are owner-filtered. React caching is per request, not shared persisted private truth.

## Ask and UI
The existing Ask dispatch handles truth questions deterministically. Existing explicit preparation requests continue to use the G1/G2 safe action planner. Scope is visible and selectable between the current opportunity/company and authorized workspace where applicable.
Opportunity shows 5 compact facts; explanations and source-level investigation are progressively disclosed. The previous CRM execution summary remains available collapsed to avoid duplicating facts by default.
Document source actions share 32px geometry; text measure is bounded. Known MIME types use existing local Docs/Sheets capability symbols, PDF/file symbols, or existing provider artwork. No official Docs/Sheets logo assets were available locally; no replacement brand artwork was invented or fetched.
Control Center's existing queue and evidence layout are unchanged; it receives no new panel or eager truth evaluation.

## Validation
Final focused group: **114 passed, 0 failed, 1 skipped** (115 tests).
This includes 18 G3B tests, an added actual Ask-dispatch no-model regression, and relevant Google/Drive/Opportunity/Control Center/provider tests.
The skipped test is the existing PostgreSQL G3A integration test; no database schema was changed.

Commands:
- npm run typecheck — PASS
- npm run lint — PASS
- npm run validate:migrations — PASS: 41 reviewed migrations verified, 3 existing new migrations scanned
- npm run validate:security — PASS: 763 files checked by the repository safety script
- npm run validate:diff — FAIL solely for the pre-existing trailing blank line at src/lib/ai/copilot-orchestrator.ts:917; preserved rather than changing unrelated formatting

No production build, full repository test suite, commit, push, or deployment.
The repository safety script is not a live penetration test.

## Remaining limitations and manual QA
Browser initialization failed once with the trusted process exiting; no automated visual QA, live OAuth, or production validation was claimed.
Manual QA remains at 1920×1080 and 1440×900: Opportunity scan/expansion, source links, current/workspace scope, safe next-step preparation, toolbar alignment, overflow behavior, and long document readability.
Extraction is intentionally limited to explicit labeled text fields. It is not general semantic understanding, PDF extraction, complete Sheets interpretation, or inference of customer intent.
Complete seven-day change history, postponed-pipeline semantics, contractual/objection analysis, and exhaustive workspace scans are not implemented; insufficient grounding is stated explicitly.
Cross-record responses display at most three evaluated records. Internal generated documents remain in existing product flows but are not parsed for new textual claims in this pass.
Browser tests and live database fixtures were not run. G3A.2 hub-specific test coverage was not retroactively completed by G3B.

## Files changed in this pass
- src/lib/commercial-truth.ts
- src/lib/commercial-truth-server.ts
- src/lib/ai/commercial-truth-answer.ts
- src/lib/ai/copilot-types.ts
- src/lib/ai/copilot-tools.ts
- src/lib/ai/copilot-orchestrator.ts
- src/components/commercial-truth/CommercialTruthSnapshot.tsx
- src/components/ui/ActionToolbar.tsx
- src/app/(protected)/opportunities/[id]/page.tsx
- src/components/intelligence/CopilotConversation.tsx
- src/app/(protected)/opportunities/[id]/sources/[sourceId]/page.tsx
- src/components/documents/DriveSourceActions.tsx
- src/lib/evidence-reference.ts
- src/lib/google-workspace/drive.ts
- src/components/evidence/EvidenceList.tsx
- tests/commercial-truth-g3b.test.mjs
- tests/real-ai-copilot-v1.test.mjs
- docs/commercial-truth-g3b.md
