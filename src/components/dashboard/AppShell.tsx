import type { ReactNode } from "react";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { BuyerDemoRail } from "@/components/demo/BuyerDemoRail";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { GuidedProductTour } from "@/components/guidance/GuidedProductTour";
import { ContextualAssistant } from "@/components/guidance/ContextualAssistant";
import { ToastProvider } from "@/components/ui/ToastProvider";
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
    <ToastProvider>
    <div className="product-desktop min-h-dvh overflow-x-hidden bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <a href="#app-content" className="focus-ring fixed left-3 top-3 z-[100] -translate-y-20 rounded-button border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-elevated))] px-4 py-2 text-sm font-semibold text-[rgb(var(--foreground))] shadow-modal transition-transform focus:translate-y-0">
        Sari la conținut
      </a>
      <Sidebar primaryItems={primaryItems} utilityItems={utilityItems} businessName={businessName} userEmail={userEmail} userName={userName} isDemo={isDemo} />
      <div className="min-w-0 lg:pl-[224px]">
        <AppHeader businessName={businessName} userEmail={userEmail} userName={userName} isDemo={isDemo} primaryItems={primaryItems} utilityItems={utilityItems} />
        <BuyerDemoRail />
        <main id="app-content" tabIndex={-1} className="min-w-0">
          {children}
        </main>
      </div>
      <MobileNav items={primaryItems} />
      <GuidedProductTour />
      <ContextualAssistant />
    </div>
    </ToastProvider>
  );
}
