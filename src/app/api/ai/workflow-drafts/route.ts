import { NextResponse } from "next/server";
import { assertJsonRequest } from "@/lib/api/request-validation";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { hasPermission } from "@/lib/authz/has-permission";
import { requireActivePaidAccess } from "@/lib/billing/paid-access";
import { createCommercialWorkflowDraftFromQuestion } from "@/lib/workflow-runtime";
import { redactForLog } from "@/lib/usage/usage-redaction";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: Request) {
  await requireActivePaidAccess();
  const authorization = await getAuthorizationContext();
  if (!authorization.authenticated || !hasPermission(authorization, "settings.update")) {
    return NextResponse.json(
      { error: "Nu ai permisiunea necesară pentru a crea workflow-uri." },
      { status: 403 },
    );
  }

  const jsonCheck = assertJsonRequest(request);
  if (!jsonCheck.ok) {
    return NextResponse.json({ error: jsonCheck.error }, { status: jsonCheck.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Confirmarea workflow-ului nu este validă." }, { status: 400 });
  }

  if (!record(body)) {
    return NextResponse.json({ error: "Confirmarea workflow-ului nu este validă." }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim().slice(0, 1_000) : "";
  const confirmationId = typeof body.confirmationId === "string" ? body.confirmationId.trim() : "";
  if (question.length < 3 || !uuidPattern.test(confirmationId)) {
    return NextResponse.json({ error: "Confirmarea workflow-ului nu este validă." }, { status: 400 });
  }

  try {
    const result = await createCommercialWorkflowDraftFromQuestion(question, confirmationId);
    return NextResponse.json(
      {
        ok: true,
        workflowId: result.id,
        replay: result.replay,
        status: "draft",
        route: "/workflows/" + result.id + "?created=ask",
      },
      {
        status: result.replay ? 200 : 201,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    console.error("ask_workflow_draft_create_failed", redactForLog(error));
    const code = error instanceof Error ? error.message : "";
    if (code === "workflow_forbidden") {
      return NextResponse.json({ error: "Nu ai permisiunea necesară pentru a crea workflow-uri." }, { status: 403 });
    }
    if (code === "workflow_draft_not_ready" || code === "workflow_confirmation_invalid") {
      return NextResponse.json({ error: "Workflow-ul trebuie revizuit înainte de creare." }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Draftul nu a putut fi creat. Nicio acțiune nu a fost executată." },
      { status: 500 },
    );
  }
}
