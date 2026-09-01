"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bars3Icon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ShellNavigation } from "@/components/dashboard/ShellNavigation";
import { WorkspaceMenu } from "@/components/dashboard/WorkspaceMenu";
import { AssistantButton } from "@/components/guidance/ContextualAssistant";
import { ContextualHelpMenu } from "@/components/guidance/ContextualHelpMenu";
import { GLOBAL_SEARCH_OPEN_EVENT } from "@/components/search/GlobalSearch";
import { useTheme } from "@/components/theme/ThemeProvider";
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
  const drawerRef = useRef<HTMLDivElement>(null);
  const instanceId = useId();
  const drawerId = `mobile-navigation-drawer-${instanceId}`;
  const drawerTitleId = `mobile-navigation-title-${instanceId}`;
  const drawerItems = [...primaryItems, ...utilityItems];
  const { identityPreview } = useTheme();
  const canViewSettings = utilityItems.some((item) => item.href === "/settings");
  const displayName = businessName ? (isDemo ? `Demo · ${businessName}` : businessName) : "Spațiu de lucru activ";
  const resolvedDisplayName = identityPreview?.displayName || displayName;

  const closeDrawer = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;

      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([tabindex="-1"]), a[href]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter((element) => !element.hasAttribute("hidden"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDrawer, open]);

  return (
    <>
      <header className="sticky top-0 z-30 h-12 border-b border-[rgb(var(--border-subtle))] bg-[rgb(var(--surface)/0.98)]">
        <div className="flex h-full items-center justify-between gap-2 px-3 sm:gap-4 sm:px-5 lg:justify-end lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              ref={triggerRef}
              type="button"
              className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--foreground))] shadow-sm transition-colors duration-fast hover:bg-[rgb(var(--surface-muted))] lg:hidden"
              aria-label="Deschide meniul principal"
              aria-haspopup="dialog"
              aria-controls={drawerId}
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Bars3Icon className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="hidden min-w-0 sm:block lg:hidden">
              <p className="text-[0.6875rem] font-medium text-[rgb(var(--text-faint))]">Spațiu de lucru</p>
              <p className="max-w-[18rem] truncate text-sm font-semibold text-[rgb(var(--foreground))]" title={resolvedDisplayName}>{resolvedDisplayName}</p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-button text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))] lg:hidden"
              aria-label="Caută în spațiul de lucru"
              aria-haspopup="dialog"
              onClick={() => window.dispatchEvent(new Event(GLOBAL_SEARCH_OPEN_EVENT))}
            >
              <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <AssistantButton />
            <div className="lg:hidden">
              <WorkspaceMenu
                businessName={businessName}
                userEmail={userEmail}
                userName={userName}
                isDemo={isDemo}
                canViewSettings={canViewSettings}
              />
            </div>
            <ContextualHelpMenu className="hidden lg:block" />
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button tabIndex={-1} className="absolute inset-0 bg-black/68" aria-label="Închide meniul principal" type="button" onClick={closeDrawer} />
          <div ref={drawerRef} id={drawerId} className="app-scrollbar absolute inset-y-0 left-0 flex w-[min(21rem,calc(100vw-2rem))] flex-col overflow-y-auto border-r border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-elevated))] shadow-modal" role="dialog" aria-modal="true" aria-labelledby={drawerTitleId}>
            <div className="flex min-h-12 items-center justify-between border-b border-[rgb(var(--border))] px-4">
              <div className="min-w-0">
                <p id={drawerTitleId} className="text-base font-semibold text-[rgb(var(--foreground))]">ReveNew</p>
                <p className="truncate text-xs text-[rgb(var(--text-muted))]" title={resolvedDisplayName}>{resolvedDisplayName}</p>
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
