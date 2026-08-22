import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

function read(file) { return fs.readFileSync(path.resolve(file), "utf8"); }
async function core() {
  const output = ts.transpileModule(read("src/lib/pilot-measurement-core.ts"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

const contract = {
  id: "de900001-0000-4000-8000-000000000001",
  businessId: "de900002-0000-4000-8000-000000000001",
  cohortOpportunityIds: ["o1", "o2", "o3"],
  successCriteria: [
    { id: "owners", metric: "owner_coverage_pp", targetValue: 20, explanation: "Responsabili" },
    { id: "followups", metric: "overdue_followups_reduction", targetValue: 1, explanation: "Follow-up" },
    { id: "actions", metric: "actions_completed", targetValue: 2, explanation: "Acțiuni" }
  ],
  definitionVersion: "commercial-state-v1",
  timezone: "Europe/Bucharest",
  comparisonPolicy: { staleAfterDays: 14, overdueReference: "captured_at" }
};

function opportunity(id, overrides = {}) {
  return {
    opportunityId: id, organizationId: `c-${id}`, title: id, stage: "qualified", lifecycle: "open",
    estimatedValue: 10000, currency: "RON", confirmedRevenue: null, ownerState: "missing",
    nextActionState: "overdue", nextActionDueAt: "2026-08-01T08:00:00.000Z", lastMeaningfulActivityAt: "2026-07-01T08:00:00.000Z",
    inactivityDays: 30, stale: true, approvalState: "not_required", documentState: "none", responseState: "none",
    outcomeState: "open", outcomeConfirmedByHuman: false, exceptionCodes: ["overdue_next_action", "unassigned_owner"],
    evidence: [{ id: `opportunity:${id}`, sourceType: "opportunity", sourceId: id, label: id, observedAt: "2026-08-01T08:00:00.000Z", href: `/opportunities/${id}` }],
    safeIntervention: { label: "Revizuiește oportunitatea", href: `/opportunities/${id}` }, missingInformation: ["Responsabil lipsă"], ...overrides
  };
}

test("same frozen cohort produces honest metrics, separate currencies and no duplicate value", async () => {
  const { buildPilotSnapshot } = await core();
  const snapshot = buildPilotSnapshot({
    contract, snapshotKind: "baseline", capturedAt: "2026-08-01T09:00:00.000Z",
    opportunities: [opportunity("o1"), opportunity("o1", { estimatedValue: 999999 }), opportunity("o2", { currency: "EUR", estimatedValue: 2000 }), opportunity("o3")],
    actionFacts: [], reviewFacts: [], newDuringPilotOpportunityIds: ["new-1"]
  });
  assert.deepEqual(snapshot.metrics.estimatedValueByCurrency, [{ currency: "EUR", value: 2000 }, { currency: "RON", value: 20000 }]);
  assert.deepEqual(snapshot.metrics.confirmedRevenueByCurrency, []);
  assert.deepEqual(snapshot.newDuringPilotOpportunityIds, ["new-1"]);
  assert.equal(snapshot.metrics.cohortSize, 3);
});

test("golden path keeps a 30-opportunity cohort stable from baseline to final", async () => {
  const { buildPilotSnapshot, comparePilotSnapshots } = await core();
  const ids = Array.from({ length: 30 }, (_, index) => `pilot-opportunity-${String(index + 1).padStart(2, "0")}`);
  const largeContract = { ...contract, cohortOpportunityIds: ids };
  const baseline = buildPilotSnapshot({ contract: largeContract, snapshotKind: "baseline", capturedAt: "2026-08-01T09:00:00.000Z", opportunities: ids.map((id) => opportunity(id)), actionFacts: [], reviewFacts: [], newDuringPilotOpportunityIds: [] });
  const final = buildPilotSnapshot({ contract: largeContract, snapshotKind: "final", capturedAt: "2026-08-15T09:00:00.000Z", opportunities: ids.map((id, index) => opportunity(id, index < 18 ? { ownerState: "confirmed", nextActionState: "scheduled", stale: false } : {})), actionFacts: ids.slice(0, 12).map((id) => ({ opportunityId: id, createdAt: "2026-08-02T09:00:00.000Z", completedAt: "2026-08-03T09:00:00.000Z" })), reviewFacts: [], newDuringPilotOpportunityIds: ["new-during-pilot"] });
  const result = comparePilotSnapshots(largeContract, baseline, final);
  assert.equal(result.cohortSize, 30);
  assert.deepEqual(result.newDuringPilotOpportunityIds, ["new-during-pilot"]);
  assert.equal(baseline.metrics.ownerAssigned, 0);
  assert.equal(final.metrics.ownerAssigned, 18);
});

test("verified comparison evaluates met, not met and insufficient data deterministically", async () => {
  const { buildPilotSnapshot, comparePilotSnapshots } = await core();
  const baseline = buildPilotSnapshot({ contract, snapshotKind: "baseline", capturedAt: "2026-08-01T09:00:00.000Z", opportunities: [opportunity("o1"), opportunity("o2"), opportunity("o3", { ownerState: "confirmed" })], actionFacts: [], reviewFacts: [], newDuringPilotOpportunityIds: [] });
  const final = buildPilotSnapshot({ contract, snapshotKind: "final", capturedAt: "2026-08-15T09:00:00.000Z", opportunities: [opportunity("o1", { ownerState: "confirmed", nextActionState: "scheduled", stale: false }), opportunity("o2", { ownerState: "confirmed" }), opportunity("o3", { ownerState: "confirmed" })], actionFacts: [{ opportunityId: "o1", createdAt: "2026-08-02T09:00:00.000Z", completedAt: "2026-08-03T09:00:00.000Z" }], reviewFacts: [], newDuringPilotOpportunityIds: ["new-2"] });
  const comparison = comparePilotSnapshots(contract, baseline, final);
  assert.equal(comparison.criteria.find((item) => item.id === "owners").status, "met");
  assert.equal(comparison.criteria.find((item) => item.id === "followups").status, "met");
  assert.equal(comparison.criteria.find((item) => item.id === "actions").status, "not_met");
  assert.deepEqual(comparison.newDuringPilotOpportunityIds, ["new-2"]);

  const emptyContract = { ...contract, cohortOpportunityIds: [], successCriteria: [{ id: "owners", metric: "owner_coverage_pp", targetValue: 1, explanation: "Responsabili" }] };
  const empty = { ...baseline, pilotId: emptyContract.id, cohortOpportunityIds: [], opportunities: [], metrics: { ...baseline.metrics, cohortSize: 0, ownerAssigned: 0 } };
  assert.equal(comparePilotSnapshots(emptyContract, empty, { ...empty, snapshotKind: "final" }).criteria[0].status, "insufficient_data");
});

test("confirmed revenue requires human confirmation and remains distinct from estimated value", async () => {
  const { buildPilotSnapshot } = await core();
  const snapshot = buildPilotSnapshot({ contract, snapshotKind: "final", capturedAt: "2026-08-15T09:00:00.000Z", opportunities: [
    opportunity("o1", { lifecycle: "won", outcomeState: "won", confirmedRevenue: 5000, outcomeConfirmedByHuman: true }),
    opportunity("o2", { lifecycle: "won", outcomeState: "won", confirmedRevenue: 9000, outcomeConfirmedByHuman: false }),
    opportunity("o3")
  ], actionFacts: [], reviewFacts: [], newDuringPilotOpportunityIds: [] });
  assert.deepEqual(snapshot.metrics.confirmedRevenueByCurrency, [{ currency: "RON", value: 5000 }]);
  assert.deepEqual(snapshot.metrics.estimatedValueByCurrency, [{ currency: "RON", value: 30000 }]);
  assert.equal(snapshot.classifications.confirmedRevenueByCurrency, "human_confirmed");
});

test("migration enforces tenant-scoped read-only tables and server-side immutability", () => {
  const sql = read("supabase/migrations/20260822090944_immutable_pilot_measurement_v1.sql");
  assert.match(sql, /alter table public\.pilot_engagements enable row level security/i);
  assert.match(sql, /alter table public\.pilot_snapshots enable row level security/i);
  assert.match(sql, /using \(public\.can_access_business\(business_id\)\)/i);
  assert.match(sql, /grant select on table public\.pilot_engagements, public\.pilot_snapshots to authenticated/i);
  assert.doesNotMatch(sql, /service[_ -]?role|grant\s+all/i);
  assert.doesNotMatch(sql, /grant (insert|update|delete|all)[^;]*(pilot_engagements|pilot_snapshots)[^;]*authenticated/i);
  assert.match(sql, /raise exception 'pilot snapshots are immutable'/i);
  assert.match(sql, /unique \(pilot_id, snapshot_kind\)/i);
  assert.match(sql, /for update/i);
  assert.match(sql, /snapshot contract mismatch/i);
  assert.match(sql, /pilot snapshot tenant mismatch/i);
  assert.match(sql, /digest\(new\.snapshot_payload::text, 'sha256'\)/i);
  assert.match(sql, /pilot\.baseline_frozen/);
  assert.match(sql, /pilot\.activated/);
  assert.match(sql, /pilot\.final_frozen/);
  assert.match(sql, /pilot\.closed/);
});

test("official snapshot is rebuilt server-side and browser values cannot define metrics", () => {
  const actions = read("src/lib/pilot-measurement-actions.ts");
  const model = read("src/lib/pilot-measurement.ts");
  const page = read("src/app/(protected)/reports/pilot-proof-of-value/page.tsx");
  assert.match(actions, /assembleOfficialPilotSnapshot\(ctx\.pilot, snapshotKind/);
  assert.doesNotMatch(actions, /^export\s+(?:const|let|var|class|\{)/m);
  assert.doesNotMatch(actions, /formData\.get\("snapshot|formData\.get\("metrics/);
  assert.match(actions, /requirePermission\("reports\.view_team"\)/);
  assert.match(model, /buildOpportunityCommercialState/);
  assert.match(model, /createdTime > baselineTime && createdTime <= capturedTime/);
  assert.match(actions, /createSupabaseServerClient/);
  assert.match(actions, /rpc\("create_pilot_engagement"/);
  assert.match(actions, /rpc\("freeze_pilot_snapshot"/);
  assert.doesNotMatch(actions, /createSupabaseAdminClient|SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(page, /Confirmă și îngheață baseline-ul/);
  assert.match(page, /Confirmă situația finală/);
  assert.match(page, /Valoare estimată, nu venit confirmat/);
  assert.match(page, /nu demonstrează că ReveNew a cauzat venit/i);
  assert.doesNotMatch(`${actions}\n${page}`, /ROI garantat|venit garantat|recuperare automată/i);
});
