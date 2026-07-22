import "server-only";
import { createHash, randomUUID } from "crypto";
import {
  buildAiBusinessAnalystPrompt,
  buildDeterministicBusinessAnalysis,
  validateAiBusinessAnalystResult,
  type AiBusinessAnalystResult,
  type AnalystEvidencePack,
  type AnalystQuestionId
} from "@/lib/ai-business-analyst-core";
import { createOpenAIClient, getOpenAIErrorCode, getOpenAIModel, isOpenAIConfigured, runWithOpenAITimeout } from "@/lib/openai/client";
import { parseJsonObject } from "@/lib/openai/validation";
import { classifyOpenAIProviderFailure } from "@/lib/usage/provider-errors";
import { releaseUsage, reserveUsage, resolveUsagePlanId, settleUsage } from "@/lib/usage/reserve-usage";

type AnalystRunContext = {
  pack: AnalystEvidencePack;
  businessId: string;
  profileId: string;
  planId?: string | null;
  questionId: AnalystQuestionId;
};

function packFingerprint(pack: AnalystEvidencePack) {
  return createHash("sha256").update(JSON.stringify(pack)).digest("hex").slice(0, 24);
}

function safeProviderDiagnostic(error: unknown) {
  return {
    category: "business_analyst_provider_fallback",
    code: getOpenAIErrorCode(error) ?? "unknown",
    errorType: error instanceof Error ? error.name : "UnknownError"
  };
}

export async function runAiBusinessAnalyst(context: AnalystRunContext): Promise<AiBusinessAnalystResult> {
  const fallback = buildDeterministicBusinessAnalysis(context.pack, "not_configured", context.questionId);
  if (context.pack.evidence.length === 0 || context.pack.decisions.length === 0) {
    return { ...fallback, fallbackReason: "insufficient_data" };
  }
  if (!isOpenAIConfigured()) return fallback;
  const client = createOpenAIClient();
  if (!client) return fallback;

  let reservation;
  try {
    reservation = await reserveUsage({
      businessId: context.businessId,
      profileId: context.profileId,
      featureId: "opportunity_analysis",
      planId: resolveUsagePlanId(context.planId),
      idempotencyKey: `business-analyst:${context.questionId}:${packFingerprint(context.pack)}`,
      requestId: randomUUID(),
      operationType: "business_analyst_analysis"
    });
  } catch {
    return { ...fallback, fallbackReason: "usage_unavailable" };
  }

  const startedAt = Date.now();
  try {
    const model = getOpenAIModel();
    const completion = await runWithOpenAITimeout((signal) => client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 900,
      messages: [
        { role: "system", content: "Răspunzi numai cu JSON valid și folosești exclusiv dovezile furnizate. Nu execuți acțiuni și nu inventezi fapte." },
        { role: "user", content: buildAiBusinessAnalystPrompt(context.pack, context.questionId) }
      ]
    }, { signal }));
    const content = completion.choices[0]?.message.content;
    if (!content) throw new Error("Răspuns gol de la provider.");
    const validated = validateAiBusinessAnalystResult(parseJsonObject(content), context.pack, context.questionId);
    await settleUsage(reservation, {
      provider: "openai",
      model: completion.model || model,
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
      costStatus: completion.usage ? "provider_confirmed" : "estimated",
      latencyMs: Date.now() - startedAt,
      requestId: reservation.requestId,
      operationType: "business_analyst_analysis",
      providerStatusCategory: "success"
    });
    return validated;
  } catch (error) {
    const failure = classifyOpenAIProviderFailure(error);
    await releaseUsage(reservation, "business_analyst_provider_failure", {
      ...failure,
      latencyMs: Date.now() - startedAt
    });
    console.error("AI Business Analyst provider fallback", safeProviderDiagnostic(error));
    return { ...fallback, fallbackReason: "provider_failure" };
  }
}
