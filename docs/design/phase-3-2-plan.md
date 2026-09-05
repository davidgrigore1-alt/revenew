# Phase 3.2 implementation plan

Risk: HIGH. User approval: Phase 3.2 attached brief, local/repository only.

1. Add generic local sources, immutable versions, segments and metadata-only audit; private originals bucket. Reuse active business Documents roles and opportunity visibility. Uploader is provenance.
2. Server-controlled bounded upload, verify stored bytes, transactional finalization, authenticated reopen and explicit retryable deletion. No overwrite, automatic expiry or import dependency.
3. Server-enforced request preparation mode and bounded selected-source/version adapter in common Copilot. Analysis cannot grant itself preparation; execution contracts unchanged.
4. Document-first upload/detail/preview/Ask/optional import UI with truthful failures.
5. Adversarial local SQL + Storage tests, behavioral capability tests, regressions, full suite/build once, browser and responsive acceptance.

Alternatives: repurposing Google-only source tables violates their contract; uploader-private storage conflicts with collaboration; public/signed permanent URLs cannot recheck membership. Use dedicated generic tables and an authenticated streaming endpoint instead.

Non-goals: remote infrastructure, Excel/dependencies, direct CRM importer repair, Google scopes, global AI redesign, autonomous execution. Preserve accepted Phase 3/3.1.
