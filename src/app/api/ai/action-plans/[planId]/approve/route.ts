import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { approveAskActionPlan } from "@/lib/ai/action-planner";
import { assertJsonRequest } from "@/lib/api/request-validation";
import { requireActivePaidAccess } from "@/lib/billing/paid-access";

export const dynamic = "force-dynamic";
const messages: Record<string, { status: number; message: string }> = {
  ask_action_forbidden: { status: 403, message: "Planul nu este disponibil în spațiul tău de lucru." },
  ask_action_stale: { status: 409, message: "Înregistrarea s-a schimbat între timp. Cere ReveNew să pregătească din nou acțiunea." },
  ask_action_replay_blocked: { status: 409, message: "Acest plan a fost deja procesat sau nu mai poate fi aplicat." },
  ask_action_owner_required: { status: 400, message: "Selectează un responsabil valid înainte de aprobare." },
  ask_action_owner_forbidden: { status: 400, message: "Responsabilul nu este membru activ al acestui spațiu de lucru." },
  ask_action_title_required: { status: 400, message: "Completează un titlu clar pentru acțiune." },
  ask_action_due_future_required: { status: 400, message: "Alege un termen viitor înainte de aprobare. Propunerea nu a fost aplicată." },
  ask_action_note_required: { status: 400, message: "Completează nota înainte de aprobare." },
  ask_action_field_forbidden: { status: 400, message: "Câmpul propus nu poate fi modificat prin Ask ReveNew." },
  ask_action_value_forbidden: { status: 400, message: "Valoarea propusă nu este permisă pentru acest câmp." },
  email_plan_requires_communication_workspace: { status: 409, message: "Deschide draftul în Inbox Comercial pentru revizuire. Niciun email nu a fost trimis." }
};
export async function POST(request: Request, context: { params: Promise<{ planId: string }> }) {
  await requireActivePaidAccess();
  const jsonCheck = assertJsonRequest(request);
  if (!jsonCheck.ok) return NextResponse.json({ error: jsonCheck.error }, { status: jsonCheck.status });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Propunerea nu este validă." }, { status: 400 }); }
  const proposal = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>).proposal : null;
  try {
    const { planId } = await context.params;
    const result = await approveAskActionPlan(planId, proposal);
    revalidatePath("/today"); revalidatePath("/dashboard"); revalidatePath("/opportunities");
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "ask_action_failed";
    const safe = messages[code] ?? { status: 500, message: "Acțiunea nu a putut fi aplicată. Datele existente au rămas protejate." };
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
