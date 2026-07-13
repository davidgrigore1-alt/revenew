import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const nodeRequire = createRequire(import.meta.url);

function load(relativePath) {
  const filename = path.resolve(relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    exports: module.exports,
    module,
    Date,
    require: (id) => id.startsWith("@/") ? load(path.join("src", id.slice(2)) + ".ts") : nodeRequire(id)
  }, { filename });
  return module.exports;
}

const attention = load("src/lib/opportunity-attention.ts");
const now = new Date("2026-07-13T12:00:00.000Z");

function opportunity(overrides = {}) {
  return {
    id: "opp-1",
    title: "Reînnoire contract",
    type: "contract_renewal",
    status: "contacted",
    lifecycleStatus: "open",
    ownerProfileId: "profile-1",
    estimatedValueLow: 8000,
    estimatedValueHigh: 10000,
    deadline: "2026-08-01",
    createdAt: "2026-07-01T09:00:00.000Z",
    updatedAt: "2026-07-12T09:00:00.000Z",
    actions: [{ id: "task-1", title: "Apel", description: "", status: "pending", dueDate: "2026-07-14T09:00:00.000Z", createdAt: "2026-07-10T09:00:00.000Z" }],
    contacts: [{ id: "assoc-1", businessId: "b", opportunityId: "opp-1", contactId: "c", isPrimary: true, role: "decision_maker", contact: { id: "c", businessId: "b", fullName: "Ana" } }],
    timeline: [],
    documents: [],
    city: "",
    county: "",
    fitScore: 0,
    urgencyScore: 0,
    moneyScore: 0,
    confidenceScore: 0,
    summary: "",
    relevance: [],
    risks: [],
    recommendedAction: "",
    rawSourceText: "",
    ...overrides
  };
}

test("healthy open opportunity is on track and selects the earliest incomplete action", () => {
  const result = attention.assessOpportunityAttention(opportunity(), { now });
  assert.equal(result.state, "on_track");
  assert.equal(result.primaryNextAction.id, "task-1");
  assert.equal(result.reasons.length, 0);
});

test("overdue, missing-action, unassigned and missing-contact reasons are deterministic", () => {
  const overdue = attention.assessOpportunityAttention(opportunity({ actions: [{ id: "old", title: "Restant", status: "pending", dueDate: "2026-07-10T09:00:00.000Z" }] }), { now });
  assert.equal(overdue.reasons.some((reason) => reason.code === "overdue_next_action"), true);

  const missing = attention.assessOpportunityAttention(opportunity({ actions: [], ownerProfileId: null, contacts: [] }), { now });
  assert.equal(missing.reasons.some((reason) => reason.code === "missing_next_action"), true);
  assert.equal(missing.reasons.some((reason) => reason.code === "unassigned_owner"), true);
  assert.equal(missing.reasons.some((reason) => reason.code === "missing_primary_contact"), true);
});

test("closed and legacy terminal opportunities are never marked stale", () => {
  for (const candidate of [
    opportunity({ lifecycleStatus: "won", updatedAt: "2020-01-01T00:00:00.000Z" }),
    opportunity({ lifecycleStatus: undefined, status: "lost", updatedAt: "2020-01-01T00:00:00.000Z" })
  ]) {
    const result = attention.assessOpportunityAttention(candidate, { now });
    assert.equal(result.state, "closed");
    assert.equal(result.reasons.length, 0);
  }
});

test("attention reason disappears when its source condition is resolved", () => {
  const before = attention.assessOpportunityAttention(opportunity({ actions: [] }), { now });
  const after = attention.assessOpportunityAttention(opportunity(), { now });
  assert.equal(before.reasons.some((reason) => reason.code === "missing_next_action"), true);
  assert.equal(after.reasons.some((reason) => reason.code === "missing_next_action"), false);
});

test("metadata updates do not reset staleness, while meaningful commercial events do", () => {
  const metadataOnly = opportunity({
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-07-13T09:00:00.000Z",
    timeline: [{ id: "event-1", type: "commercial_details_changed", date: "2026-07-13T09:00:00.000Z" }]
  });
  const stale = attention.assessOpportunityAttention(metadataOnly, { now });
  assert.equal(stale.reasons.some((item) => item.code === "stale_activity"), true);
  assert.equal(stale.lastMeaningfulActivityAt, "2026-06-01T09:00:00.000Z");

  const contacted = opportunity({
    createdAt: "2026-06-01T09:00:00.000Z",
    timeline: [{ id: "event-2", type: "contacted", date: "2026-07-12T09:00:00.000Z" }]
  });
  const fresh = attention.assessOpportunityAttention(contacted, { now });
  assert.equal(fresh.reasons.some((item) => item.code === "stale_activity"), false);
  assert.equal(fresh.lastMeaningfulActivityAt, "2026-07-12T09:00:00.000Z");
});
