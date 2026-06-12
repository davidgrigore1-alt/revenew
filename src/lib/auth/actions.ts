"use server";

import { getCurrentAuthUser, getCurrentProfile, getOrCreateProfile } from "@/lib/auth/profile";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";

export async function ensureCurrentProfile(fullName?: string) {
  try {
    const authUser = await getCurrentAuthUser();
    if (!authUser) {
      return {
        ok: false,
        needsEmailConfirmation: true,
        error: "Contul a fost creat. Verifică emailul pentru confirmare, apoi intră în cont."
      };
    }

    const profile = await getOrCreateProfile(authUser, fullName);
    return { ok: true, authUserId: authUser.id, profileId: profile.id, email: profile.email };
  } catch (error) {
    console.error("ensureCurrentProfile error", error);
    return { ok: false, error: error instanceof Error ? error.message : "Profilul nu a putut fi creat." };
  }
}

export async function getCurrentProfileDebug() {
  try {
    const { authUser, profile } = await getCurrentProfile();
    return {
      ok: true,
      sessionExists: Boolean(authUser),
      authUserId: authUser?.id ?? "",
      authUserEmail: authUser?.email ?? "",
      profileId: profile?.id ?? "",
      profileEmail: profile?.email ?? ""
    };
  } catch (error) {
    console.error("getCurrentProfileDebug error", error);
    return {
      ok: false,
      sessionExists: false,
      authUserId: "",
      authUserEmail: "",
      profileId: "",
      profileEmail: "",
      error: error instanceof Error ? error.message : "Profilul nu a putut fi citit."
    };
  }
}

export async function getPostLoginDestination() {
  try {
    const { authUser, profile } = await getCurrentProfile();
    if (!authUser || !profile) {
      return { ok: false, error: "Nu ești autentificat. Intră din nou în cont." };
    }

    const currentBusiness = await getCurrentBusinessForUser({ redirectIfMissing: false });
    return {
      ok: true,
      destination: currentBusiness?.source === "supabase" ? "/dashboard" : "/onboarding",
      authUserId: authUser.id,
      profileId: profile.id
    };
  } catch (error) {
    console.error("getPostLoginDestination error", error);
    return { ok: false, error: error instanceof Error ? error.message : "Nu am putut verifica firma conectată." };
  }
}

export async function repairCurrentProfile(fullName?: string) {
  try {
    const authUser = await getCurrentAuthUser();
    if (!authUser) {
      return { ok: false, error: "Nu există sesiune activă. Intră în cont înainte de repair." };
    }

    const profile = await getOrCreateProfile(authUser, fullName);
    return { ok: true, authUserId: authUser.id, profileId: profile.id, email: profile.email };
  } catch (error) {
    console.error("repairCurrentProfile error", error);
    return { ok: false, error: error instanceof Error ? error.message : "Profilul nu a putut fi reparat." };
  }
}
