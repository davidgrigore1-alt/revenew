export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function getDataMode() {
  return isSupabaseConfigured ? "supabase" : "demo";
}

export function getDemoModeMessage() {
  return isSupabaseConfigured ? null : "Mod demo activ - date simulate, fara scriere in baza de date.";
}
