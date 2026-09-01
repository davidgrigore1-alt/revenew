import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const nodeRequire = createRequire(import.meta.url);
const cache = new Map();
const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

function load(relativePath) {
  const filename = path.resolve(relativePath);
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiled = ts.transpileModule(read(relativePath), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: filename }).outputText;
  const module = { exports: {} };
  cache.set(filename, module);
  vm.runInNewContext(compiled, { exports: module.exports, module, Date, Intl, Object, Set, Map, require: (id) => id === "server-only" ? {} : id.startsWith("@/") ? load(path.join("src", id.slice(2)) + ".ts") : nodeRequire(id) }, { filename });
  return module.exports;
}

const { buildExecutiveMorningBrief } = load("src/lib/executive-morning-brief.ts");
const now = new Date("2026-07-23T08:00:00.000Z");
const decisionTypes = ["overdue_follow_up", "pending_approval", "prepared_work_not_advanced", "unresolved_signal", "opportunity_without_next_action", "opportunity_without_owner", "company_without_primary_contact", "inactive_active_opportunity", "high_value_blocked_opportunity"];
const counts = (overrides = {}) => Object.fromEntries(decisionTypes.map((type) => [type, overrides[type] ?? 0]));
const queue = (overrides = {}) => ({ items: [], totalCandidates: 0, criticalCount: 0, attentionCount: 0, countsByType: counts(), estimatedExposedValueByCurrency: {}, sourceState: "opportunities_available", ...overrides });
const item = (overrides = {}) => ({
  id: "decision:overdue:action-1", type: "overdue_follow_up", title: "Follow-up întârziat", reason: "Termen depășit.", whyItMatters: "Oportunitatea poate pierde ritm comercial.", severity: "critical", relatedOpportunityId: "opportunity-1", relatedOpportunityTitle: "Extindere regională", relatedCompanyName: "Meridian", actionLabel: "Revizuiește oportunitatea", actionHref: "/opportunities/opportunity-1#workflow-actions", evidence: [{ sourceType: "opportunity_action", sourceId: "action-1", sourceTimestamp: "2026-07-22T08:00:00.000Z", label: "Acțiunea restantă", href: "/opportunities/opportunity-1#workflow-actions" }], occurredAt: "2026-07-22T08:00:00.000Z", statusLabel: "Restant", estimatedValue: 76000, currency: "RON", ...overrides
});

test("brief keeps the canonical order, shows at most three priorities and exposes one primary action", () => {
  const items = Array.from({ length: 5 }, (_, index) => item({ id: `decision-${index}`, relatedOpportunityId: `opportunity-${index}`, title: `Prioritatea ${index + 1}` }));
  const brief = buildExecutiveMorningBrief(queue({ items, totalCandidates: 5, criticalCount: 5 }), { now, viewerName: "Ana Popescu" });
  assert.equal(brief.salutation, "Bună dimineața, Ana.");
  assert.equal(brief.primaryPriority.title, "Prioritatea 1");
  assert.equal(brief.secondaryPriorities.length, 2);
  assert.equal(brief.hiddenPriorityCount, 2);
  assert.equal(brief.primaryPriority.safeAction.href, items[0].actionHref);
});

test("multiple blockers for one opportunity collapse into supporting facts without adding value", () => {
  const brief = buildExecutiveMorningBrief(queue({ items: [item(), item({ id: "decision:owner:1", type: "opportunity_without_owner", title: "Oportunitate fără responsabil", reason: "Responsabil lipsă.", severity: "attention" })] }), { now });
  assert.equal(brief.primaryPriority.title, "Follow-up întârziat");
  assert.equal(brief.secondaryPriorities.length, 0);
  assert.ok(brief.primaryPriority.supportingFacts.includes("Responsabil lipsă."));
  assert.equal(brief.primaryPriority.amount, 76000);
  assert.equal(brief.primaryPriority.currency, "RON");
  assert.equal(brief.primaryPriority.valueKind, "estimated_unconfirmed");
});

test("pending approvals for distinct opportunities remain separate human decisions", () => {
  const approval = (id) => item({ id, type: "pending_approval", title: "Aprobare în așteptare", relatedOpportunityId: `opportunity-${id}`, actionLabel: "Verifică aprobarea", actionHref: `/approvals?signal=${id}`, estimatedValue: undefined, currency: undefined });
  const brief = buildExecutiveMorningBrief(queue({ items: [approval("a"), approval("b"), item({ id: "other", relatedOpportunityId: "other" })] }), { now });
  assert.equal(brief.primaryPriority.title, "Aprobare în așteptare");
  assert.equal(brief.primaryPriority.safeAction.href, "/approvals?signal=a");
  assert.equal(brief.secondaryPriorities.length, 2);
});

test("recent changes are meaningful, bounded to 24 hours and capped at three", () => {
  const brief = buildExecutiveMorningBrief(queue({ items: [item()] }), {
    now,
    events: [
      { id: "meaningful", type: "stage_changed", label: "Etapă actualizată", date: "2026-07-23T07:00:00.000Z", opportunityId: "opportunity-1" },
      { id: "noise", type: "record_viewed", label: "Vizualizare", date: "2026-07-23T07:30:00.000Z", opportunityId: "opportunity-1" },
      { id: "old", type: "stage_changed", label: "Schimbare veche", date: "2026-07-21T07:00:00.000Z", opportunityId: "opportunity-1" },
      { id: "future", type: "stage_changed", label: "Schimbare viitoare", date: "2026-07-24T07:00:00.000Z", opportunityId: "opportunity-1" }
    ],
    actions: [{ id: "done", title: "Apel", description: "", status: "done", priority: "high", opportunityTitle: "Extindere", company: "Meridian", reason: "", estimatedValue: 0, currency: "RON", completedAt: "2026-07-23T06:00:00.000Z", opportunityId: "opportunity-1" }]
  });
  assert.equal(brief.recentChanges.length, 2);
  assert.ok(brief.recentChanges.every((change) => !change.label.includes("Vizualizare") && !change.label.includes("veche") && !change.label.includes("viitoare")));
});

test("untrusted record text remains inert data and currencies are never combined", () => {
  const unsafe = `<img src=x onerror=alert(1)>`;
  const brief = buildExecutiveMorningBrief(queue({ items: [item({ title: unsafe, estimatedValue: 50000, currency: "EUR" })], estimatedExposedValueByCurrency: { EUR: 50000, RON: 76000 } }), { now });
  assert.equal(brief.primaryPriority.title, unsafe);
  assert.equal(brief.primaryPriority.amount, 50000);
  assert.equal(brief.primaryPriority.currency, "EUR");
  assert.deepEqual(Array.from(brief.estimatedExposedValueByCurrency, (entry) => entry.currency), ["EUR", "RON"]);
  assert.doesNotMatch(read("src/components/dashboard/ExecutiveMorningBrief.tsx"), /dangerouslySetInnerHTML/);
});

test("clear, insufficient and compatibility states remain explicit", () => {
  const clear = buildExecutiveMorningBrief(queue(), { now });
  assert.equal(clear.state, "clear");
  assert.equal(clear.status, "stable");
  const empty = buildExecutiveMorningBrief(queue({ sourceState: "empty_workspace" }), { now });
  assert.equal(empty.state, "insufficient");
  assert.equal(empty.status, "incomplete");
  assert.equal(empty.firstSafeActionHref, "/inbox?create=1");
});

test("implementation is server-only, role-scoped in the dashboard and restrained in the UI", () => {
  const model = read("src/lib/executive-morning-brief.ts");
  const ui = read("src/components/dashboard/ExecutiveMorningBrief.tsx");
  const dashboard = read("src/app/(protected)/dashboard/page.tsx");
  assert.match(model, /import "server-only"/);
  assert.doesNotMatch(model, /openai|anthropic|llm|fetch\s*\(|createSupabase|supabase\.from\(/i);
  assert.match(dashboard, /summary\.viewer\.isManager/);
  assert.match(dashboard, /opportunity\.ownerProfileId\s*===\s*summary\.viewer\.profileId/);
  assert.ok(dashboard.indexOf("<HomeAskSurface") < dashboard.indexOf('aria-labelledby="home-today-title"'));
  assert.match(ui, /De ce este prioritar\?/);
  assert.match(ui, /ExplanationDisclosure/);
  assert.match(ui, /valoare estimată, neconfirmată/);
  assert.match(ui, /control uman/);
  assert.match(ui, /Briefingul nu a putut fi încărcat/);
  assert.doesNotMatch(ui, /blur-3xl|bg-gradient|Continuă|Află mai multe|Explorează/);
});
