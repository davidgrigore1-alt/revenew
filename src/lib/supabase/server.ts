import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/status";

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isSupabaseAdminConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);

export const isSupabaseServerConfigured = isSupabaseConfigured;

export function getSupabaseServerConfig() {
  return {
    url: supabaseUrl ?? "",
    anonKey: supabaseAnonKey ?? "",
    serviceRoleKey: supabaseServiceRoleKey ?? "",
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

  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
}
