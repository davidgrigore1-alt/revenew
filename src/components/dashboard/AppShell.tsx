import { AppHeader } from "@/components/dashboard/AppHeader";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { Sidebar } from "@/components/dashboard/Sidebar";

export function AppShell({ children, businessName, isDemo = false }: { children: React.ReactNode; businessName?: string; isDemo?: boolean }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-ink-950/65">
      <Sidebar />
      <div className="min-w-0 xl:pl-72">
        <AppHeader businessName={businessName} isDemo={isDemo} />
        {children}
      </div>
      <MobileNav />
    </div>
  );
}
