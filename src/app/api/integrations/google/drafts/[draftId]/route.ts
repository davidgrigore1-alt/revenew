import { NextResponse } from "next/server";

import { discardCommunicationDraft, getOwnedCommunicationDraft, markCommunicationDraftReady, refineCommunicationDraft, sendApprovedGmailDraft, updateCommunicationDraft } from "@/lib/communication-os";
import { requireGoogleConnectorActor } from "@/lib/google-workspace/repository";

const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

function safeError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  const status = code.includes("required") || code.includes("incomplete") || code.includes("changed") ? 409
    : code.includes("not_editable") || code.includes("unavailable") ? 404 : 500;
  const message = code === "communication_send_capability_required"
    ? "Activează permisiunea separată de trimitere Gmail înainte de confirmare."
    : code === "communication_final_confirmation_required"
      ? "Confirmarea finală este obligatorie."
      : code === "communication_revision_changed"
        ? "Conținutul s-a schimbat după aprobare. Revizuiește din nou draftul."
        : code === "gmail_send_authorization_required"
          ? "Google necesită reautorizarea permisiunii de trimitere."
          : code === "gmail_send_rate_limited" || code === "gmail_send_provider_unavailable"
            ? "Gmail nu poate confirma trimiterea momentan. Nu reîncerca automat."
            : "Operațiunea asupra draftului nu a putut fi finalizată.";
  return NextResponse.json({ error: message, code }, { status, headers: privateHeaders });
}

export async function GET(_: Request, context: { params: { draftId: string } }) {
  try {
    const actor = await requireGoogleConnectorActor();
    const draft = await getOwnedCommunicationDraft(actor, context.params.draftId);
    if (!draft) return NextResponse.json({ error: "Draftul nu este disponibil." }, { status: 404, headers: privateHeaders });
    return NextResponse.json({ draft }, { headers: privateHeaders });
  } catch (error) {
    return safeError(error);
  }
}

export async function POST(request: Request, context: { params: { draftId: string } }) {
  try {
    const actor = await requireGoogleConnectorActor();
    const body = await request.json() as {
      action?: "save" | "ready" | "send" | "refine" | "discard";
      mode?: "rewrite" | "shorten" | "formal" | "concise";
      to?: unknown;
      cc?: unknown;
      subject?: unknown;
      body?: unknown;
      finalConfirmation?: boolean;
    };
    if (body.action === "save") {
      const draft = await updateCommunicationDraft(actor, context.params.draftId, body);
      return NextResponse.json({ draft }, { headers: privateHeaders });
    }
    if (body.action === "ready") {
      const draft = await markCommunicationDraftReady(actor, context.params.draftId);
      return NextResponse.json({ draft }, { headers: privateHeaders });
    }
    if (body.action === "refine") {
      if (!body.mode || !["rewrite", "shorten", "formal", "concise"].includes(body.mode)) return NextResponse.json({ error: "Mod de rescriere invalid." }, { status: 400, headers: privateHeaders });
      const result = await refineCommunicationDraft(actor, context.params.draftId, body.mode);
      return NextResponse.json(result, { headers: privateHeaders });
    }
    if (body.action === "discard") {
      const draft = await discardCommunicationDraft(actor, context.params.draftId);
      return NextResponse.json({ draft }, { headers: privateHeaders });
    }
    if (body.action === "send") {
      const result = await sendApprovedGmailDraft(actor, context.params.draftId, body.finalConfirmation === true);
      return NextResponse.json(result, { headers: privateHeaders });
    }
    return NextResponse.json({ error: "Acțiune invalidă." }, { status: 400, headers: privateHeaders });
  } catch (error) {
    return safeError(error);
  }
}