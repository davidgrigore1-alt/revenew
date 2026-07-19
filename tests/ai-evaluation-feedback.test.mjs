import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function loadFeedbackModel() {
  const filename = path.resolve("src/lib/recommendation-feedback.ts");
  const source = ts.transpileModule(read(filename), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, { exports: module.exports, module, require: () => ({}) }, { filename });
  return module.exports;
}

function event(eventType, metadata = {}, createdAt = "2026-07-19T10:00:00.000Z") {
  return { id: `${eventType}-1`, eventType, metadata, createdAt };
}

function signal(overrides = {}) {
  return {
    id: "signal-1",
    status: "ready_for_review",
    reviewStatus: "ready_for_review",
    analysisStatus: "completed",
    analysisMode: "deterministic_fallback",
    recommendedAction: "Confirmă contextul comercial.",
    missingInformation: [],
    uncertaintyNotes: [],
    events: [],
    ...overrides
  };
}

test("feedback model derives pending, applied, edited and rejected outcomes", () => {
  const { recommendationFeedbackForSignal } = loadFeedbackModel();
  assert.equal(recommendationFeedbackForSignal(signal()).state, "pending_review");

  const applied = recommendationFeedbackForSignal(signal({
    status: "converted",
    reviewStatus: "converted",
    events: [event("recommendation_feedback_recorded", {
      feedback_state: "accepted_as_is",
      edited: false,
      original_recommended_action: "Confirmă contextul comercial.",
      final_approved_action: "Confirmă contextul comercial.",
      conversion_type: "new_opportunity"
    })]
  }));
  assert.equal(applied.state, "applied");
  assert.equal(applied.decisionLabel, "Acceptată fără modificări");

  const edited = recommendationFeedbackForSignal(signal({
    events: [event("analysis_review_edited", {
      original_recommended_action: "Confirmă contextul comercial.",
      final_recommended_action: "Programează discuția de clarificare."
    })]
  }));
  assert.equal(edited.state, "edited_before_approval");
  assert.equal(edited.wasEdited, true);
  assert.equal(edited.finalAction, "Programează discuția de clarificare.");

  const rejected = recommendationFeedbackForSignal(signal({
    status: "dismissed",
    reviewStatus: "dismissed",
    dismissalReason: "Nu există relevanță comercială actuală."
  }));
  assert.equal(rejected.state, "rejected");
  assert.equal(rejected.rejectionReason, "Nu există relevanță comercială actuală.");
});

test("quality strip counts only prepared recommendations from real state", () => {
  const { recommendationFeedbackCounts } = loadFeedbackModel();
  const counts = recommendationFeedbackCounts([
    signal(),
    signal({ id: "signal-2", events: [event("analysis_review_edited")] }),
    signal({ id: "signal-3", status: "converted", reviewStatus: "converted", events: [event("recommendation_feedback_recorded", { edited: false })] }),
    signal({ id: "signal-4", status: "dismissed", reviewStatus: "dismissed", dismissalReason: "Respins." }),
    signal({ id: "signal-5", analysisStatus: "not_started" })
  ]);
  assert.deepEqual({ ...counts }, { pending: 2, applied: 1, edited: 1, rejected: 1 });
});

test("decision feedback is recorded only after a successful tenant-scoped mutation", () => {
  const inbox = read("src/lib/commercial-inbox.ts");
  const approvalStart = inbox.indexOf("export async function approveCommercialSignal");
  const approval = inbox.slice(approvalStart);
  const rpcIndex = approval.indexOf("supabase.rpc");
  const errorIndex = approval.indexOf("if (error)", rpcIndex);
  const feedbackIndex = approval.indexOf('"recommendation_feedback_recorded"', errorIndex);
  assert.ok(rpcIndex > 0 && errorIndex > rpcIndex && feedbackIndex > errorIndex);
  assert.match(approval, /\.eq\("business_id", business\.id\)/);
  assert.match(inbox, /original_recommended_action/);
  assert.match(inbox, /final_approved_action/);
  assert.match(inbox, /edited_fields/);
  assert.match(inbox, /conversion_type/);
  assert.doesNotMatch(inbox, /full_prompt|system_prompt|prompt_content/);
});

test("feedback UI is compact, explicit and makes no autonomous-learning claim", () => {
  const approval = read("src/components/approvals/ApprovalCenterClient.tsx");
  const panel = read("src/components/signals/RecommendationFeedbackPanel.tsx");
  const preparation = read("src/components/signals/SignalPreparationPanel.tsx");
  assert.match(approval, /RecommendationFeedbackPanel/);
  assert.match(approval, /De revizuit/);
  assert.match(approval, /Aplicate/);
  assert.match(approval, /Editate/);
  assert.match(approval, /Respinse/);
  assert.match(panel, /Feedback recomandare/);
  assert.match(panel, /Recomandarea a fost modificată înainte de aprobare/);
  assert.match(panel, /nu declanșează învățare sau acțiuni automate/);
  assert.match(preparation, /În așteptarea unei decizii umane/);
  assert.match(preparation, /Aprobată cu modificări/);
  assert.match(preparation, /Respinsă cu motiv/);
  assert.doesNotMatch(panel + preparation, /învață automat|optimizează automat|se antrenează/i);
});

test("feedback path has no provider, privileged client or external execution integration", () => {
  const source = [
    "src/lib/recommendation-feedback.ts",
    "src/components/signals/RecommendationFeedbackPanel.tsx",
    "src/components/approvals/ApprovalCenterClient.tsx"
  ].map(read).join("\n");
  assert.doesNotMatch(source, /OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|createSupabaseAdminClient|service_role/i);
  assert.doesNotMatch(source, /fetch\s*\(|sendEmail|sendMessage|gmail|whatsapp|twilio|webhook|phoneAgent/i);
});

test("local demo verifies every feedback state without an external provider", () => {
  const fixtures = read("scripts/demo/fixtures.mjs");
  const verify = read("scripts/demo/verify-local-demo.mjs");
  assert.match(fixtures, /recommendation_feedback_recorded/);
  assert.match(fixtures, /analysis_review_edited/);
  assert.match(fixtures, /accepted_as_is/);
  assert.match(verify, /recommendation_feedback_pending_count/);
  assert.match(verify, /recommendation_feedback_applied_count/);
  assert.match(verify, /recommendation_feedback_edited_count/);
  assert.match(verify, /recommendation_feedback_rejected_count/);
  assert.match(verify, /recommendation_feedback_external_action_count/);
  assert.match(verify, /ai_preparation_provider_count/);
});
