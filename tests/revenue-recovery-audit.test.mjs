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
  const filename = path.resolve("src/lib/revenue-recovery-audit.ts");
  const compiled = ts.transpileModule(read("src/lib/revenue-recovery-audit.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    exports: module.exports,
    module,
    Date,
    Map,
    Set,
    require: (id) => {
      if (id === "server-only") return {};
      if (id === "@/lib/executive-morning-brief") return { buildExecutiveMorningBrief: () => { throw new Error("not used"); } };
      if (id === "@/lib/revenue-workspace") return { getRevenueWorkspaceSummary: () => { throw new Error("not used"); } };
      if (id === "@/lib/supabase/data") return { getCurrentBusinessOrDemo: () => { throw new Error("not used"); } };
      if (id === "@/lib/workspace-decision-queue") return { buildWorkspaceDecisionQueue: () => { throw new Error("not used"); } };
      throw new Error(`Unexpected dependency: ${id}`);
    }
  }, { filename });
  return module.exports;
}

const { buildRevenueRecoveryAudit } = loadModel();
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

function item(index, overrides = {}) {
  return {
    id: `decision-${index}`,
    type: "overdue_follow_up",
    title: `Prioritatea ${index}`,
    reason: "Termen depășit.",
    whyItMatters: "Continuitatea comercială este expusă.",
    severity: "critical",
    relatedCompanyId: `company-${index}`,
    relatedCompanyName: `Compania ${index}`,
    relatedOpportunityId: `opportunity-${index}`,
    actionLabel: "Revizuiește oportunitatea",
    actionHref: `/opportunities/opportunity-${index}`,
    evidence: [{ sourceType: "opportunity_action", sourceId: `action-${index}`, sourceTimestamp: "2026-07-23T08:00:00.000Z", label: `Acțiunea ${index}`, href: `/opportunities/opportunity-${index}` }],
    occurredAt: "2026-07-23T08:00:00.000Z",
    statusLabel: "Restant",
    ...overrides
  };
}

function queue(overrides = {}) {
  const items = [item(1), item(2), item(3), item(4), item(5), item(6)];
  return {
    items,
    totalCandidates: items.length,
    criticalCount: 2,
    attentionCount: 4,
    countsByType: counts({ overdue_follow_up: 2, pending_approval: 1, opportunity_without_owner: 3, company_without_primary_contact: 2 }),
    estimatedExposedValueByCurrency: { RON: 25000, EUR: 4000 },
    sourceState: "opportunities_available",
    ...overrides
  };
}

function brief(overrides = {}) {
  return {
    status: "critical",
    statusLabel: "Critic",
    headline: "Două decizii critice pot bloca progresul comercial.",
    summary: "Prioritățile sunt derivate din datele workspace-ului.",
    firstSafeActionLabel: "Revizuiește oportunitatea",
    firstSafeActionHref: "/opportunities/opportunity-1",
    counts: {
      criticalDecisions: 2,
      attentionDecisions: 4,
      pendingApprovals: 1,
      missingNextActions: 0,
      missingOwners: 3,
      missingPrimaryContacts: 2,
      unresolvedSignals: 0,
      overdueFollowUps: 2
    },
    estimatedExposedValueByCurrency: [{ currency: "EUR", value: 4000 }, { currency: "RON", value: 25000 }],
    ...overrides
  };
}

test("audit caps priorities, keeps currencies separate and retains evidence-backed actions", () => {
  const audit = buildRevenueRecoveryAudit({ generatedAt: "2026-07-23T08:00:00.000Z", workspaceName: "Acme", activeOpportunityCount: 8, queue: queue(), brief: brief() });
  assert.equal(audit.priorities.length, 5);
  assert.deepEqual(Array.from(audit.estimatedExposedValueByCurrency, (entry) => entry.currency), ["EUR", "RON"]);
  assert.equal(audit.counts.activeOpportunitiesConsidered, 8);
  assert.ok(audit.priorities.every((priority) => priority.actionHref && priority.evidence.length > 0));
  assert.ok(audit.evidence.length <= 12);
  assert.equal("confirmedRevenue" in audit, false);
});

test("company risks require explicit relationships and operational gaps produce a deterministic plan", () => {
  const items = [
    item(1, { relatedCompanyId: undefined, relatedCompanyName: "Nume doar din text" }),
    item(2, { relatedCompanyId: "company-a", relatedCompanyName: "Compania A" }),
    item(3, { relatedCompanyId: "company-a", relatedCompanyName: "Compania A" }),
    item(4, { relatedCompanyId: "company-b", relatedCompanyName: "Compania B" })
  ];
  const audit = buildRevenueRecoveryAudit({ generatedAt: "2026-07-23T08:00:00.000Z", workspaceName: "Acme", activeOpportunityCount: 4, queue: queue({ items }), brief: brief() });
  assert.deepEqual(Array.from(audit.companyRisks, (risk) => risk.relatedCompanyId), ["company-a", "company-b"]);
  assert.deepEqual(Array.from(audit.operationalGaps, (gap) => gap.type), ["overdue_follow_up", "pending_approval", "opportunity_without_owner"]);
  assert.deepEqual(Array.from(audit.sevenDayPlan, (step) => step.period), ["Ziua 1", "Zilele 2–3", "Zilele 4–7"]);
  assert.ok(audit.sevenDayPlan.every((step) => step.actionHref && step.actionLabel));
});

test("empty workspaces remain honest and route generation is server-only and print-safe", () => {
  const emptyQueue = queue({ items: [], totalCandidates: 0, criticalCount: 0, attentionCount: 0, countsByType: counts(), estimatedExposedValueByCurrency: {}, sourceState: "empty_workspace" });
  const emptyBrief = brief({ status: "incomplete", statusLabel: "Incomplet", firstSafeActionLabel: "Adaugă primul semnal", firstSafeActionHref: "/inbox?create=1", estimatedExposedValueByCurrency: [] });
  const audit = buildRevenueRecoveryAudit({ generatedAt: "2026-07-23T08:00:00.000Z", workspaceName: "Acme", activeOpportunityCount: 0, queue: emptyQueue, brief: emptyBrief });
  assert.equal(audit.priorities.length, 0);
  assert.equal(audit.operationalGaps.length, 0);
  assert.equal(audit.sevenDayPlan[0].actionHref, "/inbox?create=1");

  const model = read("src/lib/revenue-recovery-audit.ts");
  const route = read("src/app/(protected)/reports/revenue-recovery-audit/page.tsx");
  const printButton = read("src/components/reports/PrintAuditButton.tsx");
  const policies = read("src/lib/authz/route-policies.ts");
  assert.match(model, /import "server-only"/);
  assert.match(model, /getRevenueWorkspaceSummary\(\)/);
  assert.doesNotMatch(model, /openai|anthropic|embedding|service[_-]?role|\.from\(|fetch\s*\(/i);
  assert.match(policies, /prefix: "\/reports", permission: "reports\.read"/);
  assert.match(route, /Estimările rămân separate pe monedă și nu reprezintă venit confirmat/);
  assert.match(route, /Aprobarea umană rămâne obligatorie/);
  assert.match(route, /Un document pregătit sau aprobat nu este considerat trimis fără dovadă/);
  assert.match(route, /Nu reprezintă o garanție financiară, predicție de venit sau confirmare contabilă/);
  assert.match(route, /Acțiunile comerciale, aprobările și comunicările externe rămân sub control uman/);
  assert.match(printButton, /window\.print\(\)/);
  assert.match(printButton, /Printează auditul/);
  assert.doesNotMatch(route, /"use client"/);
  assert.doesNotMatch(`${model}\n${route}`, /guaranteed revenue|revenue guarantee|ROI garantat|recuperare automată/i);
});

test("partial signal-only workspaces report only supported approval work", () => {
  const approval = item(1, {
    type: "pending_approval",
    title: "Aprobare în așteptare",
    relatedCompanyId: undefined,
    relatedCompanyName: undefined,
    relatedOpportunityId: undefined,
    actionLabel: "Verifică aprobarea",
    actionHref: "/approvals?signal=signal-1",
    evidence: [{ sourceType: "approval", sourceId: "signal-1", sourceTimestamp: "2026-07-23T08:00:00.000Z", label: "Aprobarea semnalului", href: "/approvals?signal=signal-1" }]
  });
  const partialQueue = queue({
    items: [approval],
    totalCandidates: 1,
    criticalCount: 0,
    attentionCount: 1,
    countsByType: counts({ pending_approval: 1 }),
    estimatedExposedValueByCurrency: {},
    sourceState: "signals_only"
  });
  const partialBrief = brief({
    status: "incomplete",
    statusLabel: "Incomplet",
    firstSafeActionLabel: "Verifică aprobarea",
    firstSafeActionHref: "/approvals?signal=signal-1",
    estimatedExposedValueByCurrency: [],
    counts: { ...brief().counts, criticalDecisions: 0, attentionDecisions: 1, pendingApprovals: 1, missingOwners: 0, missingPrimaryContacts: 0, overdueFollowUps: 0 }
  });
  const audit = buildRevenueRecoveryAudit({ generatedAt: "2026-07-23T08:00:00.000Z", workspaceName: "Acme", activeOpportunityCount: 0, queue: partialQueue, brief: partialBrief });
  assert.equal(audit.status, "incomplete");
  assert.equal(audit.priorities.length, 1);
  assert.equal(audit.operationalGaps[0].type, "pending_approval");
  assert.equal(audit.companyRisks.length, 0);
  assert.equal(audit.estimatedExposedValueByCurrency.length, 0);
});

test("reports and Control Center expose discreet audit routes", () => {
  assert.match(read("src/app/(protected)/reports/page.tsx"), /href="\/reports\/revenue-recovery-audit"/);
  assert.match(read("src/app/(protected)/dashboard/page.tsx"), /href="\/reports\/revenue-recovery-audit"/);
});
