import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const nodeRequire = createRequire(import.meta.url);
const cache = new Map();

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function load(relativePath) {
  const filename = path.resolve(relativePath);
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiled = ts.transpileModule(read(relativePath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename
  }).outputText;
  const module = { exports: {} };
  cache.set(filename, module);
  vm.runInNewContext(compiled, {
    exports: module.exports,
    module,
    Date,
    Intl,
    Map,
    Set,
    require: (id) => {
      if (id === "server-only") return {};
      if (id.startsWith("@/")) return load(path.join("src", id.slice(2)) + ".ts");
      return nodeRequire(id);
    }
  }, { filename });
  return module.exports;
}

const { buildWorkspaceDecisionQueue } = load("src/lib/workspace-decision-queue.ts");
const now = new Date("2026-07-23T12:00:00.000Z");

function contact(overrides = {}) {
  return {
    id: "association-1",
    contactId: "contact-1",
    opportunityId: "opportunity-1",
    businessId: "business-1",
    isPrimary: true,
    role: "decision_maker",
    contact: { id: "contact-1", businessId: "business-1", fullName: "Ana Pop", decisionRole: "decision_maker", organizationId: "company-1", organization: { id: "company-1", businessId: "business-1", name: "Companie Test" } },
    ...overrides
  };
}

function opportunity(overrides = {}) {
  return {
    id: "opportunity-1",
    businessId: "business-1",
    organizationId: "company-1",
    title: "Reînnoire contract",
    type: "contract_renewal",
    status: "contacted",
    lifecycleStatus: "open",
    ownerProfileId: "profile-1",
    ownerName: "Mara Ionescu",
    currency: "RON",
    estimatedValueLow: 8000,
    estimatedValueHigh: 10000,
    actualOutcomeAmount: null,
    deadline: "2026-08-15",
    createdAt: "2026-07-20T09:00:00.000Z",
    updatedAt: "2026-07-22T09:00:00.000Z",
    actions: [{ id: "action-1", title: "Apel de confirmare", description: "", status: "pending", dueDate: "2026-07-25T09:00:00.000Z", priority: "high", createdAt: "2026-07-22T09:00:00.000Z" }],
    documents: [],
    timeline: [{ id: "event-1", type: "contacted", label: "Contactat", description: "", date: "2026-07-22T09:00:00.000Z" }],
    contacts: [contact()],
    city: "București",
    county: "București",
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

function signal(overrides = {}) {
  return {
    id: "signal-1",
    businessId: "business-1",
    source: "manual",
    status: "ready_for_review",
    priority: "high",
    title: "Cerere ofertă",
    analysisStatus: "completed",
    reviewStatus: "ready_for_review",
    estimatedRecoverableValue: 7000,
    currency: "RON",
    matchedOrganizationId: "company-1",
    contactCompany: "Companie Test",
    duplicateRisk: false,
    missingInformation: [],
    uncertaintyNotes: [],
    urgencyScore: 0,
    fitScore: 0,
    confidenceScore: 0,
    createdAt: "2026-07-22T08:00:00.000Z",
    ...overrides
  };
}

test("workspace queue ranks overdue work before pending approval and retains evidence", () => {
  const overdue = opportunity({ actions: [{ id: "overdue", title: "Follow-up restant", description: "", status: "pending", dueDate: "2026-07-20T09:00:00.000Z", createdAt: "2026-07-19T09:00:00.000Z" }] });
  const queue = buildWorkspaceDecisionQueue({ opportunities: [overdue], signals: [signal({ reviewDueAt: "2026-07-21T09:00:00.000Z" })] }, { now });
  assert.equal(queue.items[0].type, "overdue_follow_up");
  assert.equal(queue.items[1].type, "pending_approval");
  assert.ok(queue.items.every((item) => item.evidence.every((evidence) => evidence.sourceId && evidence.label && evidence.href)));
});

test("same-severity overdue items use due date before value", () => {
  const laterHighValue = opportunity({ id: "later", estimatedValueHigh: 50000, actions: [{ id: "later-action", title: "Mai târziu", description: "", status: "pending", dueDate: "2026-07-22T09:00:00.000Z" }] });
  const earlierLowValue = opportunity({ id: "earlier", estimatedValueHigh: 1000, actions: [{ id: "earlier-action", title: "Mai devreme", description: "", status: "pending", dueDate: "2026-07-20T09:00:00.000Z" }] });
  const queue = buildWorkspaceDecisionQueue({ opportunities: [laterHighValue, earlierLowValue], signals: [] }, { now });
  assert.equal(queue.items[0].relatedOpportunityId, "earlier");
});

test("queue never fabricates company relationships from names or free text", () => {
  const item = opportunity({ organizationId: null, contacts: [], contact: undefined, title: "Companie Test urgent", summary: "Companie Test are buget" });
  const queue = buildWorkspaceDecisionQueue({ opportunities: [item], signals: [] }, { now });
  assert.ok(queue.items.length > 0);
  assert.ok(queue.items.every((candidate) => candidate.relatedCompanyId === undefined && candidate.relatedCompanyName === undefined));
  assert.doesNotMatch(read("src/lib/workspace-decision-queue.ts"), /rawSourceText|nameSimilarity|embedding|openai|fetch\s*\(/i);
});

test("safe routes map to existing approval, inbox, opportunity, document and contact surfaces", () => {
  const prepared = opportunity({
    ownerProfileId: null,
    actions: [],
    contacts: [],
    documents: [{ id: "document-1", title: "Ofertă", status: "approved", sendStatus: "not_sent", readyAt: "2026-07-22T10:00:00.000Z" }]
  });
  const queue = buildWorkspaceDecisionQueue({ opportunities: [prepared], signals: [signal(), signal({ id: "signal-2", reviewStatus: "new", status: "new", priority: "urgent" })] }, { now, limit: 5 });
  const all = buildWorkspaceDecisionQueue({ opportunities: [prepared], signals: [signal(), signal({ id: "signal-2", reviewStatus: "new", status: "new", priority: "urgent" })] }, { now, limit: 99 });
  assert.equal(queue.items.length, 5);
  assert.ok(all.items.some((item) => item.actionHref === "/approvals?signal=signal-1"));
  assert.ok(all.items.some((item) => item.actionHref === "/inbox?signal=signal-2"));
  assert.ok(all.items.some((item) => item.actionHref.endsWith("#documents")));
  assert.ok(all.items.some((item) => item.actionHref.endsWith("#opportunity-contacts")));
  assert.ok(all.items.some((item) => item.actionLabel === "Atribuie responsabil"));
});

test("estimates remain item-level, exclude confirmed revenue and never aggregate currencies", () => {
  const ron = opportunity({ id: "ron", currency: "RON", estimatedValueHigh: 10000, actualOutcomeAmount: 999999, ownerProfileId: null });
  const eur = opportunity({ id: "eur", currency: "EUR", estimatedValueHigh: 20000, actualOutcomeAmount: 888888, ownerProfileId: null });
  const queue = buildWorkspaceDecisionQueue({ opportunities: [ron, eur], signals: [] }, { now });
  assert.ok(queue.items.some((item) => item.currency === "RON" && item.estimatedValue === 10000));
  assert.ok(queue.items.some((item) => item.currency === "EUR" && item.estimatedValue === 20000));
  assert.ok(queue.items.every((item) => item.estimatedValue !== 999999 && item.estimatedValue !== 888888));
  assert.equal(queue.estimatedExposedValueByCurrency.RON, 10000);
  assert.equal(queue.estimatedExposedValueByCurrency.EUR, 20000);
  assert.equal("estimatedTotal" in queue, false);
});

test("exposed value counts one opportunity once even when it has multiple blockers", () => {
  const blocked = opportunity({
    id: "multi-blocked",
    ownerProfileId: null,
    contacts: [],
    actions: [],
    estimatedValueHigh: 185300,
    documents: [{ id: "prepared", title: "Ofertă", status: "approved", sendStatus: "not_sent", readyAt: "2026-07-22T10:00:00.000Z" }]
  });
  const queue = buildWorkspaceDecisionQueue({ opportunities: [blocked], signals: [] }, { now, limit: 20 });
  assert.ok(queue.items.filter((item) => item.relatedOpportunityId === "multi-blocked").length > 1);
  assert.equal(queue.estimatedExposedValueByCurrency.RON, 185300);
});

test("issue counts cover all valid candidates even when the primary queue is capped", () => {
  const signals = Array.from({ length: 8 }, (_, index) => signal({ id: `counted-signal-${index}`, title: `Semnal ${index}` }));
  const queue = buildWorkspaceDecisionQueue({ opportunities: [], signals }, { now, limit: 3 });
  assert.equal(queue.items.length, 3);
  assert.equal(queue.countsByType.pending_approval, 8);
  assert.equal(queue.totalCandidates, 8);
});

test("empty and partial workspaces are explicit and low-value healthy records stay out", () => {
  const empty = buildWorkspaceDecisionQueue({ opportunities: [], signals: [] }, { now });
  assert.deepEqual(Array.from(empty.items), []);
  assert.equal(empty.sourceState, "empty_workspace");
  const partial = buildWorkspaceDecisionQueue({ opportunities: [], signals: [signal()] }, { now });
  assert.equal(partial.sourceState, "signals_only");
  assert.equal(partial.items[0].type, "pending_approval");
  const healthy = buildWorkspaceDecisionQueue({ opportunities: [opportunity()], signals: [] }, { now });
  assert.equal(healthy.items.length, 0);
});

test("human approval stays mandatory and primary output is capped at five", () => {
  const signals = Array.from({ length: 8 }, (_, index) => signal({ id: `signal-${index}`, title: `Semnal ${index}` }));
  const queue = buildWorkspaceDecisionQueue({ opportunities: [], signals }, { now });
  assert.equal(queue.items.length, 5);
  assert.equal(queue.totalCandidates, 8);
  assert.ok(queue.items.every((item) => item.type === "pending_approval" && item.actionLabel === "Verifică aprobarea"));
  const ui = read("src/components/dashboard/WorkspaceDecisionQueue.tsx");
  assert.match(ui, /Aprobarea umană rămâne obligatorie/);
  assert.match(ui, /nu este venit confirmat/);
  assert.doesNotMatch(ui, /Continuă|Află mai multe|Explorează/);
});

test("decision aggregation stays server-only and reuses the authorized workspace summary", () => {
  const model = read("src/lib/workspace-decision-queue.ts");
  const dashboard = read("src/app/(protected)/dashboard/page.tsx");
  assert.match(model, /import "server-only"/);
  assert.match(dashboard, /getRevenueWorkspaceSummary\(\)/);
  assert.match(dashboard, /buildWorkspaceDecisionQueue\(\{ opportunities: summary\.opportunities, signals: summary\.signals \}\)/);
  assert.doesNotMatch(model, /createSupabase|service[_-]?role|\.from\(|fetch\s*\(/i);
  assert.doesNotMatch(model, /businesses\.owner_id|disable row level security/i);
});
