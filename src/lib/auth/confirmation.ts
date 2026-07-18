import type { EmailOtpType } from "@supabase/supabase-js";
import { safeInternalRedirect } from "@/lib/auth/redirects";

const supportedEmailOtpTypes = new Set<EmailOtpType>(["email", "email_change", "invite", "magiclink", "recovery", "signup"]);

export type AuthConfirmationInput =
  | { method: "code"; code: string; next: string; passwordRecovery: boolean }
  | { method: "token_hash"; tokenHash: string; type: EmailOtpType; next: string; passwordRecovery: boolean }
  | { method: "invalid"; next: string; passwordRecovery: false };

export function getAuthConfirmationInput(searchParams: URLSearchParams): AuthConfirmationInput {
  const next = safeInternalRedirect(searchParams.get("next"), "/onboarding");
  const code = searchParams.get("code")?.trim();
  if (code) {
    return { method: "code", code, next, passwordRecovery: next === "/reset-password" };
  }

  const tokenHash = searchParams.get("token_hash")?.trim();
  const rawType = searchParams.get("type")?.trim() as EmailOtpType | undefined;
  if (tokenHash && rawType && supportedEmailOtpTypes.has(rawType)) {
    return { method: "token_hash", tokenHash, type: rawType, next, passwordRecovery: rawType === "recovery" || next === "/reset-password" };
  }

  return { method: "invalid", next, passwordRecovery: false };
}

export function authConfirmationRedirectUrl(origin: string, next = "/onboarding") {
  const safeNext = safeInternalRedirect(next, "/onboarding");
  return `${origin.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}
