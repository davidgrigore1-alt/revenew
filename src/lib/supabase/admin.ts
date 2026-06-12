import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/supabase/status";

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isSupabaseAdminConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);

export function createSupabaseAdminClient(): SupabaseClient | null {
  if (!isSupabaseAdminConfigured || !supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
