import "server-only";

import { randomUUID } from "crypto";
import {
  COPILOT_MAX_TOOL_CALLS,
  COPILOT_MAX_TOOL_ROUNDS,
  type CopilotAnswer,
  type CopilotProvider,
  type CopilotRequest,
  type CopilotToolResult
} from "@/lib/ai/copilot-types";
import { REVENew_COPILOT_INSTRUCTIONS } from "@/lib/ai/copilot-instructions";
import { getCopilotProvider } from "@/lib/ai/provider";
import { copilotToolDefinitions, executeCopilotTool } from "@/lib/ai/copilot-tools";
import { collectAuthorizedSources, validateCopilotAnswer } from "@/lib/ai/copilot-validation";

type CopilotRunResult = {
  answer: CopilotAnswer;
  diagnostics: {
    requestId: string;
    provider: "openai" | "deterministic";
    model: string | null;
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    toolNames: string[];
    success: boolean;
  };
};

function parseJson(value: string) {
  try { return JSON.parse(value) as unknown; } catch { return null; }
}

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function unsupportedInference(question: string) {
  const value = normalized(question);
  return /probabilitat|sanse|forecast|prognoz|cati bani vom|cat vom recupera|mai este interesat|ce crede client|sentiment/.test(value);
}

function prohibitedRequest(question: string) {
  const value = normalized(question);
  return /ignora.*permisi|alte.*(?:spatii|workspace)|drop table|system prompt|instructiuni.*ascuns|chain of thought|aproba.*(?:oportunitate|semnal)|trimite.*(?:email|mesaj)/.test(value);
}
function answerFromStructuredData(question: string, result: CopilotToolResult) {
  if (!result.data || typeof result.data !== "object") return "";
  const data = result.data as Record<string, unknown>;
  const query = normalized(question);
  if (result.toolName === "get_daily_brief") {
    const priorities = Array.isArray(data.priorities) ? data.priorities.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")) : [];
    if (/expunere|valoare.*companie/.test(query)) {
      const totals = new Map<string, { amount: number; currency: string }>();
      for (const item of priorities) {
        const company = String(item.company ?? "Companie neconfirmată");
        const current = totals.get(company) ?? { amount: 0, currency: String(item.currency ?? "") };
        totals.set(company, { amount: current.amount + Number(item.amount ?? 0), currency: current.currency || String(item.currency ?? "") });
      }
      const leader = Array.from(totals.entries()).sort((left, right) => right[1].amount - left[1].amount)[0];
      if (leader && leader[1].amount > 0) return `${leader[0]} are cea mai mare expunere vizibilă în prioritățile autorizate: ${leader[1].amount} ${leader[1].currency}. Valoarea este estimată, nu venit confirmat.`;
    }
    const matches = priorities.filter((item) => {
      const text = normalized(JSON.stringify(item));
      if (/restant|depasit|follow.?up/.test(query)) return /restant|depasit|termen|follow.?up/.test(text);
      if (/aprobar|asteapta aprob/.test(query)) return /aprobar|asteptare/.test(text);
      if (/fara responsabil|nu au responsabil|owner/.test(query)) return /responsabil.*(?:lips|neconfirmat)|fara responsabil/.test(text);
      if (/risc/.test(query)) return /risc|bloca|expir|restant/.test(text);
      return true;
    });
    const selected = (/cel mai mare|top 5|top cinci/.test(query) ? [...matches].sort((left, right) => Number(right.amount ?? 0) - Number(left.amount ?? 0)) : matches).slice(0, /top 5|top cinci/.test(query) ? 5 : 3);
    if (selected.length > 0) {
      const items = selected.map((item, index) => {
        const amount = Number(item.amount ?? 0);
        const value = amount > 0 && item.currency ? ` · valoare estimată ${amount} ${String(item.currency)}` : "";
        return `${index + 1}. ${String(item.title ?? "Prioritate comercială")} — ${String(item.reason ?? item.whyItMatters ?? "necesită verificare")}${value}`;
      });
      return `Am găsit ${matches.length} ${matches.length === 1 ? "situație relevantă" : "situații relevante"} în datele autorizate. ${items.join(" ")} Valorile sunt estimări, nu venit confirmat.`;
    }
    return [typeof data.headline === "string" ? data.headline : "", typeof data.summary === "string" ? data.summary : "", "Nu am găsit un caz care să corespundă exact filtrului cerut în prioritățile autorizate."].filter(Boolean).join(" ");
  }
  if (result.toolName === "get_opportunity_context") {
    const opportunity = data.opportunity && typeof data.opportunity === "object" ? data.opportunity as Record<string, unknown> : null;
    if (opportunity && /draft|mesaj|follow.?up/.test(query)) {
      return `Draft pentru revizuire umană: „Bună ziua, revin privind ${String(opportunity.title ?? "discuția comercială")}. Pentru a confirma următorul pas, vă rog să ne spuneți dacă există informații sau o decizie de clarificat. Mulțumesc.” ReveNew nu trimite acest mesaj.`;
    }
    if (opportunity) return `${String(opportunity.title ?? "Oportunitatea")} este în starea ${String(opportunity.status ?? "neconfirmată")}. Responsabil: ${String(opportunity.ownerName ?? "neconfirmat")}. Următoarea intervenție sigură: ${String(opportunity.recommendedAction ?? "de stabilit")}. Valoarea afișată este estimată, nu venit confirmat.`;
  }
  return "";
}

function fallbackToolFor(request: CopilotRequest) {
  const query = normalized(request.question);
  if (/cum |unde |ce este revenew|explica pagina|folosesc|ghid/.test(query)) return { name: "get_product_help", args: { question: request.question } };
  if (request.context.pageType === "company" && request.context.organizationId) return { name: "get_company_context", args: { organizationId: request.context.organizationId } };
  if (request.context.pageType === "opportunity" && request.context.opportunityId) return { name: "get_opportunity_context", args: { opportunityId: request.context.opportunityId } };
  if (/prioritar|probleme|decizie|astazi|schimbat|prima data|brief|restant|depasit|follow.?up|responsabil|owner|aprobar|risc|top 5|top cinci|expunere|valoare.*companie/.test(query)) return { name: "get_daily_brief", args: {} };
  if (/semnal|descoper/.test(query)) return { name: "get_commercial_discoveries", args: {} };
  return { name: "search_commercial_context", args: { query: request.question } };
}

function deterministicAnswer(request: CopilotRequest, result: CopilotToolResult, providerAvailable: boolean, providerFailure = false): CopilotAnswer {
  if (prohibitedRequest(request.question)) {
    return {
      answer: "Nu pot modifica permisiunile, accesa alte spații de lucru, dezvălui instrucțiuni interne sau executa acțiuni. Pot analiza numai informațiile autorizate furnizate de ReveNew, iar orice decizie și acțiune rămân la utilizator.",
      summaryType: "insufficient_information",
      evidence: [],
      missingInformation: [],
      caveats: ["Asistentul v1 este strict read-only."],
      suggestedAction: null,
      followUps: ["Ce probleme sunt vizibile în spațiul curent?", "Ce necesită decizie umană?"],
      mode: "deterministic_fallback",
      providerAvailable
    };
  }
  if (unsupportedInference(request.question)) {
    return {
      answer: "Nu am suficiente informații în ReveNew pentru a confirma asta. Datele disponibile pot descrie situația și valoarea estimată, dar nu susțin o probabilitate, o prognoză sau intenția clientului.",
      summaryType: "insufficient_information",
      evidence: result.sources.slice(0, 4),
      missingInformation: ["Un indicator validat explicit pentru această estimare"],
      caveats: ["Valoarea estimată nu reprezintă venit confirmat."],
      suggestedAction: result.suggestedAction,
      followUps: ["Ce fapte sunt înregistrate?", "Ce informații lipsesc?"],
      mode: "deterministic_fallback",
      providerAvailable
    };
  }
  const ignoredTokens = new Set(["acest", "aceast", "despre", "care", "este", "sunt", "pentru", "prioritar", "prioritara", "important", "probleme", "informat", "urmatorul", "sigur", "ramas", "nerezolvat", "nerezolvate"]);
  const queryTokens = normalized(request.question).split(/[^a-z0-9]+/).filter((token) => token.length >= 5 && !ignoredTokens.has(token));
  const scoredSources = result.sources.map((item) => ({ item, score: queryTokens.reduce((score, token) => score + (normalized(`${item.label} ${item.fact}`).includes(token) ? 1 : 0), 0) }));
  const bestScore = Math.max(0, ...scoredSources.map((entry) => entry.score));
  const matchedFacts = new Set(scoredSources.filter((entry) => entry.score === bestScore && bestScore > 0).map((entry) => entry.item.fact));
  const sources = (bestScore > 0 ? scoredSources.filter((entry) => entry.score === bestScore || matchedFacts.has(entry.item.fact)) : scoredSources).map((entry) => entry.item).slice(0, 5);
  const facts = Array.from(new Set(sources.slice(0, 3).map((item) => item.fact.replace(/\s+/g, " ").trim()).filter(Boolean)));
  const productAnswer = result.toolName === "get_product_help" && result.state === "ready" && result.data && typeof result.data === "object"
    ? String((result.data as Record<string, unknown>).answer ?? "") : "";
  const answer = productAnswer || answerFromStructuredData(request.question, result) || facts.join(" ") || "Nu am suficiente informații în ReveNew pentru a confirma asta.";
  return {
    answer,
    summaryType: productAnswer ? "product_help" : sources.length ? "commercial" : providerFailure ? "temporary_error" : "insufficient_information",
    evidence: sources,
    missingInformation: result.missingInformation,
    caveats: providerFailure ? ["Răspunsul generativ nu este disponibil momentan; sunt afișate numai informații verificate determinist."] : providerAvailable ? [] : ["Conversația AI nu este configurată în acest mediu; căutarea și ghidarea ReveNew rămân disponibile."],
    suggestedAction: result.suggestedAction,
    followUps: result.toolName === "get_product_help" ? ["Explică această pagină."] : ["Ce informații lipsesc?", "Care este următorul pas sigur?"],
    mode: "deterministic_fallback",
    providerAvailable
  };
}

function moneyClaimsAreSupported(answer: CopilotAnswer, results: CopilotToolResult[]) {
  const sources = Array.from(collectAuthorizedSources(results).values());
  const supportedText = sources.map((item) => item.fact).join(" ");
  const claims = answer.answer.match(/\b\d[\d .,'’]*\s*(?:RON|EUR|USD)\b/gi) ?? [];
  return claims.every((claim) => supportedText.includes(claim.replace(/\s+/g, " ")) || supportedText.replace(/[. ,'’]/g, "").includes(claim.replace(/[. ,'’]/g, "")));
}

function safeHistory(request: CopilotRequest) {
  return request.history.map((turn) => ({ role: turn.role, content: [{ type: "input_text", text: turn.content }] }));
}

export async function runCopilot(request: CopilotRequest, provider: CopilotProvider = getCopilotProvider()): Promise<CopilotRunResult> {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const toolResults: CopilotToolResult[] = [];
  const toolNames: string[] = [];
  const providerAvailable = provider.available();
  const fallbackSelection = fallbackToolFor(request);

  if (!providerAvailable) {
    const toolResult = await executeCopilotTool(fallbackSelection.name, fallbackSelection.args, { page: request.context });
    return { answer: deterministicAnswer(request, toolResult, false), diagnostics: { requestId, provider: "deterministic", model: null, latencyMs: Date.now() - startedAt, inputTokens: 0, outputTokens: 0, totalTokens: 0, toolNames: [toolResult.toolName], success: true } };
  }

  const context = JSON.stringify({ route: request.context.route, pageType: request.context.pageType, organizationId: request.context.organizationId ?? null, opportunityId: request.context.opportunityId ?? null });
  let items: unknown[] = [
    ...safeHistory(request),
    { role: "user", content: [{ type: "input_text", text: `Context sigur al paginii: ${context}\n\nÎntrebare: ${request.question}` }] }
  ];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalTokens = 0;

  try {
    for (let round = 0; round < COPILOT_MAX_TOOL_ROUNDS; round += 1) {
      const turn = await provider.createTurn({ instructions: REVENew_COPILOT_INSTRUCTIONS, items, tools: copilotToolDefinitions, requireStructuredAnswer: true });
      totalInputTokens += turn.usage.inputTokens;
      totalOutputTokens += turn.usage.outputTokens;
      totalTokens += turn.usage.totalTokens;
      if (turn.toolCalls.length === 0) {
        const validated = validateCopilotAnswer(parseJson(turn.outputText), toolResults, true);
        const answer = moneyClaimsAreSupported(validated, toolResults) ? validated : deterministicAnswer(request, toolResults[0] ?? await executeCopilotTool(fallbackSelection.name, fallbackSelection.args, { page: request.context }), true);
        return { answer, diagnostics: { requestId, provider: "openai", model: turn.model, latencyMs: Date.now() - startedAt, inputTokens: totalInputTokens, outputTokens: totalOutputTokens, totalTokens, toolNames, success: true } };
      }
      const remaining = COPILOT_MAX_TOOL_CALLS - toolResults.length;
      if (remaining <= 0) break;
      const calls = turn.toolCalls.slice(0, remaining);
      const outputs = [];
      for (const call of calls) {
        const result = await executeCopilotTool(call.name, parseJson(call.argumentsJson), { page: request.context });
        toolResults.push(result);
        toolNames.push(call.name);
        outputs.push({ type: "function_call_output", call_id: call.callId, output: JSON.stringify(result) });
      }
      items = [...items, ...turn.output, ...outputs];
    }
    const partial = toolResults[0] ?? await executeCopilotTool(fallbackSelection.name, fallbackSelection.args, { page: request.context });
    return { answer: deterministicAnswer(request, partial, true), diagnostics: { requestId, provider: "deterministic", model: provider.model(), latencyMs: Date.now() - startedAt, inputTokens: totalInputTokens, outputTokens: totalOutputTokens, totalTokens, toolNames, success: true } };
  } catch (error) {
    console.warn("copilot_provider_fallback", { requestId, model: provider.model(), errorType: error instanceof Error ? error.name : "UnknownError", toolNames });
    const fallbackResult = toolResults[0] ?? await executeCopilotTool(fallbackSelection.name, fallbackSelection.args, { page: request.context });
    return { answer: deterministicAnswer(request, fallbackResult, true, true), diagnostics: { requestId, provider: "deterministic", model: provider.model(), latencyMs: Date.now() - startedAt, inputTokens: totalInputTokens, outputTokens: totalOutputTokens, totalTokens, toolNames, success: false } };
  }
}
