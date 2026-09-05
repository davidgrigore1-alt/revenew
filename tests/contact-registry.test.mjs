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
      if (id === "react" && file.endsWith("ContactsRegistry.tsx")) return { ...React, useMemo: (fn) => fn() };
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
const { buildContactRegistry, filterContactRegistry, normalizeContactFilter, normalizeContactSort } = load("src/lib/crm/contact-registry.ts");
const { ContactsRegistry } = load("src/components/crm/ContactsRegistry.tsx");
const coverage = { contacts: true, organizations: true, associations: true };
const company = { id: "co", businessId: "b", name: "Meridian Logistics" };
const contact = (id = "c", extra = {}) => ({ id, businessId: "b", organizationId: "co", fullName: "Andrei Ionescu", jobTitle: "Director Comercial", isActive: true, ...extra });
const opportunity = (id = "o", extra = {}) => ({ id, businessId: "b", title: "Contract logistic", status: "new", ...extra });
const association = (extra = {}) => ({ businessId: "b", contactId: "c", opportunity: opportunity(), ...extra });
const build = (extra = {}) => buildContactRegistry({ businessId: "b", contacts: [contact()], organizations: [company], associations: [], coverage, ...extra });
const props = (extra = {}) => ({ snapshot: build(), query: "", filter: "all", sort: "name", onQuery() {}, onFilter() {}, onSort() {}, selectedIds: new Set(), onSelection() {}, pending: false, savedViews: [], currentQuery: "sort=name", onCreate() {}, onEdit() {}, onArchive() {}, ...extra });
const html = (extra) => renderToStaticMarkup(React.createElement(ContactsRegistry, props(extra)));
function nodes(node) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(nodes); return [node, ...nodes(node.props?.children)]; }

test("only a unique explicit active company primary is confirmed", () => {
  assert.equal(build().rows[0].primary, "none");
  assert.equal(build({ contacts: [contact("c", { isPrimaryForOrganization: true })] }).rows[0].primary, "confirmed");
  for (const extra of [{ isActive: false }, { isActive: null }, { organizationId: null }, { archivedAt: "2026-09-01" }]) {
    assert.equal(build({ contacts: [contact("c", { isPrimaryForOrganization: true, ...extra })] }).rows[0].primary, "none");
  }
  const duplicate = build({ contacts: [contact("a", { isPrimaryForOrganization: true }), contact("b", { isPrimaryForOrganization: true })] });
  assert.ok(duplicate.rows.every((row) => row.primary === "ambiguous"));
  assert.equal(filterContactRegistry(duplicate.rows, "", "primary", "name").length, 0);
});

test("partial contacts cannot establish uniqueness and unavailable company remains unknown", () => {
  for (const extra of [{ coverage: { ...coverage, contacts: false } }, { organizations: [] }]) {
    assert.equal(build({ contacts: [contact("c", { isPrimaryForOrganization: true })], ...extra }).rows[0].primary, "unknown");
  }
});

test("opportunity links never invent a canonical company and tenant mismatches are discarded", () => {
  const snapshot = build({ contacts: [contact("c", { organizationId: null, organization: company }), contact("foreign", { businessId: "other" })], associations: [association(), association({ businessId: "other" }), association({ opportunity: opportunity("foreign", { businessId: "other" }) })] });
  assert.equal(snapshot.rows.length, 1);
  assert.equal(snapshot.rows[0].contact.organization, null);
  assert.equal(snapshot.rows[0].active.length, 1);
  assert.equal(build({ organizations: [{ ...company, businessId: "other" }] }).rows[0].contact.organization, null);
});

test("canonical lifecycle takes precedence; history and duplicate associations stay separate", () => {
  const linked = [opportunity(), opportunity(), opportunity("won", { status: "won" }), opportunity("ignored", { status: "ignored" }), opportunity("explicit-open", { status: "won", lifecycleStatus: "open" }), ...["won", "lost", "disqualified", "archived"].map((lifecycleStatus) => opportunity(lifecycleStatus + "-life", { lifecycleStatus }))];
  const row = build({ associations: linked.map((item) => association({ opportunity: item })) }).rows[0];
  assert.equal(row.active.length, 2);
  assert.equal(row.closedCount, 6);
});

test("search preserves name, title, canonical company, email and phone; states are explicit", () => {
  const rows = build({ contacts: [contact("c", { email: "a@example.com", phone: "0712345678", isPrimaryForOrganization: true }), contact("inactive", { isActive: false }), contact("unknown", { isActive: null }), contact("none", { organizationId: null, fullName: "Elena Popa", jobTitle: null })] }).rows;
  for (const query of [" andrei ", "DIRECTOR", "Meridian", "a@example.com", "071234"]) assert.equal(filterContactRegistry(rows, query, "all", "name").length, 1);
  assert.equal(filterContactRegistry(rows, "", "all", "name").length, 2);
  assert.equal(filterContactRegistry(rows, "", "primary", "name").length, 1);
  assert.equal(filterContactRegistry(rows, "", "inactive", "name")[0].contact.id, "inactive");
  assert.equal(filterContactRegistry(rows, "", "unknown", "name")[0].contact.id, "unknown");
  assert.equal(filterContactRegistry(rows, "", "unassociated", "name")[0].contact.id, "none");
  assert.equal(normalizeContactFilter("__proto__"), "all");
  assert.equal(normalizeContactSort("unsupported"), "updated");
});

test("record-update sorting is deterministic and does not mutate the cohort", () => {
  const rows = build({ contacts: [contact("a", { fullName: "Zoe", updatedAt: "2026-01-01" }), contact("b", { fullName: "Ana", updatedAt: "2026-02-01" })] }).rows;
  assert.equal(filterContactRegistry(rows, "", "all", "updated")[0].contact.id, "b");
  assert.equal(filterContactRegistry(rows, "", "all", "name")[0].contact.fullName, "Ana");
  assert.equal(rows[0].contact.id, "a");
});

test("rendered registry uses person/company/opportunity links without leaking contact methods", () => {
  const markup = html({ snapshot: build({ contacts: [contact("c", { email: "private@example.com", phone: "0712345678", isPrimaryForOrganization: true })], associations: [association()] }) });
  for (const href of ["/crm/contacts/c", "/crm/organizations/co", "/opportunities/o"]) assert.ok(markup.includes(`href="${href}"`));
  assert.match(markup, /scope="row"/); assert.match(markup, /scope="col"/);
  assert.match(markup, /aria-label="Selectează contactul Andrei Ionescu"/);
  assert.match(markup, /Contact principal/);
  assert.doesNotMatch(markup, /private@example.com|0712345678/);
});

test("selection, edit and archive invoke only their own callbacks; rows have no click handler", () => {
  const calls = [];
  const tree = nodes(ContactsRegistry(props({ onSelection: (ids) => calls.push(["select", Array.from(ids)]), onEdit: (item) => calls.push(["edit", item.id]), onArchive: (id) => calls.push(["archive", id]) })));
  tree.find((node) => node.props?.["aria-label"] === "Selectează contactul Andrei Ionescu").props.onChange();
  tree.find((node) => node.props?.["aria-label"] === "Editează contactul Andrei Ionescu").props.onClick();
  tree.find((node) => node.props?.["aria-label"] === "Arhivează contactul Andrei Ionescu").props.onClick();
  assert.deepEqual(calls, [["select", ["c"]], ["edit", "c"], ["archive", "c"]]);
  assert.ok(tree.filter((node) => node.type === "tr" || node.type === "li").every((node) => !node.props.onClick));
});

test("partial opportunity coverage never renders a confirmed empty count", () => {
  const markup = html({ snapshot: build({ coverage: { ...coverage, associations: false } }) });
  assert.match(markup, /Context incomplet/); assert.doesNotMatch(markup, /Fără oportunități active/);
  assert.match(html({ snapshot: build({ associations: [association()], coverage: { ...coverage, associations: false } }) }), /≥ 1/);
});

test("inactive records cannot reactivate through edit or navigate to the active-only detail route", () => {
  const markup = html({ snapshot: build({ contacts: [contact("c", { isActive: false, isPrimaryForOrganization: true })] }), filter: "inactive" });
  assert.match(markup, /Contact inactiv/); assert.match(markup, /href="\/crm\/organizations\/co"/);
  assert.doesNotMatch(markup, /href="\/crm\/contacts\/c"|Editează contactul|Arhivează contactul/);
});

test("distinct zero, search-empty and filter-empty states", () => {
  assert.match(html({ snapshot: build({ contacts: [] }) }), /Adaugă primul contact/);
  assert.match(html({ query: "absent" }), /Niciun contact găsit/);
  assert.match(html({ filter: "primary" }), /Niciun contact în această selecție/);
});

test("load retry refreshes the Contacts route", () => {
  let refreshes = 0;
  const { ContactsRegistryError } = loader({ "next/navigation": { useRouter: () => ({ refresh: () => refreshes++ }) } })("src/components/crm/ContactsRegistry.tsx");
  const error = ContactsRegistryError({ message: "Reîncearcă" });
  error.props.onAction();
  assert.equal(refreshes, 1);
  assert.equal(error.props.actionHref, undefined);
});

test("mobile and desktop use the same facts and CSS preserves readable responsive semantics", () => {
  const markup = html({ snapshot: build({ contacts: [contact("c", { isPrimaryForOrganization: true })] }) });
  assert.match(markup, /<ul[^>]*aria-label="Contacte"/); assert.match(markup, /<table/);
  assert.equal((markup.match(/Contact principal/g) ?? []).length, 2);
  const css = fs.readFileSync("src/components/crm/ContactsRegistry.module.css", "utf8");
  assert.match(css, /overflow-wrap: anywhere/); assert.match(css, /max-width: 767px/);
  assert.doesNotMatch(css, /(?:^|[;\s])order:|grid-area:/);
});

function dataLoader(results, { authFailure = false } = {}) {
  const reads = [];
  const client = { from(table) {
    const read = { table, operations: [] }; reads.push(read);
    const query = new Proxy({}, { get(_target, key) {
      if (key === "then") return (resolve, reject) => Promise.resolve(results[table] ?? { data: [], count: 0, error: null }).then(resolve, reject);
      return (...args) => { read.operations.push([key, ...args]); return query; };
    } }); return query;
  } };
  const loaded = loader({ "@/lib/business/current-business": { getCurrentBusinessForUser: async () => { if (authFailure) throw new Error("auth redirect"); return { business: { id: "b" } }; } }, "@/lib/supabase/server": { createSupabaseServerClient: async () => client }, "@/lib/supabase/status": { isSupabaseConfigured: true } })("src/lib/crm/contact-registry-data.ts");
  return { run: loaded.getContactRegistryForCurrentBusiness, reads };
}
const result = (data, extra = {}) => ({ data, count: data.length, error: null, ...extra });
const dbContact = { id: "c", business_id: "b", organization_id: "co", full_name: "Andrei", is_active: true, is_primary_for_organization: true };

test("loader makes three bounded tenant-scoped reads, no full opportunity workflows", async () => {
  const { run, reads } = dataLoader({ crm_contacts: result([dbContact]), crm_organizations: result([{ id: "co", business_id: "b", name: "Meridian" }]), opportunity_contacts: result([{ id: "a", business_id: "b", contact_id: "c", opportunities: { id: "o", business_id: "b", title: "Work", status: "new" } }]) });
  const loaded = await run();
  assert.equal(loaded.ready, true); assert.equal(loaded.registry.rows[0].active.length, 1);
  assert.equal(reads.length, 3);
  for (const read of reads) {
    assert.ok(read.operations.some(([op, col, value]) => op === "eq" && col === "business_id" && value === "b"));
    assert.ok(read.operations.some(([op, value]) => op === "limit" && value === 500));
    assert.ok(read.operations.some(([op, _cols, options]) => op === "select" && options.count === "exact"));
  }
  assert.ok(reads[2].operations.some(([op, column, ids]) => op === "in" && column === "contact_id" && ids[0] === "c"));
});

test("loader sanitizes contact errors, preserves partial context and detects lower API caps", async () => {
  const failed = await dataLoader({ crm_contacts: result([], { error: { message: "secret provider payload" } }) }).run();
  assert.equal(failed.ready, false); assert.doesNotMatch(failed.error, /secret/);
  const partial = await dataLoader({ crm_contacts: result([dbContact], { count: 900 }), crm_organizations: result([], { error: {} }), opportunity_contacts: result([{ business_id: "b", contact_id: "c", opportunities: null }]) }).run();
  assert.equal(partial.ready, true);
  assert.ok(Object.values(partial.registry.coverage).every((value) => value === false));
  assert.equal(partial.registry.rows[0].primary, "unknown");
  await assert.rejects(dataLoader({}, { authFailure: true }).run(), /auth redirect/);
});
