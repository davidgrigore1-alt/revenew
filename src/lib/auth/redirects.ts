export const authIntents = ["audit", "create_account", "login", "preview", "select_plan"] as const;

export type AuthIntent = (typeof authIntents)[number];

const authIntentSet = new Set<string>(authIntents);

const safeRedirectPaths = [
  "/access",
  "/auth/bootstrap",
  "/auth/logout",
  "/auth/recover-session",
  "/auth/switch-account",
  "/billing",
  "/dashboard",
  "/demo",
  "/forgot-password",
  "/inbox",
  "/login",
  "/onboarding",
  "/opportunities",
  "/recoverable",
  "/reports",
  "/reset-password",
  "/results",
  "/signup",
  "/today",
  "/verify-email"
] as const;

export function sanitizeAuthIntent(value: unknown, fallback: AuthIntent = "create_account"): AuthIntent {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && authIntentSet.has(raw) ? (raw as AuthIntent) : fallback;
}

export function authIntentQuery(intent: AuthIntent) {
  return `intent=${encodeURIComponent(intent)}`;
}

export function authPath(path: "/login" | "/signup", intent: AuthIntent) {
  return `${path}?${authIntentQuery(intent)}`;
}

export function safeInternalRedirect(value: unknown, fallback = "/dashboard") {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw, "https://revenew.local");
  } catch {
    return fallback;
  }

  if (parsed.origin !== "https://revenew.local") {
    return fallback;
  }

  const isAllowed = safeRedirectPaths.some((path) => parsed.pathname === path || parsed.pathname.startsWith(`${path}/`));
  if (!isAllowed) {
    return fallback;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function destinationForAuthIntent(intent: AuthIntent, postBusinessDestination: string | null) {
  if (!postBusinessDestination) {
    return "/onboarding";
  }

  if (intent === "audit" || intent === "preview" || intent === "select_plan") {
    return "/access#planuri";
  }

  return safeInternalRedirect(postBusinessDestination, "/dashboard");
}
