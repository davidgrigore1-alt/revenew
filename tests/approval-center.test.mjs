import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function loadApprovalCenter() {
  const filename = path.resolve("src/lib/approval-center.ts");
  const compiled = ts.transpileModule(read(filename), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { exports: module.exports, module, require: () => ({}) }, { filename });
  return module.exports;
}

function signal(overrides = {}) {
  return {
    id: "signal-1",
    status: "ready_for_review",
    reviewStatus: "ready_for_review",
    title: "Cerere comercială",
    createdAt: "2026-07-19T10:00:00.000Z",
    missingInformation: [],
    uncertaintyNotes: [],
    ...overrides
  };
}

test("approval center maps existing signal states without inventing a new business state", () => {
  const { approvalStateForSignal, approvalCenterSignals } = loadApprovalCenter();
  assert.equal(approvalStateForSignal(signal()), "pending");
  assert.equal(approvalStateForSignal(signal({ status: "converted", reviewStatus: "converted" })), "applied");
  assert.equal(approvalStateForSignal(signal({ status: "dismissed", reviewStatus: "dismissed" })), "rejected");
  assert.equal(approvalStateForSignal(signal({ status: "new", reviewStatus: "new" })), null);
  assert.equal(approvalCenterSignals([signal(), signal({ id: "signal-2", status: "converted", reviewStatus: "converted" })]).length, 2);
});

test("proposed changes distinguish new opportunities from actions on existing opportunities", () => {
  const { proposedChangeForSignal } = loadApprovalCenter();
  assert.match(proposedChangeForSignal(signal()), /oportunitate/i);
  assert.match(proposedChangeForSignal(signal({ detectedFromOpportunityId: "opportunity-1" })), /acțiune internă/i);
});

test("approval page reads only current-workspace data and retains existing permission gates", () => {
  const page = read("src/app/(protected)/approvals/page.tsx");
  const actions = read("src/lib/commercial-inbox-actions.ts");
  const inbox = read("src/lib/commercial-inbox.ts");
  assert.match(page, /getCommercialSignalsForCurrentBusiness/);
  assert.match(page, /getCrmWorkspaceForCurrentBusiness/);
  assert.match(actions + inbox, /requireActivePaidAccess/);
  assert.match(actions + inbox, /requirePermission\("signals\.convert"\)/);
  assert.match(inbox, /validateWorkspaceLinks/);
  assert.match(inbox, /\.eq\("business_id", business\.id\)/);
});

test("approval and rejection reuse audited server actions and require a rejection reason", () => {
  const client = read("src/components/approvals/ApprovalCenterClient.tsx");
  const inbox = read("src/lib/commercial-inbox.ts");
  assert.match(client, /approveCommercialSignal/);
  assert.match(client, /setCommercialSignalReviewDecision/);
  assert.match(client, /Motivul respingerii este obligatoriu/);
  assert.match(client, /Nimic nu este trimis extern/);
  assert.match(inbox, /commercial_signal_events/);
  assert.match(inbox, /revalidatePath\("\/approvals"\)/);
});

test("approval of an existing opportunity uses the stored tenant-validated link", () => {
  const client = read("src/components/approvals/ApprovalCenterClient.tsx");
  const call = client.slice(client.indexOf("approveCommercialSignal(selectedSignal.id"), client.indexOf("if (!result.ok)", client.indexOf("approveCommercialSignal(selectedSignal.id")));
  assert.doesNotMatch(call, /opportunityId\s*:/);
  assert.match(client, /detectedFromOpportunityId/);
});

test("approval center introduces no external-send or privileged browser path", () => {
  const files = [
    "src/app/(protected)/approvals/page.tsx",
    "src/components/approvals/ApprovalCenterClient.tsx",
    "src/lib/approval-center.ts"
  ].map(read).join("\n");
  assert.doesNotMatch(files, /SUPABASE_SERVICE_ROLE_KEY|createSupabaseAdminClient|service_role/i);
  assert.doesNotMatch(files, /fetch\s*\(|sendEmail|sendSms|webhook|twilio|gmail|openai/i);
});

test("required contextual surfaces link pending work into the approval center", () => {
  const inbox = read("src/app/(protected)/inbox/page.tsx");
  const company = read("src/app/(protected)/crm/organizations/[id]/page.tsx");
  const opportunity = read("src/app/(protected)/opportunities/[id]/page.tsx");
  const recovery = read("src/app/(protected)/recoverable/page.tsx");
  for (const source of [inbox, company, opportunity, recovery]) assert.match(source, /\/approvals/);
});

test("local demo verifies pending, applied and rejected approval states", () => {
  const verify = read("scripts/demo/verify-local-demo.mjs");
  assert.match(verify, /approval_pending_count/);
  assert.match(verify, /approval_applied_count/);
  assert.match(verify, /approval_rejected_count/);
  assert.match(verify, /O conversie eșuată a modificat starea sau auditul semnalului/);
});
