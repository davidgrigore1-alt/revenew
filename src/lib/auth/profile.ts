import "server-only";
import { randomUUID } from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { classifyAuthError, hasPersistedSupabaseAuthCookie, staleSessionCleanupPath, type AuthUserResolution } from "@/lib/auth/session-errors";
import { safeProfileInitializationMessage } from "@/lib/supabase/database-errors";
import { isSupabaseConfigured } from "@/lib/supabase/status";

export type ProfileRow = {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
};

export type ProfileBootstrapPhase = "profile_client" | "profile_lookup" | "profile_insert" | "profile_reload" | "legacy_profile_lookup" | "legacy_profile_repair";

export type ProfileBootstrapCategory =
  | "profile_create_required"
  | "profile_unique_conflict"
  | "profile_role_constraint_failure"
  | "profile_not_null_constraint_failure"
  | "profile_rls_denied"
  | "profile_schema_mismatch"
  | "profile_multiple_rows"
  | "profile_temporary_database_failure"
  | "profile_unexpected_failure";

type SupabaseProfileError = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

type ProfileInsertPayload = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
};

export class ProfileInitializationError extends Error {
  phase: ProfileBootstrapPhase;
  category: ProfileBootstrapCategory;
  code: string;

  constructor({
    phase,
    category,
    code = "none",
    message = safeProfileInitializationMessage
  }: {
    phase: ProfileBootstrapPhase;
    category: ProfileBootstrapCategory;
    code?: string;
    message?: string;
  }) {
    super(message);
    this.name = "ProfileInitializationError";
    this.phase = phase;
    this.category = category;
    this.code = code;
  }
}

function fallbackName(authUser: User, fullName?: string) {
  return (
    fullName?.trim() ||
    String(authUser.user_metadata?.full_name ?? "").trim() ||
    authUser.email?.split("@")[0] ||
    "Utilizator ReveNew"
  );
}

function asSupabaseProfileError(error: unknown): SupabaseProfileError | null {
  return error && typeof error === "object" ? (error as SupabaseProfileError) : null;
}

function errorText(error: unknown) {
  const candidate = asSupabaseProfileError(error);
  return [candidate?.message, candidate?.details, candidate?.hint]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function profileErrorCode(error: unknown) {
  const candidate = asSupabaseProfileError(error);
  return typeof candidate?.code === "string" ? candidate.code : "none";
}

function classifyProfileBootstrapError(error: unknown): ProfileBootstrapCategory {
  const code = profileErrorCode(error);
  const text = errorText(error);

  if (code === "23505") return "profile_unique_conflict";
  if (code === "42501" || code === "PGRST301") return "profile_rls_denied";
  if (code === "PGRST116" && text.includes("multiple")) return "profile_multiple_rows";
  if (code === "PGRST116") return "profile_unexpected_failure";
  if (code === "42P01" || code === "PGRST205" || code === "42703") return "profile_schema_mismatch";
  if (code === "57014" || code.startsWith("08")) return "profile_temporary_database_failure";
  if (code === "23514" && (text.includes("profiles_role_check") || text.includes("role"))) return "profile_role_constraint_failure";
  if (code === "23502") return text.includes("role") ? "profile_role_constraint_failure" : "profile_not_null_constraint_failure";
  if (code === "23514") return "profile_not_null_constraint_failure";

  return "profile_unexpected_failure";
}

function profileInsertPayload(authUser: User, fullName?: string): ProfileInsertPayload {
  return {
    id: randomUUID(),
    user_id: authUser.id,
    full_name: fallbackName(authUser, fullName),
    email: (authUser.email ?? "").trim().toLowerCase()
  };
}

function logProfileBootstrapFailure({
  phase,
  error,
  profileFound,
  profileCreationAttempted,
  referenceId
}: {
  phase: ProfileBootstrapPhase;
  error: unknown;
  profileFound: boolean;
  profileCreationAttempted: boolean;
  referenceId: string;
}) {
  console.error("profile_bootstrap_failed", {
    phase,
    category: classifyProfileBootstrapError(error),
    code: profileErrorCode(error),
    hasAuthenticatedUser: true,
    profileFound,
    profileCreationAttempted,
    referenceId
  });
}

export const resolveCurrentAuthUser = cache(async function resolveCurrentAuthUser(): Promise<AuthUserResolution> {
  if (!isSupabaseConfigured) {
    return { status: "anonymous" };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { status: "anonymous" };
  }

  const hasPersistedSession = hasPersistedSupabaseAuthCookie(cookies().getAll());

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    const classified = classifyAuthError(error, { hasPersistedSession });

    if (classified.status === "anonymous") {
      return classified;
    }

    if (classified.status === "stale_session") {
      console.warn("auth_stale_session_detected", { reason: classified.reason });
      return classified;
    }

    console.error("auth_user_lookup_failed", { status: classified.status, reason: classified.reason });
    return classified;
  }

  return user ? { status: "authenticated", user } : { status: "anonymous" };
});

export async function getCurrentAuthUser() {
  const result = await resolveCurrentAuthUser();

  if (result.status === "authenticated") {
    return result.user;
  }

  if (result.status === "anonymous") {
    return null;
  }

  if (result.status === "stale_session") {
    redirect(staleSessionCleanupPath());
  }

  throw new Error("Autentificarea nu este disponibilă momentan. Încearcă din nou în câteva momente.");
}

async function findProfileByUserId(client: NonNullable<ReturnType<typeof createSupabaseServerClient>>, userId: string) {
  return client.from("profiles").select("id,user_id,full_name,email").eq("user_id", userId).maybeSingle();
}

async function repairLegacyProfileByEmail(authUser: User, fullName?: string) {
  const admin = createSupabaseAdminClient();
  const email = (authUser.email ?? "").trim().toLowerCase();
  const referenceId = randomUUID();

  if (!admin || !email) {
    return null;
  }

  const { data: legacyProfile, error: lookupError } = await admin
    .from("profiles")
    .select("id,user_id,full_name,email")
    .eq("email", email)
    .is("user_id", null)
    .maybeSingle();

  if (lookupError) {
    logProfileBootstrapFailure({
      phase: "legacy_profile_lookup",
      error: lookupError,
      profileFound: false,
      profileCreationAttempted: false,
      referenceId
    });
    return null;
  }

  if (!legacyProfile) {
    return null;
  }

  const { data, error } = await admin
    .from("profiles")
    .update({ user_id: authUser.id, email, full_name: legacyProfile.full_name || fallbackName(authUser, fullName) })
    .eq("id", legacyProfile.id)
    .select("id,user_id,full_name,email")
    .single();

  if (error || !data) {
    logProfileBootstrapFailure({
      phase: "legacy_profile_repair",
      error,
      profileFound: true,
      profileCreationAttempted: false,
      referenceId
    });
    return null;
  }

  return data as ProfileRow;
}

async function rereadProfileAfterConflict(client: NonNullable<ReturnType<typeof createSupabaseServerClient>>, authUser: User, fullName: string | undefined) {
  const retry = await findProfileByUserId(client, authUser.id);
  if (!retry.error && retry.data) {
    return retry.data as ProfileRow;
  }

  return repairLegacyProfileByEmail(authUser, fullName);
}

async function insertProfile(
  client: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  authUser: User,
  fullName: string | undefined,
  referenceId: string
) {
  const payload = profileInsertPayload(authUser, fullName);

  const inserted = await client
    .from("profiles")
    .insert(payload)
    .select("id,user_id,full_name,email")
    .single();

  if (!inserted.error && inserted.data) {
    return inserted.data as ProfileRow;
  }

  if (profileErrorCode(inserted.error) === "23505") {
    const conflictedProfile = await rereadProfileAfterConflict(client, authUser, fullName);
    if (conflictedProfile) {
      return conflictedProfile;
    }
  }

  logProfileBootstrapFailure({
    phase: "profile_insert",
    error: inserted.error,
    profileFound: false,
    profileCreationAttempted: true,
    referenceId
  });
  throw new ProfileInitializationError({
    phase: "profile_insert",
    category: classifyProfileBootstrapError(inserted.error),
    code: profileErrorCode(inserted.error)
  });
}

export async function getOrCreateProfile(authUser: User, fullName?: string) {
  const supabase = createSupabaseServerClient();
  const referenceId = randomUUID();

  if (!supabase) {
    throw new ProfileInitializationError({
      phase: "profile_client",
      category: "profile_schema_mismatch",
      code: "supabase_client_unavailable"
    });
  }

  const byUserId = await findProfileByUserId(supabase, authUser.id);

  if (byUserId.error) {
    const category = classifyProfileBootstrapError(byUserId.error);
    logProfileBootstrapFailure({
      phase: "profile_lookup",
      error: byUserId.error,
      profileFound: false,
      profileCreationAttempted: false,
      referenceId
    });
    throw new ProfileInitializationError({ phase: "profile_lookup", category, code: profileErrorCode(byUserId.error) });
  }

  if (byUserId.data) {
    return byUserId.data as ProfileRow;
  }

  console.info("profile_bootstrap_state", {
    phase: "profile_lookup",
    category: "profile_create_required",
    hasAuthenticatedUser: true,
    profileFound: false,
    profileCreationAttempted: false,
    referenceId
  });

  return insertProfile(supabase, authUser, fullName, referenceId);
}

export const getCurrentProfile = cache(async function getCurrentProfile() {
  const authUser = await getCurrentAuthUser();
  if (!authUser) {
    return { authUser: null, profile: null };
  }

  const profile = await getOrCreateProfile(authUser);
  return { authUser, profile };
});
