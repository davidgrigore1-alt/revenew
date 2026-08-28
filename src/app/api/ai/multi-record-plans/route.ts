import { NextResponse } from "next/server";
import { assertJsonRequest } from "@/lib/api/request-validation";
import { requireActivePaidAccess } from "@/lib/billing/paid-access";
import { prepareMultiRecordActionPlans } from "@/lib/ai/multi-record-planning";
import { MULTI_RECORD_MAX_SELECTION, type MultiRecordBatchAction } from "@/lib/ai/multi-record-planning-core";
import { redactForLog } from "@/lib/usage/usage-redaction";

export const dynamic = "force-dynamic";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const actions = new Set<MultiRecordBatchAction>(["prepare_email", "create_internal_task", "assign_review", "create_notification", "prepare_next_action_update"]);
function record(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
export async function POST(request: Request) {
  await requireActivePaidAccess();
  const jsonCheck = assertJsonRequest(request); if (!jsonCheck.ok) return NextResponse.json({ error: jsonCheck.error }, { status: jsonCheck.status });
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "Planul multi-record nu este valid." }, { status: 400 }); }
  if (!record(body)) return NextResponse.json({ error: "Planul multi-record nu este valid." }, { status: 400 });
  const resultSetId = typeof body.resultSetId === "string" ? body.resultSetId.trim() : "";
  const confirmationId = typeof body.confirmationId === "string" ? body.confirmationId.trim() : "";
  const actionType = typeof body.actionType === "string" ? body.actionType as MultiRecordBatchAction : "" as MultiRecordBatchAction;
  const selectedRecordIds = Array.from(new Set((Array.isArray(body.selectedRecordIds) ? body.selectedRecordIds : []).filter((item): item is string => typeof item === "string" && uuidPattern.test(item))));
  if (!uuidPattern.test(resultSetId) || !uuidPattern.test(confirmationId) || !actions.has(actionType) || !selectedRecordIds.length || selectedRecordIds.length > MULTI_RECORD_MAX_SELECTION) return NextResponse.json({ error: `Selectează între 1 și ${MULTI_RECORD_MAX_SELECTION} oportunități valide.` }, { status: 400 });
  try {
    const result = await prepareMultiRecordActionPlans({ resultSetId, confirmationId, actionType, selectedRecordIds });
    return NextResponse.json(result, { status: result.prepared.some((item) => !item.replay) ? 201 : 200, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("multi_record_plan_prepare_failed", redactForLog(error));
    const code = error instanceof Error ? error.message : "";
    if (code.includes("forbidden")) return NextResponse.json({ error: "Selecția nu este disponibilă în spațiul tău de lucru." }, { status: 403 });
    if (code.includes("expired")) return NextResponse.json({ error: "Selecția a expirat. Rulează din nou filtrul înainte de pregătire." }, { status: 409 });
    return NextResponse.json({ error: "Planurile nu au putut fi pregătite. Nicio acțiune externă nu a fost executată." }, { status: 500 });
  }
}
