import type { ReactNode } from "react";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { primaryNavigation, utilityNavigation, type NavigationItem } from "@/lib/navigation";

export function AppShell({
  children,
  businessName,
  userEmail,
  userName,
  isDemo = false,
  primaryItems = primaryNavigation,
  utilityItems = utilityNavigation
}: {
  children: ReactNode;
  businessName?: string;
  userEmail?: string;
  userName?: string;
  isDemo?: boolean;
  primaryItems?: NavigationItem[];
  utilityItems?: NavigationItem[];
}) {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <a href="#app-content" className="focus-ring fixed left-3 top-3 z-[100] -translate-y-20 rounded-button bg-[rgb(var(--surface))] px-4 py-2 text-sm font-semibold text-[rgb(var(--foreground))] shadow-elevated transition-transform focus:translate-y-0">
        Sari la conținut
      </a>
      <Sidebar primaryItems={primaryItems} utilityItems={utilityItems} businessName={businessName} isDemo={isDemo} />
      <div className="min-w-0 lg:pl-[260px]">
        <AppHeader businessName={businessName} userEmail={userEmail} userName={userName} isDemo={isDemo} primaryItems={primaryItems} utilityItems={utilityItems} />
        <div id="app-content" tabIndex={-1} className="min-w-0">
          {children}
        </div>
      </div>
      <MobileNav items={primaryItems} />
    </div>
  );
}
