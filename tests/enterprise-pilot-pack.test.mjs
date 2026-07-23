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
  const filename = path.resolve("src/lib/enterprise-pilot-pack.ts");
  const compiled = ts.transpileModule(read("src/lib/enterprise-pilot-pack.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    exports: module.exports,
    module,
    Array,
    Set,
    require: (id) => {
      if (id === "server-only") return {};
      if (id === "@/lib/revenue-recovery-audit") return { getRevenueRecoveryAudit: () => { throw new Error("not used"); } };
      throw new Error(`Unexpected dependency: ${id}`);
    }
  }, { filename });
  return module.exports;
}

const { buildEnterprisePilotPack } = loadModel();

function priority(index, overrides = {}) {
  return {
    id: `decision-${index}`,
    type: "overdue_follow_up",
    title: `Prioritatea ${index}`,
    reason: "Termenul comercial este depășit.",
    whyItMatters: "Lipsa unei decizii poate întârzia progresul comercial.",
    severity: "critical",
    relatedCompanyId: `company-${index}`,
    relatedCompanyName: `Compania ${index}`,
    relatedOpportunityId: `opportunity-${index}`,
    actionLabel: "Revizuiește oportunitatea",
    actionHref: `/opportunities/opportunity-${index}`,
    evidence: [{ sourceType: "opportunity_action", sourceId: `action-${index}`, sourceTimestamp: "2026-07-23T08:00:00.000Z", label: `Acțiunea ${index}`, href: `/opportunities/opportunity-${index}` }],
    occurredAt: "2026-07-23T08:00:00.000Z",
    statusLabel: "Restant",
    estimatedValue: 10000,
    currency: "RON",
    ...overrides
  };
}

function audit(overrides = {}) {
  const priorities = [priority(1), priority(2, { type: "opportunity_without_owner" })];
  return {
    generatedAt: "2026-07-23T08:00:00.000Z",
    workspaceName: "Acme",
    status: "critical",
    statusLabel: "Critic",
    headline: "Două decizii critice necesită atenție.",
    summary: "Rezumat bazat pe datele disponibile.",
    firstSafeActionLabel: "Revizuiește oportunitatea",
    firstSafeActionHref: "/opportunities/opportunity-1",
    estimatedExposedValueByCurrency: [{ currency: "EUR", value: 4000 }, { currency: "RON", value: 20000 }],
    counts: {
      criticalDecisions: 2,
      attentionDecisions: 0,
      pendingApprovals: 1,
      missingNextActions: 1,
      missingOwners: 1,
      missingPrimaryContacts: 0,
      unresolvedSignals: 0,
      overdueFollowUps: 1,
      preparedWorkNotAdvanced: 0,
      activeOpportunitiesConsidered: 2
    },
    priorities,
    companyRisks: priorities,
    operationalGaps: [
      { type: "overdue_follow_up", label: "Follow-up-uri întârziate", count: 1, impact: "Risc", actionLabel: "Revizuiește", actionHref: "/today" },
      { type: "opportunity_without_owner", label: "Fără responsabil", count: 1, impact: "Risc", actionLabel: "Atribuie", actionHref: "/opportunities" }
    ],
    sevenDayPlan: [],
    evidence: priorities.flatMap((item) => item.evidence),
    sourceState: "opportunities_available",
    ...overrides
  };
}

test("pilot pack reuses deduplicated exposure, separate currencies and evidence-backed priorities", () => {
  const source = audit({
    priorities: [
      priority(1, { relatedOpportunityId: "shared", estimatedValue: 10000 }),
      priority(2, { relatedOpportunityId: "shared", type: "opportunity_without_owner", estimatedValue: 10000 })
    ]
  });
  const pack = buildEnterprisePilotPack(source);
  assert.deepEqual(Array.from(pack.estimatedExposedValueByCurrency, (entry) => [entry.currency, entry.value]), [["EUR", 4000], ["RON", 20000]]);
  assert.equal(pack.proofOfValuePriorities.length, 2);
  assert.ok(pack.proofOfValuePriorities.every((item) => item.evidence.length > 0 && item.actionHref));
  assert.equal(pack.evidence.length, source.evidence.length);
  assert.equal("confirmedRevenue" in pack, false);
});

test("14-day plan is deterministic and responds to observed operational gaps", () => {
  const source = audit();
  const first = buildEnterprisePilotPack(source);
  const second = buildEnterprisePilotPack(source);
  assert.deepEqual(JSON.parse(JSON.stringify(first.fourteenDayPlan)), JSON.parse(JSON.stringify(second.fourteenDayPlan)));
  assert.deepEqual(Array.from(first.fourteenDayPlan, (phase) => phase.period), ["Zilele 1–2", "Zilele 3–7", "Zilele 8–14"]);
  assert.match(first.fourteenDayPlan[1].actions.join(" "), /responsabili/);
  assert.match(first.fourteenDayPlan[1].actions.join(" "), /aprobări/);
});

test("success criteria, buyer committee and client inputs remain operational and concise", () => {
  const pack = buildEnterprisePilotPack(audit());
  assert.ok(pack.successCriteria.length >= 4);
  assert.ok(pack.successCriteria.every((criterion) => criterion.currentState && criterion.pilotTarget && criterion.measurement));
  assert.deepEqual(Array.from(pack.buyerCommitteeNotes, (entry) => entry.role), ["CEO / Fondator", "CFO / Financiar", "Director comercial", "Operațiuni", "IT / Securitate"]);
  assert.ok(pack.buyerCommitteeNotes.every((entry) => entry.note.length < 180));
  assert.ok(pack.requiredClientInputs.some((entry) => entry.availability === "Necesar"));
  assert.ok(pack.requiredClientInputs.some((entry) => entry.availability === "Dacă este disponibil"));
});

test("empty and partial workspaces stay honest without fabricated commercial conclusions", () => {
  const empty = buildEnterprisePilotPack(audit({
    status: "incomplete",
    statusLabel: "Incomplet",
    sourceState: "empty_workspace",
    priorities: [],
    companyRisks: [],
    evidence: [],
    operationalGaps: [],
    estimatedExposedValueByCurrency: [],
    counts: { ...audit().counts, criticalDecisions: 0, pendingApprovals: 0, missingNextActions: 0, missingOwners: 0, overdueFollowUps: 0, activeOpportunitiesConsidered: 0 }
  }));
  assert.equal(empty.proofOfValuePriorities.length, 0);
  assert.match(empty.executiveSummary, /nu permit încă o propunere completă/i);
  assert.match(empty.primaryCommercialProblem.title, /incompletă/i);
  assert.doesNotMatch(empty.executiveSummary, /venit recuperat|succes garantat/i);

  const partial = buildEnterprisePilotPack(audit({
    status: "incomplete",
    statusLabel: "Incomplet",
    sourceState: "signals_only",
    priorities: [priority(1, { type: "pending_approval", relatedOpportunityId: undefined, estimatedValue: undefined, currency: undefined })],
    companyRisks: [],
    estimatedExposedValueByCurrency: []
  }));
  assert.equal(partial.estimatedExposedValueByCurrency.length, 0);
  assert.match(partial.pilotObjective, /Validarea în 14 zile/);
});

test("protected route, print action and entry links are present without external automation", () => {
  const model = read("src/lib/enterprise-pilot-pack.ts");
  const route = read("src/app/(protected)/reports/enterprise-pilot-pack/page.tsx");
  const reports = read("src/app/(protected)/reports/page.tsx");
  const auditRoute = read("src/app/(protected)/reports/revenue-recovery-audit/page.tsx");
  const printButton = read("src/components/reports/PrintPilotPackButton.tsx");
  const policies = read("src/lib/authz/route-policies.ts");

  assert.match(model, /import "server-only"/);
  assert.match(model, /getRevenueRecoveryAudit\(\)/);
  assert.doesNotMatch(model, /openai|anthropic|embedding|service[_-]?role|supabase[\s\S]{0,80}\.from\(|fetch\s*\(/i);
  assert.match(policies, /prefix: "\/reports", permission: "reports\.read"/);
  assert.match(reports, /href="\/reports\/enterprise-pilot-pack"/);
  assert.match(auditRoute, /href="\/reports\/enterprise-pilot-pack"/);
  assert.match(printButton, /window\.print\(\)/);
  assert.match(printButton, /Printează propunerea/);
  assert.doesNotMatch(route, /"use client"/);
});

test("methodology preserves human approval, cautious estimates and the required disclaimer", () => {
  const pack = buildEnterprisePilotPack(audit());
  const text = JSON.stringify(pack);
  assert.match(text, /deduplicate pe oportunitate/);
  assert.match(text, /nu sunt venit confirmat/);
  assert.match(text, /Aprobarea umană rămâne obligatorie/);
  assert.match(text, /nu trimite comunicări externe/);
  assert.match(pack.disclaimer, /Nu reprezintă o garanție financiară, predicție de venit sau confirmare contabilă/);
  assert.doesNotMatch(text, /ROI garantat|venit garantat|recuperare automată|probabilitate de succes/i);
});
