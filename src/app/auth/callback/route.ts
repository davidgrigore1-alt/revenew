import { NextResponse, type NextRequest } from "next/server";
import { getAuthConfirmationInput } from "@/lib/auth/confirmation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const confirmation = getAuthConfirmationInput(request.nextUrl.searchParams);
  const supabase = createSupabaseServerClient();

  if (confirmation.method === "invalid" || !supabase) {
    return NextResponse.redirect(new URL("/verify-email?reason=invalid_link", request.url));
  }

  const { error } = confirmation.method === "code"
    ? await supabase.auth.exchangeCodeForSession(confirmation.code)
    : await supabase.auth.verifyOtp({ token_hash: confirmation.tokenHash, type: confirmation.type });
  if (error) {
    console.warn("auth_confirmation_failed", { method: confirmation.method, name: error.name, status: error.status });
    return NextResponse.redirect(new URL("/verify-email?reason=invalid_link", request.url));
  }

  if (confirmation.passwordRecovery) {
    return NextResponse.redirect(new URL("/reset-password", request.url));
  }

  const bootstrap = new URL("/auth/bootstrap", request.url);
  bootstrap.searchParams.set("next", confirmation.next);
  return NextResponse.redirect(bootstrap);
}
