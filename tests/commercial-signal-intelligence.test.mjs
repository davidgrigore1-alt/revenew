import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const intelligencePath = new URL("../src/lib/commercial-signal-intelligence.ts", import.meta.url);

async function loadIntelligence() {
  const source = await readFile(intelligencePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(module,exports){${output}\n})(module,module.exports)`, { module, exports: module.exports });
  return { api: module.exports, source };
}

function signal(overrides = {}) {
  return {
    id: "signal-1", businessId: "business-1", source: "manual", status: "new", reviewStatus: "new",
    priority: "medium", title: "Semnal comercial", analysisStatus: "not_started", missingInformation: [],
    uncertaintyNotes: [], duplicateRisk: false, currency: "RON", urgencyScore: 0, fitScore: 0,
    confidenceScore: 0, assignedToProfileId: "profile-1", createdAt: "2026-07-19T08:00:00.000Z",
    ...overrides
  };
}

test("classifier identifies multiple commercial intents with explicit confidence", async () => {
  const { api } = await loadIntelligence();
  const cases = [
    ["quote_request", { source: "email", rawMessage: "Solicitare de ofertă și pricing pentru 20.000 EUR" }],
    ["follow_up", { rawMessage: "Follow-up: oferta transmisă nu are răspuns" }],
    ["renewal", { source: "phone", rawMessage: "Notă după apel despre reînnoirea contractului" }],
    ["complaint_risk", { rawMessage: "Client nemulțumit; incident urgent și aprobare blocată" }],
    ["referral", { source: "referral", rawMessage: "Recomandare introdusă de partener" }],
    ["client_decision", { rawMessage: "Clientul a aprobat oferta" }],
    ["lost_reason", { rawMessage: "Oportunitate pierdută: clientul a ales alt furnizor" }],
    ["internal_note", { rawMessage: "Notă internă de verificat cu echipa" }]
  ];
  for (const [expected, overrides] of cases) {
    const result = api.classifyCommercialSignalIntent(signal(overrides));
    assert.equal(result.signalType, expected);
    assert.ok(["medium", "high"].includes(result.confidence));
    assert.ok(result.detectionReasons.length > 0);
  }
});

test("deadline clues distinguish exact dates from relative windows", async () => {
  const { api } = await loadIntelligence();
  const now = new Date("2026-07-19T10:00:00.000Z");
  const tomorrow = api.detectCommercialDeadlineClue(signal({ rawMessage: "Avem nevoie de răspuns mâine." }), now);
  assert.equal(tomorrow.exactDate, "2026-07-20");
  assert.equal(tomorrow.urgency, "high");
  const friday = api.detectCommercialDeadlineClue(signal({ rawMessage: "Răspuns până vineri." }), now);
  assert.equal(friday.exactDate, null);
  assert.match(friday.evidence, /trebuie confirmat/);
});

test("value clues never invent currency or turn qualitative text into an amount", async () => {
  const { api } = await loadIntelligence();
  const explicit = api.detectCommercialValueClue(signal({ rawMessage: "Buget de 20.000 EUR." }));
  assert.equal(explicit.amount, 20000);
  assert.equal(explicit.currency, "EUR");
  const unclear = api.detectCommercialValueClue(signal({ rawMessage: "Buget 20k pentru proiect." }));
  assert.equal(unclear.amount, 20000);
  assert.equal(unclear.currency, null);
  const qualitative = api.detectCommercialValueClue(signal({ rawMessage: "Contract mare, ofertă revizuită." }));
  assert.equal(qualitative.amount, null);
  assert.equal(qualitative.kind, "qualitative");
});

test("gaps, tenant-local context and recommended action remain review-only", async () => {
  const { api } = await loadIntelligence();
  const result = api.analyzeCommercialSignalIntelligence(signal({
    rawMessage: "Follow-up urgent fără răspuns.",
    assignedToProfileId: null,
    matchedOrganizationId: "org-1"
  }), { duplicateRisk: true, activeOpportunityTitle: "Extindere contract" }, new Date("2026-07-19T10:00:00.000Z"));
  assert.ok(result.missingInformation.includes("Persoană de contact confirmată"));
  assert.ok(result.missingInformation.includes("Responsabil comercial"));
  assert.ok(result.contextHints.some((item) => item.includes("Oportunitate activă")));
  assert.match(result.recommendedNextAction, /Leagă semnalul de oportunitatea existentă/);
  assert.doesNotMatch(result.recommendedNextAction, /trimite automat|creează automat/i);
});

test("deterministic intelligence has no provider, network or autonomous execution path", async () => {
  const { source } = await loadIntelligence();
  assert.doesNotMatch(source, /openai|anthropic|gemini|fetch\(|createClient|service[_-]?role/i);
  assert.doesNotMatch(source, /sendEmail|sendMessage|webhook|twilio|gmail/i);
});
