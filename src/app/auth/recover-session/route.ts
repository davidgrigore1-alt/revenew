import { NextResponse, type NextRequest } from "next/server";
import { safeInternalRedirect } from "@/lib/auth/redirects";
import { clearSupabaseSession } from "@/lib/auth/session-cleanup";

export async function GET(request: NextRequest) {
  const requestedNext = safeInternalRedirect(request.nextUrl.searchParams.get("next"), "/login?reason=session_expired");
  const pointsToRecovery = requestedNext === "/auth/recover-session" || requestedNext.startsWith("/auth/recover-session?");
  const pointsExpiredReasonAtSignup = requestedNext.startsWith("/signup") && requestedNext.includes("reason=session_expired");
  const next = pointsToRecovery || pointsExpiredReasonAtSignup ? "/login?reason=session_expired" : requestedNext;
  const response = NextResponse.redirect(new URL(next, request.url));
  return clearSupabaseSession(request, response);
}
