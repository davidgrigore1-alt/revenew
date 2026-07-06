export type AuthUserResolution =
  | { status: "authenticated"; user: import("@supabase/supabase-js").User }
  | { status: "anonymous" }
  | { status: "stale_session"; reason: "deleted_user" | "invalid_refresh_token" | "session_not_found" | "invalid_jwt" }
  | { status: "temporary_failure"; reason: "rate_limited" | "network" | "service_unavailable" }
  | { status: "unexpected_failure"; reason: "unexpected" };

type AuthLikeError = {
  message?: unknown;
  name?: unknown;
  status?: unknown;
  code?: unknown;
};

type CookieLike = {
  name: string;
  value?: string | null;
};

type AuthClassificationOptions = {
  hasPersistedSession?: boolean;
};

function authErrorText(error: unknown) {
  if (!error || typeof error !== "object") return "";
  const candidate = error as AuthLikeError;
  return [candidate.message, candidate.name, candidate.code]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

export function isSupabaseAuthCookie(name: string) {
  return /^sb-.+-auth-token(?:\.\d+)?$/.test(name) || name === "supabase-auth-token";
}

export function hasPersistedSupabaseAuthCookie(cookies: CookieLike[]) {
  return cookies.some((cookie) => isSupabaseAuthCookie(cookie.name) && Boolean(cookie.value));
}

export function classifyAuthError(error: unknown, options: AuthClassificationOptions = {}): Exclude<AuthUserResolution, { status: "authenticated" }> {
  const text = authErrorText(error);
  const hasPersistedSession = Boolean(options.hasPersistedSession);

  if (text.includes("auth session missing")) {
    return hasPersistedSession ? { status: "stale_session", reason: "session_not_found" } : { status: "anonymous" };
  }

  if (text.includes("user from sub claim in jwt does not exist") || text.includes("jwt subject") || text.includes("auth user does not exist")) {
    return { status: "stale_session", reason: "deleted_user" };
  }

  if (text.includes("refresh_token_not_found") || text.includes("refresh token not found") || text.includes("invalid refresh token")) {
    return { status: "stale_session", reason: "invalid_refresh_token" };
  }

  if (text.includes("session_not_found") || text.includes("session not found")) {
    return hasPersistedSession ? { status: "stale_session", reason: "session_not_found" } : { status: "anonymous" };
  }

  if (text.includes("invalid jwt") || text.includes("jwt expired")) {
    return { status: "stale_session", reason: "invalid_jwt" };
  }

  if (text.includes("rate limit") || text.includes("too many requests")) {
    return { status: "temporary_failure", reason: "rate_limited" };
  }

  if (text.includes("fetch failed") || text.includes("network") || text.includes("econnreset") || text.includes("enotfound")) {
    return { status: "temporary_failure", reason: "network" };
  }

  if (text.includes("service unavailable") || text.includes("timeout") || text.includes("503")) {
    return { status: "temporary_failure", reason: "service_unavailable" };
  }

  return { status: "unexpected_failure", reason: "unexpected" };
}

export function staleSessionCleanupPath(next = "/login?reason=session_expired") {
  return `/auth/recover-session?next=${encodeURIComponent(next)}`;
}
