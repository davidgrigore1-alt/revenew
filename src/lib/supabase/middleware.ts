import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasPersistedSupabaseAuthCookie } from "@/lib/auth/session-errors";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/status";

export async function refreshSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const hasPersistedSession = hasPersistedSupabaseAuthCookie(request.cookies.getAll());

  if (!isSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) {
    if (hasPersistedSession) {
      response.headers.set("Cache-Control", "private, no-store");
    }
    return response;
  }

  let refreshedCookies = false;
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        refreshedCookies = cookiesToSet.length > 0;
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        const nextResponse = NextResponse.next({ request });
        response.cookies.getAll().forEach((cookie) => nextResponse.cookies.set(cookie));
        cookiesToSet.forEach(({ name, value, options }) => nextResponse.cookies.set(name, value, options));
        response = nextResponse;
      }
    }
  });

  await supabase.auth.getClaims();

  if (refreshedCookies || hasPersistedSession) {
    response.headers.set("Cache-Control", "private, no-store");
  }

  return response;
}
