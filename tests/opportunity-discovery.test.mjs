import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const nodeRequire = createRequire(import.meta.url);
const moduleCache = new Map();

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function load(relativePath) {
  const filename = path.resolve(relativePath);
  if (moduleCache.has(filename)) return moduleCache.get(filename).exports;
  const compiled = ts.transpileModule(read(relativePath), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: filename }).outputText;
  const module = { exports: {} };
  moduleCache.set(filename, module);
  vm.runInNewContext(compiled, {
    exports: module.exports,
    module,
    Intl,
    Date,
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

const { buildExecutiveDecisionSnapshot, discoverCompanyOpportunities, whyItMattersForIssue } = load("src/lib/opportunity-discovery.ts");

function evidence(sourceType, sourceId, href = "/companies/company-1") {
  return { sourceType, sourceId, sourceTimestamp: "2026-07-22T09:00:00.000Z", label: `Dovada ${sourceId}`, href };
}

function attention(overrides = {}) {
  return {
    id: "attention-1",
    code: "missing_next_action",
    severity: "high",
    title: "Oportunitate fără acțiune următoare",
    description: "Oportunitatea nu are un pas programat.",
    actionLabel: "Completează următoarea acțiune",
    href: "/opportunities/opportunity-1#workflow-actions",
    occurredAt: "2026-07-22T09:00:00.000Z",
    evidence: evidence("opportunity", "opportunity-1", "/opportunities/opportunity-1#workflow-actions"),
    ...overrides
  };
}

function opportunity(overrides = {}) {
  return {
    id: "opportunity-1",
    status: "contacted",
    lifecycleStatus: "open",
    title: "Reînnoire contract",
    estimatedValueHigh: 12000,
    currency: "RON",
    actions: [],
    documents: [],
    timeline: [],
    summary: "Textul poate menționa buget sau urgență, dar nu produce discovery.",
    ...overrides
  };
}

function discoveryInput(overrides = {}) {
  return {
    organizationId: "company-1",
    organizationName: "Companie Test",
    organizationEvidence: evidence("organization", "company-1"),
    attention: [],
    opportunities: [],
    ...overrides
  };
}

test("why-it-matters explanations are deterministic and issue-specific", () => {
  assert.equal(whyItMattersForIssue("missing_primary_contact"), "Fără contact principal, relația poate rămâne fără continuitate când responsabilul se schimbă.");
  assert.equal(whyItMattersForIssue("missing_owner"), "Fără responsabil atribuit, oportunitatea poate rămâne nerezolvată chiar dacă există interes comercial.");
  assert.match(whyItMattersForIssue("pending_approval"), /aprobarea umană/);
});

test("discovery orders critical work first, caps output and retains evidence and safe routes", () => {
  const items = [
    attention({ id: "owner", code: "missing_owner", title: "Fără responsabil", evidence: evidence("opportunity", "opportunity-1") }),
    attention({ id: "approval", code: "pending_approval", title: "Aprobare în așteptare", actionLabel: "Verifică aprobarea", href: "/approvals?signal=signal-1", evidence: evidence("approval", "signal-1", "/approvals?signal=signal-1") }),
    attention({ id: "overdue", code: "overdue_next_action", severity: "critical", title: "Follow-up întârziat", actionLabel: "Revizuiește oportunitatea", evidence: evidence("opportunity_action", "action-1", "/opportunities/opportunity-1#workflow-actions") }),
    ...Array.from({ length: 5 }, (_, index) => attention({ id: `gap-${index}`, evidence: evidence("opportunity", `other-${index}`) }))
  ];
  const candidates = discoverCompanyOpportunities(discoveryInput({ attention: items, opportunities: [opportunity({ actions: [{ id: "action-1" }] })] }), { limit: 5 });
  assert.equal(candidates.length, 5);
  assert.equal(candidates[0].type, "follow_up_gap");
  assert.equal(candidates[0].severity, "critical");
  assert.equal(candidates.find((item) => item.type === "approval_blocker").actionHref, "/approvals?signal=signal-1");
  assert.ok(candidates.every((item) => item.evidence.every((source) => source.sourceId && source.sourceTimestamp && source.label)));
});

test("discovery uses canonical estimated value without treating it as confirmed revenue", () => {
  const candidates = discoverCompanyOpportunities(discoveryInput({ attention: [attention()], opportunities: [opportunity()] }));
  assert.equal(candidates[0].estimatedValue, 12000);
  assert.equal(candidates[0].currency, "RON");
  const ui = read("src/components/company/CompanyBusinessMemory.tsx");
  assert.match(ui, /Valoare recuperabilă estimată/);
  assert.match(ui, /Separată de venitul confirmat/);
  assert.doesNotMatch(ui, /venit generat|revenue recovered/i);
});

test("prepared work becomes a candidate only while delivery is unconfirmed", () => {
  const prepared = opportunity({ documents: [{ id: "doc-1", title: "Ofertă", status: "ready_to_send", sendStatus: "not_sent", readyAt: "2026-07-22T10:00:00.000Z" }] });
  const sent = opportunity({ id: "opportunity-2", documents: [{ id: "doc-2", title: "Ofertă trimisă", status: "ready_to_send", sendStatus: "sent", sentAt: "2026-07-22T11:00:00.000Z" }] });
  const candidates = discoverCompanyOpportunities(discoveryInput({ opportunities: [prepared, sent] }));
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].type, "prepared_work_not_advanced");
  assert.equal(candidates[0].actionHref, "/opportunities/opportunity-1#documents");
  assert.match(candidates[0].whyItMatters, /acțiune finală controlată/);
});

test("free text, names and unrelated neutral records never fabricate discovery candidates", () => {
  const candidates = discoverCompanyOpportunities(discoveryInput({ opportunities: [opportunity({ title: "Client urgent cu buget mare", summary: "Competitor și intenție de cumpărare" })] }));
  assert.equal(candidates.length, 0);
  const source = read("src/lib/opportunity-discovery.ts");
  assert.doesNotMatch(source, /rawSourceText|nameSimilarity|embedding|openai|fetch\s*\(/i);
});

test("executive snapshot selects the leading decision and has a safe stable fallback", () => {
  const candidates = discoverCompanyOpportunities(discoveryInput({ attention: [attention({ code: "overdue_next_action", severity: "critical", title: "Follow-up întârziat", actionLabel: "Revizuiește oportunitatea" })], opportunities: [opportunity()] }));
  const critical = buildExecutiveDecisionSnapshot({ candidates, organizationName: "Companie Test", organizationHref: "/crm/organizations/company-1", organizationEvidence: evidence("organization", "company-1") });
  assert.equal(critical.statusLabel, "Critic");
  assert.equal(critical.primaryRisk, "Follow-up întârziat");
  assert.equal(critical.safeNextActionLabel, "Revizuiește oportunitatea");
  assert.ok(critical.evidence[0].sourceId);
  const stable = buildExecutiveDecisionSnapshot({ candidates: [], organizationName: "Companie Test", organizationHref: "/crm/organizations/company-1", organizationEvidence: evidence("organization", "company-1") });
  assert.equal(stable.statusLabel, "Stabil");
  assert.equal(stable.safeNextActionHref, "/crm/organizations/company-1");
});

test("Company 360 keeps one dominant decision, bounded queues and mandatory human approval", () => {
  const ui = read("src/components/company/CompanyBusinessMemory.tsx");
  const model = read("src/lib/company-intelligence.ts");
  assert.match(ui, /Decizie executivă/);
  assert.match(ui, /De revizuit astăzi/);
  assert.match(ui, /discoveryCandidates\.slice\(1, 5\)/);
  assert.match(ui, /\.slice\(0, 3\)/);
  assert.match(model, /recentEvidence[\s\S]*\.slice\(0, 3\)/);
  assert.match(model, /Verifică aprobarea/);
  assert.doesNotMatch(ui + model, /sendEmail|sendSms|webhook|autonomous|automatic opportunity/i);
});

test("existing local demo fixtures already exercise decision and discovery states", () => {
  const fixtures = read("scripts/demo/fixtures.mjs");
  assert.match(fixtures, /owner_profile_id: null/);
  assert.match(fixtures, /status: index === 0 \? "ready_to_send"/);
  assert.match(fixtures, /matched_organization_id: organizationIds\[0\]/);
  assert.match(fixtures, /ready_for_review/);
});
