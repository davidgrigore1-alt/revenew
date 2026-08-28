import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertJsonRequest } from "@/lib/api/request-validation";
import { requireActivePaidAccess } from "@/lib/billing/paid-access";
import { handleCommercialIntervention } from "@/lib/commercial-interventions-server";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  await requireActivePaidAccess();
  const check = assertJsonRequest(request);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
  let body: Record<string, unknown>;
  try { const value: unknown = await request.json(); if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(); body = value as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Cererea nu este validă." }, { status: 400 }); }
  if (typeof body.opportunityId !== "string" || typeof body.version !== "string" || !["prepare", "approve"].includes(String(body.operation))) return NextResponse.json({ error: "Selectează o intervenție validă." }, { status: 400 });
  try {
    const result = await handleCommercialIntervention({ opportunityId: body.opportunityId, version: body.version, operation: body.operation as "prepare" | "approve", planId: typeof body.planId === "string" ? body.planId : undefined, proposal: body.proposal });
    if (body.operation === "approve") { revalidatePath("/dashboard"); revalidatePath("/today"); revalidatePath("/opportunities"); }
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const changed = ["intervention_changed", "ask_action_stale", "ask_action_replay_blocked"].includes(code);
    const forbidden = ["intervention_forbidden", "ask_action_forbidden"].includes(code);
    return NextResponse.json({ error: changed ? "Situația comercială s-a schimbat. Actualizează lista și revizuiește noul context; nu reluăm acțiunea automat."
      : forbidden ? "Nu ai acces la această intervenție sau la acțiunea propusă."
      : code === "ask_action_due_future_required" ? "Alege un termen viitor pentru pasul nou. Propunerea nu a fost aplicată; termenul istoric rămâne doar în context."
      : code === "intervention_review_existing" ? "Revizuiește lucrul existent sau selectează responsabilul în oportunitate."
      : "Nu am putut finaliza cererea. Propunerea rămâne vizibilă; verifică starea înainte de a încerca din nou. Niciun email nu este trimis automat." },
    { status: changed ? 409 : forbidden ? 403 : ["intervention_invalid", "ask_action_due_future_required"].includes(code) ? 400 : 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
