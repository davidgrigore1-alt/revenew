import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
function modules(overrides = {}) {
  const cache = new Map();
  function load(file) {
    const filename = path.resolve(file);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true
    }}).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, Date, Map, Set, URL, URLSearchParams, require(id) {
      if (id in overrides) return overrides[id];
      if (id.endsWith(".css")) return { __esModule: true, default: new Proxy({}, { get: (_, name) => String(name) }) };
      if (id.startsWith(".")) return load(path.resolve(path.dirname(filename), id) + ".tsx");
      if (id === "server-only") return {};
      if (id.startsWith("@/")) {
        const base = path.join("src", id.slice(2));
        return load(fs.existsSync(base + ".ts") ? base + ".ts" : base + ".tsx");
      }
      return require(id);
    }}, { filename });
    return module.exports;
  }
  return load;
}

const company = { id: "company", business_id: "business", name: "Meridian" };
const person = { id: "person", business_id: "business", organization_id: "company", full_name: "Andrei", is_active: true, is_primary_for_organization: true };
const deal = { id: "deal", business_id: "business", organization_id: "company", title: "Contract", status: "contacted", lifecycle_status: "open", currency: "RON", estimated_value_high: 42000 };
function fixture(direct = person, joined = person) {
  const queries = [];
  const client = {
    from(table) {
      const query = { table, fields: "", filters: [] };
      queries.push(query);
      const chain = {
        select(fields) { query.fields = fields; return chain; },
        eq(...args) { query.filters.push(args); return chain; },
        in(...args) { query.filters.push(args); return chain; },
        order() { return chain; }, limit() { return chain; }, maybeSingle() { return chain; },
        then(resolve) {
          const data = table === "crm_organizations" ? company : table === "crm_contacts" ? (Array.isArray(direct) ? direct : [direct]) : table === "opportunities" ? [deal]
            : table === "opportunity_contacts" ? query.fields === "opportunity_id" ? [{ opportunity_id: "deal" }] : [{ id: "association", business_id: "business", opportunity_id: "deal", contact_id: joined.id, is_primary: true, crm_contacts: joined }] : [];
          return Promise.resolve({ data, error: null }).then(resolve);
        }
      };
      return chain;
    },
    rpc: async () => ({ data: [], error: null })
  };
  const load = modules({
    "@/lib/business/current-business": { getCurrentBusinessForUser: async () => ({ business: { id: "business" } }) },
    "@/lib/commercial-inbox": { getCommercialSignalsForOrganization: async () => [] },
    "@/lib/supabase/server": { createSupabaseServerClient: async () => client },
    "@/lib/supabase/status": { isSupabaseConfigured: true }
  });
  return { load, queries, api: load("src/lib/company-intelligence.ts") };
}

test("real loader merge preserves explicit company primary contact over a narrow association projection", async () => {
  const { api, queries } = fixture();
  const { snapshot } = await api.getCompanyIntelligenceSnapshot("company");
  assert.equal(snapshot.identity.primaryContact?.id, "person");
  assert.equal(snapshot.contacts.find(c => c.id === "person").isPrimary, true);
  assert.equal(snapshot.attention.some(i => i.code === "missing_primary_contact"), false);
  assert.equal(snapshot.knowledgeGaps.some(i => i.code === "missing_primary_contact"), false);
  for (const query of queries) assert.ok(query.filters.some(([field, value]) => field === "business_id" && value === "business"));
});

test("opportunity-primary flag never substitutes for a company-primary flag", async () => {
  const { api } = fixture({ ...person, is_primary_for_organization: false });
  const { snapshot } = await api.getCompanyIntelligenceSnapshot("company");
  assert.equal(snapshot.identity.primaryContact, null);
  assert.equal(snapshot.contacts[0].isPrimary, false);
});

test("inactive, unknown-active, foreign-company, foreign-tenant and ambiguous primaries are not promoted", async () => {
  for (const patch of [{ is_active: false }, { is_active: undefined }, { organization_id: "other" }, { business_id: "foreign" }]) {
    const { snapshot } = await fixture({ ...person, ...patch }).api.getCompanyIntelligenceSnapshot("company");
    assert.equal(snapshot.identity.primaryContact, null, JSON.stringify(patch));
    assert.equal(snapshot.contacts.some(c => c.isPrimary), false);
  }
  const { snapshot } = await fixture([person, { ...person, id: "second" }]).api.getCompanyIntelligenceSnapshot("company");
  assert.equal(snapshot.identity.primaryContact, null);
});

test("query limits are disclosed and duplicate contact links do not duplicate opportunities", async () => {
  const contacts = Array.from({ length: 50 }, (_, i) => ({ ...person, id: `p${i}`, is_primary_for_organization: false }));
  const { snapshot } = await fixture(contacts).api.getCompanyIntelligenceSnapshot("company");
  assert.equal(snapshot.coverage.atLimit, true);
  assert.equal(snapshot.opportunities.length, 1);
});

const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const noop = () => null;
const presentationOverrides = {
  "next/link": { __esModule: true, default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children) },
  "@/components/opportunities/CreateOpportunityPanel": { CreateOpportunityPanel: noop },
  "@/components/intelligence/ExplanationDisclosure": { ExplanationDisclosure: noop }
};
function render(load, file, name, props) { return renderToStaticMarkup(React.createElement(load(file)[name], props)); }
async function baseSnapshot() { return (await fixture().api.getCompanyIntelligenceSnapshot("company")).snapshot; }

test("briefing preserves distinct issues while eliminating duplicate attention projections", async () => {
  const snapshot = await baseSnapshot();
  snapshot.attention.push({ ...snapshot.attention[0] });
  const load = modules(presentationOverrides);
  const { companyBriefing } = load("src/lib/company-briefing.ts");
  const model = companyBriefing(snapshot);
  assert.equal(model.issues.filter(i => i.code === "missing_owner").length, 1);
  assert.equal(model.issues.filter(i => i.code === "missing_next_action").length, 1);
  const html = render(load, "src/components/company/CompanyBusinessMemory.tsx", "CompanyBusinessMemory", { memory: snapshot.memory, executiveDecision: snapshot.executiveDecision, recoverableValueByCurrency: snapshot.commercial.recoverableValueByCurrency, attention: model.issues });
  for (const issue of model.issues) assert.equal(html.split(`data-issue="${issue.id}"`).length - 1, 1);
  assert.ok(html.includes("Ce contează acum"));
  assert.ok(html.includes('href="/opportunities/deal"'));
  assert.ok(html.includes('href="/opportunities/deal?tab=workflow#workflow-actions"'));
});

test("responsibility uses unique profile IDs from canonical active opportunities, including missing and unavailable identities", async () => {
  const snapshot = await baseSnapshot();
  const { companyBriefing } = modules()("src/lib/company-briefing.ts");
  snapshot.opportunities = [
    { ...snapshot.opportunities[0], id: "a", ownerProfileId: "one", ownerName: "Same name" },
    { ...snapshot.opportunities[0], id: "b", ownerProfileId: "two", ownerName: "Same name" },
    ...["won", "lost", "disqualified", "archived"].map(lifecycleStatus => ({ ...snapshot.opportunities[0], lifecycleStatus, ownerProfileId: "closed", ownerName: "Closed owner" }))
  ];
  assert.equal(companyBriefing(snapshot).active.length, 2);
  assert.equal(companyBriefing(snapshot).owners.length, 2);
  assert.equal(companyBriefing(snapshot).responsibility, "2 responsabili în oportunitățile active");
  snapshot.opportunities[1].ownerProfileId = null;
  assert.equal(companyBriefing(snapshot).unassigned, 1);
  snapshot.opportunities[0].ownerName = null;
  assert.equal(companyBriefing(snapshot).responsibility, "Identitate neconfirmată");
  snapshot.coverage.responsibilityUnavailable = true;
  assert.equal(companyBriefing(snapshot).responsibility, "Identități indisponibile");
});

test("active work and people render primary identity, original currencies and real detail links", async () => {
  const snapshot = await baseSnapshot();
  snapshot.opportunities.push({ ...snapshot.opportunities[0], id: "eur", title: "Euro contract", currency: "EUR", estimatedValue: 7000, href: "/opportunities/eur" });
  snapshot.opportunities.push({ ...snapshot.opportunities[0], id: "closed", title: "Closed contract", lifecycleStatus: "won" });
  const html = render(modules(presentationOverrides), "src/components/company/CompanyBriefing.tsx", "CompanyActiveWork", { snapshot });
  assert.ok(html.includes("RON") && html.includes("EUR") && html.includes("Valoare estimată"));
  assert.ok(html.includes('href="/crm/contacts/person"') && html.includes("Contact principal"));
  assert.ok(html.includes('href="/opportunities/eur"'));
  assert.equal(html.includes("Closed contract"), false);
});

test("empty, unknown and bounded Company 360 states stay explicit in rendered output", async () => {
  const snapshot = await baseSnapshot();
  snapshot.opportunities = []; snapshot.contacts = []; snapshot.identity.primaryContact = null;
  snapshot.commercial.latestActivity = null; snapshot.coverage.atLimit = true;
  const load = modules(presentationOverrides);
  for (const relationshipStatus of [undefined, null, "", "unrecognized"]) {
    snapshot.organization.relationshipStatus = relationshipStatus;
    const html = render(load, "src/components/company/CompanyBriefing.tsx", "CompanyIdentity", { snapshot });
    assert.ok(html.includes("Neclasificată") && html.includes("Imagine parțială") && html.includes("datată neconfirmată"));
    assert.equal(html.includes("Prospect"), false);
  }
  const html = render(load, "src/components/company/CompanyBriefing.tsx", "CompanyActiveWork", { snapshot });
  assert.ok(html.includes("Nicio oportunitate activă") && html.includes("Nicio persoană asociată"));
});

test("evidence and documents retain fact, timestamp, state and a navigable source", async () => {
  const snapshot = await baseSnapshot();
  snapshot.documents = [{ id: "doc", title: "Offer", status: "approved", opportunityTitle: "Contract", href: "/opportunities/deal#opportunity-documents", occurredAt: null }];
  const html = render(modules(presentationOverrides), "src/components/company/CompanyBriefing.tsx", "CompanyRecentContext", { snapshot });
  assert.ok(html.includes("Aprobat") && html.includes("Dată neconfirmată"));
  assert.ok(html.includes('href="/opportunities/deal?tab=workflow#opportunity-documents"'));
  assert.ok(html.includes("Nu există istoric comercial datat"));
  assert.equal(html.includes("Trimis cu succes"), false);
});

test("execution includes the leading issue once, excludes closed tasks and distinguishes unavailable private context", async () => {
  const snapshot = await baseSnapshot();
  snapshot.opportunities.push({ ...snapshot.opportunities[0], id: "closed", lifecycleStatus: "won", nextActionTitle: "Closed task" });
  const html = render(modules(presentationOverrides), "src/components/company/CompanyExecutionWorkspace.tsx", "CompanyExecutionWorkspace", { snapshot, emails: [], events: [], hasConnection: false });
  assert.equal(html.split(`data-issue="${snapshot.attention[0].id}"`).length - 1, 1);
  assert.equal(html.includes("Closed task"), false);
  assert.ok(html.includes("neconectat sau indisponibil"));
});

test("route reads notes only for Notes and owner-private context only for Execution; invalid tab falls back to Context", async () => {
  const snapshot = await baseSnapshot();
  for (const tab of [undefined, "overview", "execution", "contacts", "opportunities", "notes", "ask", "invalid"]) {
    const calls = [];
    const stub = new Proxy({}, { get: () => noop });
    const overrides = { ...presentationOverrides,
      "next/navigation": { notFound: () => { throw new Error("not_found"); } },
      "@/lib/company-intelligence": { getCompanyIntelligenceSnapshot: async () => ({ ready: true, snapshot }) },
      "@/lib/company-commercial-memory": { suggestedCompanyQuestions: () => ["Question"] },
      "@/lib/ai/google-context-tool": { getExternalContextForCompany: async id => { calls.push(["private", id]); return { connection: null, emails: [], events: [] }; } },
      "@/lib/workspace-notes": { getWorkspaceNotes: async (...args) => { calls.push(["notes", ...args]); return []; } }
    };
    for (const id of ["company/CompanyBusinessMemory", "company/CompanyBriefing", "company/CompanyExecutionWorkspace", "company/CompanyContextualAsk", "dashboard/DataCard", "dashboard/PageShell", "workspace/RecordNotes"]) overrides[`@/components/${id}`] = stub;
    const page = modules(overrides)("src/app/(protected)/crm/organizations/[id]/page.tsx").default;
    const html = renderToStaticMarkup(await page({ params: Promise.resolve({ id: "company" }), searchParams: Promise.resolve({ tab }) }));
    assert.deepEqual(calls, tab === "execution" ? [["private", "company"]] : tab === "notes" ? [["notes", "company", "company"]] : []);
    assert.ok(html.includes(`href="?tab=${tab === undefined || tab === "invalid" ? "overview" : tab}" aria-current="page"`));
    assert.equal(html.includes('role="tab"'), false);
  }
});

test("Company Ask retains company context and makes the existing explicit workspace scope switch truthful", () => {
  let captured;
  const load = modules({ ...presentationOverrides, "@/components/intelligence/CopilotConversation": { CopilotConversation: props => { captured = props; return null; } } });
  const html = render(load, "src/components/company/CompanyContextualAsk.tsx", "CompanyContextualAsk", { organizationId: "company", companyName: "Meridian", suggestions: ["Question"] });
  assert.equal(captured.lockedContext.pageType, "company");
  assert.equal(captured.lockedContext.organizationId, "company");
  assert.equal(captured.contextLabel, "Meridian");
  assert.ok(html.includes("schimba explicit aria în Workspace autorizat"));
});

test("pending approval replaces the generic alert for that signal but preserves unrelated signals", async () => {
  const snapshot = await baseSnapshot();
  const source = snapshot.attention[0];
  snapshot.attention = [
    { ...source, id: "approval", code: "pending_approval", evidence: { ...source.evidence, sourceType: "approval", sourceId: "signal" } },
    { ...source, id: "generic", code: "high_priority_signal", evidence: { ...source.evidence, sourceType: "commercial_signal", sourceId: "signal" } },
    { ...source, id: "other", code: "high_priority_signal", evidence: { ...source.evidence, sourceType: "commercial_signal", sourceId: "other" } }
  ];
  const model = modules()("src/lib/company-briefing.ts").companyBriefing(snapshot);
  assert.equal(model.issues.map(item => item.id).join(","), "approval,other");
});

test("truncated data cannot prove absent next steps, primary contacts or recent activity", async () => {
  const snapshot = await baseSnapshot();
  snapshot.coverage.atLimit = true;
  const model = modules()("src/lib/company-briefing.ts").companyBriefing(snapshot);
  assert.equal(model.issues.some(item => ["missing_next_action", "missing_primary_contact", "inactive_company"].includes(item.code)), false);
  assert.equal(model.issues.some(item => item.code === "missing_owner"), true, "explicit absent owner ID remains a known fact");
});
