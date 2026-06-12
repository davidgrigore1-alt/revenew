import "server-only";
import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";

export type ProfileRow = {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  role: string;
};

function fallbackName(authUser: User, fullName?: string) {
  return (
    fullName ||
    String(authUser.user_metadata?.full_name ?? "") ||
    authUser.email?.split("@")[0] ||
    "Utilizator MoneyHunter"
  );
}

export async function getCurrentAuthUser() {
  if (!isSupabaseConfigured) {
    return null;
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Auth/user error: ${error.message}`);
  }

  return user;
}

export async function getOrCreateProfile(authUser: User, fullName?: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Profilul nu a putut fi creat: Supabase service role nu este configurat pe server.");
  }

  const email = authUser.email ?? "";
  const name = fallbackName(authUser, fullName);

  const byUserId = await admin
    .from("profiles")
    .select("id,user_id,full_name,email,role")
    .eq("user_id", authUser.id)
    .maybeSingle();

  if (byUserId.error) {
    throw new Error(`Profilul nu a putut fi citit: ${byUserId.error.message}`);
  }

  if (byUserId.data) {
    return byUserId.data as ProfileRow;
  }

  const byLegacyId = await admin
    .from("profiles")
    .select("id,user_id,full_name,email,role")
    .eq("id", authUser.id)
    .maybeSingle();

  if (byLegacyId.error) {
    throw new Error(`Profilul legacy nu a putut fi citit: ${byLegacyId.error.message}`);
  }

  if (byLegacyId.data) {
    const { data, error } = await admin
      .from("profiles")
      .update({ user_id: authUser.id, email, full_name: byLegacyId.data.full_name || name })
      .eq("id", byLegacyId.data.id)
      .select("id,user_id,full_name,email,role")
      .single();

    if (error || !data) {
      throw new Error(`Profilul nu a putut fi reparat: ${error?.message ?? "nu s-a întors rândul actualizat"}`);
    }

    return data as ProfileRow;
  }

  const { data, error } = await admin
    .from("profiles")
    .insert({
      user_id: authUser.id,
      full_name: name,
      email,
      role: "business_owner"
    })
    .select("id,user_id,full_name,email,role")
    .single();

  if (error || !data) {
    throw new Error(`Profilul nu a putut fi creat: ${error?.message ?? "nu s-a întors rândul inserat"}`);
  }

  return data as ProfileRow;
}

export async function getCurrentProfile() {
  const authUser = await getCurrentAuthUser();
  if (!authUser) {
    return { authUser: null, profile: null };
  }

  const profile = await getOrCreateProfile(authUser);
  return { authUser, profile };
}
