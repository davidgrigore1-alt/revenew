import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const nodeRequire = createRequire(import.meta.url);

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function load(relativePath) {
  const filename = path.resolve(relativePath);
  const compiled = ts.transpileModule(read(relativePath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    exports: module.exports,
    module,
    Date,
    URL,
    require: (id) => id.startsWith("@/") ? load(path.join("src", id.slice(2)) + ".ts") : nodeRequire(id)
  }, { filename });
  return module.exports;
}

function opportunity(overrides = {}) {
  return {
    id: "opp-default",
    businessId: "business-current",
    title: "Reactivare contract",
    type: "contract_renewal",
    status: "contacted",
    lifecycleStatus: "open",
    ownerProfileId: "profile-1",
    ownerName: "Ana Pop",
    estimatedValueLow: 8000,
    estimatedValueHigh: 10000,
    deadline: "2026-08-01",
    createdAt: "2026-07-01T09:00:00.000Z",
    updatedAt: "2026-07-12T09:00:00.000Z",
    actions: [{ id: "task-1", title: "Apel", description: "", status: "pending", dueDate: "2026-07-14T09:00:00.000Z", createdAt: "2026-07-10T09:00:00.000Z" }],
    contacts: [{ id: "assoc-1", businessId: "business-current", opportunityId: "opp-default", contactId: "contact-1", isPrimary: true, role: "decision_maker", contact: { id: "contact-1", businessId: "business-current", fullName: "Ana" } }],
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

test("company website is optional and normalizes safe business domains", () => {
  const website = load("src/lib/crm/website.ts");
  assert.equal(website.normalizeOptionalCompanyWebsite("").value, null);
  assert.equal(website.normalizeOptionalCompanyWebsite("firma.ro").value, "https://firma.ro");
  assert.equal(website.normalizeOptionalCompanyWebsite("www.firma.ro").value, "https://www.firma.ro");
  assert.equal(website.normalizeOptionalCompanyWebsite("https://firma.ro/oferta?tip=1").value, "https://firma.ro/oferta?tip=1");
});

test("company website rejects unsafe protocols and malformed domains", () => {
  const website = load("src/lib/crm/website.ts");
  for (const value of ["javascript:alert(1)", "data:text/plain,test", "mailto:test@example.com", "file:///tmp/x", "//firma.ro", "firma .ro", "domeniu-invalid"]) {
    const result = website.normalizeOptionalCompanyWebsite(value);
    assert.equal(result.ok, false, value);
    assert.match(result.error, /domeniu valid/i);
  }
});

test("Add Company uses Romanian inline website validation instead of native URL validation", () => {
  const client = read("src/components/crm/CrmWorkspaceClient.tsx");
  const actions = read("src/lib/crm/workspace-actions.ts");
  assert.match(client, /name="website"[\s\S]{0,120}type="text"/);
  assert.doesNotMatch(client, /name="website"\s+type="url"/);
  assert.match(client, /inputMode="url"/);
  assert.match(client, /onSubmit=\{organizationFormSubmit\}/);
  assert.match(client, /aria-invalid=\{Boolean\(websiteError\)\}/);
  assert.match(client, /Website-ul este opțional/);
  assert.match(actions, /normalizeOptionalCompanyWebsite/);
  assert.match(actions, /website: website\.value/);
});

test("Company 360 remains protected and presents empty and populated operating contexts", () => {
  const route = read("src/app/(protected)/crm/organizations/[id]/page.tsx");
  const loader = read("src/lib/revenue-workspace.ts");
  const policy = read("src/lib/authz/route-policies.ts");
  assert.match(policy, /prefix: "\/crm"[\s\S]*permission: "workspace\.read"/);
  assert.match(loader, /getCrmWorkspaceForCurrentBusiness\(\)/);
  assert.match(loader, /crm\.organizations\.find\(\(item\) => item\.id === organizationId\)/);
  assert.match(loader, /getOpportunitiesForCurrentBusiness\(\)/);
  assert.match(route, /Company 360/);
  assert.match(route, /Situație operațională/);
  assert.match(route, /Nicio persoană asociată/);
  assert.match(route, /Nicio oportunitate asociată/);
  assert.match(route, /Activitate și decizii/);
  assert.match(route, /Următoarea acțiune/);
  assert.match(route, /CreateOpportunityPanel/);
});

test("recovery queue is deterministic and overdue work precedes a lower-risk gap", () => {
  const queue = load("src/lib/revenue-recovery-queue.ts");
  const now = new Date("2026-07-13T12:00:00.000Z");
  const missingContact = opportunity({ id: "missing-contact", contacts: [] });
  const missingNextAction = opportunity({ id: "missing-action", actions: [] });
  const overdue = opportunity({ id: "overdue", actions: [{ id: "old", title: "Follow-up restant", status: "pending", dueDate: "2026-07-10T09:00:00.000Z" }] });
  const result = queue.buildRevenueRecoveryQueue([missingContact, missingNextAction, overdue], { now });
  assert.equal(result[0].opportunity.id, "overdue");
  assert.equal(result[0].primaryReason.code, "overdue_next_action");
  assert.equal(result.some((item) => item.opportunity.id === "missing-action" && item.primaryReason.code === "missing_next_action"), true);
});

test("recovery queue empty state contains no fake metrics and populated rows expose operational fields", () => {
  const route = read("src/app/(protected)/recoverable/page.tsx");
  const loader = read("src/lib/revenue-workspace.ts");
  assert.match(route, /Nu există oportunități de urmărit/);
  assert.match(route, /buildRevenueRecoveryQueue\(summary\.activeOpportunities\)/);
  assert.match(route, /Responsabil/);
  assert.match(route, /Următoarea acțiune/);
  assert.match(route, /Ultima activitate/);
  assert.match(loader, /getRecoverySummary\(\)/);
  assert.match(loader, /getAuthorizationContext\(\)/);
  assert.doesNotMatch(route, /Math\.random|fake|mock-data/i);
});

test("assisted preparation is review-only and has no provider or external execution path", () => {
  const component = read("src/components/recovery/AssistedPreparation.tsx");
  const opportunityRoute = read("src/app/(protected)/opportunities/[id]/page.tsx");
  assert.match(component, /Pregătire asistată/);
  assert.match(component, /Nu trimite mesaje, nu contactează clienți și nu modifică date/);
  assert.match(opportunityRoute, /recommendNextBestAction\(opportunity\)/);
  assert.doesNotMatch(component, /"use client"|fetch\(|openai|anthropic|sendEmail|sendMessage/i);
});
