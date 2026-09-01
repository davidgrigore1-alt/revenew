import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireActivePaidAccess } from "@/lib/billing/paid-access";
import { requirePermission } from "@/lib/authz/require-permission";
import {
  exchangeGoogleAuthorizationCode,
  getGoogleIdentity,
  grantedGoogleCapabilities,
  validateOAuthState
} from "@/lib/google-workspace/oauth";
import { getOwnedGoogleConnection, requireGoogleConnectorActor, saveGoogleConnection, updateConnection } from "@/lib/google-workspace/repository";

export const dynamic = "force-dynamic";

function appsRedirect(request: Request, state: string) {
  return new URL(`/apps?google=${encodeURIComponent(state)}`, new URL(request.url).origin);
}

function clearAttempt(response: NextResponse) {
  response.cookies.set("revenew_google_oauth_state", "", { httpOnly: true, maxAge: 0, path: "/api/integrations/google" });
  response.cookies.set("revenew_google_oauth_verifier", "", { httpOnly: true, maxAge: 0, path: "/api/integrations/google" });
  response.cookies.set("revenew_google_oauth_purpose", "", { httpOnly: true, maxAge: 0, path: "/api/integrations/google" });
  response.cookies.set("revenew_google_oauth_actor", "", { httpOnly: true, maxAge: 0, path: "/api/integrations/google" });
  return response;
}

export async function GET(request: Request) {
  try {
    await requireActivePaidAccess();
    await requirePermission("workspace.read");
    const actor = await requireGoogleConnectorActor();
    const url = new URL(request.url);
    const store = await cookies();
    const state = store.get("revenew_google_oauth_state")?.value;
    const verifier = store.get("revenew_google_oauth_verifier")?.value;
    const purpose = store.get("revenew_google_oauth_purpose")?.value;
    if (!validateOAuthState(state, url.searchParams.get("state")) || !verifier) {
      return clearAttempt(NextResponse.redirect(appsRedirect(request, "invalid-state")));
    }
    if (url.searchParams.get("error")) return clearAttempt(NextResponse.redirect(appsRedirect(request, "consent-denied")));
    const existing = await getOwnedGoogleConnection(actor);
    if (purpose === "drive" && (!existing || store.get("revenew_google_oauth_actor")?.value !== `${actor.businessId}:${actor.profileId}:${existing.id}`)) {
      return clearAttempt(NextResponse.redirect(appsRedirect(request, "invalid-state")));
    }
    const code = url.searchParams.get("code");
    if (!code) return clearAttempt(NextResponse.redirect(appsRedirect(request, "missing-code")));
    const token = await exchangeGoogleAuthorizationCode(code, verifier);
    const identity = await getGoogleIdentity(token.access_token);
    const capabilities = grantedGoogleCapabilities(token.scope);
    if (purpose === "drive" && existing?.external_account_id !== identity.externalAccountId) {
      return clearAttempt(NextResponse.redirect(appsRedirect(request, "wrong-account")));
    }
    if (purpose === "drive" && !capabilities.drive) return clearAttempt(NextResponse.redirect(appsRedirect(request, "drive-denied")));
    const grantedScopes = existing?.external_account_id === identity.externalAccountId
      ? Array.from(new Set([...(existing.granted_scopes ?? []), ...capabilities.scopes]))
      : capabilities.scopes;
    if (purpose === "drive" && existing) {
      // Capability extension must not rewrite Gmail/Calendar health or cursors.
      const { encryptGoogleRefreshCredential } = await import("@/lib/google-workspace/crypto");
      await updateConnection(existing.id, actor, {
        granted_scopes: capabilities.scopes, drive_status: "connected",
        ...(token.refresh_token ? { encrypted_refresh_credential: encryptGoogleRefreshCredential(token.refresh_token) } : {})
      });
      return clearAttempt(NextResponse.redirect(appsRedirect(request, "drive-enabled")));
    }
    await saveGoogleConnection({
      actor,
      externalAccountId: identity.externalAccountId,
      email: identity.email,
      grantedScopes,
      refreshToken: token.refresh_token,
      expiresInSeconds: token.expires_in
    });
    const outcome = purpose === "email_send" && grantedScopes.includes("https://www.googleapis.com/auth/gmail.send") ? "send-enabled" : "connected";
    return clearAttempt(NextResponse.redirect(appsRedirect(request, outcome)));
  } catch (error) {
    console.warn("google_oauth_callback_failed", { errorType: error instanceof Error ? error.message : "unknown" });
    return clearAttempt(NextResponse.redirect(appsRedirect(request, "error")));
  }
}
