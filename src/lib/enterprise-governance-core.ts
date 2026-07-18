export const enterpriseMemberRoles = ["admin", "manager", "member", "viewer"] as const;
export type EnterpriseMemberRole = (typeof enterpriseMemberRoles)[number];
export type EnterprisePolicyLevel = "existing_approval" | "manager_required" | "dual_control";
export type OutcomePolicyLevel = "member_confirmation" | "manager_required" | "dual_control";

export const enterpriseRoleLabels: Record<string, string> = {
  owner: "Proprietar", admin: "Administrator", manager: "Manager", member: "Membru comercial", viewer: "Vizualizator"
};

export const governanceDefaults = {
  liveEmailApprovalPolicy: "existing_approval" as EnterprisePolicyLevel,
  outcomeApprovalPolicy: "member_confirmation" as OutcomePolicyLevel,
  confirmedRevenueThreshold: 0,
  assignmentPolicy: "members_self_assign" as "members_self_assign" | "managers_only",
  invitationExpiryHours: 72 as 24 | 72 | 168 | 336
};

export function normalizeInvitationEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidInvitationEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeInvitationEmail(value)) && normalizeInvitationEmail(value).length <= 320;
}

export function isSafeInternalRedirect(value: string | null | undefined) {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !/[\r\n]/.test(value));
}

export function requiresManagedApproval(policy: EnterprisePolicyLevel | OutcomePolicyLevel, actorRole: string | null) {
  if (policy === "existing_approval" || policy === "member_confirmation") return false;
  if (policy === "dual_control") return true;
  return !["business_owner", "business_admin", "business_manager"].includes(actorRole ?? "");
}

export function requiresRevenueApproval(amount: number, threshold: number, actorRole: string | null) {
  return amount > threshold && !["business_owner", "business_admin", "business_manager"].includes(actorRole ?? "");
}

export function invitationStatus(status: string, expiresAt: string) {
  return status === "pending" && Date.parse(expiresAt) <= Date.now() ? "expired" : status;
}
