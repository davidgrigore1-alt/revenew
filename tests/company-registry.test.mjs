import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function loader(overrides = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file }).outputText;
    vm.runInNewContext(compiled, { module, exports: module.exports, Date, Map, Set, URL, URLSearchParams, Intl, require: (id) => {
      if (id in overrides) return overrides[id];
      if (id === "server-only") return {};
      if (id.endsWith(".module.css")) return new Proxy({}, { get: (_target, key) => key === "__esModule" ? false : String(key) });
      if (id === "next/link") return ({ children, ...props }) => React.createElement("a", props, children);
      if (id === "@/components/filters/SavedViewControls") return { SavedViewControls: () => null };
      if (id === "react" && file.endsWith("CompaniesRegistry.tsx")) return { ...React, useMemo: (fn) => fn() };
      if (id.startsWith("@/")) {
        const base = path.resolve("src", id.slice(2));
        return load(base + (fs.existsSync(base + ".ts") ? ".ts" : ".tsx"));
      }
      return require(id);
    } }, { filename: file });
    return module.exports;
  }
  return load;
}
const load = loader();
const { buildCompanyRegistry, companyInitials, companyDomain, filterCompanyRegistry, registryActivityTime } = load("src/lib/crm/company-registry.ts");
const { CompaniesRegistry } = load("src/components/crm/CompaniesRegistry.tsx");
const now = new Date("2026-09-05T12:00:00Z");
const coverage = { organizations: true, contacts: true, opportunities: true, associations: true, actions: true, events: true };
const organization = (id = "c1", extra = {}) => ({ id, businessId: "b1", name: "Meridian Logistics", updatedAt: "2026-09-01T12:00:00Z", ...extra });
const opportunity = (id = "o1", extra = {}) => ({ id, businessId: "b1", organizationId: "c1", status: "new", ownerProfileId: "p1", createdAt: "2026-08-01T12:00:00Z", ...extra });
const contact = (id, extra = {}) => ({ id, businessId: "b1", organizationId: "c1", fullName: id, isActive: true, ...extra });
const action = (id, extra = {}) => ({ id, businessId: "b1", opportunityId: "o1", status: "pending", title: id, description: "", dueDate: "2026-09-08T12:00:00Z", ...extra });
const input = (extra = {}) => ({ businessId: "b1", organizations: [organization()], contacts: [], opportunities: [], associations: [], actions: [], events: [], coverage, ...extra });
const build = (extra) => buildCompanyRegistry(input(extra), now);
const props = (extra = {}) => ({ snapshot: build(), query: "", relationship: "all", sort: "updated", onQuery() {}, onRelationship() {}, onSort() {}, selectedIds: new Set(), onSelection() {}, onCreate() {}, onEdit() {}, onArchive() {}, pending: false, savedViews: [], currentQuery: "sort=updated", ...extra });
const html = (extra) => renderToStaticMarkup(React.createElement(CompaniesRegistry, props(extra)));
function nodes(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}

test("registry counts canonical open opportunities with explicit lifecycle taking precedence", () => {
  const opportunities = [opportunity("open"), ...["won", "lost", "ignored"].map((status) => opportunity(status, { status })), ...["won", "lost", "disqualified", "archived"].map((lifecycleStatus) => opportunity(`life-${lifecycleStatus}`, { lifecycleStatus })), opportunity("explicit-open", { status: "won", lifecycleStatus: "open" })];
  assert.equal(build({ opportunities }).rows[0].activeOpportunities, 2);
});

test("explicit contact associations include inactive contacts, deduplicate companies, and reject foreign tenants", () => {
  const association = { businessId: "b1", opportunityId: "o1", contactBusinessId: "b1", organizationId: "c2" };
  const snapshot = build({ organizations: [organization(), organization("c2"), organization("foreign", { businessId: "b2" })], opportunities: [opportunity(), opportunity(), opportunity("foreign", { businessId: "b2" })], associations: [association, association, { ...association, organizationId: "c1" }, { ...association, contactBusinessId: "b2", organizationId: "foreign" }] });
  assert.deepEqual(Array.from(snapshot.rows, (row) => [row.organization.id, row.activeOpportunities]), [["c1", 1], ["c2", 1]]);
});

test("primary contact requires the explicit active flag and matching company and tenant", () => {
  const contacts = [contact("first"), contact("inactive", { isActive: false, isPrimaryForOrganization: true }), contact("foreign", { businessId: "b2", isPrimaryForOrganization: true }), contact("other", { organizationId: "c2", isPrimaryForOrganization: true }), contact("primary", { isPrimaryForOrganization: true })];
  assert.equal(build({ contacts }).rows[0].primaryContact.fullName, "primary");
  assert.equal(build({ contacts: [contact("first")] }).rows[0].primaryContact, null);
});

test("attention uses pending canonical next action; completed tasks and closed opportunities do not create attention", () => {
  const result = build({ opportunities: [opportunity(), opportunity("closed", { lifecycleStatus: "won", ownerProfileId: null })], actions: [action("done", { status: "done", dueDate: "2026-01-01" }), action("next")] });
  assert.equal(result.rows[0].attention.length, 0);
  const overdue = build({ opportunities: [opportunity("o1", { ownerProfileId: null })], actions: [action("late", { dueDate: "2026-09-01T12:00:00Z" })] }).rows[0].attention;
  assert.deepEqual(Array.from(overdue, (item) => item.code), ["overdue_next_action", "missing_owner"]);
});

test("incomplete queries never prove no next action, no primary contact, zero opportunities, or a healthy company", () => {
  const snapshot = build({ opportunities: [opportunity()], coverage: { ...coverage, contacts: false, opportunities: false, actions: false } });
  assert.equal(snapshot.rows[0].attention.length, 0);
  const rendered = html({ snapshot });
  assert.match(rendered, /≥ 1/);
  assert.match(rendered, /Date incomplete/);
  assert.match(rendered, /Date parțiale/);
  assert.doesNotMatch(rendered, /Niciun motiv identificat|Fără contact principal|healthy|Sănătoasă/);
});

test("activity scans all loaded events, ignores invalid dates, and labels profile updates separately", () => {
  const events = [{ id: "e-old", businessId: "b1", opportunityId: "o1", label: "Notă", occurredAt: "2026-08-20T12:00:00Z" }, { id: "e-new", businessId: "b1", opportunityId: "o1", label: "Follow-up programat", occurredAt: "2026-09-04T12:00:00Z" }, { id: "e-invalid", businessId: "b1", opportunityId: "o1", label: "Invalid", occurredAt: "invalid" }];
  const latest = build({ opportunities: [opportunity()], events }).rows[0].latestActivity;
  assert.equal(latest.sourceId, "e-new");
  assert.equal(latest.label, "Follow-up programat");
  assert.equal(build().rows[0].latestActivity.label, "Profil actualizat");
  assert.equal(build({ organizations: [organization("c1", { updatedAt: null })] }).rows[0].latestActivity, null);
  assert.equal(registryActivityTime(latest.occurredAt, now.toISOString()).relative, "Acum o zi");
});

test("company identity has deterministic Unicode initials and safe display-only domain fallback", () => {
  assert.equal(companyInitials("  Ștefan   Țiriac SRL "), "ȘȚ");
  assert.equal(companyInitials(""), "?");
  assert.equal(companyDomain("https://www.example.ro/path?token=secret"), "example.ro");
  assert.equal(companyDomain("user:password@example.ro"), null);
  assert.equal(companyDomain("javascript:alert(1)"), null);
  assert.equal(companyDomain(null), null);
  const rendered = html();
  assert.match(rendered, /Domeniu necompletat/);
  assert.doesNotMatch(rendered, /<img|srcset|clearbit|logo\.dev/);
});

test("unknown relationship is preserved in both representations without classifying a company as a prospect", () => {
  for (const relationshipStatus of [undefined, null, "", "unexpected", "prospect", "customer", "partner", "inactive"]) {
    const rendered = html({ snapshot: build({ organizations: [organization("c1", { relationshipStatus })] }) });
    const expected = { prospect: "Prospect", customer: "Client", partner: "Partener", inactive: "Inactiv" }[relationshipStatus] ?? "Neclasificată";
    assert.ok(rendered.match(/<ul\b[\s\S]*?<\/ul>/)[0].includes(expected));
    assert.ok(rendered.match(/<tbody\b[\s\S]*?<\/tbody>/)[0].includes(expected));
  }
});

test("search, relationship filters and stable sorts preserve the established query contract", () => {
  const snapshot = build({ organizations: [organization("b", { name: "Șantier SA", industry: "Construcții", city: "Brașov", relationshipStatus: "customer" }), organization("a", { name: "Atlas SA", relationshipStatus: "prospect", website: "only-domain.example" })], opportunities: [opportunity("o1", { organizationId: "b" })] });
  assert.equal(filterCompanyRegistry(snapshot.rows, " BRAȘOV ", "all", "name")[0].organization.id, "b");
  assert.equal(filterCompanyRegistry(snapshot.rows, "construcții", "prospect", "name").length, 0);
  assert.equal(filterCompanyRegistry(snapshot.rows, "only-domain", "all", "name").length, 0);
  assert.deepEqual(Array.from(filterCompanyRegistry(snapshot.rows, "", "all", "name"), (row) => row.organization.id), ["a", "b"]);
  assert.equal(filterCompanyRegistry(snapshot.rows, "", "all", "opportunities")[0].organization.id, "b");
});

test("recent-update sorting preserves event-first saved-view order independently of activity display", () => {
  const snapshot = build({
    organizations: [organization("a"), organization("b"), organization("c", { updatedAt: "2026-09-03T12:00:00Z" })],
    opportunities: [opportunity("oa", { organizationId: "a", updatedAt: "2026-09-05T10:00:00Z" }), opportunity("ob", { organizationId: "b" })],
    actions: [action("new-action", { opportunityId: "oa", updatedAt: "2026-09-05T11:00:00Z" })],
    events: [{ id: "ea", businessId: "b1", opportunityId: "oa", label: "Notă A", occurredAt: "2026-09-01T12:00:00Z" }, { id: "eb", businessId: "b1", opportunityId: "ob", label: "Notă B", occurredAt: "2026-09-04T12:00:00Z" }]
  });
  assert.equal(snapshot.rows[0].latestActivity.sourceId, "new-action");
  assert.deepEqual(Array.from(filterCompanyRegistry(snapshot.rows, "", "all", "updated"), (row) => row.organization.id), ["b", "c", "a"]);
});

test("selection targets invoke selection only; row identity stays a native navigable link", () => {
  let selected;
  let edited = false;
  const tree = CompaniesRegistry(props({ selectedIds: new Set(["hidden"]), onSelection: (ids) => { selected = ids; }, onEdit: () => { edited = true; } }));
  const checkbox = nodes(tree).find((node) => node.props?.["aria-label"] === "Selectează compania Meridian Logistics");
  checkbox.props.onChange();
  assert.deepEqual([...selected], ["hidden", "c1"]);
  assert.equal(edited, false);
  const rendered = html();
  assert.match(rendered, /href="\/crm\/organizations\/c1"/);
  for (const [anchor] of rendered.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)) assert.doesNotMatch(anchor, /type="checkbox"/);
  assert.match(rendered, /<table\b/);
  assert.match(rendered, /<th scope="row"/);
  assert.match(rendered, /<caption/);
  assert.match(rendered, /aria-label="Editează compania Meridian Logistics"/);
});

test("no records, search miss and relationship-empty have different recoverable states", () => {
  assert.match(html({ snapshot: build({ organizations: [] }) }), /Adaugă prima companie/);
  assert.match(html({ query: "no-match" }), /Nicio companie găsită/);
  assert.match(html({ relationship: "customer" }), /Nicio companie în această relație/);
  assert.match(html({ query: "no-match" }), /Resetează filtrele/);
});

test("company load retry refreshes the current route instead of navigating to the dashboard", () => {
  let refreshed = 0;
  const load = loader({ "next/navigation": { useRouter: () => ({ refresh: () => refreshed++ }) } });
  const { CompaniesRegistryError } = load("src/components/crm/CompaniesRegistry.tsx");
  const error = CompaniesRegistryError({ message: "Reîncearcă în câteva momente." });
  error.props.onAction();
  assert.equal(refreshed, 1);
  assert.equal(error.props.actionHref, undefined);
});

test("Companies can present private views without changing the shared disclosure or its default consumers", () => {
  const loadViews = loader({
    "next/navigation": { useRouter: () => ({}) },
    "@/lib/saved-views/actions": { createSavedView() {}, deleteSavedView() {} }
  });
  const { SavedViewControls } = loadViews("src/components/filters/SavedViewControls.tsx");
  const viewProps = { views: [{ id: "v1", name: "Prospecte", filter_state: { relationship: "prospect" } }], currentQuery: "relationship=prospect", targetPage: "companies" };
  const original = renderToStaticMarkup(React.createElement(SavedViewControls, viewProps));
  const custom = renderToStaticMarkup(React.createElement(SavedViewControls, { ...viewProps, summary: React.createElement("span", null, "Vizualizări private (1)") }));
  assert.match(original, /Vizualizări private/);
  assert.match(custom, /Vizualizări private \(1\)/);
  assert.equal(custom.split("</summary>")[1], original.split("</summary>")[1]);
  for (const markup of [original, custom]) {
    assert.match(markup, /Salvează filtrele curente/);
    assert.match(markup, /disabled=""/);
    assert.match(markup, />Prospecte<\/button>/);
    assert.match(markup, /aria-label="Șterge vizualizarea Prospecte"/);
  }
});

function dataLoader(results, context = { business: { id: "b1" } }) {
  const calls = [];
  const supabase = { from(table) {
    const call = { table, operations: [] }; calls.push(call);
    const query = { then(resolve, reject) { return Promise.resolve(results[table] ?? { data: [], count: 0, error: null }).then(resolve, reject); } };
    for (const method of ["select", "eq", "in", "order", "limit"]) query[method] = (...args) => { call.operations.push([method, ...args]); return query; };
    return query;
  } };
  const load = loader({ "@/lib/supabase/server": { createSupabaseServerClient: async () => supabase }, "@/lib/supabase/status": { isSupabaseConfigured: true }, "@/lib/business/current-business": { getCurrentBusinessForUser: async () => context } });
  return { calls, run: load("src/lib/crm/company-registry-data.ts").getCompanyRegistryForCurrentBusiness };
}
const rawCompany = { id: "c1", business_id: "b1", name: "Meridian", is_archived: false };
const rawOpportunity = { id: "o1", business_id: "b1", organization_id: "c1", status: "new" };
const result = (data, extra = {}) => ({ data, count: data.length, error: null, ...extra });

test("registry loader scopes every bounded narrow query to server-derived business and avoids N+1 hydration", async () => {
  const { run, calls } = dataLoader({ crm_organizations: result([rawCompany]), opportunities: result([rawOpportunity]) });
  assert.equal((await run()).ready, true);
  assert.equal(calls.length, 6);
  for (const call of calls) {
    assert.ok(call.operations.some(([method, field, value]) => method === "eq" && field === "business_id" && value === "b1"), call.table);
    assert.ok(call.operations.some(([method, value]) => method === "limit" && value === 500));
    const select = call.operations.find(([method]) => method === "select");
    assert.equal(select[2].count, "exact");
    assert.equal(select[1].includes("*"), false);
    assert.ok(call.operations.some(([method, field]) => method === "order" && field === "id"));
  }
});

test("loader detects both truncation and unavailable counts instead of claiming complete results", async () => {
  for (const count of [501, null]) {
    const { run } = dataLoader({ crm_organizations: result([rawCompany], { count }), opportunities: result([rawOpportunity], { count }) });
    const snapshot = (await run()).registry;
    assert.equal(snapshot.coverage.organizations, false);
    assert.equal(snapshot.coverage.opportunities, false);
  }
});

test("source failures retain companies with explicit unavailable coverage; raw errors never reach the UI", async () => {
  const secretError = { message: "internal_database_secret" };
  const { run } = dataLoader({ crm_organizations: result([rawCompany]), opportunities: result([], { error: secretError }), crm_contacts: result([], { error: secretError }) });
  const response = await run();
  assert.equal(response.ready, true);
  assert.equal(response.registry.coverage.opportunities, false);
  assert.equal(response.registry.coverage.contacts, false);
  assert.equal(JSON.stringify(response).includes(secretError.message), false);
  const failed = await dataLoader({ crm_organizations: result([], { error: secretError }) }).run();
  assert.equal(failed.ready, false);
  assert.equal(JSON.stringify(failed).includes(secretError.message), false);
});

test("missing server business cannot issue data queries", async () => {
  const { run, calls } = dataLoader({}, null);
  assert.equal((await run()).ready, false);
  assert.equal(calls.length, 0);
});
