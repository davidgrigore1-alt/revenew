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
      <div className="border-b border-[rgb(var(--border))] px-5 py-4">
        <Logo href="/dashboard" />
      </div>

      <div className="mx-3 mt-3 rounded-control border border-[rgb(var(--primary)/0.18)] bg-[rgb(var(--surface-subtle))] px-3 py-3">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Compania activă</p>
        <span className="mt-2 block"><WorkspaceIdentityDisplay fallbackName={displayName} showIndustry /></span>
      </div>

      <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <ShellNavigation items={[...primaryItems, ...utilityItems]} />
      </div>
    </aside>
  );
}
