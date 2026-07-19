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
  shortName?: string;
};

export type NavigationGroupId = "control" | "commercial-flow" | "relationships" | "execution" | "management" | "utility";

export type NavigationGroup = {
  id: NavigationGroupId;
  label: string;
  items: NavigationItem[];
};

export const primaryNavigation = [
  { name: "Control Center", shortName: "Acasă", href: "/dashboard", icon: "home", permission: "dashboard.read" },
  { name: "Inbox Comercial", shortName: "Inbox", href: "/inbox", icon: "inbox-stack", description: "Revizuiește semnalele înainte de a le transforma în oportunități.", permission: "signals.read" },
  { name: "Activitatea mea", shortName: "Activitate", href: "/today", icon: "clipboard-check", permission: "actions.read" },
  { name: "Recuperare venituri", shortName: "Recuperare", href: "/recoverable", icon: "banknotes", description: "Prioritizează oportunitățile fără responsabil, termen sau următoarea acțiune.", permission: "opportunities.read" },
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
  { name: "Verifică potențialul", href: "/opportunities/analyze", icon: "sparkles", description: "Transformă o cerere într-o oportunitate verificată.", permission: "opportunities.analyze" },
  { name: "Lead-uri", href: "/leads", icon: "user-group", description: "Gestionează companii și contacte comerciale.", permission: "workspace.read" },
  { name: "Outreach", href: "/outreach", icon: "megaphone", description: "Lucrează mesajele și comunicarea comercială.", permission: "documents.read" },
  { name: "Rapoarte detaliate", href: "/reports", icon: "chart-bar", description: "Deschide raportarea completă și exporturile.", permission: "reports.read" },
  { name: "Instrumente", href: "/tools", icon: "puzzle", description: "Accesează module operaționale și interne permise.", permission: "workspace.read" },
  { name: "Demo", href: "/demo", icon: "clipboard-check", description: "Instrumente de prezentare și scenarii demo.", permission: "platform.internal_tools.access" },
  { name: "Admin", href: "/admin", icon: "shield-check", description: "Zonă administrativă pentru operare internă.", permission: "platform.admin.access" }
] satisfies NavigationItem[];

export const dashboardNavigation = [...primaryNavigation, ...utilityNavigation, ...advancedNavigation] satisfies NavigationItem[];

const groupDefinitions: Array<{ id: NavigationGroupId; label: string; hrefs: string[] }> = [
  { id: "control", label: "Control", hrefs: ["/dashboard", "/today"] },
  { id: "commercial-flow", label: "Flux comercial", hrefs: ["/inbox", "/opportunities", "/recoverable", "/pipeline"] },
  { id: "relationships", label: "Relații", hrefs: ["/companies", "/contacts"] },
  { id: "execution", label: "Execuție", hrefs: ["/outreach"] },
  { id: "management", label: "Management", hrefs: ["/reports"] },
  { id: "utility", label: "Utilitare", hrefs: ["/settings", "/help"] }
];

export function groupNavigationItems(items: NavigationItem[]): NavigationGroup[] {
  const availableItems = new Map(items.map((item) => [item.href, item]));

  return groupDefinitions
    .map((group) => ({
      id: group.id,
      label: group.label,
      items: group.hrefs.flatMap((href) => {
        const item = availableItems.get(href);
        return item ? [item] : [];
      })
    }))
    .filter((group) => group.items.length > 0);
}

const sectionRouteMappings: Array<{ href: string; routePrefixes: string[] }> = [
  { href: "/companies", routePrefixes: ["/companies", "/crm/organizations"] },
  { href: "/contacts", routePrefixes: ["/contacts", "/crm/contacts"] },
  { href: "/opportunities", routePrefixes: ["/opportunities"] },
  { href: "/recoverable", routePrefixes: ["/recoverable"] }
];

function matchesRoutePrefix(pathname: string, routePrefix: string) {
  return pathname === routePrefix || pathname.startsWith(`${routePrefix}/`);
}

export function getActiveNavigationHref(pathname: string) {
  if (pathname === "/dashboard") return "/dashboard";

  const mappedSection = sectionRouteMappings.find(({ routePrefixes }) =>
    routePrefixes.some((routePrefix) => matchesRoutePrefix(pathname, routePrefix))
  );

  if (mappedSection) return mappedSection.href;

  const directItem = dashboardNavigation.find((item) =>
    item.href !== "/dashboard" && matchesRoutePrefix(pathname, item.href)
  );

  return directItem?.href ?? null;
}

export function isNavItemActive(pathname: string, href: string) {
  return getActiveNavigationHref(pathname) === href;
}
