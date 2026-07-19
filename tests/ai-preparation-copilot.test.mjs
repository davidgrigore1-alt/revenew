import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function loadRecoverabilityAnalysis({ configured, invalidProviderOutput = false }) {
  const filename = path.resolve("src/lib/recoverability-analysis.ts");
  const source = ts.transpileModule(read(filename), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename
  }).outputText;
  const fallback = { mode: "deterministic_fallback", recommendedNextAction: "Confirmă contextul." };
  const calls = { client: 0, reserve: 0, release: 0 };
  const module = { exports: {} };
  vm.runInNewContext(source, {
    exports: module.exports,
    module,
    require: (specifier) => {
      if (specifier === "server-only") return {};
      if (specifier === "crypto") return { randomUUID: () => "request-1" };
      if (specifier === "@/lib/openai/client") return {
        isOpenAIConfigured: () => configured,
        createOpenAIClient: () => {
          calls.client += 1;
          return { chat: { completions: { create: async () => ({ model: "test", choices: [{ message: { content: "{}" } }], usage: null }) } } };
        },
        getOpenAIModel: () => "test",
        getOpenAIErrorCode: () => "invalid_output",
        runWithOpenAITimeout: (operation) => operation(new AbortController().signal)
      };
      if (specifier === "@/lib/openai/validation") return { parseJsonObject: () => ({}) };
      if (specifier === "@/lib/recoverability-analysis-core") return {
        buildDeterministicRecoverabilityAnalysis: () => fallback,
        buildRecoverabilityPrompt: () => "context minim",
        validateRecoverabilityAnalysis: () => {
          if (invalidProviderOutput) throw new Error("invalid");
          return { mode: "ai" };
        }
      };
      if (specifier === "@/lib/usage/reserve-usage") return {
        reserveUsage: async () => { calls.reserve += 1; return { requestId: "request-1" }; },
        resolveUsagePlanId: () => null,
        settleUsage: async () => {},
        releaseUsage: async () => { calls.release += 1; }
      };
      return {};
    },
    console: { error: () => {} },
    AbortController,
    Date
  }, { filename });
  return { api: module.exports, fallback, calls };
}

test("preparation falls back locally without a provider key", async () => {
  const { api, fallback, calls } = loadRecoverabilityAnalysis({ configured: false });
  const result = await api.runRecoverabilityAnalysis({ signal: {}, business: {}, profileId: "profile-1", duplicateRisk: false });
  assert.equal(result, fallback);
  assert.equal(calls.client, 0);
  assert.equal(calls.reserve, 0);
});

test("invalid provider output releases usage and falls back safely", async () => {
  const { api, fallback, calls } = loadRecoverabilityAnalysis({ configured: true, invalidProviderOutput: true });
  const result = await api.runRecoverabilityAnalysis({ signal: {}, business: {}, profileId: "profile-1", duplicateRisk: false });
  assert.equal(result, fallback);
  assert.equal(calls.reserve, 1);
  assert.equal(calls.release, 1);
});

test("AI preparation requires an explicit click and never runs on render", () => {
  const client = read("src/components/inbox/CommercialInboxClient.tsx");
  const callIndex = client.indexOf("analyzeCommercialSignal(selectedSignal.id)");
  const clickIndex = client.lastIndexOf("onClick", callIndex);
  assert.ok(callIndex > 0 && clickIndex > 0 && callIndex - clickIndex < 240);
  assert.match(client, /Pregătește cu AI/);
  assert.doesNotMatch(client.slice(0, client.indexOf("return (")), /useEffect\([\s\S]*analyzeCommercialSignal/);
});

test("preparation persists only a pending proposal and leaves conversion behind approval", () => {
  const inbox = read("src/lib/commercial-inbox.ts");
  const analysisStart = inbox.indexOf("export async function analyzeCommercialSignal");
  const analysisEnd = inbox.indexOf("export async function setCommercialSignalReviewDecision", analysisStart);
  const analysis = inbox.slice(analysisStart, analysisEnd);
  assert.match(analysis, /review_status: "ready_for_review"/);
  assert.match(analysis, /analysis_completed/);
  assert.doesNotMatch(analysis, /approve_recoverable_signal|approve_detected_recoverable_signal|opportunity_actions.*insert|opportunities.*insert/);
});

test("preparation context is server-authorized, tenant-scoped and minimal", () => {
  const inbox = read("src/lib/commercial-inbox.ts");
  const actions = read("src/lib/commercial-inbox-actions.ts");
  const provider = read("src/lib/recoverability-analysis-core.ts");
  assert.match(actions, /requirePermission\("opportunities\.analyze"\)/);
  assert.match(inbox, /getCurrentInboxContext/);
  assert.match(inbox, /\.eq\("business_id", business\.id\)/);
  assert.match(provider, /Context minim firmă/);
  assert.match(provider, /slice\(0, 5000\)/);
  assert.doesNotMatch(provider, /service[_-]?role|workspace.*select/i);
});

test("client UI contains no provider key, service role or external execution integration", () => {
  const client = read("src/components/inbox/CommercialInboxClient.tsx");
  const approval = read("src/components/approvals/ApprovalCenterClient.tsx");
  const panel = read("src/components/signals/SignalPreparationPanel.tsx");
  const feedbackPanel = read("src/components/signals/RecommendationFeedbackPanel.tsx");
  const feedbackModel = read("src/lib/recommendation-feedback.ts");
  const source = client + approval + panel + feedbackPanel + feedbackModel;
  assert.doesNotMatch(source, /OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|createSupabaseAdminClient|service_role/i);
  assert.doesNotMatch(source, /fetch\s*\(|gmail|twilio|webhook|sendEmail|sendMessage|phoneAgent/i);
  assert.match(panel, /Nimic nu este trimis extern/);
  assert.doesNotMatch(panel, /garantat|agent autonom|am verificat compania online/i);
});

test("Approval Center reuses the structured preparation panel", () => {
  const approval = read("src/components/approvals/ApprovalCenterClient.tsx");
  const panel = read("src/components/signals/SignalPreparationPanel.tsx");
  assert.match(approval, /SignalPreparationPanel signal=\{selectedSignal\}/);
  for (const label of ["Ce a detectat ReveNew", "Dovezi din semnal", "Riscuri / neclarități", "Draft propus"]) {
    assert.ok(panel.includes(label), `${label} missing from preparation panel`);
  }
});
