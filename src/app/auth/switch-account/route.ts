import { NextResponse, type NextRequest } from "next/server";
import { authPath, safeInternalRedirect, sanitizeAuthIntent } from "@/lib/auth/redirects";
import { clearSupabaseSession } from "@/lib/auth/session-cleanup";

export async function GET(request: NextRequest) {
  const intent = sanitizeAuthIntent(request.nextUrl.searchParams.get("intent"), "login");
  const mode = request.nextUrl.searchParams.get("mode") === "signup" ? "signup" : "login";
  const next = safeInternalRedirect(request.nextUrl.searchParams.get("next"), authPath(mode === "signup" ? "/signup" : "/login", intent));
  const response = NextResponse.redirect(new URL(next.includes("?") ? `${next}&reason=account_switched` : `${next}?reason=account_switched`, request.url));

  response.cookies.set("revenew_current_business", "", { maxAge: 0, path: "/" });
  response.cookies.set("moneyhunter_current_business", "", { maxAge: 0, path: "/" });

  return clearSupabaseSession(request, response);
}
