import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/status";

export const isSupabaseClientConfigured = isSupabaseConfigured;

export function getSupabaseBrowserConfig() {
  return {
    url: supabaseUrl ?? "",
    anonKey: supabaseAnonKey ?? "",
    isConfigured: isSupabaseClientConfigured
  };
}

export function createSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
