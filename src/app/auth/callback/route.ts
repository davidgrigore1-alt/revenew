import { NextResponse, type NextRequest } from "next/server";
import { safeInternalRedirect } from "@/lib/auth/redirects";
import { staleSessionCleanupPath } from "@/lib/auth/session-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeInternalRedirect(request.nextUrl.searchParams.get("next"), "/auth/bootstrap");
  const supabase = createSupabaseServerClient();

  if (!code || !supabase) {
    return NextResponse.redirect(new URL(staleSessionCleanupPath("/login?reason=invalid_link"), request.url));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.warn("auth_callback_exchange_failed", { name: error.name, status: error.status });
    return NextResponse.redirect(new URL(staleSessionCleanupPath("/login?reason=invalid_link"), request.url));
  }

  if (next === "/reset-password") {
    return NextResponse.redirect(new URL("/reset-password", request.url));
  }

  return NextResponse.redirect(new URL("/auth/bootstrap", request.url));
}
