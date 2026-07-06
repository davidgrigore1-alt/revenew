import { NextResponse, type NextRequest } from "next/server";
import { safeInternalRedirect } from "@/lib/auth/redirects";
import { clearSupabaseSession } from "@/lib/auth/session-cleanup";

export async function GET(request: NextRequest) {
  const next = safeInternalRedirect(request.nextUrl.searchParams.get("next"), "/login?reason=session_expired");
  const response = NextResponse.redirect(new URL(next, request.url));
  return clearSupabaseSession(request, response);
}
