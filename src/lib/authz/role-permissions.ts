import type { BusinessRole, PlatformRole } from "@/lib/authz/roles";
import type { Permission } from "@/lib/authz/permissions";

const businessRead: Permission[] = [
  "workspace.read", "dashboard.read", "signals.read", "opportunities.read", "actions.read", "documents.read",
  "reports.read", "settings.read", "usage.read"
];

const businessWork: Permission[] = [
  ...businessRead, "signals.create", "signals.update", "signals.convert", "signals.archive", "opportunities.create",
  "opportunities.update", "opportunities.analyze", "actions.create", "actions.update", "actions.complete",
  "documents.generate", "documents.update", "documents.mark_sent", "reports.export"
];

export const platformRolePermissions: Record<PlatformRole, Permission[]> = {
  platform_admin: ["platform.admin.access", "platform.businesses.read_all", "platform.businesses.operate", "platform.usage.read_all", "platform.audit.read", "platform.system_health.read", "platform.integrations.read", "platform.technical_diagnostics.read", "platform.subscriptions.read_all", "platform.internal_tools.access"],
  platform_operator: ["platform.businesses.operate", "platform.system_health.read", "platform.internal_tools.access"],
  platform_developer: ["platform.system_health.read", "platform.integrations.read", "platform.technical_diagnostics.read", "platform.internal_tools.access"]
};

const governanceRead: Permission[] = ["workspace.members.read", "workspace.policies.read", "approvals.read"];
const teamOperations: Permission[] = [
  ...governanceRead, "workspace.audit.read", "opportunities.assign", "opportunities.manage_all", "actions.assign",
  "outreach.approve_live", "outcomes.approve", "revenue.confirm", "reports.view_team", "approvals.decide"
];

export const businessRolePermissions: Record<BusinessRole, Permission[]> = {
  business_owner: [...businessWork, ...teamOperations, "settings.update", "members.read", "members.manage", "workspace.members.manage", "workspace.policies.manage", "integrations.manage", "billing.read", "billing.manage"],
  business_admin: [...businessWork, ...teamOperations, "settings.update", "members.read", "members.manage", "workspace.members.manage", "workspace.policies.manage", "integrations.manage", "billing.read"],
  business_manager: [...businessWork, ...teamOperations, "members.read"],
  business_member: [...businessWork, "workspace.policies.read", "approvals.read"],
  business_viewer: businessRead
};
