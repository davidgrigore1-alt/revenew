import { NextResponse, type NextRequest } from "next/server";
import { browserSafeRedirectUrl } from "@/lib/auth/redirects";
import { clearSupabaseSession } from "@/lib/auth/session-cleanup";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(browserSafeRedirectUrl(request.url, "/login?reason=signed_out"));
  response.cookies.set("revenew_current_business", "", { maxAge: 0, path: "/" });
  response.cookies.set("moneyhunter_current_business", "", { maxAge: 0, path: "/" });
  return clearSupabaseSession(request, response);
}
