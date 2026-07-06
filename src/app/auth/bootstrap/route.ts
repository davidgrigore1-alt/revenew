import { NextResponse, type NextRequest } from "next/server";
import { resolveAuthState } from "@/lib/auth/auth-state";
import { sanitizeAuthIntent, safeInternalRedirect } from "@/lib/auth/redirects";

function retryUrl(request: NextRequest, reason: string) {
  return new URL(`/auth/bootstrap/retry?reason=${encodeURIComponent(reason)}`, request.url);
}

export async function GET(request: NextRequest) {
  const intent = sanitizeAuthIntent(request.nextUrl.searchParams.get("intent"), "login");
  const state = await resolveAuthState({ includeProfile: true, includeBusiness: true, intent });

  if (state.status === "anonymous") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (state.status === "stale_session") {
    return NextResponse.redirect(new URL("/auth/recover-session?next=/login?reason=session_expired", request.url));
  }

  if (state.status === "temporary_auth_failure") {
    console.warn("auth_bootstrap_temporary_failure", { reason: state.reason });
    return NextResponse.redirect(retryUrl(request, state.reason));
  }

  if (state.status === "unexpected_auth_failure") {
    console.error("auth_bootstrap_unexpected_failure", { reason: state.reason });
    return NextResponse.redirect(retryUrl(request, state.reason));
  }

  if (state.status === "authenticated_no_profile") {
    console.error("auth_bootstrap_profile_unavailable", { reason: state.reason });
    return NextResponse.redirect(retryUrl(request, state.reason));
  }

  if (state.status === "authenticated_unconfirmed") {
    return NextResponse.redirect(new URL("/verify-email", request.url));
  }

  if (state.status === "authenticated_profile_no_business") {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return NextResponse.redirect(new URL(safeInternalRedirect(state.safeNextPath, "/dashboard"), request.url));
}
