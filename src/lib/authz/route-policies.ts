import type { Permission } from "@/lib/authz/permissions";

export const routePolicies: Array<{ prefix: string; permission: Permission }> = [
  { prefix: "/admin/businesses", permission: "platform.businesses.read_all" },
  { prefix: "/admin/usage", permission: "platform.usage.read_all" },
  { prefix: "/admin/costs", permission: "platform.usage.read_all" },
  { prefix: "/admin/audit", permission: "platform.audit.read" },
  { prefix: "/admin/system", permission: "platform.system_health.read" },
  { prefix: "/admin", permission: "platform.admin.access" },
  { prefix: "/settings", permission: "settings.read" },
  { prefix: "/reports", permission: "reports.read" },
  { prefix: "/inbox", permission: "signals.read" },
  { prefix: "/opportunities/analyze", permission: "opportunities.analyze" },
  { prefix: "/opportunities", permission: "opportunities.read" },
  { prefix: "/today", permission: "actions.read" },
  { prefix: "/results", permission: "reports.read" },
  { prefix: "/recoverable", permission: "opportunities.read" },
  { prefix: "/leads", permission: "workspace.read" },
  { prefix: "/outreach", permission: "documents.read" },
  { prefix: "/demo", permission: "platform.internal_tools.access" },
  { prefix: "/help", permission: "workspace.read" },
  { prefix: "/tools", permission: "workspace.read" },
  { prefix: "/dashboard", permission: "dashboard.read" }
];
