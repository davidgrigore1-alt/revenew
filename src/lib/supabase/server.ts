import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { classifyAuthError, hasPersistedSupabaseAuthCookie } from "@/lib/auth/session-errors";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/status";

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isSupabaseAdminConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);

export const isSupabaseServerConfigured = isSupabaseConfigured;

export function getSupabaseServerConfig() {
  return {
    url: supabaseUrl ?? "",
    anonKey: supabaseAnonKey ?? "",
    isConfigured: isSupabaseServerConfigured,
    isAdminConfigured: isSupabaseAdminConfigured
  };
}

export function createSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options: Parameters<typeof cookieStore.set>[2];
        }>
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always set cookies. Middleware/actions refresh sessions.
        }
      }
    }
  });
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const hasPersistedSession = hasPersistedSupabaseAuthCookie(cookies().getAll());

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    const classified = classifyAuthError(error, { hasPersistedSession });
    if (classified.status === "anonymous") {
      return null;
    }

    if (classified.status === "stale_session") {
      console.warn("auth_stale_session_detected", { reason: classified.reason });
      return null;
    }

    console.error("auth_user_lookup_failed", { status: classified.status, reason: classified.reason });
    throw new Error("Autentificarea nu este disponibilă momentan. Încearcă din nou în câteva momente.");
  }

  return user;
}
