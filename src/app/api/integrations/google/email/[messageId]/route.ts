import { NextResponse } from "next/server";

import { getOwnedGoogleEmailDetail, getOwnedGoogleEmailThread, requireGoogleConnectorActor } from "@/lib/google-workspace/repository";
import { getOwnedGoogleEmailHtml, runOwnedGoogleEmailAction } from "@/lib/google-workspace/email-runtime";
import { listOwnedCommunicationTemplates, prepareReplyDraft } from "@/lib/communication-os";

const actions = new Set(["summarize_email", "explain_email_relevance", "prepare_email_followup", "ask_about_email", "prepare_reply_draft"]);
const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

function errorResponse(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  const status = code.startsWith("google_connector_actor_") ? 401 : code === "google_refresh_invalid" ? 409 : 500;
  return NextResponse.json(
    { error: status === 401 ? "Autentificarea este necesară." : status === 409 ? "Conexiunea Google necesită reconectare." : "Emailul nu poate fi încărcat momentan." },
    { status, headers: privateHeaders }
  );
}

export async function GET(request: Request, context: { params: { messageId: string } }) {
  try {
    const actor = await requireGoogleConnectorActor();
    const url = new URL(request.url);
    if (url.searchParams.get("view") === "html") {
      const result = await getOwnedGoogleEmailHtml(actor, context.params.messageId, url.searchParams.get("images") === "1");
      if (!result) return NextResponse.json({ error: "Emailul nu este disponibil." }, { status: 404, headers: privateHeaders });
      return NextResponse.json(result, { headers: privateHeaders });
    }
    const [email, thread] = await Promise.all([
      getOwnedGoogleEmailDetail(actor, context.params.messageId),
      getOwnedGoogleEmailThread(actor, context.params.messageId)
    ]);
    if (!email) return NextResponse.json({ error: "Emailul nu este disponibil." }, { status: 404 });
    return NextResponse.json({ email, thread: thread ?? [] }, { headers: privateHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: { params: { messageId: string } }) {
  try {
    const actor = await requireGoogleConnectorActor();
    const body = await request.json() as { action?: string; question?: string };
    if (!body.action || !actions.has(body.action)) return NextResponse.json({ error: "Acțiune invalidă." }, { status: 400, headers: privateHeaders });
    if (body.action === "prepare_reply_draft") {
      const [draft, templates] = await Promise.all([
        prepareReplyDraft(actor, context.params.messageId, "human"),
        listOwnedCommunicationTemplates(actor)
      ]);
      return NextResponse.json({ draft, templates }, { headers: privateHeaders });
    }
    const result = await runOwnedGoogleEmailAction(actor, context.params.messageId, body.action as "summarize_email" | "explain_email_relevance" | "prepare_email_followup" | "ask_about_email", body.question);
    if (!result) return NextResponse.json({ error: "Emailul nu este disponibil." }, { status: 404, headers: privateHeaders });
    return NextResponse.json({ result }, { headers: privateHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}
