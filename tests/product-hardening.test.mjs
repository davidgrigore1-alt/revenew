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

function loadTsModule(relativePath) {
  const filename = path.resolve(relativePath);
  const source = read(relativePath);
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    },
    fileName: filename
  }).outputText;
  const module = { exports: {} };

  vm.runInNewContext(compiled, {
    exports: module.exports,
    module,
    Intl,
    URL,
    require: (id) => {
      if (id === "server-only") return {};
      if (id === "@/lib/utils") {
        return {
          formatCurrency: (value) => `${value} EUR`,
          formatDate: (value) => value || "fără termen"
        };
      }
      if (id.startsWith("@/")) {
        const localPath = path.resolve("src", id.slice(2));
        const tsPath = fs.existsSync(localPath) ? localPath : `${localPath}.ts`;
        if (fs.existsSync(tsPath)) return loadTsModule(tsPath);
        return {};
      }
      return nodeRequire(id);
    }
  }, { filename });

  return module.exports;
}

test("customer-facing opportunity and AI source does not contain known Romanian mojibake", () => {
  const files = [
    "src/components/opportunities/AnalyzeOpportunityForm.tsx",
    "src/components/opportunities/OpportunityWorkflow.tsx",
    "src/components/opportunities/OpportunityContactsPanel.tsx",
    "src/lib/mock-generators.ts",
    "src/lib/openai/prompts.ts",
    "src/lib/openai/fallback.ts",
    "src/app/api/ai/analyze-opportunity/route.ts",
    "src/app/api/ai/generate-document/route.ts",
    "src/components/authz/ForbiddenState.tsx",
    "src/app/(protected)/admin/layout.tsx",
    "src/components/admin/AdminUi.tsx",
    "src/lib/navigation.ts",
    "src/lib/revenue-workspace.ts",
    "src/lib/crm/workspace-actions.ts",
    "src/app/(protected)/crm/page.tsx",
    "src/app/(protected)/crm/organizations/[id]/page.tsx",
    "src/components/crm/CrmWorkspaceClient.tsx",
    "src/components/revenue/PipelineBoard.tsx",
    "src/components/revenue/TaskControls.tsx",
    "src/components/revenue/NextBestActionPanel.tsx"
  ];

  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /Ä|È|Å|Ã|Â|�/, file);
    assert.doesNotMatch(source, /Programeaz\?|Revizuie\?|Ac\?iuni|Po\?i|Salveaz\?|Preg\?te\?te|Marcheaz\?|Nu exist\?/i, file);
  }
});

test("theme initialization script is valid JavaScript", () => {
  const source = read("src/components/theme/theme-script.ts");

  assert.equal(source.includes('stored === "system"'), true);
  assert.equal(source.includes('? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")'), true);
});

test("deterministic fallback documents are structured, useful and do not reproduce filler", () => {
  const generators = loadTsModule("src/lib/mock-generators.ts");
  const business = {
    name: "ReveNew Test",
    legalName: "ReveNew Test SRL",
    website: "",
    industry: "servicii",
    city: "București",
    county: "București",
    services: ["audit comercial", "follow-up B2B"],
    targetCustomers: [],
    averageContractValue: 10000,
    targetCities: [],
    targetIndustries: [],
    currentSalesProcess: "",
    notificationEmail: ""
  };
  const opportunity = {
    id: "opp-1",
    title: "bla bla bla bla bla",
    type: "b2b_lead",
    status: "reviewed",
    estimatedValueLow: 0,
    estimatedValueHigh: 0,
    city: "București",
    county: "Ilfov",
    fitScore: 50,
    urgencyScore: 50,
    moneyScore: 50,
    confidenceScore: 50,
    summary: "bla bla bla bla",
    relevance: [],
    risks: [],
    recommendedAction: "",
    rawSourceText: "bla bla bla bla bla",
    timeline: [],
    documents: [],
    actions: []
  };

  const email = generators.generateOutreachEmail(opportunity, business);
  const script = generators.generateCallScript(opportunity, business);
  const offer = generators.generateOfferDraft(opportunity, business);
  const checklist = generators.generateChecklist(opportunity, business);

  assert.equal(/bla bla/i.test(`${email}\n${script}\n${offer}\n${checklist}`), false);
  assert.match(email, /Subiect:/);
  assert.match(script, /Întrebări de calificare:/);
  assert.match(offer, /Elemente deschise/);
  assert.match(checklist, /Checklist operațional/);
  assert.match(offer, /De confirmat înainte de trimitere/);
});

test("AI prompts instruct missing-data handling and hide technical fallback language", () => {
  const promptSource = read("src/lib/openai/prompts.ts");
  const workflowSource = read("src/components/opportunities/OpportunityWorkflow.tsx");
  const analysisRoute = read("src/app/api/ai/analyze-opportunity/route.ts");
  const documentRoute = read("src/app/api/ai/generate-document/route.ts");

  assert.match(promptSource, /Nu reproduce filler/);
  assert.match(promptSource, /Marchează explicit informațiile care trebuie confirmate/);
  assert.match(promptSource, /Nu menționa providerul AI, fallback-ul, metering-ul/);
  assert.equal(workflowSource.includes("local_fallback") && workflowSource.includes("isDevelopmentMode"), true);
  assert.match(analysisRoute, /Analiză standard pregătită pentru revizuire/);
  assert.match(documentRoute, /Draft standard pregătit pentru revizuire/);
});

test("Admin unauthorized and usage unavailable states are intentional", () => {
  const adminLayout = read("src/app/(protected)/admin/layout.tsx");
  const adminInsights = read("src/lib/admin/insights.ts");
  const usagePage = read("src/app/(protected)/admin/usage/page.tsx");
  const costsPage = read("src/app/(protected)/admin/costs/page.tsx");

  assert.match(adminLayout, /hasPermission\(authorization, "platform\.admin\.access"\)/);
  assert.match(adminLayout, /ForbiddenState/);
  assert.doesNotMatch(adminLayout, /requirePermission/);
  assert.ok(adminLayout.indexOf("hasPermission") < adminLayout.indexOf("adminLinks.map"));
  assert.match(adminInsights, /isMissingRelationError\(usageResult\.error, "usage_events"\)/);
  assert.match(usagePage, /usageAvailable/);
  assert.match(costsPage, /usageAvailable/);
});

test("QA-polished operational copy remains accurate and uses shared primitives", () => {
  const dashboard = read("src/app/(protected)/dashboard/page.tsx");
  const opportunities = read("src/app/(protected)/opportunities/page.tsx");
  const analyze = read("src/app/(protected)/opportunities/analyze/page.tsx");
  const reportActions = read("src/components/reports/ReportActions.tsx");

  assert.match(dashboard, /oportunități sunt evaluate cu risc ridicat/);
  assert.doesNotMatch(dashboard, /oportunități cu valoare mare sunt evaluate/);
  assert.match(opportunities, /filtered\.length === 1 \? "oportunitate" : "oportunități"/);
  assert.match(analyze, /Analizează o oportunitate nouă/);
  assert.match(reportActions, /import \{ Button \} from "@\/components\/ui\/Button"/);
  assert.match(reportActions, /role="status"/);
  assert.doesNotMatch(reportActions, /bg-mint-|text-ink-|text-mint-/);
});

test("security invariants remain explicit in hardened source", () => {
  const files = [
    "src/app/(protected)/admin/layout.tsx",
    "src/lib/openai/prompts.ts",
    "src/lib/openai/fallback.ts",
    "src/lib/mock-generators.ts",
    "src/app/api/ai/analyze-opportunity/route.ts",
    "src/app/api/ai/generate-document/route.ts"
  ];

  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /\bowner_id\b/, file);
    assert.doesNotMatch(source, /profiles\.role/, file);
  }
});
