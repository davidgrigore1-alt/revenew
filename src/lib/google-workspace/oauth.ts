import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const GOOGLE_GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const GOOGLE_GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events.readonly";
export const GOOGLE_IDENTITY_SCOPES = ["openid", "email", "profile"] as const;
export const GOOGLE_WORKSPACE_SCOPES = [...GOOGLE_IDENTITY_SCOPES, GOOGLE_GMAIL_SCOPE, GOOGLE_CALENDAR_SCOPE] as const;

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

type GoogleTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

function config() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) throw new Error("google_oauth_not_configured");
  const uri = new URL(redirectUri);
  if (!["https:", "http:"].includes(uri.protocol)) throw new Error("google_oauth_redirect_invalid");
  return { clientId, clientSecret, redirectUri };
}

export function isGoogleWorkspaceConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim() && process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() && process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim());
}

export function createGoogleOAuthAttempt(options: { includeEmailSend?: boolean; includeDrive?: boolean; loginHint?: string } = {}) {
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(64).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const { clientId, redirectUri } = config();
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  const scopes = options.includeEmailSend ? [...GOOGLE_WORKSPACE_SCOPES, GOOGLE_GMAIL_SEND_SCOPE] : GOOGLE_WORKSPACE_SCOPES;
  url.searchParams.set("scope", (options.includeDrive ? [GOOGLE_DRIVE_SCOPE, ...GOOGLE_IDENTITY_SCOPES] : scopes).join(" "));
  if (options.loginHint) url.searchParams.set("login_hint", options.loginHint);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent select_account");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return { authorizationUrl: url.toString(), state, verifier };
}

export function validateOAuthState(expected: string | undefined, received: string | null) {
  if (!expected || !received) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function formRequest(url: string, values: Record<string, string>, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams(values),
      signal: controller.signal,
      cache: "no-store"
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function exchangeGoogleAuthorizationCode(code: string, verifier: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret, redirectUri } = config();
  const response = await formRequest(TOKEN_ENDPOINT, {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    code_verifier: verifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri
  });
  if (!response.ok) throw new Error(response.status === 400 ? "google_oauth_code_rejected" : "google_oauth_exchange_failed");
  const token = await response.json() as Partial<GoogleTokenResponse>;
  if (!token.access_token) throw new Error("google_oauth_access_token_missing");
  return token as GoogleTokenResponse;
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = config();
  const response = await formRequest(TOKEN_ENDPOINT, {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });
  if (!response.ok) {
    if (response.status === 400 || response.status === 401) throw new Error("google_refresh_invalid");
    throw new Error(response.status === 429 ? "google_rate_limited" : "google_refresh_failed");
  }
  const token = await response.json() as Partial<GoogleTokenResponse>;
  if (!token.access_token) throw new Error("google_refresh_access_token_missing");
  return token as GoogleTokenResponse;
}

export async function getGoogleIdentity(accessToken: string) {
  const response = await fetch(USERINFO_ENDPOINT, { headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error("google_identity_failed");
  const value = await response.json() as { sub?: string; email?: string; email_verified?: boolean };
  if (!value.sub || !value.email || value.email_verified === false) throw new Error("google_identity_invalid");
  return { externalAccountId: value.sub, email: value.email.trim().toLowerCase() };
}

export async function revokeGoogleCredential(credential: string) {
  try {
    const response = await formRequest(REVOKE_ENDPOINT, { token: credential }, 8_000);
    return response.ok;
  } catch {
    return false;
  }
}

export function grantedGoogleCapabilities(scopeText: string | undefined) {
  const scopes = new Set((scopeText ?? "").split(/\s+/).filter(Boolean));
  return {
    scopes: Array.from(scopes),
    gmail: scopes.has(GOOGLE_GMAIL_SCOPE),
    emailRead: scopes.has(GOOGLE_GMAIL_SCOPE),
    emailSend: scopes.has(GOOGLE_GMAIL_SEND_SCOPE),
    calendar: scopes.has(GOOGLE_CALENDAR_SCOPE),
    calendarRead: scopes.has(GOOGLE_CALENDAR_SCOPE),
    calendarWrite: false,
    drive: scopes.has(GOOGLE_DRIVE_SCOPE)
  };
}
