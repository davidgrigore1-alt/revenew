import type { Permission } from "@/lib/authz/permissions";

export type NavigationIconName =
  | "banknotes"
  | "building-office"
  | "chart-bar"
  | "cog"
  | "clipboard-check"
  | "home"
  | "inbox-stack"
  | "lifebuoy"
  | "megaphone"
  | "puzzle"
  | "shield-check"
  | "sparkles"
  | "document"
  | "user-group";

export type NavigationItem = {
  name: string;
  href: string;
  icon: NavigationIconName;
  permission: Permission;
  description?: string;
};

export const primaryNavigation = [
  { name: "Acasă", href: "/dashboard", icon: "home", permission: "dashboard.read" },
  { name: "Inbox Comercial", href: "/inbox", icon: "inbox-stack", description: "Revizuiește semnalele înainte de a le transforma în oportunități.", permission: "signals.read" },
  { name: "Activitatea mea", href: "/today", icon: "clipboard-check", permission: "actions.read" },
  { name: "Pipeline", href: "/pipeline", icon: "chart-bar", permission: "opportunities.read" },
  { name: "Companii", href: "/companies", icon: "building-office", permission: "workspace.read" },
  { name: "Contacte", href: "/contacts", icon: "user-group", permission: "workspace.read" },
  { name: "Oportunități", href: "/opportunities", icon: "sparkles", permission: "opportunities.read" },
  { name: "Documente", href: "/outreach", icon: "document", permission: "documents.read" },
  { name: "Rapoarte", href: "/reports", icon: "chart-bar", permission: "reports.read" }
] satisfies NavigationItem[];

export const utilityNavigation = [
  { name: "Setări", href: "/settings", icon: "cog", permission: "settings.read" },
  { name: "Ajutor", href: "/help", icon: "lifebuoy", permission: "workspace.read" }
] satisfies NavigationItem[];

export const advancedNavigation = [
  { name: "Bani recuperabili", href: "/recoverable", icon: "banknotes", description: "Vezi valoarea recuperabilă și cererile active.", permission: "opportunities.read" },
  { name: "Verifică potențialul", href: "/opportunities/analyze", icon: "sparkles", description: "Transformă o cerere într-o oportunitate verificată.", permission: "opportunities.analyze" },
  { name: "Lead-uri", href: "/leads", icon: "user-group", description: "Gestionează companii și contacte comerciale.", permission: "workspace.read" },
  { name: "Outreach", href: "/outreach", icon: "megaphone", description: "Lucrează mesajele și comunicarea comercială.", permission: "documents.read" },
  { name: "Rapoarte detaliate", href: "/reports", icon: "chart-bar", description: "Deschide raportarea completă și exporturile.", permission: "reports.read" },
  { name: "Instrumente", href: "/tools", icon: "puzzle", description: "Accesează module operaționale și interne permise.", permission: "workspace.read" },
  { name: "Demo", href: "/demo", icon: "clipboard-check", description: "Instrumente de prezentare și scenarii demo.", permission: "platform.internal_tools.access" },
  { name: "Admin", href: "/admin", icon: "shield-check", description: "Zonă administrativă pentru operare internă.", permission: "platform.admin.access" }
] satisfies NavigationItem[];

export const dashboardNavigation = [...primaryNavigation, ...utilityNavigation, ...advancedNavigation] satisfies NavigationItem[];

export function isNavItemActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}
