import { NextResponse } from "next/server";
import { runOperationalIntelligence } from "@/lib/ai/operational-intelligence";
import { parseCopilotRequest } from "@/lib/ai/copilot-validation";
import { assertJsonRequest } from "@/lib/api/request-validation";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { hasPermission } from "@/lib/authz/has-permission";
import { requireActivePaidAccess } from "@/lib/billing/paid-access";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { redactForLog } from "@/lib/usage/usage-redaction";

export const dynamic = "force-dynamic";

const activeRequests = new Set<string>();

export async function POST(request: Request) {
  const access = await requireActivePaidAccess();
  const authorization = await getAuthorizationContext();
  const localDemoAccess = !isSupabaseConfigured && access.currentBusiness.source === "demo";
  if (!localDemoAccess && (!authorization.authenticated || !hasPermission(authorization, "workspace.read"))) {
    return NextResponse.json({ error: "Nu ai permisiunea necesară pentru această analiză." }, { status: 403 });
  }
  const jsonCheck = assertJsonRequest(request);
  if (!jsonCheck.ok) return NextResponse.json({ error: jsonCheck.error }, { status: jsonCheck.status });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Întrebarea nu este validă." }, { status: 400 }); }
  const parsed = parseCopilotRequest(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const actorKey = authorization.profileId ?? access.currentBusiness.profileId ?? `demo:${access.currentBusiness.business.id}`;
  if (activeRequests.has(actorKey)) return NextResponse.json({ error: "O verificare este deja în curs. Așteaptă finalizarea ei." }, { status: 429 });
  activeRequests.add(actorKey);
  try {
    const result = await runOperationalIntelligence(parsed.value, request.signal);
    console.info("copilot_request_complete", {
      requestId: result.diagnostics.requestId,
      provider: result.diagnostics.provider,
      model: result.diagnostics.model,
      latencyMs: result.diagnostics.latencyMs,
      inputTokens: result.diagnostics.inputTokens,
      outputTokens: result.diagnostics.outputTokens,
      totalTokens: result.diagnostics.totalTokens,
      toolNames: result.diagnostics.toolNames,
      success: result.diagnostics.success
    });
    return NextResponse.json(result.answer, {
      headers: {
        "Cache-Control": "private, no-store",
        "X-ReveNew-Request-Id": result.diagnostics.requestId,
        "Server-Timing": `copilot;dur=${result.diagnostics.latencyMs}`
      }
    });
  } catch (error) {
    console.error("copilot_request_failed", redactForLog(error));
    return NextResponse.json({ error: "Nu am putut verifica informațiile acum. Întrebarea rămâne în editor pentru reîncercare." }, { status: 500 });
  } finally {
    activeRequests.delete(actorKey);
  }
}
