import "server-only";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { hasPermission } from "@/lib/authz/has-permission";
import type { Permission } from "@/lib/authz/permissions";
import { AuthorizationError } from "@/lib/authz/authorization-errors";

export async function requirePermission(permission: Permission) {
  const context = await getAuthorizationContext();
  if (!context.authenticated) {
    throw new AuthorizationError("Nu ești autentificat.");
  }
  if (!hasPermission(context, permission)) {
    throw new AuthorizationError();
  }
  return context;
}

export async function requireAnyPermission(permissions: Permission[]) {
  const context = await getAuthorizationContext();
  if (!context.authenticated) {
    throw new AuthorizationError("Nu ești autentificat.");
  }
  if (!permissions.some((permission) => hasPermission(context, permission))) {
    throw new AuthorizationError();
  }
  return context;
}
