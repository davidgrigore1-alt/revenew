import { ShellNavigation } from "@/components/dashboard/ShellNavigation";
import { Logo } from "@/components/ui/Logo";
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
  const displayName = businessName ? (isDemo ? `Demo · ${businessName}` : businessName) : "Workspace activ";

  return (
    <aside className="app-scrollbar fixed inset-y-0 left-0 z-40 hidden w-[260px] overflow-y-auto border-r border-[rgb(var(--border))] bg-[rgb(var(--sidebar))] lg:flex lg:flex-col" aria-label="Navigare ReveNew">
      <div className="border-b border-[rgb(var(--border))] px-5 py-4">
        <Logo href="/dashboard" />
      </div>

      <div className="mx-3 mt-3 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-3 py-2.5">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Workspace</p>
        <p className="mt-1 truncate text-sm font-semibold text-[rgb(var(--foreground))]" title={displayName}>{displayName}</p>
      </div>

      <div className="min-h-0 flex-1 px-3 py-4">
        <ShellNavigation items={[...primaryItems, ...utilityItems]} />
      </div>
    </aside>
  );
}
