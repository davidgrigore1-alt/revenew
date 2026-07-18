import "server-only";
import { cache } from "react";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingRelationError, toSafeDatabaseErrorMessage } from "@/lib/supabase/database-errors";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { businessRolePermissions, platformRolePermissions } from "@/lib/authz/role-permissions";
import { isPlatformRole, mapDatabaseBusinessRole, type BusinessRole, type PlatformRole } from "@/lib/authz/roles";
import type { Permission } from "@/lib/authz/permissions";

let platformRoleSchemaWarningLogged = false;

export type AuthorizationContext = {
  authenticated: boolean;
  profileId: string | null;
  userId: string | null;
  email: string | null;
  platformRoles: PlatformRole[];
  businessRole: BusinessRole | null;
  permissions: Permission[];
  legacyProfileRole: string | null;
};

function uniquePermissions(values: Permission[]) {
  return Array.from(new Set(values));
}

async function getPlatformRoles(profileId: string): Promise<PlatformRole[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("platform_user_roles")
    .select("role")
    .eq("profile_id", profileId)
    .eq("is_active", true)
    .is("revoked_at", null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  if (error) {
    if (isMissingRelationError(error, "platform_user_roles")) {
      if (!platformRoleSchemaWarningLogged) {
        platformRoleSchemaWarningLogged = true;
        console.warn("platform_role_schema_unavailable", { code: toSafeDatabaseErrorMessage(error) });
      }
      return [];
    }

    console.error("platform_role_lookup_failed", { code: toSafeDatabaseErrorMessage(error) });
    throw new Error("Platform role lookup failed.");
  }

  return (data ?? []).map((row) => row.role).filter(isPlatformRole);
}

async function getBusinessRole(profileId: string): Promise<BusinessRole | null> {
  const current = await getCurrentBusinessForUser({ redirectIfMissing: false });
  if (!current) return null;

  if (current.business.owner_profile_id === profileId) {
    return "business_owner";
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("business_members")
    .select("role,status")
    .eq("business_id", current.business.id)
    .eq("profile_id", profileId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(`Business role lookup error: ${error.message}`);
  }

  return mapDatabaseBusinessRole(data?.role);
}

export const getAuthorizationContext = cache(async function getAuthorizationContext(): Promise<AuthorizationContext> {
  if (!isSupabaseConfigured) {
    return {
      authenticated: false,
      profileId: null,
      userId: null,
      email: null,
      platformRoles: [],
      businessRole: null,
      permissions: ["workspace.read", "dashboard.read", "settings.read", "usage.read"],
      legacyProfileRole: null
    };
  }

  const { authUser, profile } = await getCurrentProfile();
  if (!authUser || !profile) {
    return {
      authenticated: false,
      profileId: null,
      userId: null,
      email: null,
      platformRoles: [],
      businessRole: null,
      permissions: [],
      legacyProfileRole: null
    };
  }

  const [platformRoles, businessRole] = await Promise.all([getPlatformRoles(profile.id), getBusinessRole(profile.id)]);
  const permissions = uniquePermissions([
    ...platformRoles.flatMap((role) => platformRolePermissions[role]),
    ...(businessRole ? businessRolePermissions[businessRole] : [])
  ]);

  return {
    authenticated: true,
    profileId: profile.id,
    userId: authUser.id,
    email: profile.email,
    platformRoles,
    businessRole,
    permissions,
    legacyProfileRole: null
  };
});
