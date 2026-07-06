import { NextResponse, type NextRequest } from "next/server";
import { clearSupabaseSession } from "@/lib/auth/session-cleanup";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login?reason=signed_out", request.url));
  response.cookies.set("revenew_current_business", "", { maxAge: 0, path: "/" });
  response.cookies.set("moneyhunter_current_business", "", { maxAge: 0, path: "/" });
  return clearSupabaseSession(request, response);
}
