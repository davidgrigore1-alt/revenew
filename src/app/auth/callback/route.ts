import { NextResponse, type NextRequest } from "next/server";
import { getAuthConfirmationInput } from "@/lib/auth/confirmation";
import { browserSafeRedirectUrl } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const confirmation = getAuthConfirmationInput(request.nextUrl.searchParams);
  const supabase = await createSupabaseServerClient();

  if (confirmation.method === "invalid" || !supabase) {
    return NextResponse.redirect(browserSafeRedirectUrl(request.url, "/verify-email?reason=invalid_link"));
  }

  const { error } = confirmation.method === "code"
    ? await supabase.auth.exchangeCodeForSession(confirmation.code)
    : await supabase.auth.verifyOtp({ token_hash: confirmation.tokenHash, type: confirmation.type });
  if (error) {
    console.warn("auth_confirmation_failed", { method: confirmation.method, name: error.name, status: error.status });
    return NextResponse.redirect(browserSafeRedirectUrl(request.url, "/verify-email?reason=invalid_link"));
  }

  if (confirmation.passwordRecovery) {
    return NextResponse.redirect(browserSafeRedirectUrl(request.url, "/reset-password"));
  }

  const bootstrap = browserSafeRedirectUrl(request.url, "/auth/bootstrap");
  bootstrap.searchParams.set("next", confirmation.next);
  return NextResponse.redirect(bootstrap);
}
