import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

async function importTypeScript(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  if (path.endsWith("recoverability-analysis-core.ts")) {
    const dependencySource = await readFile(new URL("../src/lib/commercial-signal-intelligence.ts", import.meta.url), "utf8");
    const compilerOptions = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 };
    const dependencyModule = { exports: {} };
    vm.runInNewContext(`(function(module,exports,require){${ts.transpileModule(dependencySource, { compilerOptions }).outputText}\n})(module,module.exports,require)`, {
      module: dependencyModule,
      exports: dependencyModule.exports,
      require: () => ({})
    });
    const module = { exports: {} };
    vm.runInNewContext(`(function(module,exports,require){${ts.transpileModule(source, { compilerOptions }).outputText}\n})(module,module.exports,require)`, {
      module,
      exports: module.exports,
      require: (specifier) => specifier === "@/lib/commercial-signal-intelligence" ? dependencyModule.exports : {}
    });
    return module.exports;
  }
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

const signal = {
  id: "signal-1",
  businessId: "business-1",
  source: "email",
  status: "new",
  priority: "high",
  title: "Ofertă fără răspuns",
  lastInteractionAt: "2026-05-01T10:00:00.000Z",
  analysisStatus: "not_started",
  reviewStatus: "new",
  missingInformation: [],
  uncertaintyNotes: [],
  duplicateRisk: false,
  contactName: "Ana Test",
  contactCompany: "AI Recovery E2E SRL",
  contactEmail: "ana@example.test",
  rawMessage: "Client anterior. Am trimis oferta și nu am primit răspuns.",
  estimatedValueMin: 10000,
  estimatedValueMax: 12500,
  currency: "RON",
  urgencyScore: 70,
  fitScore: 80,
  confidenceScore: 75,
  assignedToProfileId: null
};

test("deterministic analyst explains score, uncertainty and human review", async () => {
  const { buildDeterministicRecoverabilityAnalysis } = await importTypeScript("../src/lib/recoverability-analysis-core.ts");
  const result = buildDeterministicRecoverabilityAnalysis(signal, false, new Date("2026-07-15T12:00:00.000Z"));
  assert.equal(result.mode, "deterministic_fallback");
  assert.ok(result.recoverabilityScore > 20 && result.recoverabilityScore <= 100);
  assert.equal(result.estimatedRecoverableValue, 12500);
  assert.ok(result.scoreFactors.length >= 4);
  assert.ok(result.detectedCommercialIntent);
  assert.ok(result.relationshipContext);
  assert.ok(result.humanReviewChecklist.some((item) => item.includes("nu trimite mesaje externe")));
  assert.match(result.recommendedDraftSubject, /AI Recovery E2E SRL/);
  assert.match(result.recommendedDraftBody, /Ana Test/);
});

test("deterministic analyst never fabricates missing value or identity", async () => {
  const { buildDeterministicRecoverabilityAnalysis } = await importTypeScript("../src/lib/recoverability-analysis-core.ts");
  const result = buildDeterministicRecoverabilityAnalysis({ ...signal, contactName: null, contactCompany: null, contactEmail: null, estimatedValueMin: null, estimatedValueMax: null }, true);
  assert.equal(result.estimatedRecoverableValue, 0);
  assert.equal(result.duplicateRisk, true);
  assert.match(result.recommendedDraftSubject, /^Reluare discuție comercială$/);
  assert.ok(result.missingInformation.includes("Date de contact confirmate"));
});

test("AI validator enforces the exact rich schema and known value ceiling", async () => {
  const { buildDeterministicRecoverabilityAnalysis, validateRecoverabilityAnalysis } = await importTypeScript("../src/lib/recoverability-analysis-core.ts");
  const fallback = buildDeterministicRecoverabilityAnalysis(signal, false);
  const valid = {
    recoverability_score: 84, confidence: "high", estimated_recoverable_value: 12000, urgency: "high",
    primary_recovery_reason: "Ofertă fără răspuns", executive_explanation: "Datele indică un follow-up restant, care trebuie confirmat.",
    detected_commercial_intent: "Reluarea discuției", relationship_context: "Client anterior menționat în sursă.",
    score_factors: ["Ofertă existentă", "Interacțiune veche"], missing_information: ["Interes actual"],
    recommended_next_action: "Confirmă interesul.", suggested_due_date: "2026-07-18",
    risk_notes: ["Context neconfirmat"], uncertainty_notes: ["Interesul actual nu este cunoscut"],
    human_review_checklist: ["Confirmă identitatea", "Revizuiește draftul"],
    recommended_draft_subject: "Reluare discuție", recommended_draft_body: "Bună ziua, revenim pentru confirmarea interesului.",
    alternative_draft_angle: null
  };
  const result = validateRecoverabilityAnalysis(valid, signal, false, fallback);
  assert.equal(result.mode, "ai");
  assert.equal(result.estimatedRecoverableValue, 12000);
  assert.equal(result.suggestedOwnerProfileId, fallback.suggestedOwnerProfileId);
  assert.throws(() => validateRecoverabilityAnalysis({ ...valid, estimated_recoverable_value: 999999 }, signal, false, fallback));
  assert.throws(() => validateRecoverabilityAnalysis({ ...valid, unexpected: true }, signal, false, fallback));
  assert.throws(() => validateRecoverabilityAnalysis({ ...valid, suggested_due_date: "imediat" }, signal, false, fallback));
  assert.throws(() => validateRecoverabilityAnalysis({ ...valid, urgency: "immediate" }, signal, false, fallback));
  assert.throws(() => validateRecoverabilityAnalysis({ ...valid, score_factors: [] }, signal, false, fallback));
  assert.throws(() => validateRecoverabilityAnalysis({ ...valid, recommended_draft_body: "Venit garantat dacă răspunzi azi." }, signal, false, fallback));
});

test("structured insights and editable draft round-trip through existing fields", async () => {
  const { packRecoverabilityInsights, unpackRecoverabilityInsights, formatRecoveryDraft, parseRecoveryDraft } = await importTypeScript("../src/lib/recoverability-review.ts");
  const packed = packRecoverabilityInsights({
    detectedCommercialIntent: "Follow-up", relationshipContext: "Client existent", scoreFactors: ["Vechime (+20)"],
    riskNotes: ["Duplicat posibil"], uncertaintyNotes: ["Valoare neconfirmată"],
    humanReviewChecklist: ["Confirmă contactul"], alternativeDraftAngle: "Solicită actualizare"
  });
  assert.deepEqual(unpackRecoverabilityInsights(packed).scoreFactors, ["Vechime (+20)"]);
  const draft = formatRecoveryDraft("Subiect test", "Mesaj test");
  assert.deepEqual(parseRecoveryDraft(draft), { subject: "Subiect test", body: "Mesaj test" });
});
