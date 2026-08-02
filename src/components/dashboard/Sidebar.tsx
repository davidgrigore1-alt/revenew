import { ShellNavigation } from "@/components/dashboard/ShellNavigation";
import { Logo } from "@/components/ui/Logo";
import { WorkspaceIdentityDisplay } from "@/components/theme/WorkspaceIdentityDisplay";
import { primaryNavigation, utilityNavigation, type NavigationItem } from "@/lib/navigation";

export function Sidebar({
  primaryItems = primaryNavigation,
  utilityItems = utilityNavigation,
  businessName,
  isDemo = false
}: {
  primaryItems?: NavigationItem[];
  utilityItems?: NavigationItem[];
  businessName?: string;
  isDemo?: boolean;
}) {
  const displayName = businessName ? (isDemo ? `Demo · ${businessName}` : businessName) : "Spațiu de lucru activ";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] overflow-hidden border-r border-[rgb(var(--border))] bg-[rgb(var(--sidebar))] lg:flex lg:flex-col" aria-label="Navigare ReveNew">
      <div className="border-b border-[rgb(var(--border))] px-4 py-2.5">
        <Logo href="/dashboard" />
      </div>

      <div className="mx-2.5 mt-1.5 rounded-control border border-[rgb(var(--primary)/0.16)] bg-[rgb(var(--surface-subtle))] px-2.5 py-1.5">
        <p className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Compania activă</p>
        <span className="mt-1.5 block"><WorkspaceIdentityDisplay fallbackName={displayName} compact showIndustry /></span>
      </div>

      <div data-sidebar-primary className="app-scrollbar min-h-0 flex-1 overflow-y-auto px-2.5 py-1.5">
        <ShellNavigation items={primaryItems} />
      </div>

      <div data-sidebar-utilities className="shrink-0 px-2.5 pb-2">
        <ShellNavigation items={utilityItems} ariaLabel="Utilitare" />
      </div>
    </aside>
  );
}
