import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseAuthCookie } from "@/lib/auth/session-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function clearSupabaseSession(request: NextRequest, response: NextResponse) {
  const supabase = createSupabaseServerClient();

  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn("auth_session_clear_signout_failed", { name: error.name, status: error.status });
    }
  }

  for (const cookie of request.cookies.getAll()) {
    if (isSupabaseAuthCookie(cookie.name)) {
      response.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
    }
  }

  response.headers.set("x-revenew-auth-recovered", "1");
  return response;
}
