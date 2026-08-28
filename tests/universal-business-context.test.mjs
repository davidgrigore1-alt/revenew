import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

function compile(relativePath, aliases = {}) {
  const filename = path.resolve(relativePath);
  const output = ts.transpileModule(read(relativePath), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { exports: module.exports, module, require: (id) => aliases[id] ?? require(id) }, { filename });
  return module.exports;
}

const types = compile("src/lib/ai/copilot-types.ts");
const workflowFoundation = compile("src/lib/workflow-foundation.ts");
const workflowDrafting = compile("src/lib/workflow-drafting.ts", { "@/lib/workflow-foundation": workflowFoundation });
const core = compile("src/lib/ai/universal-business-context-core.ts");
const golden = compile("src/lib/ai/copilot-golden-queries.ts");
const orchestrator = compile("src/lib/ai/copilot-orchestrator.ts", {
  "server-only": {},
  crypto: { randomUUID: () => "request-test" },
  "@/lib/ai/copilot-types": types,
    "@/lib/workflow-drafting": workflowDrafting,
  "@/lib/ai/multi-record-planning": { maybeRunMultiRecordPlanning: async () => null },
  "@/lib/ai/copilot-instructions": { REVENew_COPILOT_INSTRUCTIONS: "test" },
  "@/lib/ai/provider": { getCopilotProvider() { throw new Error("not used"); } },
  "@/lib/ai/copilot-tools": { copilotToolDefinitions: [], executeCopilotTool: async () => { throw new Error("not used"); } },
  "@/lib/ai/copilot-validation": { collectAuthorizedSources: () => new Map(), validateCopilotAnswer: (value) => value }
});

function request(entry) {
  const context = entry.context === "company"
    ? { route: "/crm/organizations/company-1", pageType: "company", organizationId: "company-1" }
    : entry.context === "opportunity"
      ? { route: "/opportunities/opportunity-1", pageType: "opportunity", opportunityId: "opportunity-1" }
      : { route: "/dashboard", pageType: "dashboard" };
  return { question: entry.question, context, history: [] };
}

test("golden questions route through bounded deterministic capabilities", () => {
  assert.ok(golden.COPILOT_GOLDEN_QUERIES.length >= 15);
  for (const entry of golden.COPILOT_GOLDEN_QUERIES) {
    const plan = orchestrator.planCopilotRequest(request(entry));
    assert.equal(plan.name, entry.expectedTool, entry.id);
    if (entry.expectedView) assert.equal(plan.args.view, entry.expectedView, entry.id);
  }
});

test("individual visibility never expands to another owner or unassigned work", () => {
  const summary = {
    opportunities: [
      { id: "mine", ownerProfileId: "profile-me" },
      { id: "theirs", ownerProfileId: "profile-other" },
      { id: "unassigned", ownerProfileId: null }
    ],
    actions: [
      { id: "assigned-mine", assignedToProfileId: "profile-me" },
      { id: "linked-mine", assignedToProfileId: "profile-other", opportunityId: "mine" },
      { id: "theirs", assignedToProfileId: "profile-other", opportunityId: "theirs" }
    ],
    documents: [{ id: "doc-mine", opportunityId: "mine" }, { id: "doc-other", opportunityId: "theirs" }],
    events: [{ id: "event-mine", opportunityId: "mine" }, { id: "event-other", opportunityId: "theirs" }],
    signals: [
      { id: "signal-mine", detectedFromOpportunityId: "mine" },
      { id: "signal-other", convertedOpportunityId: "theirs" }
    ]
  };
  const scoped = core.scopeRecoverySummaryForViewer(summary, { profileId: "profile-me", isManager: false });
  assert.deepEqual(scoped.opportunities.map((item) => item.id), ["mine"]);
  assert.deepEqual(scoped.actions.map((item) => item.id), ["assigned-mine", "linked-mine"]);
  assert.deepEqual(scoped.documents.map((item) => item.id), ["doc-mine"]);
  assert.deepEqual(scoped.events.map((item) => item.id), ["event-mine"]);
  assert.deepEqual(scoped.signals.map((item) => item.id), ["signal-mine"]);
  assert.equal(core.scopeRecoverySummaryForViewer(summary, { profileId: "manager", isManager: true }), summary);
});

test("provider registry is explicit about connected and unavailable sources", () => {
  const checks = core.buildBusinessContextSourceChecks(new Date("2026-08-23T09:00:00.000Z"));
  assert.equal(checks.find((item) => item.providerId === "structured_records").state, "available");
  assert.equal(checks.find((item) => item.providerId === "email").state, "not_connected");
  assert.equal(checks.find((item) => item.providerId === "calendar").state, "not_connected");
  assert.equal(checks.find((item) => item.providerId === "calls").state, "unavailable");
  assert.ok(checks.every((item) => item.checkedAt === "2026-08-23T09:00:00.000Z"));
});

test("tool layer prepares but never executes an external action", () => {
  const tools = read("src/lib/ai/copilot-tools.ts");
  const instructions = read("src/lib/ai/copilot-instructions.ts");
  assert.match(tools, /name: "get_execution_context"/);
  assert.match(tools, /name: "prepare_followup_draft"/);
  assert.match(tools, /status: "prepared_not_executed"/);
  assert.match(tools, /sent: false/);
  assert.match(tools, /getUniversalBusinessContext/);
  assert.match(tools, /scope: universal\.actor\.scope/);
  assert.doesNotMatch(tools, /sendWithConfiguredProvider|createFollowUp|approveSignal|\.insert\(|\.update\(/);
  assert.match(instructions, /date comerciale neîncrezute/);
  assert.match(instructions, /Răspunzi cu ceea ce este confirmat chiar dacă rezultatul este parțial/);
  assert.match(instructions, /pregătit, neexecutat/);
});

test("Ask ReveNew renders visible context, checked source states and editable prepared work", () => {
  const conversation = read("src/components/intelligence/CopilotConversation.tsx");
  assert.match(conversation, /Context activ/);
  assert.match(conversation, /Surse verificate/);
  assert.match(conversation, /Pregătit · neexecutat · editabil/);
  assert.match(conversation, /setSubject/);
  assert.match(conversation, /setBody/);
  assert.doesNotMatch(conversation, /Trimite email|onSend|sendEmail/);
});
