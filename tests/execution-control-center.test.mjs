import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import { buildFixtures, DEMO } from "../scripts/demo/fixtures.mjs";
import { assertDemoStoryInvariants } from "../scripts/demo/story-contracts.mjs";

const require = createRequire(import.meta.url);
const cache = new Map();
function load(name) {
  if (name === "server-only") return {};
  if (!name.startsWith("@/")) return require(name);
  if (cache.has(name)) return cache.get(name).exports;
  const file = path.resolve("src", name.slice(2) + ".ts");
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} }; cache.set(name, module);
  vm.runInNewContext(code, { module, exports: module.exports, require: load, Date, Set, Map, Intl, console }, { filename: file });
  return module.exports;
}
const { buildExecutionControlCenter } = load("@/lib/execution-control-center");
const { buildCommercialInterventions } = load("@/lib/commercial-interventions");
const { buildWorkspaceDecisionQueue } = load("@/lib/workspace-decision-queue");
const { metadataEvidence, evidenceHref } = load("@/lib/evidence-reference");
const now = new Date("2026-08-27T12:00:00Z");
const viewer = { businessId: "business-a", profileId: "owner-a", isManager: true };
const future = "2026-08-29T09:00:00Z";
const task = (patch = {}) => ({ id: "task-a", title: "Confirmă agenda", status: "pending", dueDate: "2026-08-22T09:00:00Z", createdAt: "2026-08-20T09:00:00Z", ...patch });
function opportunity(patch = {}) {
  return { id: "case-a", businessId: viewer.businessId, title: "Contract de servicii", status: "reviewed", lifecycleStatus: "open",
    ownerProfileId: viewer.profileId, ownerName: "Ana", contact: { company: "Compania A" },
    estimatedValueHigh: 76000, currency: "RON", deadline: future, createdAt: "2026-08-20T09:00:00Z",
    actions: [task()], contacts: [], documents: [], timeline: [], responses: [], risks: [], ...patch };
}
function derive(opportunities = [opportunity()], options = {}) {
  const scope = options.viewer ?? viewer;
  const signals = options.signals ?? [];
  const privateContext = options.privateContext ?? { ...scope, state: "not_connected", byOpportunityId: {} };
  const brief = buildCommercialInterventions({ opportunities, signals, viewer: scope, privateContext, now });
  const queue = buildWorkspaceDecisionQueue({ opportunities, signals }, { now, limit: 20 });
  const model = buildExecutionControlCenter({ opportunities, signals, queue, brief: options.fallback ? null : brief, viewer: scope, now });
  return { model, brief };
}

test("projection keeps canonical ordering, deduplicates cases and explains overdue", () => {
  const records = [opportunity(), opportunity({ id: "case-b", estimatedValueHigh: 1000 }), opportunity()];
  const { model, brief } = derive(records);
  assert.deepEqual(Array.from(model.cases, (item) => item.id), Array.from(brief.items, (item) => item.id));
  assert.equal(model.cases.length, 2);
  assert.equal(model.overdueCount, 2);
  assert.equal(model.cases[0].overdueDays, 5);
  assert.ok(model.cases[0].reasons.some((reason) => /Termenul/.test(reason)));
  assert.equal(model.cases[0].owner.name, "Ana");
  assert.ok(model.cases[0].evidence.some((source) => source.sourceType === "action"));
});
test("missing ownership and prepared document are explicit, no send claim", () => {
  const { model } = derive([opportunity({ ownerProfileId: null, ownerName: null,
    documents: [{ id: "doc-a", title: "Propunere comercială", status: "ready_to_send", readyAt: "2026-08-24T10:00:00Z", sendStatus: "not_sent", content: "PRIVATE BODY" }]
  })]);
  const item = model.cases[0];
  assert.equal(item.owner.name, "Fără responsabil");
  assert.match(item.intervention.href, /\?tab=responsibility$/);
  assert.ok(item.reasons.some((reason) => /decizie umană/.test(reason)));
  assert.match(item.evidence.find((source) => source.sourceType === "document").supportingFact, /trimiterea nu este confirmată/);
  assert.ok(!JSON.stringify(model).includes("PRIVATE BODY"));
});
test("legitimate waiting and handled replies never reappear from fallback queue reasons", () => {
  const { model, brief } = derive([opportunity()], { privateContext: { ...viewer, state: "available", byOpportunityId: {
    "case-a": { outbound: { id: "mail-a", at: "2026-08-27T09:00:00Z" } }
  } } });
  assert.equal(brief.waitingCount, 1);
  assert.equal(model.waitingCount, 1);
  assert.equal(model.cases.length, 0);
});
test("server brief gates private sources; managers do not inherit another mailbox", () => {
  const privateContext = { ...viewer, state: "available", byOpportunityId: { "case-a": { inbound: { id: "mail-a", at: "2026-08-27T09:00:00Z" } } } };
  const own = derive(undefined, { privateContext }).model;
  assert.equal(own.cases[0].evidence.find((item) => item.sourceType === "email").entityHref, "/inbox?email=mail-a");
  const other = derive(undefined, { privateContext: { ...privateContext, profileId: "other-owner" } }).model;
  assert.ok(other.cases.every((item) => item.evidence.every((source) => source.sourceType !== "email")));
  const tenant = derive([opportunity({ businessId: "other-business" })]).model;
  assert.equal(tenant.cases.length, 0);
  const individual = derive([opportunity({ ownerProfileId: "other-owner" })], { viewer: { ...viewer, isManager: false } }).model;
  assert.equal(individual.cases.length, 0);
});
test("evidence is allowlisted metadata and cannot carry raw content or remote destinations", () => {
  const item = metadataEvidence({ sourceType: "document", sourceId: "doc", title: "<script>untrusted</script>", occurredAt: "bad",
    entityHref: "https://external.example", excerpt: "hidden", content: "hidden", access_token: "hidden" });
  assert.equal(item.visibility, "metadata");
  assert.equal(item.occurredAt, null); assert.equal(item.entityHref, undefined);
  for (const key of ["content", "excerpt", "access_token"]) assert.ok(!(key in item));
  for (const href of ["//external.example", "javascript:alert(1)", "/inbox\\evil", "/unknown", "/inbox\nunsafe"]) assert.equal(evidenceHref(href), undefined);
  assert.equal(evidenceHref("/opportunities/a#opportunity-documents"), "/opportunities/a?tab=workflow#opportunity-documents");
  assert.equal(evidenceHref("/opportunities/a#workflow-actions-list"), "/opportunities/a?tab=workflow#workflow-actions-list");
  assert.equal(evidenceHref("/opportunities/a#action-schedule"), "/opportunities/a?tab=schedule#action-schedule");
  assert.equal(evidenceHref("/opportunities/a#commercial-response"), "/opportunities/a?tab=response#action-response");
  assert.equal(evidenceHref("/opportunities/a?tab=responsibility"), "/opportunities/a?tab=responsibility");
});
test("linked evidence excludes another tenant and content, activity stays chronological", () => {
  const record = opportunity({ timeline: [
    { id: "old", label: "Pas înregistrat", date: "2026-08-20T09:00:00Z", description: "HIDDEN DESCRIPTION" },
    { id: "new", label: "Revizuire", date: "2026-08-26T09:00:00Z" },
    { id: "future", label: "Future", date: future }
  ] });
  const { model } = derive([record], { signals: [
    { id: "foreign", businessId: "foreign", detectedFromOpportunityId: record.id, title: "FOREIGN SIGNAL" }
  ] });
  assert.equal(model.cases[0].recentActivity[0].sourceId, "new");
  assert.doesNotMatch(JSON.stringify(model), /HIDDEN DESCRIPTION|FOREIGN SIGNAL|"future"/);
});
test("mixed currencies stay separated and a filtered view never invents totals", () => {
  const { model } = derive([opportunity(), opportunity({ id: "euro", currency: "EUR", estimatedValueHigh: 32000 })]);
  assert.equal(model.exposure.RON, 76000); assert.equal(model.exposure.EUR, 32000);
  assert.equal(Object.keys(model.exposure).length, 2);
});
test("fallback reuses the existing queue without claiming external evidence", () => {
  const { model } = derive(undefined, { fallback: true });
  assert.equal(model.sourceState, "fallback");
  assert.equal(model.cases.length, 1);
  assert.ok(model.cases[0].overdue);
  assert.ok(model.cases[0].evidence.every((source) => !source.provider));
});
test("canonical Vector fixture becomes a coherent case without UI story branches", () => {
  const fixtures = buildFixtures(viewer.profileId, now);
  assertDemoStoryInvariants(fixtures, now);
  const source = fixtures.opportunities.find((item) => item.id === DEMO.featuredOpportunityId);
  const company = fixtures.organizations.find((item) => item.id === source.organization_id);
  const record = opportunity({ id: source.id, businessId: source.business_id, title: source.title, status: source.status,
    ownerProfileId: source.owner_profile_id, ownerName: null, currency: source.currency, estimatedValueHigh: source.estimated_value_high,
    contact: { company: company.name }, createdAt: source.created_at, updatedAt: source.updated_at, deadline: source.deadline,
    actions: fixtures.actions.filter((item) => item.opportunity_id === source.id).map((item) => ({ id: item.id, title: item.title, status: item.status, dueDate: item.due_at, createdAt: item.created_at })),
    documents: fixtures.documents.filter((item) => item.opportunity_id === source.id).map((item) => ({ id: item.id, title: item.title, status: item.status, sendStatus: "not_sent", readyAt: source.updated_at })),
    timeline: fixtures.events.filter((item) => item.opportunity_id === source.id).map((item) => ({ id: item.id, label: item.label, date: item.occurred_at }))
  });
  const { model } = derive([record], { viewer: { ...viewer, businessId: source.business_id } });
  assert.equal(model.cases[0].value, source.estimated_value_high);
  assert.equal(model.cases[0].organization, company.name);
  assert.equal(model.cases[0].owner.name, "Fără responsabil");
  assert.ok(model.cases[0].overdue);
  assert.ok(model.cases[0].evidence.some((item) => item.sourceType === "document"));
  assert.ok(model.cases[0].recentActivity.length >= 3);
  for (const file of ["src/lib/execution-control-center.ts", "src/components/dashboard/ExecutionControlCenter.tsx"])
    assert.doesNotMatch(fs.readFileSync(file, "utf8"), /Vector|76000|featuredOpportunityId/);
});
test("queue keeps semantic selection and existing action paths, no external mutations", () => {
  const ui = fs.readFileSync("src/components/dashboard/ExecutionControlCenter.tsx", "utf8");
  for (const text of ["aria-pressed", 'aria-controls="execution-case-detail"', "focus-ring", "visible.find", "EvidenceList", "De ce acum", "Următorul pas", "Activitate recentă"]) assert.ok(ui.includes(text), text);
  assert.doesNotMatch(ui, /fetch\(|send_email|dangerouslySetInnerHTML|transition-all/);
  const evidence = fs.readFileSync("src/components/evidence/EvidenceList.tsx", "utf8");
  assert.match(evidence, /item.visibility === "authorized_content"/);
  assert.doesNotMatch(evidence, /dangerouslySetInnerHTML/);
});
