import { NextResponse } from "next/server";
import { createGoogleOAuthAttempt, isGoogleWorkspaceConfigured } from "@/lib/google-workspace/oauth";
import { requireActivePaidAccess } from "@/lib/billing/paid-access";
import { requirePermission } from "@/lib/authz/require-permission";
import { getOwnedGoogleConnection, requireGoogleConnectorActor } from "@/lib/google-workspace/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireActivePaidAccess();
  await requirePermission("workspace.read");
  const actor = await requireGoogleConnectorActor();
  if (!isGoogleWorkspaceConfigured()) return NextResponse.redirect(new URL("/apps?google=not-configured", process.env.REVENEW_PUBLIC_SITE_URL ?? "http://localhost:3000"));
  const capability = new URL(request.url).searchParams.get("capability");
  const purpose = capability === "drive" ? "drive" : capability === "email_send" ? "email_send" : "workspace_read";
  const connection = purpose === "drive" ? await getOwnedGoogleConnection(actor) : null;
  if (purpose === "drive" && !connection) return NextResponse.redirect(new URL("/apps?google=connection-required", request.url));
  const attempt = createGoogleOAuthAttempt({ includeEmailSend: purpose === "email_send", includeDrive: purpose === "drive", loginHint: connection?.external_email });
  const response = NextResponse.redirect(attempt.authorizationUrl);
  const secure = process.env.NODE_ENV === "production";
  const options = { httpOnly: true, secure, sameSite: "lax" as const, maxAge: 600, path: "/api/integrations/google" };
  response.cookies.set("revenew_google_oauth_state", attempt.state, options);
  response.cookies.set("revenew_google_oauth_verifier", attempt.verifier, options);
  response.cookies.set("revenew_google_oauth_purpose", purpose, options);
  response.cookies.set("revenew_google_oauth_actor", `${actor.businessId}:${actor.profileId}:${connection?.id ?? ""}`, options);
  return response;
}
