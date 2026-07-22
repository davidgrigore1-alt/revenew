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
    Object,
    require: (id) => {
      if (id === "server-only") return {};
      if (id.startsWith("@/")) return load(path.join("src", id.slice(2)) + ".ts");
      return nodeRequire(id);
    }
  }, { filename });
  return module.exports;
}

const { buildExecutiveMorningBrief } = load("src/lib/executive-morning-brief.ts");
const now = new Date("2026-07-23T08:00:00.000Z");
const decisionTypes = [
  "overdue_follow_up",
  "pending_approval",
  "prepared_work_not_advanced",
  "unresolved_signal",
  "opportunity_without_next_action",
  "opportunity_without_owner",
  "company_without_primary_contact",
  "inactive_active_opportunity",
  "high_value_blocked_opportunity"
];

function counts(overrides = {}) {
  return Object.fromEntries(decisionTypes.map((type) => [type, overrides[type] ?? 0]));
}

function queue(overrides = {}) {
  return {
    items: [],
    totalCandidates: 0,
    criticalCount: 0,
    attentionCount: 0,
    countsByType: counts(),
    estimatedExposedValueByCurrency: {},
    sourceState: "opportunities_available",
    ...overrides
  };
}

function item(overrides = {}) {
  return {
    id: "decision:overdue:action-1",
    type: "overdue_follow_up",
    title: "Follow-up întârziat",
    reason: "Termen depășit.",
    whyItMatters: "Oportunitatea poate pierde ritm comercial.",
    severity: "critical",
    actionLabel: "Revizuiește oportunitatea",
    actionHref: "/opportunities/opportunity-1#workflow-actions",
    evidence: [{ sourceType: "opportunity_action", sourceId: "action-1", sourceTimestamp: "2026-07-22T08:00:00.000Z", label: "Acțiunea restantă «Follow-up»", href: "/opportunities/opportunity-1#workflow-actions" }],
    occurredAt: "2026-07-22T08:00:00.000Z",
    statusLabel: "Restant",
    ...overrides
  };
}

test("brief severity and headline follow the decision queue instead of a parallel heuristic", () => {
  const critical = buildExecutiveMorningBrief(queue({ items: [item()], criticalCount: 1, attentionCount: 3 }), { now });
  assert.equal(critical.status, "critical");
  assert.match(critical.headline, /^1 decizie critică poate bloca progresul comercial\.$/);

  const attention = buildExecutiveMorningBrief(queue({ items: [item({ severity: "attention" })], attentionCount: 2 }), { now });
  assert.equal(attention.status, "attention");
  assert.match(attention.headline, /^2 priorități comerciale necesită revizuire astăzi\.$/);

  const stable = buildExecutiveMorningBrief(queue(), { now });
  assert.equal(stable.status, "stable");
  assert.equal(stable.headline, "Nu există decizii critice acum.");
});

test("brief preserves the first safe action and its evidence", () => {
  const top = item();
  const brief = buildExecutiveMorningBrief(queue({ items: [top], criticalCount: 1 }), { now });
  assert.equal(brief.firstSafeActionLabel, top.actionLabel);
  assert.equal(brief.firstSafeActionHref, top.actionHref);
  assert.equal(brief.evidence.sourceId, "action-1");
  assert.equal(brief.topDecisionItemId, top.id);
});

test("counts and exposed estimates remain deterministic and currencies stay separate", () => {
  const brief = buildExecutiveMorningBrief(queue({
    countsByType: counts({ overdue_follow_up: 2, pending_approval: 3, opportunity_without_next_action: 1 }),
    estimatedExposedValueByCurrency: { RON: 12500, EUR: 4000 }
  }), { now });
  assert.equal(brief.counts.overdueFollowUps, 2);
  assert.equal(brief.counts.pendingApprovals, 3);
  assert.equal(brief.counts.missingNextActions, 1);
  assert.equal(brief.estimatedExposedValueByCurrency.length, 2);
  assert.equal(brief.estimatedExposedValueByCurrency[0].currency, "EUR");
  assert.equal(brief.estimatedExposedValueByCurrency[0].value, 4000);
  assert.equal(brief.estimatedExposedValueByCurrency[1].currency, "RON");
  assert.equal(brief.estimatedExposedValueByCurrency[1].value, 12500);
  assert.equal("estimatedExposedValue" in brief, false);
});

test("only the top three evidence-backed decisions become executive bullets", () => {
  const items = Array.from({ length: 5 }, (_, index) => item({ id: `decision-${index}`, title: `Prioritatea ${index + 1}` }));
  const brief = buildExecutiveMorningBrief(queue({ items, criticalCount: 5 }), { now });
  assert.equal(brief.bullets.length, 3);
  assert.equal(brief.bullets[0].id, "decision-0");
  assert.equal(brief.bullets[2].id, "decision-2");
});

test("empty and partial workspaces receive honest safe fallbacks", () => {
  const empty = buildExecutiveMorningBrief(queue({ sourceState: "empty_workspace" }), { now });
  assert.equal(empty.status, "incomplete");
  assert.equal(empty.firstSafeActionLabel, "Adaugă primul semnal");
  assert.equal(empty.firstSafeActionHref, "/inbox?create=1");
  assert.equal(empty.evidence, null);

  const partial = buildExecutiveMorningBrief(queue({ sourceState: "signals_only" }), { now });
  assert.equal(partial.status, "incomplete");
  assert.equal(partial.firstSafeActionHref, "/inbox");
});

test("implementation stays server-only, deterministic and directly above the decision queue", () => {
  const model = read("src/lib/executive-morning-brief.ts");
  const ui = read("src/components/dashboard/ExecutiveMorningBrief.tsx");
  const dashboard = read("src/app/(protected)/dashboard/page.tsx");
  assert.match(model, /import "server-only"/);
  assert.doesNotMatch(model, /openai|anthropic|llm|fetch\s*\(|createSupabase|\.from\(/i);
  assert.ok(dashboard.indexOf("<ExecutiveMorningBrief brief={morningBrief} />") < dashboard.indexOf("<WorkspaceDecisionQueue queue={decisionQueue} />"));
  assert.match(ui, /Valoare estimată expusă:/);
  assert.match(ui, /nu este venit confirmat/);
  assert.match(ui, /Aprobarea umană rămâne obligatorie/);
  assert.match(ui, /Bazat pe:/);
  assert.doesNotMatch(ui, /Continuă|Află mai multe|Explorează/);
});
