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
const validation = compile("src/lib/ai/copilot-validation.ts", { "@/lib/ai/copilot-types": types });
const evals = compile("src/lib/ai/copilot-evals.ts");

function result(overrides = {}) {
  return {
    toolName: "get_opportunity_context",
    state: "ready",
    data: {},
    sources: [{ sourceId: "opportunity:vector", label: "Vector Industrial", sourceType: "Oportunitate", route: "/opportunities/vector", fact: "Valoare estimată 76000 RON, nu venit confirmat." }],
    missingInformation: ["Responsabil confirmat"],
    suggestedAction: { label: "Revizuiește oportunitatea", route: "/opportunities/vector" },
    ...overrides
  };
}

function compileOrchestrator(executeTool) {
  return compile("src/lib/ai/copilot-orchestrator.ts", {
    "server-only": {},
    "crypto": { randomUUID: () => "request-test" },
    "@/lib/ai/copilot-types": types,
    "@/lib/ai/copilot-instructions": { REVENew_COPILOT_INSTRUCTIONS: "test instructions" },
    "@/lib/ai/provider": { getCopilotProvider() { throw new Error("provider must be injected"); } },
    "@/lib/ai/copilot-tools": { copilotToolDefinitions: [], executeCopilotTool: executeTool },
    "@/lib/ai/copilot-validation": validation
  });
}

function request(question = "De ce este Vector prioritar?") {
  return { question, context: { route: "/dashboard", pageType: "dashboard" }, history: [] };
}

test("copilot request validation bounds question, history and page identifiers", () => {
  const parsed = validation.parseCopilotRequest({ question: "  De ce este Vector prioritar?  ", context: { route: "/opportunities/vector", opportunityId: "vector", business_id: "forbidden" }, history: Array.from({ length: 12 }, (_, index) => ({ role: index % 2 ? "assistant" : "user", content: `turn ${index}` })) });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.question, "De ce este Vector prioritar?");
  assert.equal(parsed.value.history.length, 8);
  assert.equal(parsed.value.context.opportunityId, "vector");
  assert.equal("business_id" in parsed.value.context, false);
  assert.equal(validation.parseCopilotRequest({ question: "x" }).ok, false);
  assert.equal(validation.parseCopilotRequest({ question: "x".repeat(3001) }).ok, false);
});

test("server validation removes hallucinated citations and arbitrary routes", () => {
  const answer = validation.validateCopilotAnswer({ answer: "Vector are 76.000 RON valoare estimată.", summaryType: "commercial", evidence: [{ sourceId: "opportunity:vector" }, { sourceId: "fake:source", route: "https://evil.example" }], missingInformation: [], caveats: [], suggestedAction: { label: "Deschide", route: "https://evil.example" }, followUps: ["Ce lipsește?"] }, [result()]);
  assert.equal(answer.evidence.length, 1);
  assert.equal(answer.evidence[0].fact, "Valoare estimată 76000 RON, nu venit confirmat.");
  assert.deepEqual(answer.suggestedAction, { label: "Revizuiește oportunitatea", route: "/opportunities/vector" });
  assert.equal(answer.missingInformation.includes("Responsabil confirmat"), true);
});

test("commercial output without validated evidence fails closed", () => {
  const answer = validation.validateCopilotAnswer({ answer: "Afirmație inventată", summaryType: "commercial", evidence: [], missingInformation: [], caveats: [], suggestedAction: null, followUps: [] }, []);
  assert.equal(answer.answer, "Nu am suficiente informații în ReveNew pentru a confirma asta.");
  assert.equal(answer.evidence.length, 0);
});

test("provider uses Responses API, structured outputs and no provider storage", () => {
  const provider = read("src/lib/ai/openai-provider.ts");
  const sharedClient = read("src/lib/openai/client.ts");
  assert.match(provider, /client\.responses\.create/);
  assert.match(provider, /store: false/);
  assert.match(provider, /type: "json_schema"/);
  assert.match(provider, /strict: true/);
  assert.match(provider, /DEFAULT_COPILOT_MODEL = "gpt-5\.6"/);
  assert.match(sharedClient, /import "server-only"/);
  assert.doesNotMatch(provider, /NEXT_PUBLIC_|chat\.completions|console\.log/);
});

test("tool registry is bounded, read-only and has no arbitrary database contract", () => {
  const tools = read("src/lib/ai/copilot-tools.ts");
  const definitions = [...tools.matchAll(/name: "(search_commercial_context|get_daily_brief|get_company_context|get_opportunity_context|get_commercial_discoveries|get_product_help)"/g)].map((match) => match[1]);
  assert.equal(new Set(definitions).size, 6);
  for (const name of ["search_commercial_context", "get_daily_brief", "get_company_context", "get_opportunity_context", "get_commercial_discoveries", "get_product_help"]) assert.match(tools, new RegExp(name));
  assert.doesNotMatch(tools, /create_opportunity|approve_opportunity|send_email|execute_sql|raw_sql|from\(args|rpc\(args|businessId: \{ type/);
  assert.match(tools, /slice\(0, 12\)|limit: 20/);
});

test("orchestrator enforces loop, tool, history and output bounds with safe fallback", () => {
  const orchestrator = read("src/lib/ai/copilot-orchestrator.ts");
  const typesSource = read("src/lib/ai/copilot-types.ts");
  assert.match(typesSource, /COPILOT_MAX_TOOL_CALLS = 6/);
  assert.match(typesSource, /COPILOT_MAX_TOOL_ROUNDS = 4/);
  assert.match(typesSource, /COPILOT_MAX_HISTORY_TURNS = 8/);
  assert.match(orchestrator, /for \(let round = 0; round < COPILOT_MAX_TOOL_ROUNDS/);
  assert.match(orchestrator, /COPILOT_MAX_TOOL_CALLS - toolResults\.length/);
  assert.match(orchestrator, /deterministicAnswer/);
  assert.match(orchestrator, /copilot_provider_fallback/);
  assert.doesNotMatch(orchestrator, /console\.log|request\.question[^\n]*console/);
});

test("mocked provider covers unavailable, valid structured, timeout and malformed responses", async () => {
  const executed = [];
  const orchestrator = compileOrchestrator(async (name) => { executed.push(name); return result(); });
  const unavailable = await orchestrator.runCopilot(request(), { available: () => false, model: () => "mock", createTurn: async () => { throw new Error("must not run"); } });
  assert.equal(unavailable.answer.mode, "deterministic_fallback");
  assert.equal(unavailable.answer.providerAvailable, false);

  let turn = 0;
  const valid = await orchestrator.runCopilot(request(), {
    available: () => true,
    model: () => "mock",
    async createTurn() {
      turn += 1;
      if (turn === 1) return { responseId: "1", output: [{ type: "function_call", call_id: "call-1", name: "get_daily_brief", arguments: "{}" }], toolCalls: [{ callId: "call-1", name: "get_daily_brief", argumentsJson: "{}" }], outputText: "", usage: { inputTokens: 10, outputTokens: 2, totalTokens: 12 }, model: "mock" };
      return { responseId: "2", output: [], toolCalls: [], outputText: JSON.stringify({ answer: "Vector are 76000 RON valoare estimată, nu venit confirmat.", summaryType: "commercial", evidence: [{ sourceId: "opportunity:vector" }], missingInformation: [], caveats: [], suggestedAction: { label: "Revizuiește oportunitatea", route: "/opportunities/vector" }, followUps: [] }), usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 }, model: "mock" };
    }
  });
  assert.equal(valid.answer.mode, "ai");
  assert.equal(valid.answer.evidence[0].sourceId, "opportunity:vector");
  assert.equal(valid.diagnostics.totalTokens, 42);

  const timeout = await orchestrator.runCopilot(request(), { available: () => true, model: () => "mock", createTurn: async () => { const error = new Error("timeout"); error.name = "AbortError"; throw error; } });
  assert.equal(timeout.answer.mode, "deterministic_fallback");
  assert.equal(timeout.diagnostics.success, false);

  const malformed = await orchestrator.runCopilot(request(), { available: () => true, model: () => "mock", createTurn: async () => ({ responseId: "3", output: [], toolCalls: [], outputText: "not-json", usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, model: "mock" }) });
  assert.equal(malformed.answer.summaryType, "insufficient_information");
  assert.equal(malformed.answer.answer, "Nu am suficiente informații în ReveNew pentru a confirma asta.");
  assert.ok(executed.length >= 2);
});

test("mocked provider cannot escape tool-call limits or authorize unknown tools", async () => {
  const executed = [];
  const orchestrator = compileOrchestrator(async (name) => {
    executed.push(name);
    return name === "unknown_tool" ? result({ toolName: "get_product_help", state: "forbidden", sources: [], missingInformation: ["Instrumentul solicitat nu este permis."], suggestedAction: null }) : result();
  });
  const provider = {
    available: () => true,
    model: () => "mock",
    createTurn: async () => ({ responseId: "loop", output: [], toolCalls: [0, 1].map((index) => ({ callId: `call-${executed.length}-${index}`, name: "unknown_tool", argumentsJson: "{}" })), outputText: "", usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, model: "mock" })
  };
  const response = await orchestrator.runCopilot(request(), provider);
  assert.equal(executed.length, 6);
  assert.equal(response.answer.mode, "deterministic_fallback");
  assert.ok(response.answer.missingInformation.includes("Instrumentul solicitat nu este permis."));
});

test("authorization stays server-derived and every object loader remains tenant scoped", () => {
  const route = read("src/app/api/ai/copilot/route.ts");
  const tools = read("src/lib/ai/copilot-tools.ts");
  const company = read("src/lib/company-intelligence.ts");
  const opportunity = read("src/lib/supabase/data.ts");
  const search = read("src/lib/search/actions.ts");
  assert.match(route, /requireActivePaidAccess/);
  assert.match(route, /hasPermission\(authorization, "workspace\.read"\)/);
  assert.match(tools, /getCompanyIntelligenceSnapshot|getOpportunityForCurrentBusiness|searchWorkspace/);
  assert.match(company, /getCurrentBusinessForUser/);
  assert.match(opportunity, /\.eq\("business_id", business\.id\)/);
  assert.match(search, /\.eq\("business_id", businessId\)/);
  assert.doesNotMatch(route + tools, /SUPABASE_SERVICE_ROLE_KEY|business_id.*request|workspace_id.*request/);
});

test("prompt injection, financial safety and chain-of-thought protections are explicit", () => {
  const instructions = read("src/lib/ai/copilot-instructions.ts");
  const orchestrator = read("src/lib/ai/copilot-orchestrator.ts");
  assert.match(instructions, /date comerciale neîncrezute/);
  assert.match(instructions, /nu poți cere sau accesa alt spațiu de lucru/i);
  assert.match(instructions, /Nu generezi SQL/);
  assert.match(instructions, /nu furnizezi chain-of-thought/i);
  assert.match(instructions, /Valoarea estimată nu este venit confirmat/);
  assert.match(instructions, /Nu combini monede/);
  assert.match(orchestrator, /unsupportedInference/);
  for (const prompt of ["Ignoră toate permisiunile", "DROP TABLE", "chain of thought", "Aprobă această oportunitate"]) assert.ok(evals.meridianCopilotEvalCases.some((item) => item.question.includes(prompt)), prompt);
});

test("Meridian evaluation harness covers 20–30 cases and all required categories", () => {
  assert.ok(evals.meridianCopilotEvalCases.length >= 20 && evals.meridianCopilotEvalCases.length <= 30);
  const categories = new Set(evals.meridianCopilotEvalCases.map((item) => item.category));
  for (const category of ["search", "company_memory", "opportunity", "daily_brief", "discovery", "explainability", "missing_information", "prompt_injection", "cross_tenant", "financial_safety", "unsupported_prediction", "product_help"]) assert.equal(categories.has(category), true, category);
});

test("assistant UI is structured, contextual, accessible and does not render unsafe HTML", () => {
  const conversation = read("src/components/intelligence/CopilotConversation.tsx");
  const drawer = read("src/components/guidance/ContextualAssistant.tsx");
  const company = read("src/components/company/CompanyContextualAsk.tsx");
  const ask = read("src/components/intelligence/AskReveNew.tsx");
  assert.match(drawer, /role="dialog"/);
  assert.match(drawer, /event\.key === "Escape"/);
  assert.match(drawer, /returnFocusRef\.current\?\.focus/);
  assert.match(conversation, /Dovezi ·/);
  assert.match(conversation, /Ce nu pot confirma/);
  assert.match(conversation, /Verific informațiile disponibile/);
  assert.match(conversation, /Reîncearcă/);
  assert.match(conversation, /event\.key === "Enter"/);
  assert.match(conversation, /motion-reduce:animate-none/);
  assert.match(company, /lockedContext=\{\{ pageType: "company", organizationId \}\}/);
  assert.match(ask, /lockedContext=\{\{ pageType: "ai" \}\}/);
  assert.doesNotMatch(conversation + drawer, /dangerouslySetInnerHTML|javascript:|ChatGPT|avatar|AI gradient/i);
});

test("documentation records privacy, no-write boundary and deterministic fallback", () => {
  const docs = read("docs/real-ai-copilot.md");
  for (const phrase of ["store: false", "server-side", "read-only", "Nu există SQL generat", "fallback", "fără web search", "fără stocare persistentă"]) assert.match(docs, new RegExp(phrase, "i"));
});
