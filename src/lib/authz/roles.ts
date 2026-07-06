export const PLATFORM_ROLES = ["platform_admin", "platform_operator", "platform_developer"] as const;
export const BUSINESS_ROLES = ["business_owner", "business_admin", "business_member", "business_viewer"] as const;
export const DATABASE_BUSINESS_MEMBER_ROLES = ["owner", "admin", "member", "viewer"] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];
export type BusinessRole = (typeof BUSINESS_ROLES)[number];
export type DatabaseBusinessMemberRole = (typeof DATABASE_BUSINESS_MEMBER_ROLES)[number];

export function isPlatformRole(value: unknown): value is PlatformRole {
  return typeof value === "string" && PLATFORM_ROLES.includes(value as PlatformRole);
}

export function mapDatabaseBusinessRole(value: string | null | undefined): BusinessRole | null {
  if (value === "owner") return "business_owner";
  if (value === "admin") return "business_admin";
  if (value === "member") return "business_member";
  if (value === "viewer") return "business_viewer";
  return null;
}
