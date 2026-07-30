import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

function loadIntelligenceBuilder() {
  const filename = path.resolve("src/lib/operational-intelligence.ts");
  const output = ts.transpileModule(read("src/lib/operational-intelligence.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, {
    exports: module.exports,
    module,
    require: (id) => id === "server-only" ? {} : (() => { throw new Error(`Unexpected runtime import: ${id}`); })()
  }, { filename });
  return module.exports;
}

function decision(index, overrides = {}) {
  return {
    id: `decision-${index}`,
    type: index === 1 ? "overdue_follow_up" : "unresolved_signal",
    title: index === 1 ? "Follow-up întârziat" : `Semnal ${index}`,
    reason: "Termen depășit",
    whyItMatters: "Continuitatea comercială poate fi pierdută.",
    severity: index === 1 ? "critical" : "attention",
    relatedCompanyName: "Companie Exemplu SRL",
    relatedOpportunityId: `opportunity-${index}`,
    relatedOpportunityTitle: `Oportunitate ${index}`,
    actionLabel: index === 1 ? "Revizuiește oportunitatea" : "Deschide semnalul",
    actionHref: index === 1 ? `/opportunities/opportunity-${index}` : `/inbox?signal=signal-${index}`,
    evidence: [{
      sourceType: index === 1 ? "opportunity_action" : "commercial_signal",
      sourceId: `evidence-${index}`,
      sourceTimestamp: "2026-07-30T09:00:00.000Z",
      label: `Dovada ${index}`,
      href: index === 1 ? `/opportunities/opportunity-${index}#opportunity-timeline` : `/inbox?signal=signal-${index}`
    }],
    occurredAt: "2026-07-30T09:00:00.000Z",
    estimatedValue: index === 1 ? 76000 : undefined,
    currency: index === 1 ? "RON" : undefined,
    statusLabel: "Restant",
    ...overrides
  };
}

function queue(overrides = {}) {
  return {
    items: [decision(1), decision(2), decision(3), decision(4)],
    totalCandidates: 4,
    criticalCount: 1,
    attentionCount: 3,
    countsByType: {},
    estimatedExposedValueByCurrency: { RON: 76000 },
    sourceState: "opportunities_available",
    ...overrides
  };
}

test("operational intelligence derives at most three evidence-backed recommendations", () => {
  const { buildOperationalIntelligenceCenter } = loadIntelligenceBuilder();
  const result = buildOperationalIntelligenceCenter(queue());

  assert.equal(result.recommendations.length, 3);
  assert.equal(result.recommendations[0].title, "Follow-up întârziat");
  assert.equal(result.recommendations[0].evidenceLabel, "Dovada 1");
  assert.equal(result.recommendations[0].actionHref, "/opportunities/opportunity-1");
  assert.match(result.recommendations[0].uncertainty, /verificat de o persoană/);
  assert.match(result.recommendations[0].controlNote, /verifică și aprobă/);
  assert.equal(result.estimatedExposedValueByCurrency[0].value, 76000);
  assert.equal("confirmedRevenue" in result, false);
});

test("insufficient data produces an honest intake state without invented recommendations", () => {
  const { buildOperationalIntelligenceCenter } = loadIntelligenceBuilder();
  const result = buildOperationalIntelligenceCenter(queue({
    items: [],
    totalCandidates: 0,
    criticalCount: 0,
    attentionCount: 0,
    estimatedExposedValueByCurrency: {},
    sourceState: "empty_workspace"
  }));

  assert.equal(result.state, "insufficient_data");
  assert.equal(result.recommendations.length, 0);
  assert.match(result.headline, /suficiente date/);
  assert.equal(result.safeActionHref, "/inbox?create=1");
  assert.equal(result.evidenceHref, null);
});

test("AI page leads with current operational intelligence and keeps the registry secondary", () => {
  const page = read("src/app/(protected)/ai/page.tsx");
  const summaryIndex = page.indexOf("operational-intelligence-summary");
  const recommendationsIndex = page.indexOf("operational-recommendations");
  const registryIndex = page.indexOf("Registrul complet de capabilități și limite");

  assert.ok(summaryIndex >= 0);
  assert.ok(recommendationsIndex > summaryIndex);
  assert.ok(registryIndex > recommendationsIndex);
  assert.match(page, /getRecoverySummary\(\)/);
  assert.match(page, /export const dynamic = "force-dynamic"/);
  assert.match(page, /buildWorkspaceDecisionQueue/);
  assert.match(page, /\{ limit: 3 \}/);
  assert.match(page, /intelligence\.recommendations\.map/);
  assert.match(page, /Bazat pe:/);
  assert.match(page, /Nu există recomandări verificabile acum/);
  assert.match(page, /<details className="group rounded-panel/);
});

test("AI page preserves financial separation, human control and inactive integrations", () => {
  const page = read("src/app/(protected)/ai/page.tsx");

  assert.match(page, /Valoare estimată, neconfirmată/);
  assert.match(page, /Nu reprezintă venit confirmat/);
  assert.match(page, /Nicio comunicare externă nu este trimisă automat/);
  assert.match(page, /Gmail nu este conectat/);
  assert.match(page, /Google Calendar nu este conectat/);
  assert.match(page, /Telefonia și vocea nu sunt active/);
  assert.doesNotMatch(page, /Inteligență AI|ROI garantat|venit garantat|recuperare automată/i);
  assert.doesNotMatch(page, /(?:title|description|label)="[^"]*\b(?:provider|pending|ownership|workspace)\b/i);
  assert.match(page, /min-w-0/);
  assert.match(page, /flex flex-wrap/);
});
