import { NextResponse } from "next/server";
import { buildAnalystEvidencePack, parseAnalystQuestionRequest } from "@/lib/ai-business-analyst-core";
import { runAiBusinessAnalyst } from "@/lib/ai-business-analyst";
import { assertJsonRequest } from "@/lib/api/request-validation";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { hasPermission } from "@/lib/authz/has-permission";
import { requireActivePaidAccess } from "@/lib/billing/paid-access";
import { buildExecutiveMorningBrief } from "@/lib/executive-morning-brief";
import { getRevenueWorkspaceSummary } from "@/lib/revenue-workspace";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { redactForLog } from "@/lib/usage/usage-redaction";
import { buildWorkspaceDecisionQueue } from "@/lib/workspace-decision-queue";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await requireActivePaidAccess();
  const authorization = await getAuthorizationContext();
  const localDemoAccess = !isSupabaseConfigured && access.currentBusiness.source === "demo";
  if (!localDemoAccess && (!authorization.authenticated || !hasPermission(authorization, "opportunities.analyze"))) {
    return NextResponse.json({ error: "Nu ai permisiunea necesară pentru această analiză." }, { status: 403 });
  }
  const jsonCheck = assertJsonRequest(request);
  if (!jsonCheck.ok) {
    return NextResponse.json({ error: jsonCheck.error }, { status: jsonCheck.status });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Întrebarea selectată nu este validă." }, { status: 400 });
  }
  const question = parseAnalystQuestionRequest(body);
  if (!question.ok) {
    return NextResponse.json({ error: "Întrebarea selectată nu este acceptată." }, { status: 400 });
  }

  try {
    const summary = await getRevenueWorkspaceSummary();
    const queue = buildWorkspaceDecisionQueue({ opportunities: summary.opportunities, signals: summary.signals });
    const brief = buildExecutiveMorningBrief(queue);
    const pack = buildAnalystEvidencePack(brief, queue);
    const result = await runAiBusinessAnalyst({
      pack,
      businessId: access.currentBusiness.business.id,
      profileId: authorization.profileId ?? access.currentBusiness.profileId,
      planId: access.subscription?.plan ?? access.previewPlan?.id,
      questionId: question.questionId
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" }
    });
  } catch (error) {
    console.error("AI Business Analyst request failed", redactForLog(error));
    return NextResponse.json({ error: "Analiza nu a putut fi pregătită. Încearcă din nou." }, { status: 500 });
  }
}
