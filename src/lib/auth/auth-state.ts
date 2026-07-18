import "server-only";

import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { getOrCreateProfile, ProfileInitializationError, resolveCurrentAuthUser, type ProfileBootstrapCategory, type ProfileRow } from "@/lib/auth/profile";
import { destinationForAuthIntent, type AuthIntent } from "@/lib/auth/redirects";
import { getPostBusinessDestination } from "@/lib/billing/paid-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";

export type AuthStateStatus =
  | "anonymous"
  | "authenticated_unconfirmed"
  | "authenticated_no_profile"
  | "authenticated_profile_no_business"
  | "authenticated_ready"
  | "stale_session"
  | "temporary_auth_failure"
  | "unexpected_auth_failure";

export type AuthStateResult =
  | { status: "anonymous"; safeNextPath: "/login" }
  | { status: "authenticated_unconfirmed"; user: User; safeNextPath: "/verify-email" }
  | { status: "authenticated_no_profile"; user: User; reason: ProfileBootstrapCategory; safeNextPath: "/auth/bootstrap" }
  | { status: "authenticated_profile_no_business"; user: User; profile: ProfileRow; safeNextPath: "/onboarding" }
  | { status: "authenticated_ready"; user: User; profile: ProfileRow; businessId: string; safeNextPath: string }
  | { status: "stale_session"; reason: string; safeNextPath: "/auth/recover-session" }
  | { status: "temporary_auth_failure"; reason: string; safeNextPath: "/login" }
  | { status: "unexpected_auth_failure"; reason: string; safeNextPath: "/login" };

type ResolveAuthStateOptions = {
  includeProfile?: boolean;
  includeBusiness?: boolean;
  intent?: AuthIntent;
};

function isConfirmed(user: User) {
  return Boolean(user.email_confirmed_at || user.confirmed_at || user.phone_confirmed_at);
}

async function findAccessibleBusinessId(profileId: string) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data: ownedBusiness, error: ownerError } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ownerError) {
    console.error("auth_state_business_owner_lookup_failed", { code: ownerError.code });
    throw new Error("business_lookup_failed");
  }

  if (ownedBusiness?.id) {
    return String(ownedBusiness.id);
  }

  const { data: membership, error: membershipError } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("profile_id", profileId)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error("auth_state_business_membership_lookup_failed", { code: membershipError.code });
    throw new Error("business_lookup_failed");
  }

  return membership?.business_id ? String(membership.business_id) : null;
}

export const resolveAuthState = cache(async function resolveAuthState(options: ResolveAuthStateOptions = {}): Promise<AuthStateResult> {
  if (!isSupabaseConfigured) {
    return { status: "anonymous", safeNextPath: "/login" };
  }

  const auth = await resolveCurrentAuthUser();

  if (auth.status === "anonymous") {
    return { status: "anonymous", safeNextPath: "/login" };
  }

  if (auth.status === "stale_session") {
    return { status: "stale_session", reason: auth.reason, safeNextPath: "/auth/recover-session" };
  }

  if (auth.status === "temporary_failure") {
    return { status: "temporary_auth_failure", reason: auth.reason, safeNextPath: "/login" };
  }

  if (auth.status === "unexpected_failure") {
    return { status: "unexpected_auth_failure", reason: auth.reason, safeNextPath: "/login" };
  }

  if (!isConfirmed(auth.user)) {
    return { status: "authenticated_unconfirmed", user: auth.user, safeNextPath: "/verify-email" };
  }

  if (!options.includeProfile) {
    return { status: "authenticated_ready", user: auth.user, profile: null as never, businessId: "", safeNextPath: "/auth/bootstrap" };
  }

  let profile: ProfileRow;
  try {
    profile = await getOrCreateProfile(auth.user);
  } catch (error) {
    const reason = error instanceof ProfileInitializationError ? error.category : "profile_unexpected_failure";
    console.error("auth_state_profile_bootstrap_failed", {
      reason,
      phase: error instanceof ProfileInitializationError ? error.phase : "profile_insert",
      code: error instanceof ProfileInitializationError ? error.code : "none"
    });
    return { status: "authenticated_no_profile", user: auth.user, reason, safeNextPath: "/auth/bootstrap" };
  }

  if (!options.includeBusiness) {
    return { status: "authenticated_profile_no_business", user: auth.user, profile, safeNextPath: "/onboarding" };
  }

  let businessId: string | null;
  try {
    businessId = await findAccessibleBusinessId(profile.id);
  } catch {
    return { status: "unexpected_auth_failure", reason: "business_lookup_failed", safeNextPath: "/login" };
  }

  if (!businessId) {
    return { status: "authenticated_profile_no_business", user: auth.user, profile, safeNextPath: "/onboarding" };
  }

  return {
    status: "authenticated_ready",
    user: auth.user,
    profile,
    businessId,
    safeNextPath: destinationForAuthIntent(options.intent ?? "login", await getPostBusinessDestination())
  };
});

export async function resolveAuthPageState() {
  const state = await resolveAuthState({ includeProfile: false, includeBusiness: false });
  if (state.status === "authenticated_ready") {
    return { status: "authenticated" as const, email: state.user.email ?? "contul curent" };
  }

  return state;
}
