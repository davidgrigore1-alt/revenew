import type { AuthorizationContext } from "@/lib/authz/get-authorization-context";
import type { Permission } from "@/lib/authz/permissions";

export function hasPermission(context: AuthorizationContext, permission: Permission) {
  return context.permissions.includes(permission);
}
