import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const nodeRequire = createRequire(import.meta.url);

function load(relativePath) {
  const filename = path.resolve(relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { exports: module.exports, module, Date, Set, Map, require: nodeRequire }, { filename });
  return module.exports;
}

const { assessCommercialExecution, commercialExecutionStates } = load("src/lib/commercial-execution.ts");
const { createWorkflowDraft } = load("src/lib/workflow-foundation.ts");
const now = new Date("2026-08-24T12:00:00.000Z");

const base = { now, lifecycleOpen: true, ownerMissing: false, nextActionMissing: false, nextActionOverdue: false, approvalPending: false, outreachRestricted: false };

test("canonical model exposes the complete bounded execution vocabulary", () => {
  assert.deepEqual(Array.from(commercialExecutionStates), ["healthy", "needs_attention", "overdue", "waiting_for_client", "waiting_internal", "approval_required", "owner_missing", "next_action_missing", "blocked", "prepared", "ready_for_review", "resolved"]);
});

test("recent outbound communication creates a legitimate waiting state", () => {
  const result = assessCommercialExecution({ ...base, communication: { lastInboundAt: "2026-08-20T08:00:00.000Z", lastOutboundAt: "2026-08-23T08:00:00.000Z", expectedResponseWindowDays: 3 } });
  assert.equal(result.state, "waiting_for_client");
  assert.equal(result.waitingIsLegitimate, true);
  assert.equal(result.nextReviewAt, "2026-08-26T08:00:00.000Z");
});

test("new inbound reply takes priority over an earlier outbound", () => {
  const result = assessCommercialExecution({ ...base, communication: { lastOutboundAt: "2026-08-22T08:00:00.000Z", lastInboundAt: "2026-08-24T08:00:00.000Z" } });
  assert.equal(result.state, "needs_attention");
  assert.equal(result.recentInboundReply, true);
});

test("expired response window becomes overdue without deleting prior context", () => {
  const result = assessCommercialExecution({ ...base, communication: { lastOutboundAt: "2026-08-18T08:00:00.000Z", expectedResponseWindowDays: 3 } });
  assert.equal(result.state, "overdue");
  assert.equal(result.rule, "response_window_expired");
});

test("owner, approval, missing action, blocking, prepared work and resolved states are deterministic", () => {
  assert.equal(assessCommercialExecution({ ...base, ownerMissing: true }).state, "owner_missing");
  assert.equal(assessCommercialExecution({ ...base, approvalPending: true }).state, "approval_required");
  assert.equal(assessCommercialExecution({ ...base, nextActionMissing: true }).state, "next_action_missing");
  assert.equal(assessCommercialExecution({ ...base, explicitBlocker: "Contractul lipsește." }).state, "blocked");
  assert.equal(assessCommercialExecution({ ...base, preparedWorkState: "ready_for_review" }).state, "ready_for_review");
  assert.equal(assessCommercialExecution({ ...base, lifecycleOpen: false }).state, "resolved");
});

test("workflow foundation creates only auditable approval-gated drafts", () => {
  const draft = createWorkflowDraft({ id: "wf-1", name: "Follow-up restant", trigger: "next_action_overdue", createdBy: "profile-1", source: "ai_assisted", actions: [{ type: "prepare_email", description: "Pregătește un email pentru revizuire." }] });
  assert.equal(draft.status, "draft");
  assert.equal(draft.audit.publishedAt, null);
  assert.equal(draft.actions[0].requiresHumanApproval, true);
  assert.throws(() => createWorkflowDraft({ id: "bad", name: "Unsafe", trigger: "email_received", createdBy: "profile-1", actions: [{ type: "send_email", description: "Trimite" }] }));
});

test("Ask action requests remain previews and Google context stays owner-scoped", () => {
  const orchestrator = fs.readFileSync(path.resolve("src/lib/ai/copilot-orchestrator.ts"), "utf8");
  const tools = fs.readFileSync(path.resolve("src/lib/ai/copilot-tools.ts"), "utf8");
  const repository = fs.readFileSync(path.resolve("src/lib/google-workspace/repository.ts"), "utf8");
  assert.match(orchestrator, /actionType: "task"/);
  assert.match(orchestrator, /actionType: "next_action"/);
  assert.match(orchestrator, /prepare_meeting_brief/);
  assert.match(tools, /Pregătit, neexecutat\. ReveNew nu a creat task-ul/);
  assert.match(repository, /\.eq\("owner_profile_id", input\.actor\.profileId\)/);
  assert.doesNotMatch(tools, /send_email\(|gmail\.send|calendar\.events\.insert/);
});

test("official Google artwork is stored locally and source identity is shared", () => {
  for (const file of ["public/brands/google/gmail.svg", "public/brands/google/calendar.svg"]) {
    assert.ok(fs.statSync(path.resolve(file)).size > 500);
  }
  const component = fs.readFileSync(path.resolve("src/components/ui/IntegrationBrandIcon.tsx"), "utf8");
  const preview = fs.readFileSync(path.resolve("src/components/marketing/ProductPreview.tsx"), "utf8");
  assert.match(component, /\/brands\/google\/gmail\.svg/);
  assert.match(component, /\/brands\/google\/calendar\.svg/);
  assert.doesNotMatch(preview, />M<|>31</);
});
test("unified timeline and Company 360 consume only owner-authorized external context", () => {
  const timeline = fs.readFileSync(path.resolve("src/lib/opportunity-intelligence-timeline.ts"), "utf8");
  const companyPage = fs.readFileSync(path.resolve("src/app/(protected)/crm/organizations/[id]/page.tsx"), "utf8");
  const inboxPage = fs.readFileSync(path.resolve("src/app/(protected)/inbox/page.tsx"), "utf8");
  const repository = fs.readFileSync(path.resolve("src/lib/google-workspace/repository.ts"), "utf8");
  assert.match(timeline, /source: \{ type: "email"/);
  assert.match(timeline, /source: \{ type: "calendar_event"/);
  assert.match(companyPage, /getExternalContextForCompany\(organization\.id\)/);
  assert.match(inboxPage, /linkedOpportunityId: email\.linked_opportunity_id/);
  assert.match(repository, /\.eq\("owner_profile_id", input\.actor\.profileId\)/);
});

test("commercial Inbox derives real response states without inventing CRM links", () => {
  const inbox = fs.readFileSync(path.resolve("src/components/inbox/ConnectedEmailInbox.tsx"), "utf8");
  assert.match(inbox, /if \(!linked\) return "unlinked"/);
  assert.match(inbox, /email\.direction === "inbound"/);
  assert.match(inbox, /addBusinessDays\(email\.sentAt, responseWindowBusinessDays\)/);
  assert.doesNotMatch(inbox, /Math\.random|fake|demoCompany/);
});