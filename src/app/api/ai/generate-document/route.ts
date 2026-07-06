import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { assertJsonRequest, validateDocumentRequest } from "@/lib/api/request-validation";
import { requireActivePaidAccess } from "@/lib/billing/paid-access";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { hasPermission } from "@/lib/authz/has-permission";
import { createOpenAIClient, getOpenAIErrorCode, getOpenAIModel, isOpenAIConfigured, runWithOpenAITimeout } from "@/lib/openai/client";
import { buildLocalGeneratedDocument } from "@/lib/openai/fallback";
import { buildDocumentGenerationPrompt } from "@/lib/openai/prompts";
import { parseJsonObject, validateGeneratedDocument } from "@/lib/openai/validation";
import { getOpportunityForCurrentBusiness } from "@/lib/supabase/data";
import { classifyOpenAIProviderFailure } from "@/lib/usage/provider-errors";
import { documentFeatureByType } from "@/lib/usage/usage-types";
import { releaseUsage, reserveUsage, resolveUsagePlanId, settleUsage } from "@/lib/usage/reserve-usage";
import { UsageLimitError, UsageUnavailableError } from "@/lib/usage/usage-errors";
import { redactForLog } from "@/lib/usage/usage-redaction";

export async function POST(request: Request) {
  const access = await requireActivePaidAccess();
  const authorization = await getAuthorizationContext();
  if (!hasPermission(authorization, "documents.generate")) {
    return NextResponse.json({ error: "Nu ai permisiunea necesară pentru această acțiune." }, { status: 403 });
  }

  const jsonCheck = assertJsonRequest(request);
  if (!jsonCheck.ok) {
    return NextResponse.json({ error: jsonCheck.error }, { status: jsonCheck.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    console.error("AI document request parse error", redactForLog(error));
    return NextResponse.json({ error: "Cererea nu a putut fi citită." }, { status: 400 });
  }

  const validated = validateDocumentRequest(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: validated.status });
  }

  const opportunity = await getOpportunityForCurrentBusiness(validated.data.opportunityId);
  if (!opportunity) {
    return NextResponse.json({ error: "Oportunitatea nu a fost găsită în workspace-ul curent." }, { status: 404 });
  }

  const business = access.currentBusiness.business;
  const standardDraft = () =>
    NextResponse.json({
      ...buildLocalGeneratedDocument(validated.data.documentType, business, opportunity),
      message: "Draft standard pregătit pentru revizuire."
    });

  if (!isOpenAIConfigured()) {
    return standardDraft();
  }

  const client = createOpenAIClient();
  if (!client) {
    return standardDraft();
  }

  const featureId = documentFeatureByType[validated.data.documentType];
  const idempotencyKey = request.headers.get("idempotency-key") ?? `document:${business.id}:${opportunity.id}:${validated.data.documentType}`;
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  let reservation;

  try {
    reservation = await reserveUsage({
      businessId: business.id,
      profileId: access.currentBusiness.profileId,
      featureId,
      planId: resolveUsagePlanId(access.previewPlan?.id ?? access.subscription?.plan),
      idempotencyKey,
      requestId,
      operationType: featureId
    });
  } catch (error) {
    if (error instanceof UsageLimitError) {
      return NextResponse.json({ error: "Ai folosit toate documentele incluse în perioada curentă. Poți continua cu un draft standard.", canUseLocalFallback: true }, { status: 429 });
    }
    if (error instanceof UsageUnavailableError) {
      return NextResponse.json({ error: "Informațiile de utilizare nu au putut fi verificate. Poți continua cu un draft standard.", canUseLocalFallback: true }, { status: 503 });
    }
    throw error;
  }

  const providerStartedAt = Date.now();
  try {
    const model = getOpenAIModel();
    const completion = await runWithOpenAITimeout((signal) =>
      client.chat.completions.create(
        {
          model,
          response_format: { type: "json_object" },
          temperature: 0.35,
          max_tokens: 1400,
          messages: [
            {
              role: "system",
              content: "Răspunzi doar cu JSON valid. Nu include markdown. Nu trimite mesaje și nu inventa fapte."
            },
            {
              role: "user",
              content: buildDocumentGenerationPrompt({
                documentType: validated.data.documentType,
                business,
                opportunity,
                tone: validated.data.tone
              })
            }
          ]
        },
        { signal }
      )
    );

    const content = completion.choices[0]?.message.content;
    if (!content) {
      throw new Error("Providerul a returnat un răspuns gol.");
    }

    await settleUsage(reservation, {
      provider: "openai",
      model: completion.model ?? model,
      promptTokens: completion.usage?.prompt_tokens ?? 0,
      completionTokens: completion.usage?.completion_tokens ?? 0,
      totalTokens: completion.usage?.total_tokens ?? 0,
      costStatus: completion.usage ? "provider_confirmed" : "estimated",
      latencyMs: Date.now() - providerStartedAt,
      requestId,
      operationType: featureId,
      providerStatusCategory: "success"
    });

    return NextResponse.json(validateGeneratedDocument(parseJsonObject(content), "ai", validated.data.documentType));
  } catch (error) {
    const failure = classifyOpenAIProviderFailure(error);
    await releaseUsage(reservation, error instanceof Error ? error.name : "provider_error", {
      ...failure,
      latencyMs: Date.now() - providerStartedAt
    });
    console.error("OpenAI document generation error", redactForLog(error));
    if (getOpenAIErrorCode(error) === "insufficient_quota") {
      return NextResponse.json(
        {
          code: "insufficient_quota",
          error: "Generarea avansată nu este disponibilă momentan. Poți continua cu un draft standard.",
          canUseLocalFallback: true
        },
        { status: 503 }
      );
    }

    const message = error instanceof Error && error.message.includes("validat")
      ? "Răspunsul generat nu a putut fi validat."
      : "Documentul nu a putut fi generat momentan. Poți continua cu un draft standard.";
    return NextResponse.json({ error: message, canUseLocalFallback: true }, { status: 502 });
  }
}
