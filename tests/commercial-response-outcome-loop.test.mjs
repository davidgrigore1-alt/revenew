import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importDomain() {
  const source = await readFile(new URL("../src/lib/commercial-response.ts", import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import("data:text/javascript;base64," + Buffer.from(output).toString("base64"));
}

const migrationUrl = new URL("../supabase/migrations/20260716224633_commercial_response_outcome_loop_v1.sql", import.meta.url);

test("response taxonomy and deterministic next actions are bounded", async () => {
  const domain = await importDomain();
  assert.equal(domain.responseCategories.length, 11);
  assert.deepEqual(domain.getSuggestedNextAction("positive_interest"), { type: "call_contact", title: "Programează o întâlnire", days: 2, milestone: "response_received" });
  assert.equal(domain.getSuggestedNextAction("no_response").type, "follow_up");
  assert.equal(domain.getSuggestedNextAction("unsubscribe").type, "research_more");
  assert.equal(domain.getSuggestedNextAction("bounced").title, "Verifică sau înlocuiește adresa de email");
  assert.equal(domain.responseSummaryRequired("objection"), true);
  assert.equal(domain.responseSummaryRequired("no_response"), false);
});

test("response mutations reject invalid category, summary and cross-workspace relationships", async () => {
  const source = await readFile(new URL("../src/lib/commercial-response-actions.ts", import.meta.url), "utf8");
  assert.match(source, /requirePermission\("opportunities\.update"\)/);
  assert.match(source, /getOpportunityForCurrentBusiness\(opportunityId\)/);
  assert.match(source, /!responseCategories\.includes\(input\.category\)/);
  assert.match(source, /responseSummaryRequired\(input\.category\).*summary\.length < 3/s);
  assert.match(source, /opportunity\.contacts\?\.some\(\(association\) => association\.contactId === contactId\)/);
  assert.match(source, /opportunity\.documents\.some\(\(document\) => document\.id === sourceDocumentId\)/);
  assert.match(source, /business_id: business\.id/);
  assert.match(source, /next_action_created/);
  assert.doesNotMatch(source, /fetch\(|sendWithConfiguredProvider|RESEND_API_KEY|EMAIL_FROM_ADDRESS/);
});

test("unsubscribe and bounced responses persist a hard outreach restriction", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  const sending = await readFile(new URL("../src/lib/follow-up-send-actions.ts", import.meta.url), "utf8");
  assert.match(migration, /response_category in \('unsubscribe', 'bounced'\)/i);
  assert.match(migration, /outreach_restricted_at = coalesce/i);
  assert.match(sending, /outreach_allowed/);
  assert.match(sending, /!opportunity\.outreach_restricted_at/);
});

test("won and lost outcomes require final confirmation and block duplicates", async () => {
  const source = await readFile(new URL("../src/lib/revenue-workspace/actions.ts", import.meta.url), "utf8");
  const ui = await readFile(new URL("../src/components/opportunities/OpportunityControlCenter.tsx", import.meta.url), "utf8");
  assert.match(source, /finalConfirmation/);
  assert.match(source, /\.eq\("lifecycle_status", "open"\)\.is\("outcome_recorded_at", null\)/);
  assert.match(source, /duplicate_outcome_blocked/);
  assert.match(source, /actual_outcome_amount: lifecycleStatus === "won" \? amount : null/);
  assert.match(source, /confirmed_revenue_recorded/);
  assert.match(ui, /Confirmare finală rezultat/);
  assert.match(ui, /Confirm explicit rezultatul/);
  assert.match(ui, /Separat de valoarea estimată/);
});

test("migration is additive, tenant-safe, RLS-enabled and validates contact scope", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  assert.match(migration, /create table if not exists public\.commercial_responses/i);
  assert.match(migration, /alter table public\.commercial_responses enable row level security/i);
  assert.match(migration, /public\.can_access_business\(business_id\)/i);
  assert.match(migration, /commercial response contact must belong to the opportunity and business/i);
  assert.match(migration, /new\.business_id := target_business_id/i);
  assert.match(migration, /new\.recorded_by := trusted_profile_id/i);
  assert.match(migration, /grant select, insert, update on table public\.commercial_responses to authenticated/i);
  assert.match(migration, /revoke delete on table public\.commercial_responses from authenticated/i);
  assert.doesNotMatch(migration, /disable row level security|businesses\.owner_id|grant all on table public\.commercial_responses to authenticated|drop\s+(?:table|schema|column)|truncate/i);
});

test("dashboard and reports separate responses, outcomes and confirmed revenue", async () => {
  const summary = await readFile(new URL("../src/lib/commercial-response-summary.ts", import.meta.url), "utf8");
  const dashboard = await readFile(new URL("../src/app/(protected)/dashboard/page.tsx", import.meta.url), "utf8");
  const reports = await readFile(new URL("../src/app/(protected)/reports/page.tsx", import.meta.url), "utf8");
  assert.match(summary, /lifecycle_status === "won" && row\.currency === "RON"/);
  assert.match(summary, /actual_outcome_amount/);
  assert.doesNotMatch(summary, /estimated_value|send_attempt_count|test_completed/);
  for (const source of [dashboard, reports]) {
    assert.match(source, /Răspunsuri primite/);
    assert.match(source, /Venit recuperat confirmat/);
    assert.match(source, /Rată de răspuns/);
  }
});
