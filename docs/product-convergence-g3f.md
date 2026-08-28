# G3F PRIME — Product convergence and demo readiness

## Implementation
- Workflow list: one shared CSS grid for header and rows, fixed 218px action track, explicit 82px/128px action slots. Playbooks share stable columns and a contained horizontal overflow region.
- Pipeline: wider desktop page, five deliberate stage columns, bounded vertical column scrolling, quieter cards, stronger value/owner/deadline/next-action hierarchy. Existing stage writes and audit logic are unchanged.
- Control Center: lightweight SVG exposure chart and operational distribution bars derived exclusively from the already-authorized case projection. No dependency, additional query, storage, migration, or analytics backend.
- CaseReadiness: three independent facts (owner, next step, dated step), with overdue/evidence context where already available. This is not a percentage or a claim of completed execution.
- Executive brief and review: bounded panes, full action labels, repeated detail removed, the same factual case cues.
- Select: shared custom combobox/listbox with keyboard navigation, typeahead, disabled options/groups, viewport-positioned portal menu, required-field feedback, and reset handling. An invisible native select preserves form submission, existing change handlers, and forwarded refs. No visible native dropdown is used by the adopted forms.
- Inbox: removed repetitive optional labels. Clean reader handles an entire known TEXT_FORMAT_BODY/TEXT_FORMAT sentinel as unavailable text; ordinary messages containing those phrases remain unchanged. Original sanitized HTML, sandbox, no-referrer and remote-image controls are unchanged.
- Company, personal activity and operational intelligence: denser structure and progressive disclosure; sparse views have intentional widths, existing data and actions remain accessible.
- Settings: consistent compact controls and section rhythm. Apps catalog copy now distinguishes selected Drive documents from planned Meet.

## Preserved boundaries
No G3A/G3B/G3C/G3D/G3E server authorization, truth, ingestion, financial ledger, workflow runtime, schema, RLS, Google credentials, send approval, or checkpoint policy changes.
No seed, migration application, production infrastructure, commit, push or deployment.
Pipeline totals retain their existing RON-only semantics and explicitly flag other currencies in cards.

## Limits and tradeoffs
- The exposure line is **current estimated value cumulatively ordered by commercial deadline**, not historical exposure, revenue, or a collection forecast. The source has no authoritative historical exposure snapshots. Undated and unknown values are disclosed. Currencies are never combined.
- Distribution is mutually exclusive: overdue first, then attention, then watch. It describes the current queue, not the whole portfolio.
- Reader fallback fixes the visible known sentinel without modifying the stored source. The upstream origin of any live sentinel was not reproduced.
- Browser skill bootstrap failed before navigation with the Windows sandbox error `helper_unknown_error: apply deny-read ACLs`. No screenshot or live interaction verification is claimed.
- Desktop acceptance still needs manual inspection at 1440×900 and 1920×1080, especially popup positioning, keyboard interaction/form submission, workflow column geometry and board/review scroll behavior. No mobile/tablet pass.

## Validation
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed; 86 static pages generated.
- Targeted tests: **172 distinct tests; 171 passed, 1 opt-in PostgreSQL test skipped** after repairing the legacy harness dependencies.
- New G3F coverage extends the existing presentation test file: currency/date/unknown accounting, exclusive distribution, empty aggregates, keyboard option navigation, custom control/form contract, shared workflow tracks, and precise sentinel handling.
- Initial workflow failures came from the harness returning an empty module for the existing `commercial-state-invalidation` import. Both mutation and planner harnesses now compile the real helper with the existing Next cache stub. Runtime code was not changed. Only the affected group and final single failing test were rerun.
- No full `npm test`, extra migration/security gate, or repeated browser attempts.
- Test groups: presentation-hardening-v1, workflow-studio-v2-pass-h, commercial-workflow-builder-g2b, commercial-workflow-runtime-g2a, commercial-decision-review-g3e, execution-control-center, commercial-email-workspace-v1, company-commercial-memory-360-v1, theme-settings-personalization, applications-provider-model, revenue-workspace-core.
- Logs: `.revenew-backups/g3f-tests.log`, `g3f-retest.log`, `g3f-final-test.log`, `g3f-build.log`. The earlier logs intentionally retain their initial failure records.

## Manual acceptance checklist
1. Workflow: compare all six header tracks against long and short rows; verify Deschide/Activează explicit/Pauză alignment.
2. Pipeline: scroll horizontally at 1440; check five columns at 1920; scroll long columns; inspect full title and next action; verify unchanged stage confirmation and server validation.
3. Control Center: switch currency and reconcile chart table/undated amounts; inspect empty queue and unknown values; confirm case filters and selection still resolve fresh props.
4. Select: Tab, arrows, Home/End, typeahead, Enter, Escape, outside click, disabled options/groups, form reset and required empty fields; open near viewport edges and inside overlays.
5. Reader: known sentinel, genuine plain text containing the sentinel phrase, HTML-only email, original mode and explicit external-image loading.
6. Review: previous/next selection, complete CTA labels, independent scrolling and existing checkpoint semantics.
7. Company/Settings/Apps: disclosure access, compact sparse tabs, local identity controls and accurate Google capability copy.

## Files touched (46)

- docs/product-convergence-g3f.md
- src/app/(protected)/ai/page.tsx
- src/app/(protected)/crm/organizations/[id]/page.tsx
- src/app/(protected)/pipeline/page.tsx
- src/app/(protected)/recoverable/page.tsx
- src/app/(protected)/sequences/page.tsx
- src/app/(protected)/today/page.tsx
- src/app/(protected)/workflows/page.tsx
- src/components/apps/DriveWorkspace.tsx
- src/components/apps/IntegrationCatalog.tsx
- src/components/company/CompanyBusinessMemory.tsx
- src/components/company/CompanyExecutionWorkspace.tsx
- src/components/crm/CrmWorkspaceClient.tsx
- src/components/dashboard/CommercialDecisionReview.tsx
- src/components/dashboard/ControlCenterVisuals.tsx
- src/components/dashboard/ExecutionControlCenter.tsx
- src/components/dashboard/PageShell.tsx
- src/components/dashboard/RevenueCommandBrief.tsx
- src/components/dashboard/TodayExecutionSections.tsx
- src/components/imports/CsvImportWizard.tsx
- src/components/inbox/CommercialInboxClient.tsx
- src/components/intelligence/EmailDetailDrawer.tsx
- src/components/leads/LeadsExplorer.tsx
- src/components/onboarding/OnboardingForm.tsx
- src/components/opportunities/AnalyzeOpportunityForm.tsx
- src/components/opportunities/CommercialResponsePanel.tsx
- src/components/opportunities/CreateOpportunityPanel.tsx
- src/components/opportunities/OpportunityContactsPanel.tsx
- src/components/opportunities/OpportunityControlCenter.tsx
- src/components/opportunities/OpportunityWorkflow.tsx
- src/components/recovery/ImpactControls.tsx
- src/components/revenue/PipelineBoard.tsx
- src/components/settings/EnterpriseGovernancePanel.tsx
- src/components/settings/PersonalizationSettingsPanel.tsx
- src/components/ui/CaseReadiness.tsx
- src/components/ui/OperationalPatterns.module.css
- src/components/ui/Select.tsx
- src/components/workflows/WorkflowBuilder.tsx
- src/components/workflows/WorkflowPlaybooks.tsx
- src/lib/control-center-visuals.ts
- src/lib/integrations/catalog.ts
- src/lib/ui/email-reader.ts
- src/lib/ui/select-navigation.ts
- tests/commercial-decision-review-g3e.test.mjs
- tests/commercial-workflow-runtime-g2a.test.mjs
- tests/presentation-hardening-v1.test.mjs
