export const PERMISSIONS = [
  "platform.admin.access", "platform.businesses.read_all", "platform.businesses.operate", "platform.usage.read_all",
  "platform.audit.read", "platform.system_health.read", "platform.integrations.read", "platform.technical_diagnostics.read",
  "platform.subscriptions.read_all", "platform.internal_tools.access", "workspace.read", "dashboard.read",
  "signals.read", "signals.create", "signals.update", "signals.convert", "signals.archive",
  "opportunities.read", "opportunities.create", "opportunities.update", "opportunities.analyze",
  "actions.read", "actions.create", "actions.update", "actions.complete", "documents.read", "documents.generate",
  "documents.update", "documents.mark_sent", "reports.read", "reports.export", "settings.read", "settings.update",
  "members.read", "members.manage", "billing.read", "billing.manage", "usage.read",
  "workspace.members.read", "workspace.members.manage", "workspace.policies.read", "workspace.policies.manage",
  "workspace.audit.read", "opportunities.assign", "opportunities.manage_all", "actions.assign",
  "outreach.approve_live", "outcomes.approve", "revenue.confirm", "reports.view_team", "integrations.manage",
  "approvals.read", "approvals.decide"
] as const;

export type Permission = (typeof PERMISSIONS)[number];
