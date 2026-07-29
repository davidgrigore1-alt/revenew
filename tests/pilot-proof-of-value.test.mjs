import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function loadModel() {
  const filename = path.resolve("src/lib/pilot-proof-of-value.ts");
  const compiled = ts.transpileModule(read("src/lib/pilot-proof-of-value.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    exports: module.exports,
    module,
    Array,
    Boolean,
    Map,
    Number,
    Set,
    require: (id) => {
      if (id === "server-only") return {};
      if (id === "@/lib/revenue-recovery-audit") return { getRevenueRecoveryAudit: () => { throw new Error("not used"); } };
      if (id === "@/lib/revenue-workspace") return { getRevenueWorkspaceSummary: () => { throw new Error("not used"); } };
      throw new Error(`Unexpected dependency: ${id}`);
    }
  }, { filename });
  return module.exports;
}

const { buildPilotProofOfValue } = loadModel();

function opportunity(id, overrides = {}) {
  return {
    id,
    title: `Oportunitatea ${id}`,
    status: "contacted",
    lifecycleStatus: "open",
    ownerProfileId: `owner-${id}`,
    currency: "RON",
    estimatedValueHigh: 10000,
    actions: [{ id: `action-${id}`, title: "Follow-up", description: "", status: "pending", dueDate: "2026-08-01T09:00:00.000Z" }],
    documents: [],
    timeline: [],
    ...overrides
  };
}

function priority(index, overrides = {}) {
  return {
    id: `decision-${index}`,
    type: "overdue_follow_up",
    title: `Blocaj ${index}`,
    reason: "Acțiunea este întârziată.",
    whyItMatters: "Decizia comercială poate rămâne blocată.",
    severity: "critical",
    relatedOpportunityId: `opportunity-${index}`,
    actionLabel: "Revizuiește oportunitatea",
    actionHref: `/opportunities/opportunity-${index}`,
    evidence: [{
      sourceType: "opportunity_action",
      sourceId: `action-${index}`,
      sourceTimestamp: "2026-07-28T08:00:00.000Z",
      label: `Acțiunea ${index}`,
      href: `/opportunities/opportunity-${index}`
    }],
    occurredAt: "2026-07-28T08:00:00.000Z",
    statusLabel: "Restant",
    estimatedValue: 10000,
    currency: "RON",
    ...overrides
  };
}

function audit(overrides = {}) {
  const priorities = [priority(1), priority(2, { type: "opportunity_without_owner", relatedOpportunityId: "opportunity-1" })];
  return {
    generatedAt: "2026-07-29T08:00:00.000Z",
    workspaceName: "Meridian Commercial Operations",
    status: "critical",
    statusLabel: "Critic",
    headline: "Două priorități necesită atenție.",
    summary: "Rezumat prudent.",
    firstSafeActionLabel: "Revizuiește oportunitatea",
    firstSafeActionHref: "/opportunities/opportunity-1",
    estimatedExposedValueByCurrency: [{ currency: "EUR", value: 3000 }, { currency: "RON", value: 10000 }],
    counts: {
      criticalDecisions: 2,
      attentionDecisions: 0,
      pendingApprovals: 1,
      missingNextActions: 1,
      missingOwners: 1,
      missingPrimaryContacts: 1,
      unresolvedSignals: 1,
      overdueFollowUps: 1,
      preparedWorkNotAdvanced: 1,
      activeOpportunitiesConsidered: 3
    },
    priorities,
    companyRisks: [],
    operationalGaps: [],
    sevenDayPlan: [],
    evidence: priorities.flatMap((item) => item.evidence),
    sourceState: "opportunities_available",
    ...overrides
  };
}

function summary(overrides = {}) {
  const activeRon = opportunity("opportunity-1", {
    documents: [{ id: "document-1", title: "Ofertă pregătită", status: "ready_to_send", readyAt: "2026-07-28T09:00:00.000Z" }]
  });
  const activeEur = opportunity("opportunity-2", { currency: "EUR", estimatedValueHigh: 2000, ownerProfileId: null, actions: [] });
  const wonDeclared = opportunity("won-declared", {
    status: "won",
    lifecycleStatus: "won",
    actualOutcomeAmount: 5000,
    outcomeRecordedAt: "2026-07-28T12:00:00.000Z",
    outcomeRecordedByProfileId: "profile-1"
  });
  const wonUndeclared = opportunity("won-undeclared", {
    status: "won",
    lifecycleStatus: "won",
    actualOutcomeAmount: 9000,
    outcomeRecordedAt: null,
    outcomeRecordedByProfileId: null
  });
  return {
    opportunities: [activeRon, activeEur, wonDeclared, wonUndeclared],
    signals: [{
      id: "signal-1",
      title: "Cerere revizuită",
      status: "converted",
      reviewStatus: "converted",
      reviewedAt: "2026-07-28T10:00:00.000Z"
    }],
    actions: [{
      id: "completed-1",
      title: "Confirmă necesarul",
      description: "",
      status: "done",
      priority: "high",
      opportunityId: "opportunity-1",
      opportunityTitle: "Oportunitatea opportunity-1",
      company: "Compania A",
      reason: "Acțiune confirmată",
      estimatedValue: 10000,
      currency: "RON",
      completedAt: "2026-07-28T11:00:00.000Z"
    }],
    documents: [],
    events: [],
    ...overrides
  };
}

test("proof builder recommends a monthly cadence only from evidence plus recurring work", () => {
  const proof = buildPilotProofOfValue({ audit: audit(), summary: summary() });
  assert.equal(proof.recommendation, "continue");
  assert.equal(proof.recommendationLabel, "Continuă cadența operațională lunară");
  assert.match(proof.executiveConclusion, /progres operațional documentat/i);
  assert.ok(proof.recommendationBasis.length >= 3);
  assert.ok(proof.evidence.length > 0);
  assert.ok(proof.evidence.every((item) => item.label && item.context && item.href));
  assert.match(proof.commercialClose, /vizibilitate recurentă/i);
});

test("current-state baseline is explicit and never fabricated as historical before/after", () => {
  const proof = buildPilotProofOfValue({ audit: audit(), summary: summary() });
  assert.equal(proof.baselineNote, "Aceasta este o linie de bază operațională a stării curente, nu o măsurare istorică înainte/după.");
  assert.equal(proof.startingBaseline.blockedOpportunities, 1);
  assert.doesNotMatch(proof.executiveConclusion, /pilotul a (redus|crescut|recuperat)/i);
  assert.match(proof.disclaimer, /nu atribuie progresul pilotului/i);
});

test("pipeline, exposure and user-declared confirmed revenue remain separate by currency", () => {
  const proof = buildPilotProofOfValue({ audit: audit(), summary: summary() });
  assert.deepEqual(JSON.parse(JSON.stringify(proof.estimatedPipelineValueByCurrency)), [
    { currency: "EUR", value: 2000 },
    { currency: "RON", value: 10000 }
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(proof.estimatedExposedValueByCurrency)), [
    { currency: "EUR", value: 3000 },
    { currency: "RON", value: 10000 }
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(proof.confirmedRevenueByCurrency)), [
    { currency: "RON", value: 5000 }
  ]);
  assert.equal(proof.confirmedOutcomeCount, 1);
  assert.match(proof.disclaimer, /rezultat câștigat declarat explicit de un utilizator/i);
  assert.doesNotMatch(JSON.stringify(proof), /ROI garantat|venit garantat|recuperare automată/i);
});

test("empty workspaces stop instead of manufacturing proof", () => {
  const proof = buildPilotProofOfValue({
    audit: audit({
      sourceState: "empty_workspace",
      priorities: [],
      evidence: [],
      estimatedExposedValueByCurrency: [],
      counts: { ...audit().counts, missingOwners: 0, missingNextActions: 0, overdueFollowUps: 0, pendingApprovals: 0, unresolvedSignals: 0 }
    }),
    summary: summary({ opportunities: [], signals: [], actions: [] })
  });
  assert.equal(proof.recommendation, "stop");
  assert.match(proof.executiveConclusion, /nu susțin încă o decizie de continuare/i);
  assert.equal(proof.evidence.length, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(proof.confirmedRevenueByCurrency)), []);
});

test("proof route is protected by the reports policy, printable and linked from the report flow", () => {
  const model = read("src/lib/pilot-proof-of-value.ts");
  const route = read("src/app/(protected)/reports/pilot-proof-of-value/page.tsx");
  const reports = read("src/app/(protected)/reports/page.tsx");
  const pilot = read("src/app/(protected)/reports/enterprise-pilot-pack/page.tsx");
  const printButton = read("src/components/reports/PrintProofOfValueButton.tsx");
  const styles = read("src/app/globals.css");
  const policies = read("src/lib/authz/route-policies.ts");

  assert.match(model, /import "server-only"/);
  assert.match(model, /getRevenueWorkspaceSummary\(\)/);
  assert.match(policies, /prefix: "\/reports", permission: "reports\.read"/);
  assert.match(reports, /href="\/reports\/pilot-proof-of-value"/);
  assert.match(pilot, /href="\/reports\/pilot-proof-of-value"/);
  assert.match(route, /Dovadă de valoare pilot/);
  assert.match(route, /Continuă \/ ajustează \/ oprește/);
  assert.match(route, /Valoare estimată în pipeline/);
  assert.match(route, /Rezultat declarat de utilizator|rezultate declarate de utilizatori/i);
  assert.match(route, /Cadență operațională lunară/);
  assert.match(route, /Deschide dovada/);
  assert.doesNotMatch(route, /"use client"/);
  assert.match(printButton, /window\.print\(\)/);
  assert.match(printButton, /Printează concluzia/);
  assert.match(styles, /\.pilot-proof-of-value \.proof-section/);
  assert.doesNotMatch(`${model}\n${route}`, /service[_-]?role|openai|anthropic|embedding|fetch\s*\(/i);
});

test("sales and audit docs close the pilot with an evidence-backed decision", () => {
  const docs = [
    read("docs/sales/offer-and-pricing-draft.md"),
    read("docs/sales/demo-script.md"),
    read("docs/sales/objection-handling.md"),
    read("docs/client-audit-intake.md")
  ].join("\n");
  assert.match(docs, /\/reports\/pilot-proof-of-value/);
  assert.match(docs, /continuăm cadența operațională lunară, ajustăm domeniul sau oprim/i);
  assert.match(docs, /nu pretinde o comparație istorică înainte\/după/i);
  assert.match(docs, /rezultat declarat de utilizator/i);
  assert.match(docs, /valoare operațională recurentă/i);
  const unsafeClaims = docs
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /\bgarantăm (venit|ROI)|recuperează bani automat/i.test(line))
    .filter((line) => !/\b(nu|fără|evită|refuză)\b/i.test(line));
  assert.deepEqual(unsafeClaims, []);
});
