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
    Date,
    Intl,
    require: (id) => {
      if (id === "server-only") return {};
      if (id === "@/lib/recovery") {
        return {
          getRecoverySummary: async () => ({ opportunities: [], signals: [], actions: [], documents: [], events: [] }),
          recoverableOpportunities: (items) => items.filter((item) => !["won", "lost", "ignored"].includes(item.status))
        };
      }
      if (id === "@/lib/authz/get-authorization-context") {
        return { getAuthorizationContext: async () => ({ profileId: null, businessRole: null }) };
      }
      if (id === "@/lib/supabase/data") return { getCurrentBusinessOrDemo: async () => null, getOpportunitiesForCurrentBusiness: async () => [] };
      if (id === "@/lib/supabase/database-errors") return { isMissingRelationError: () => false };
      if (id === "@/lib/supabase/server") return { createSupabaseServerClient: () => null };
      if (id === "@/lib/supabase/status") return { isSupabaseConfigured: false };
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

test("pipeline maps existing opportunity statuses to commercial stages without schema rewrite", () => {
  const workspace = loadTsModule("src/lib/revenue-workspace.ts");

  assert.equal(workspace.stageForStatus("new"), "lead");
  assert.equal(workspace.stageForStatus("contacted"), "qualified");
  assert.equal(workspace.stageForStatus("follow_up_needed"), "proposal");
  assert.equal(workspace.stageForStatus("won"), "won");
  assert.equal(workspace.stageForStatus("lost"), "lost");
  assert.equal(workspace.pipelineStages.length, 5);
});

test("workspace metrics use real statuses and distinguish active pipeline from terminal outcomes", () => {
  const workspace = loadTsModule("src/lib/revenue-workspace.ts");
  const opportunities = [
    { status: "new", estimatedValueHigh: 1000, timeline: [], actions: [] },
    { status: "follow_up_needed", estimatedValueHigh: 2000, timeline: [], actions: [] },
    { status: "won", estimatedValueHigh: 3000, timeline: [], actions: [] },
    { status: "lost", estimatedValueHigh: 4000, timeline: [], actions: [] }
  ];

  assert.equal(workspace.activePipelineValue(opportunities), 3000);
});

test("commercial dates use Europe/Bucharest and local task input becomes an exact instant", () => {
  const domain = loadTsModule("src/lib/opportunity-domain.ts");

  assert.equal(domain.applicationDateKey(new Date("2026-07-12T21:30:00.000Z")), "2026-07-13");
  assert.equal(domain.applicationMonthKey(new Date("2026-06-30T21:30:00.000Z")), "2026-07");
  assert.equal(domain.applicationLocalDateTimeToIso("2026-07-13", "09:00"), "2026-07-13T06:00:00.000Z");
  assert.equal(domain.applicationLocalDateTimeToIso("2026-03-29", "03:30"), null);
});

test("pipeline transitions advance or return one stage and reject skipped stages", () => {
  const domain = loadTsModule("src/lib/opportunity-domain.ts");

  assert.equal(domain.isValidPipelineTransition("reviewed", "contacted"), true);
  assert.equal(domain.isValidPipelineTransition("contacted", "follow_up_needed"), true);
  assert.equal(domain.isValidPipelineTransition("follow_up_needed", "contacted"), true);
  assert.equal(domain.isValidPipelineTransition("reviewed", "follow_up_needed"), false);
  assert.equal(domain.isValidPipelineTransition("contacted", "won"), false);
});

test("next-best-action uses known data and does not invent missing contact details", () => {
  const workspace = loadTsModule("src/lib/revenue-workspace.ts");
  const recommendation = workspace.recommendNextBestAction({
    id: "opp",
    title: "Oportunitate test",
    status: "reviewed",
    estimatedValueHigh: 0,
    deadline: undefined,
    rawSourceText: "",
    summary: "",
    urgencyScore: 80,
    actions: [],
    documents: [],
    timeline: [],
    contacts: []
  });

  assert.equal(recommendation.action, "Confirmă persoana responsabilă de decizie");
  assert.equal(recommendation.channel, "internal_review");
  assert.deepEqual(recommendation.missingInformation.includes("contact principal"), true);
  assert.deepEqual(recommendation.missingInformation.includes("valoare comercială estimată"), true);
});

test("workspace actions enforce membership-scoped opportunity reloads and activity events", () => {
  const source = read("src/lib/revenue-workspace/actions.ts");

  assert.match(source, /"use server"/);
  assert.match(source, /requirePermission\("opportunities\.update"\)/);
  assert.match(source, /requirePermission\("actions\.create"\)/);
  assert.match(source, /requirePermission\("actions\.complete"\)/);
  assert.match(source, /getOpportunityForCurrentBusiness\(opportunityId\)/);
  assert.match(source, /\.eq\("business_id", business\.id\)/);
  assert.match(source, /\.eq\("status", "pending"\)/);
  assert.match(source, /eventForOpportunity/);
  assert.match(source, /verifyAssignableProfile\(business\.id, assignedToProfileId\)/);
  assert.match(source, /isValidPipelineTransition\(opportunity\.status, nextStatus\)/);
  assert.doesNotMatch(source, /\bowner_id\b/);
  assert.doesNotMatch(source, /profiles\.role/);
});

test("CRM deep links stay protected while company/contact navigation remains serializable", () => {
  const policies = read("src/lib/authz/route-policies.ts");
  const navigation = read("src/lib/navigation.ts");

  assert.match(policies, /prefix: "\/crm", permission: "workspace\.read"/);
  assert.match(policies, /prefix: "\/pipeline", permission: "opportunities\.read"/);
  assert.match(navigation, /href: "\/companies"/);
  assert.match(navigation, /href: "\/contacts"/);
  assert.match(navigation, /href: "\/pipeline"/);
  assert.doesNotMatch(navigation, /render:|HomeIcon|icon:\s*[A-Z][A-Za-z]+Icon[,}]/);
});

test("pipeline and opportunity actions preserve stored commercial values in the UI", () => {
  const pipeline = read("src/components/revenue/PipelineBoard.tsx");
  const workflow = read("src/components/opportunities/OpportunityWorkflow.tsx");

  assert.match(pipeline, /formatCurrency\(column\.totalValue, "RON"\)/);
  assert.match(pipeline, /opportunity\.currency \?\? "RON"/);
  assert.match(pipeline, /opportunity\.actualOutcomeAmount \?\? 0/);
  assert.match(workflow, />\{existing\.title\}</);
});

test("repository hygiene ignores generated runtime artifacts without deleting reviewed docs", () => {
  const gitignore = read(".gitignore");

  assert.match(gitignore, /\*\.log/);
  assert.match(gitignore, /\.codex-e2e-browser-profile\//);
  assert.match(gitignore, /security-scan-export\//);
  assert.equal(fs.existsSync(path.resolve("dev-server.err.log")), false);
  assert.equal(fs.existsSync(path.resolve("dev-server.out.log")), false);
});
