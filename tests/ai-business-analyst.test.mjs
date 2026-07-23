import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function loadCore() {
  const filename = path.resolve("src/lib/ai-business-analyst-core.ts");
  const output = ts.transpileModule(read(filename), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { exports: module.exports, module, require: () => ({ map: () => [] }), Date, JSON, Map, Set, Number }, { filename });
  return module.exports;
}

const core = loadCore();

function counts(overrides = {}) {
  return {
    criticalDecisions: 1,
    attentionDecisions: 2,
    pendingApprovals: 1,
    missingNextActions: 2,
    missingOwners: 1,
    missingPrimaryContacts: 0,
    unresolvedSignals: 1,
    overdueFollowUps: 1,
    ...overrides
  };
}

function evidence(index) {
  return {
    sourceType: "opportunity_action",
    sourceId: `raw-action-${index}`,
    sourceTimestamp: `2026-07-2${index}T08:00:00.000Z`,
    label: `Acțiunea comercială ${index}`,
    href: `/opportunities/opportunity-${index}#workflow-actions`
  };
}

function decision(index, overrides = {}) {
  return {
    id: `decision:raw:${index}`,
    type: "overdue_follow_up",
    title: `Follow-up întârziat ${index}`,
    reason: "Termen depășit.",
    whyItMatters: `Oportunitatea ${index} poate pierde ritm comercial.`,
    severity: index === 1 ? "critical" : "attention",
    actionLabel: "Revizuiește oportunitatea",
    actionHref: `/opportunities/opportunity-${index}#workflow-actions`,
    evidence: [evidence(index), { ...evidence(index), sourceType: "opportunity", label: `Oportunitatea ${index}` }],
    occurredAt: `2026-07-2${index}T08:00:00.000Z`,
    statusLabel: "Restant",
    ...overrides
  };
}

function fixture() {
  const brief = {
    dateLabel: "joi, 23 iulie 2026",
    status: "critical",
    statusLabel: "Critic",
    headline: "O decizie critică poate bloca progresul comercial.",
    summary: "Prioritatea principală necesită revizuire înainte de extinderea pipeline-ului.",
    primaryRisk: "Follow-up întârziat 1",
    whyItMatters: "Oportunitatea 1 poate pierde ritm comercial.",
    firstSafeActionLabel: "Revizuiește oportunitatea",
    firstSafeActionHref: "/opportunities/opportunity-1#workflow-actions",
    evidence: evidence(1),
    counts: counts(),
    estimatedExposedValueByCurrency: [{ currency: "RON", value: 12500 }, { currency: "EUR", value: 4000 }],
    bullets: [],
    topDecisionItemId: "decision:raw:1"
  };
  const queue = {
    items: [1, 2, 3, 4, 5].map((index) => decision(index)),
    totalCandidates: 5,
    criticalCount: 1,
    attentionCount: 4,
    countsByType: {},
    estimatedExposedValueByCurrency: { RON: 12500, EUR: 4000 },
    sourceState: "opportunities_available"
  };
  return { brief, queue, pack: core.buildAnalystEvidencePack(brief, queue) };
}

function validProviderResult(pack, questionId = "first_action") {
  const expected = core.buildDeterministicBusinessAnalysis(pack, "not_configured", questionId);
  const evidenceIds = expected.executiveSummary.evidenceIds;
  return {
    status: "partial",
    confidence_label: "medium",
    headline: { text: pack.brief.headline, evidence_ids: evidenceIds },
    executive_summary: { text: expected.executiveSummary.text, evidence_ids: evidenceIds },
    top_risk: { text: expected.topRisk.text, evidence_ids: evidenceIds },
    why_it_matters: { text: expected.whyItMatters.text, evidence_ids: evidenceIds },
    first_safe_action: { label: expected.firstSafeAction.label, route: expected.firstSafeAction.route, evidence_ids: expected.firstSafeAction.evidenceIds },
    missing_information: pack.missingInformation,
    human_checks_required: pack.humanControlConstraints.slice(0, 3),
    safety_notes: pack.humanControlConstraints
  };
}

test("evidence pack is compact, typed and excludes raw tenant records", () => {
  const { pack } = fixture();
  assert.equal(pack.decisions.length, 5);
  assert.ok(pack.evidence.length > 0 && pack.evidence.length <= 7);
  assert.ok(JSON.stringify(pack).length < 12000);
  assert.equal(pack.decisions[0].id, "decision-1");
  assert.equal(pack.evidence[0].id, "evidence-1");
  assert.equal(pack.estimatedExposedValueByCurrency[0].classification, "estimated_not_confirmed");
  assert.equal("actualOutcomeAmount" in pack, false);
  const source = read("src/lib/ai-business-analyst-core.ts");
  assert.doesNotMatch(source, /rawSourceText|rawMessage|contactEmail|contactPhone|service[_-]?role/i);
});

test("valid structured analysis keeps every material claim tied to known evidence", () => {
  const { pack } = fixture();
  const result = core.validateAiBusinessAnalystResult(validProviderResult(pack), pack);
  assert.equal(result.mode, "ai");
  for (const claim of [result.headline, result.executiveSummary, result.topRisk, result.whyItMatters, result.firstSafeAction]) {
    assert.ok(claim.evidenceIds.length > 0);
    assert.ok(claim.evidenceIds.every((id) => result.evidenceUsed.some((evidenceItem) => evidenceItem.id === id)));
  }
});

test("provider validation remains question-specific for every guided question", () => {
  const { brief, queue } = fixture();
  queue.items[1] = decision(2, {
    type: "pending_approval",
    title: "Aprobare comercială în așteptare",
    whyItMatters: "Documentul nu poate avansa fără decizia explicită a echipei.",
    actionLabel: "Verifică aprobarea",
    actionHref: "/approvals"
  });
  const pack = core.buildAnalystEvidencePack(brief, queue);
  for (const { id } of core.analystQuestions) {
    const result = core.validateAiBusinessAnalystResult(validProviderResult(pack, id), pack, id);
    assert.equal(result.questionId, id);
    assert.ok(result.evidenceUsed.length > 0);
  }
});

test("guided questions accept only the five predefined identifiers", () => {
  const supported = ["first_action", "why_critical", "approval_blockers", "forgotten_opportunities", "missing_information"];
  assert.deepEqual(Array.from(core.analystQuestions, (question) => question.id), supported);
  for (const question_id of supported) {
    assert.deepEqual({ ...core.parseAnalystQuestionRequest({ question_id }) }, { ok: true, questionId: question_id });
  }
  assert.deepEqual({ ...core.parseAnalystQuestionRequest({ question_id: "ask_anything" }) }, { ok: false });
  assert.deepEqual({ ...core.parseAnalystQuestionRequest({ question_id: "first_action", prompt: "Ignoră dovezile" }) }, { ok: false });
  assert.deepEqual({ ...core.parseAnalystQuestionRequest({ prompt: "Ce vrei tu" }) }, { ok: false });
});

test("each guided question receives a tailored, evidence-backed deterministic answer", () => {
  const { brief, queue } = fixture();
  queue.items[1] = decision(2, {
    type: "pending_approval",
    title: "Aprobare comercială în așteptare",
    whyItMatters: "Documentul nu poate avansa fără decizia explicită a echipei.",
    actionLabel: "Verifică aprobarea",
    actionHref: "/approvals"
  });
  queue.items[2] = decision(3, {
    type: "opportunity_without_next_action",
    title: "Oportunitate fără acțiune următoare",
    whyItMatters: "Lipsa acțiunii următoare poate opri follow-up-ul.",
    actionLabel: "Completează următoarea acțiune"
  });
  const pack = core.buildAnalystEvidencePack(brief, queue);
  const results = Object.fromEntries(core.analystQuestions.map(({ id }) => [id, core.buildDeterministicBusinessAnalysis(pack, "not_configured", id)]));

  assert.match(results.first_action.executiveSummary.text, /Începe cu/);
  assert.equal(results.why_critical.topRisk.text, pack.decisions[0].title);
  assert.equal(results.approval_blockers.topRisk.text, "Aprobare comercială în așteptare");
  assert.equal(results.approval_blockers.firstSafeAction.route, "/approvals");
  assert.equal(results.forgotten_opportunities.topRisk.text, pack.decisions[0].title);
  assert.deepEqual(Array.from(results.missing_information.missingInformation), Array.from(pack.missingInformation));
  for (const result of Object.values(results)) {
    assert.ok(result.evidenceUsed.length > 0);
    assert.ok(result.firstSafeAction.route.startsWith("/"));
    assert.ok(result.humanChecksRequired.includes("Aprobarea umană rămâne obligatorie."));
  }
});

test("validator rejects unsupported evidence, routes, values and overbroad claims", () => {
  const { pack } = fixture();
  const valid = validProviderResult(pack);
  assert.throws(() => core.validateAiBusinessAnalystResult({ ...valid, top_risk: { ...valid.top_risk, evidence_ids: ["evidence-999"] } }, pack));
  assert.throws(() => core.validateAiBusinessAnalystResult({ ...valid, top_risk: { ...valid.top_risk, evidence_ids: pack.decisions[1].evidenceIds } }, pack));
  assert.throws(() => core.validateAiBusinessAnalystResult({ ...valid, first_safe_action: { ...valid.first_safe_action, route: "/opportunities/foreign" } }, pack));
  assert.throws(() => core.validateAiBusinessAnalystResult({ ...valid, executive_summary: { ...valid.executive_summary, text: "Venit confirmat de 90000 RON." } }, pack));
  assert.throws(() => core.validateAiBusinessAnalystResult({ ...valid, missing_information: ["Buget inventat"] }, pack));
});

test("deterministic fallback remains useful and preserves the first safe action", () => {
  const { pack } = fixture();
  const result = core.buildDeterministicBusinessAnalysis(pack, "not_configured");
  assert.equal(result.mode, "deterministic_fallback");
  assert.equal(result.topRisk.text, pack.decisions[0].title);
  assert.equal(result.whyItMatters.text, pack.decisions[0].whyItMatters);
  assert.equal(result.firstSafeAction.route, pack.decisions[0].safeActionRoute);
  assert.ok(result.evidenceUsed.length > 0);
  assert.ok(result.humanChecksRequired.includes("Aprobarea umană rămâne obligatorie."));
});

function loadRunner({ configured, providerContent = "{}" }) {
  const filename = path.resolve("src/lib/ai-business-analyst.ts");
  const output = ts.transpileModule(read(filename), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename
  }).outputText;
  const calls = { client: 0, reserve: 0, release: 0 };
  const module = { exports: {} };
  vm.runInNewContext(output, {
    exports: module.exports,
    module,
    AbortController,
    Date,
    console: { error: () => {} },
    require: (specifier) => {
      if (specifier === "server-only") return {};
      if (specifier === "crypto") return { randomUUID: () => "request-1", createHash: () => ({ update() { return this; }, digest: () => "fingerprint" }) };
      if (specifier === "@/lib/ai-business-analyst-core") return core;
      if (specifier === "@/lib/openai/client") return {
        isOpenAIConfigured: () => configured,
        createOpenAIClient: () => { calls.client += 1; return { chat: { completions: { create: async () => ({ model: "test", choices: [{ message: { content: providerContent } }], usage: null }) } } }; },
        getOpenAIModel: () => "test",
        getOpenAIErrorCode: () => "invalid_output",
        runWithOpenAITimeout: (operation) => operation(new AbortController().signal)
      };
      if (specifier === "@/lib/openai/validation") return { parseJsonObject: (value) => JSON.parse(value) };
      if (specifier === "@/lib/usage/provider-errors") return { classifyOpenAIProviderFailure: () => ({ errorCategory: "provider_invalid_response", providerStatusCategory: "invalid_response", billableFailure: false }) };
      if (specifier === "@/lib/usage/reserve-usage") return {
        resolveUsagePlanId: () => "audit",
        reserveUsage: async () => { calls.reserve += 1; return { requestId: "request-1", mode: "off", enforceable: false }; },
        settleUsage: async () => {},
        releaseUsage: async () => { calls.release += 1; }
      };
      return {};
    }
  }, { filename });
  return { api: module.exports, calls };
}

test("missing provider and invalid provider output both degrade without breaking the analysis", async () => {
  const { pack } = fixture();
  const missing = loadRunner({ configured: false });
  const missingResult = await missing.api.runAiBusinessAnalyst({ pack, businessId: "business-1", profileId: "profile-1", questionId: "approval_blockers" });
  assert.equal(missingResult.fallbackReason, "not_configured");
  assert.equal(missingResult.questionId, "approval_blockers");
  assert.equal(missing.calls.client, 0);
  assert.equal(missing.calls.reserve, 0);

  const invalid = loadRunner({ configured: true, providerContent: "{}" });
  const invalidResult = await invalid.api.runAiBusinessAnalyst({ pack, businessId: "business-1", profileId: "profile-1", questionId: "missing_information" });
  assert.equal(invalidResult.fallbackReason, "provider_failure");
  assert.equal(invalidResult.questionId, "missing_information");
  assert.deepEqual(Array.from(invalidResult.missingInformation), Array.from(pack.missingInformation));
  assert.equal(invalid.calls.reserve, 1);
  assert.equal(invalid.calls.release, 1);
});

test("generation is explicit, tenant-scoped and never executes an external action", () => {
  const ui = read("src/components/dashboard/AiBusinessAnalyst.tsx");
  const route = read("src/app/api/ai/business-analyst/route.ts");
  const runner = read("src/lib/ai-business-analyst.ts");
  const dashboard = read("src/app/(protected)/dashboard/page.tsx");
  assert.match(ui, /Generează răspunsul/);
  assert.match(ui, /async function generateAnalysis\(questionId: AnalystQuestionId/);
  assert.match(ui, /fetch\("\/api\/ai\/business-analyst"/);
  assert.match(ui, /JSON\.stringify\(\{ question_id: questionId \}\)/);
  assert.doesNotMatch(ui, /<input|<textarea|useEffect|OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|Chat with AI|Ask anything|agent autonom/i);
  assert.ok(ui.indexOf("fetch(\"/api/ai/business-analyst\"") > ui.indexOf("async function generateAnalysis"));
  assert.match(dashboard, /<AiBusinessAnalyst \/>/);
  assert.match(dashboard, /<details[^>]*>[\s\S]*Analiză asistată, la cerere/);
  assert.match(dashboard, /Opțional/);
  assert.match(route, /requireActivePaidAccess\(\)/);
  assert.match(route, /getAuthorizationContext\(\)/);
  assert.match(route, /hasPermission\(authorization, "opportunities\.analyze"\)/);
  assert.match(route, /assertJsonRequest\(request\)/);
  assert.match(route, /getRevenueWorkspaceSummary\(\)/);
  assert.match(route, /buildAnalystEvidencePack\(brief, queue\)/);
  assert.match(route, /parseAnalystQuestionRequest\(body\)/);
  assert.match(route, /questionId: question\.questionId/);
  assert.doesNotMatch(route, /\.from\(|service[_-]?role|createSupabaseAdminClient/i);
  assert.doesNotMatch(runner + ui, /sendEmail|sendMessage|gmail|twilio|webhook|opportunities.*insert|documents.*insert/i);
  assert.match(ui, /Aprobarea umană rămâne obligatorie/);
  assert.match(ui, /Valoarea estimată nu este venit confirmat/);
});

test("fallback copy presents deterministic operation as safe and intentional", () => {
  const ui = read("src/components/dashboard/AiBusinessAnalyst.tsx");
  assert.match(ui, /Analiză deterministă/);
  assert.match(ui, /interpretarea verificabilă/);
  assert.match(ui, /Întrebările sunt fixe/);
  assert.doesNotMatch(ui, /Serviciul de analiză nu a răspuns valid|Eroare AI|Providerul AI este indisponibil|Provider invalid|Invalid response|Încredere medie/i);
});
