import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL("../supabase/migrations/20260714143000_recoverable_revenue_engine_v1.sql", import.meta.url);
const approvalFixMigrationPath = new URL("../supabase/migrations/20260714234500_fix_recoverable_signal_approval_draft.sql", import.meta.url);
const analysisPath = new URL("../src/lib/recoverability-analysis.ts", import.meta.url);
const analysisCorePath = new URL("../src/lib/recoverability-analysis-core.ts", import.meta.url);
const inboxPath = new URL("../src/lib/commercial-inbox.ts", import.meta.url);
const actionsPath = new URL("../src/lib/commercial-inbox-actions.ts", import.meta.url);
const clientPath = new URL("../src/components/inbox/CommercialInboxClient.tsx", import.meta.url);
const dashboardPath = new URL("../src/app/(protected)/dashboard/page.tsx", import.meta.url);
const reportsPath = new URL("../src/app/(protected)/reports/page.tsx", import.meta.url);

test("recoverable revenue migration is additive and preserves the tenant boundary", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /alter table public\.commercial_signals/i);
  assert.doesNotMatch(sql, /drop table|truncate|delete from|drop column|disable row level security/i);
  assert.match(sql, /businesses\.owner_id exists unexpectedly/i);
  assert.match(sql, /security invoker/i);
  assert.match(sql, /public\.current_profile_id\(\)/i);
  assert.match(sql, /public\.can_access_business\(v_signal\.business_id\)/i);
  assert.doesNotMatch(sql, /target_business_id uuid/i);
});

test("approval is atomic, idempotent and creates the existing domain objects", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /create or replace function public\.approve_recoverable_signal/i);
  assert.match(sql, /for update/i);
  assert.match(sql, /if v_signal\.converted_opportunity_id is not null/i);
  assert.match(sql, /already_converted', true/i);
  assert.match(sql, /insert into public\.opportunities/i);
  assert.match(sql, /insert into public\.opportunity_contacts/i);
  assert.match(sql, /is_primary\)\s*values \(v_signal\.business_id, v_opportunity_id, v_contact_id, 'contact_principal', true\)/i);
  assert.match(sql, /insert into public\.opportunity_actions/i);
  assert.match(sql, /insert into public\.opportunity_documents/i);
  assert.match(sql, /conversion_idempotency_key = 'signal:'/i);
  assert.match(sql, /organization is unavailable in this workspace/i);
  assert.match(sql, /contact is unavailable in this workspace/i);
  assert.match(sql, /selected owner is not assignable in this workspace/i);
});

test("approval draft persistence disambiguates the RPC argument without widening access", async () => {
  const sql = await readFile(approvalFixMigrationPath, "utf8");
  assert.match(sql, /pg_get_functiondef/);
  assert.match(sql, /nullif\(btrim\(\$11\), ''\)/);
  assert.doesNotMatch(sql, /drop table|truncate|delete from|drop column|disable row level security/i);
  assert.match(sql, /revoke all .* from public, anon/i);
  assert.match(sql, /grant execute .* to authenticated/i);
});

test("analysis validates one rich shape and falls back deterministically", async () => {
  const providerSource = await readFile(analysisPath, "utf8");
  const coreSource = await readFile(analysisCorePath, "utf8");
  for (const field of [
    "recoverabilityScore", "confidence", "estimatedRecoverableValue", "currency", "urgency",
    "primaryRecoveryReason", "executiveExplanation", "detectedCommercialIntent", "relationshipContext",
    "scoreFactors", "missingInformation", "recommendedNextAction", "riskNotes", "uncertaintyNotes",
    "humanReviewChecklist", "recommendedDraftSubject", "recommendedDraftBody", "alternativeDraftAngle"
  ]) assert.match(coreSource, new RegExp(`${field}:`));
  assert.match(coreSource, /buildDeterministicRecoverabilityAnalysis/);
  assert.match(coreSource, /validateRecoverabilityAnalysis/);
  assert.match(coreSource, /ageDays >= 30/);
  assert.match(coreSource, /hasContact/);
  assert.match(coreSource, /proposalWithoutResponse/);
  assert.match(coreSource, /!signal\.assignedToProfileId/);
  assert.match(coreSource, /maximumKnownValue/);
  assert.match(providerSource, /return fallback;/);
  assert.match(providerSource, /safeProviderDiagnostic/);
  assert.doesNotMatch(providerSource, /redactForLog\(error\)|console\.error\([^\n]*content/);
});

test("signal operations derive the workspace server-side and prevent cross-tenant matching", async () => {
  const source = await readFile(inboxPath, "utf8");
  const actions = await readFile(actionsPath, "utf8");
  assert.match(source, /getCurrentBusinessForUser\(\{ redirectIfMissing: true \}\)/);
  assert.match(source, /\.eq\("business_id", business\.id\)/);
  assert.match(source, /\.from\("crm_organizations"\).*\.eq\("business_id", business\.id\)/s);
  assert.match(source, /\.from\("crm_contacts"\).*\.eq\("business_id", business\.id\)/s);
  assert.match(source, /supabase\.rpc\("approve_recoverable_signal"/);
  assert.doesNotMatch(source, /\.from\("opportunities"\)\s*\.insert/s);
  assert.match(actions, /requirePermission\("opportunities\.analyze"\)/);
  assert.match(actions, /requirePermission\("signals\.convert"\)/);
});

test("review UI requires human approval and supports all decision paths", async () => {
  const source = await readFile(clientPath, "utf8");
  assert.match(source, /Aprobă și creează oportunitatea/);
  assert.match(source, /Respinge/);
  assert.match(source, /Marchează duplicat/);
  assert.match(source, /Amână/);
  assert.match(source, /Companie CRM/);
  assert.match(source, /Contact CRM/);
  assert.match(source, /Responsabil/);
  assert.match(source, /Draft recomandat/);
  assert.match(source, /Triere asistată/);
  assert.match(source, /date și reguli vizibile/);
  assert.match(source, /Checklist înainte de aprobare/);
  assert.match(source, /Netrimis automat/);
  assert.match(source, /Risc duplicat/);
  assert.match(source, /Fără responsabil/);
  assert.doesNotMatch(source, /sendEmail|send_mail|scheduled_at/);
});

test("dashboard and reports separate estimated review value from confirmed revenue", async () => {
  const dashboard = await readFile(dashboardPath, "utf8");
  const reports = await readFile(reportsPath, "utf8");
  assert.match(dashboard, /estimatedRecoverableValue/);
  assert.match(dashboard, /Estimare activă; nu este venit confirmat/);
  assert.match(dashboard, /"dismissed", "duplicate"/);
  assert.match(reports, /estimatedValueUnderReview/);
  assert.match(reports, /separată de venitul confirmat/);
  assert.match(reports, /dismissedCount/);
  assert.match(reports, /duplicateCount/);
});
