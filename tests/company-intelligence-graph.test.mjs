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
  const compiled = ts.transpileModule(read(relativePath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename
  }).outputText;
  const module = { exports: {} };
  moduleCache.set(filename, module);
  vm.runInNewContext(compiled, {
    exports: module.exports,
    module,
    Date,
    Map,
    Set,
    URL,
    require: (id) => {
      if (id === "server-only") return {};
      if (id === "@/lib/business/current-business") return { getCurrentBusinessForUser: async () => null };
      if (id === "@/lib/commercial-inbox") return { getCommercialSignalsForOrganization: async () => [] };
      if (id === "@/lib/supabase/server") return { createSupabaseServerClient: () => null };
      if (id === "@/lib/supabase/status") return { isSupabaseConfigured: false };
      if (id.startsWith("@/")) return load(path.join("src", id.slice(2)) + ".ts");
      return nodeRequire(id);
    }
  }, { filename });
  return module.exports;
}

const { buildCompanyIntelligenceSnapshot } = load("src/lib/company-intelligence.ts");

// Execute presentation code with data/component boundaries stubbed; assertions below
// inspect rendered values rather than matching the source expressions used to build them.
function loadPresentation(relativePath, snapshot) {
  const filename = path.resolve(relativePath);
  const module = { exports: {} };
  const component = ({ children }) => children ?? null;
  const components = new Proxy({}, { get: () => component });
  const compiled = ts.transpileModule(read(relativePath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filename
  }).outputText;
  vm.runInNewContext(compiled, {
    exports: module.exports, module, URLSearchParams, Date, Map, Set,
    require: (id) => {
      if (id === "next/navigation") return { useRouter: () => ({ refresh() {} }), notFound: () => { throw new Error("unexpected_not_found"); } };
      if (id === "next/link") return component;
      if (id.endsWith(".css")) return { __esModule: true, default: {} };
      if (id === "./CompanyBusinessMemory") return components;
      if (id === "@/lib/company-briefing") return load("src/lib/company-briefing.ts");
      if (id === "@/lib/opportunity-domain") return load("src/lib/opportunity-domain.ts");
      if (id === "@/components/dashboard/StatusBadge") return { getStatusLabel: value => value };
      if (id.startsWith("@/components/") || id.startsWith("@heroicons/")) return components;
      if (id === "@/lib/company-intelligence") return { getCompanyIntelligenceSnapshot: async () => ({ ready: true, snapshot }) };
      if (id === "@/lib/company-commercial-memory") return { suggestedCompanyQuestions: () => [] };
      if (id === "@/lib/ai/google-context-tool") return { getExternalContextForCompany: async () => null };
      if (id === "@/lib/workspace-notes") return { getWorkspaceNotes: async () => [] };
      if (id === "@/lib/crm/website") return { safeCompanyWebsiteHref: () => null };
      if (id === "@/lib/crm/workspace-actions") return {};
      if (id === "@/lib/utils") return { formatDate: () => "Dată test", formatCurrency: (value) => String(value) };
      return nodeRequire(id);
    }
  }, { filename });
  return module.exports;
}

async function companySummary(snapshot) {
  const React = nodeRequire("react");
  const { renderToStaticMarkup } = nodeRequire("react-dom/server");
  const { CompanyIdentity, CompanyPeople } = loadPresentation("src/components/company/CompanyBriefing.tsx", snapshot);
  return renderToStaticMarkup(React.createElement(React.Fragment, null, React.createElement(CompanyIdentity, { snapshot }), React.createElement(CompanyPeople, { snapshot })));
}

function organization(overrides = {}) {
  return {
    id: "company-1",
    businessId: "business-current",
    name: "Companie Test",
    website: "https://companie.test",
    industry: "Servicii B2B",
    city: "București",
    country: "România",
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-07-10T09:00:00.000Z",
    ...overrides
  };
}

function contact(overrides = {}) {
  return {
    id: "contact-1",
    businessId: "business-current",
    organizationId: "company-1",
    fullName: "Ana Pop",
    jobTitle: "Director comercial",
    decisionRole: "decision_maker",
    isActive: true, isPrimaryForOrganization: true,
    ...overrides
  };
}

function opportunity(overrides = {}) {
  return {
    id: "opportunity-1",
    businessId: "business-current",
    organizationId: "company-1",
    title: "Reînnoire contract",
    type: "contract_renewal",
    status: "contacted",
    lifecycleStatus: "open",
    ownerProfileId: "profile-1",
    ownerName: "Mihai Ionescu",
    currency: "RON",
    estimatedValueLow: 8000,
    estimatedValueHigh: 10000,
    deadline: "2026-08-01",
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
    createdAt: "2026-07-01T09:00:00.000Z",
    updatedAt: "2026-07-15T09:00:00.000Z",
    actions: [{ id: "action-1", title: "Confirmă termenul", description: "", status: "pending", dueDate: "2026-07-21T09:00:00.000Z", assignedToProfileId: "profile-1", assignedToName: "Mihai Ionescu", createdAt: "2026-07-15T09:00:00.000Z" }],
    contacts: [{ id: "association-1", businessId: "business-current", opportunityId: "opportunity-1", contactId: "contact-1", role: "decision_maker", isPrimary: true, contact: contact() }],
    timeline: [{ id: "event-1", label: "Discuție înregistrată", description: "Termenul a fost discutat.", date: "2026-07-20T10:00:00.000Z" }],
    documents: [],
    ...overrides
  };
}

function signal(overrides = {}) {
  return {
    id: "signal-1",
    businessId: "business-current",
    source: "manual",
    status: "new",
    priority: "medium",
    title: "Cerere de ofertă",
    analysisStatus: "completed",
    reviewStatus: "new",
    duplicateRisk: false,
    missingInformation: [],
    uncertaintyNotes: [],
    currency: "RON",
    urgencyScore: 50,
    fitScore: 50,
    confidenceScore: 50,
    matchedOrganizationId: "company-1",
    createdAt: "2026-07-19T10:00:00.000Z",
    occurredAt: "2026-07-19T10:00:00.000Z",
    events: [],
    ...overrides
  };
}

test("company aggregation is server-only and every company query retains tenant scope", () => {
  const source = read("src/lib/company-intelligence.ts");
  assert.match(source, /import "server-only"/);
  assert.match(source, /getCurrentBusinessForUser\(\{ redirectIfMissing: true \}\)/);
  assert.match(source, /\.eq\("id", organizationId\)\.eq\("business_id", businessId\)/);
  assert.match(source, /\.eq\("business_id", businessId\)\.eq\("organization_id", organizationId\)/);
  assert.doesNotMatch(source, /service_role|SUPABASE_SERVICE_ROLE_KEY|createSupabaseAdminClient/i);
});

test("relations are never inferred without an explicit opportunity-contact association", () => {
  const unrelated = contact({ id: "contact-2", fullName: "Fără legătură", isPrimaryForOrganization: false });
  const snapshot = buildCompanyIntelligenceSnapshot({ organization: organization(), contacts: [contact(), unrelated], opportunities: [opportunity()], signals: [] }, { now: new Date("2026-07-22T12:00:00.000Z") });
  assert.equal(snapshot.contacts.find((item) => item.id === "contact-1").opportunityCount, 1);
  assert.equal(snapshot.contacts.find((item) => item.id === "contact-2").opportunityCount, 0);
  assert.deepEqual(Array.from(snapshot.contacts.find((item) => item.id === "contact-2").opportunityRoles), []);
});

test("attention is deterministic, deduplicated and ordered by severity then recency", () => {
  const overdue = opportunity({ actions: [{ id: "action-overdue", title: "Follow-up restant", description: "", status: "pending", dueDate: "2026-07-10T09:00:00.000Z" }] });
  const urgentSignal = signal({ priority: "urgent", urgencyLevel: "critical", title: "Clientul cere răspuns" });
  const snapshot = buildCompanyIntelligenceSnapshot({ organization: organization(), contacts: [contact()], opportunities: [overdue], signals: [urgentSignal] }, { now: new Date("2026-07-22T12:00:00.000Z") });
  assert.equal(snapshot.attention[0].code, "overdue_next_action");
  assert.equal(snapshot.attention[1].code, "high_priority_signal");
  assert.equal(new Set(snapshot.attention.map((item) => item.id)).size, snapshot.attention.length);
  assert.ok(snapshot.attention.every((item) => item.evidence.sourceId && item.evidence.label));
});

test("canonical next action uses stored opportunity actions before recommendations", () => {
  const storedAction = opportunity({ actions: [{ id: "action-next", title: "Sună persoana de decizie", description: "", status: "pending", dueDate: "2026-07-25T09:00:00.000Z", assignedToName: "Mihai Ionescu" }] });
  const snapshot = buildCompanyIntelligenceSnapshot({ organization: organization(), contacts: [contact()], opportunities: [storedAction], signals: [signal({ recommendedAction: "Trimite o ofertă" })] }, { now: new Date("2026-07-22T12:00:00.000Z") });
  assert.equal(snapshot.canonicalNextAction.title, "Sună persoana de decizie");
  assert.equal(snapshot.canonicalNextAction.evidence.sourceType, "opportunity_action");
  assert.equal(snapshot.canonicalNextAction.href, "/opportunities/opportunity-1#workflow-actions");
});

test("knowledge gaps and empty-company behavior are derived without invented activity", () => {
  const snapshot = buildCompanyIntelligenceSnapshot({ organization: organization({ website: null }), contacts: [], opportunities: [], signals: [] }, { now: new Date("2026-07-22T12:00:00.000Z") });
  assert.equal(snapshot.timeline.length, 0);
  assert.equal(snapshot.canonicalNextAction, null);
  assert.deepEqual(Array.from(snapshot.knowledgeGaps.map((gap) => gap.code)), ["missing_primary_contact", "missing_recent_activity", "missing_domain"]);
  assert.equal(snapshot.commercial.activeOpportunities, 0);
  assert.equal(snapshot.commercial.pendingApprovals, 0);
});

test("timeline keeps newest evidence first and removes duplicate source records", () => {
  const duplicatedEvent = { id: "event-same", label: "Status actualizat", description: "Confirmat", date: "2026-07-21T10:00:00.000Z" };
  const withDuplicates = opportunity({ timeline: [duplicatedEvent, duplicatedEvent] });
  const snapshot = buildCompanyIntelligenceSnapshot({ organization: organization(), contacts: [contact()], opportunities: [withDuplicates], signals: [signal()] }, { now: new Date("2026-07-22T12:00:00.000Z") });
  assert.equal(snapshot.timeline.filter((item) => item.id === "opportunity_event:event-same").length, 1);
  assert.equal(snapshot.timeline[0].occurredAt, "2026-07-21T10:00:00.000Z");
  assert.ok(snapshot.timeline.every((item) => item.evidence.sourceType && item.evidence.sourceId && item.evidence.sourceTimestamp));
});

test("pending approval remains an explicit human decision and never becomes execution", () => {
  const pending = signal({ status: "ready_for_review", reviewStatus: "ready_for_review", priority: "high", recommendedAction: "Pregătește follow-up" });
  const snapshot = buildCompanyIntelligenceSnapshot({ organization: organization(), contacts: [contact()], opportunities: [], signals: [pending] }, { now: new Date("2026-07-22T12:00:00.000Z") });
  assert.equal(snapshot.approvalItems.length, 1);
  assert.equal(snapshot.approvalItems[0].href, "/approvals?signal=signal-1");
  assert.equal(snapshot.canonicalNextAction.href, "/approvals?signal=signal-1");
  const page = read("src/app/(protected)/crm/organizations/[id]/page.tsx");
  assert.match(read("src/components/company/CompanyBusinessMemory.tsx"), /Acțiunea rămâne sub controlul echipei/);
  assert.doesNotMatch(page, /sendEmail|sendSms|webhook|fetch\s*\(/i);
});

test("business memory promotes only the highest-signal items and keeps evidence secondary", () => {
  const overdue = opportunity({ actions: [{ id: "action-overdue", title: "Revino cu oferta", description: "", status: "pending", dueDate: "2026-07-10T09:00:00.000Z" }] });
  const pending = signal({ status: "ready_for_review", reviewStatus: "ready_for_review", priority: "high", recommendedAction: "Pregătește follow-up" });
  const snapshot = buildCompanyIntelligenceSnapshot({ organization: organization(), contacts: [], opportunities: [overdue], signals: [pending] }, { now: new Date("2026-07-22T12:00:00.000Z") });
  assert.ok(snapshot.memory.mustRemember.length <= 5);
  assert.equal(snapshot.memory.mustRemember[0].title, "Follow-up întârziat");
  assert.match(snapshot.memory.mustRemember[0].description, /10 iul\. 2026/);
  assert.doesNotMatch(snapshot.memory.mustRemember[0].description, /2026-07-10/);
  assert.ok(snapshot.memory.mustRemember.some((item) => item.title === "Aprobare în așteptare" && item.actionLabel === "Verifică aprobarea"));
  assert.ok(snapshot.memory.recentEvidence.length <= 3);
  const visibleEvidence = [...snapshot.memory.mustRemember, ...snapshot.memory.openLoops].map((item) => `${item.evidence.sourceType}:${item.evidence.sourceId}`);
  assert.ok(snapshot.memory.recentEvidence.every((item) => !visibleEvidence.includes(`${item.evidence.sourceType}:${item.evidence.sourceId}`)));
});

test("business memory excludes non-critical profile gaps from the primary Company 360 section", () => {
  const snapshot = buildCompanyIntelligenceSnapshot({ organization: organization({ website: null }), contacts: [], opportunities: [], signals: [] }, { now: new Date("2026-07-22T12:00:00.000Z") });
  assert.ok(snapshot.knowledgeGaps.some((gap) => gap.code === "missing_domain"));
  assert.ok(snapshot.memory.criticalGaps.every((gap) => gap.code !== "missing_domain"));
  assert.ok(snapshot.memory.criticalGaps.some((gap) => gap.code === "missing_primary_contact"));
});

test("Company 360 exposes a bounded executive decision layer instead of raw feeds", () => {
  const route = read("src/app/(protected)/crm/organizations/[id]/page.tsx");
  const memory = read("src/components/company/CompanyBusinessMemory.tsx");
  assert.match(route, /CompanyBusinessMemory memory=\{snapshot\.memory\} executiveDecision=\{snapshot\.executiveDecision\}/);
  for (const label of ["Ce contează acum", "CompanyEvidenceLine", "Alte situații de revizuit"]) assert.match(memory, new RegExp(label));
  assert.match(memory, /Sursă:/);
  assert.doesNotMatch(route, /snapshot\.timeline\.map|snapshot\.signals\.slice/);
});

test("Company 360 displays canonical active count and identifies opportunity-derived responsibility", async () => {
  const opportunities = ["open", "won", "lost", "disqualified", "archived"].map((lifecycleStatus, index) => opportunity({
    id: `opportunity-${index}`, lifecycleStatus, ownerName: index === 0 ? "Responsabil activ" : "Responsabil închis"
  }));
  const snapshot = buildCompanyIntelligenceSnapshot({ organization: organization(), contacts: [], opportunities, signals: [] });
  assert.equal(snapshot.opportunities.length, 5);
  assert.equal(snapshot.commercial.activeOpportunities, 1);
  const items = await companySummary(snapshot);
  assert.match(items, /<strong>1<\/strong> oportunitate activă/);
  assert.match(items, /Responsabilitate din oportunități active/);
  assert.match(items, /Responsabil activ/);
  assert.doesNotMatch(items, /Responsabil închis/);
  assert.doesNotMatch(items, /Responsabilul companiei/);
});

test("Company 360 keeps missing responsibility unassigned and does not promote closed owners", async () => {
  const snapshot = buildCompanyIntelligenceSnapshot({ organization: organization(), contacts: [], opportunities: [opportunity({ lifecycleStatus: "won" })], signals: [] });
  const items = await companySummary(snapshot);
  assert.match(items, /<strong>0<\/strong> oportunități active/);
  assert.match(items, /Neatribuit/);
});

test("company relationship presentation preserves unknown and explicitly stored values across surfaces", async () => {
  const React = nodeRequire("react");
  const { renderToStaticMarkup } = nodeRequire("react-dom/server");
  const { CrmWorkspaceClient } = loadPresentation("src/components/crm/CrmWorkspaceClient.tsx");
  for (const [relationshipStatus, expected] of [[undefined, "Neclasificată"], [null, "Neclasificată"], ["", "Neclasificată"], ["unrecognized", "Neclasificată"], ["prospect", "Prospect"], ["customer", "Client"], ["partner", "Partener"], ["inactive", "Inactiv"]]) {
    const company = organization({ relationshipStatus });
    const snapshot = buildCompanyIntelligenceSnapshot({ organization: company, contacts: [], opportunities: [], signals: [] });
    const items = await companySummary(snapshot);
    assert.ok(items.includes(`Relație · ${expected}`));
    const html = renderToStaticMarkup(React.createElement(CrmWorkspaceClient, { organizations: [company], contacts: [], view: "companies" }));
    const mobile = html.match(/<ul\b[\s\S]*?<\/ul>/)?.[0];
    const desktop = html.match(/<tbody\b[\s\S]*?<\/tbody>/)?.[0];
    assert.ok(mobile && desktop, "both registry representations rendered");
    for (const representation of [mobile, desktop]) {
      assert.ok(representation.includes(expected), String(relationshipStatus));
      if (expected === "Neclasificată") assert.equal(representation.includes("Prospect"), false);
    }
  }
});

test("company primary contact remains explicitly flagged rather than the first contact", () => {
  const unflagged = contact({ id: "first", isPrimaryForOrganization: false });
  const flagged = contact({ id: "second", isPrimaryForOrganization: true });
  const build = (contacts) => buildCompanyIntelligenceSnapshot({ organization: organization(), contacts, opportunities: [], signals: [] });
  assert.equal(build([unflagged, flagged]).identity.primaryContact.id, "second");
  assert.equal(build([unflagged]).identity.primaryContact, null);
});
