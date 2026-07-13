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
  children: React.ReactNode;
  businessName?: string;
  userEmail?: string;
  userName?: string;
  isDemo?: boolean;
  primaryItems?: NavigationItem[];
  utilityItems?: NavigationItem[];
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <Sidebar primaryItems={primaryItems} utilityItems={utilityItems} />
      <div className="min-w-0 xl:pl-[248px]">
        <AppHeader businessName={businessName} userEmail={userEmail} userName={userName} isDemo={isDemo} primaryItems={primaryItems} utilityItems={utilityItems} />
        {children}
      </div>
      <MobileNav items={primaryItems} />
    </div>
  );
}
