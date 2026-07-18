"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { ShellNavigation } from "@/components/dashboard/ShellNavigation";
import { WorkspaceMenu } from "@/components/dashboard/WorkspaceMenu";
import { primaryNavigation, utilityNavigation, type NavigationItem } from "@/lib/navigation";

export function AppHeader({
  businessName,
  userEmail,
  userName,
  isDemo = false,
  primaryItems = primaryNavigation,
  utilityItems = utilityNavigation
}: {
  businessName?: string;
  userEmail?: string;
  userName?: string;
  isDemo?: boolean;
  primaryItems?: NavigationItem[];
  utilityItems?: NavigationItem[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerItems = [...primaryItems, ...utilityItems];
  const canViewSettings = utilityItems.some((item) => item.href === "/settings");
  const displayName = businessName ? (isDemo ? `Demo · ${businessName}` : businessName) : "Workspace activ";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeDrawer();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function closeDrawer() {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }

  return (
    <>
      <header className="sticky top-0 z-30 h-[60px] border-b border-[rgb(var(--border))] bg-[rgb(var(--background)/0.92)] backdrop-blur-md">
        <div className="flex h-full items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              ref={triggerRef}
              type="button"
              className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--foreground))] shadow-sm transition-colors duration-fast hover:bg-[rgb(var(--surface-muted))] lg:hidden"
              aria-label="Deschide meniul principal"
              aria-controls="mobile-navigation-drawer"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Bars3Icon className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold text-[rgb(var(--foreground))]">Spațiu de lucru comercial</p>
              <p className="truncate text-xs text-[rgb(var(--text-muted))]">{displayName}</p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <GlobalSearch />
            <WorkspaceMenu
              businessName={businessName}
              userEmail={userEmail}
              userName={userName}
              isDemo={isDemo}
              canViewSettings={canViewSettings}
            />
          </div>
        </div>
      </header>

      {open ? (
        <div id="mobile-navigation-drawer" className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-navigation-title">
          <button className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" aria-label="Închide meniul principal" type="button" onClick={closeDrawer} />
          <div className="app-scrollbar absolute inset-y-0 left-0 flex w-[min(21rem,calc(100vw-2rem))] flex-col overflow-y-auto border-r border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-modal">
            <div className="flex min-h-[60px] items-center justify-between border-b border-[rgb(var(--border))] px-4">
              <div className="min-w-0">
                <p id="mobile-navigation-title" className="text-base font-semibold text-[rgb(var(--foreground))]">ReveNew</p>
                <p className="truncate text-xs text-[rgb(var(--text-muted))]">{displayName}</p>
              </div>
              <button ref={closeRef} type="button" className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-button border border-[rgb(var(--border))] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-muted))]" aria-label="Închide meniul principal" onClick={closeDrawer}>
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 px-3 py-5">
              <ShellNavigation items={drawerItems} variant="drawer" onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
