"use client";

import Link from "next/link";
import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { ArrowRightOnRectangleIcon, ChevronUpDownIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import { useTheme } from "@/components/theme/ThemeProvider";
import { WorkspaceIdentityMark } from "@/components/theme/WorkspaceIdentityMark";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/status";

type WorkspaceMenuProps = {
  businessName?: string;
  userEmail?: string;
  userName?: string;
  isDemo?: boolean;
  canViewSettings?: boolean;
  variant?: "header" | "sidebar";
};

export function WorkspaceMenu({ businessName, userEmail, userName, isDemo = false, canViewSettings = true, variant = "header" }: WorkspaceMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const initialFocusRef = useRef<"first" | "last">("first");
  const menuId = useId();
  const { identityPreview } = useTheme();
  const displayName = businessName ? (isDemo ? `Demo · ${businessName}` : businessName) : "Spațiu de lucru activ";
  const resolvedDisplayName = identityPreview?.displayName || displayName;
  const identity = userName || userEmail || "Cont ReveNew";

  function getMenuItems() {
    return Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []);
  }

  useEffect(() => {
    if (!open) return;

    const animationFrame = window.requestAnimationFrame(() => {
      const items = getMenuItems();
      const item = initialFocusRef.current === "last" ? items.at(-1) : items[0];
      item?.focus();
    });

    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    initialFocusRef.current = event.key === "ArrowUp" ? "last" : "first";
    setOpen(true);
  }

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = getMenuItems();
    if (items.length === 0) return;

    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Home") {
      items[0]?.focus();
      return;
    }
    if (event.key === "End") {
      items.at(-1)?.focus();
      return;
    }

    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = currentIndex < 0
      ? (direction === 1 ? 0 : items.length - 1)
      : (currentIndex + direction + items.length) % items.length;
    items[nextIndex]?.focus();
  }

  async function logout() {
    if (isSupabaseConfigured) {
      const supabase = createSupabaseBrowserClient();
      await supabase?.auth.signOut();
    }

    window.location.href = "/auth/logout";
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          initialFocusRef.current = "first";
          setOpen((current) => !current);
        }}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "focus-ring flex h-10 items-center justify-center rounded-control text-left transition-colors duration-fast hover:bg-[rgb(var(--surface-subtle))]",
          variant === "sidebar"
            ? "w-full justify-start gap-2.5 px-2"
            : "w-10 border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-sm hover:border-[rgb(var(--border-strong))] md:w-[220px] md:justify-start md:gap-2.5 md:px-2.5"
        )}
        aria-label={`Cont și spațiu de lucru: ${resolvedDisplayName}`}
        title={`${resolvedDisplayName} · ${identity}`}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-expanded={open}
      >
        <WorkspaceIdentityMark displayName={resolvedDisplayName} initials={identityPreview?.initials} compact />
        <span className={cn("min-w-0 flex-1", variant === "header" && "hidden md:block")}>
          <span className="block truncate text-sm font-semibold text-[rgb(var(--foreground))]" title={resolvedDisplayName}>{resolvedDisplayName}</span>
          <span className="block truncate text-[0.6875rem] text-[rgb(var(--text-muted))]" title={identity}>{identity}</span>
        </span>
        <ChevronUpDownIcon className={cn("h-4 w-4 shrink-0 text-[rgb(var(--text-faint))]", variant === "header" && "hidden md:block")} aria-hidden="true" />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Cont și spațiu de lucru"
          onKeyDown={handleMenuKeyDown}
          onBlurCapture={(event) => {
            if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
            setOpen(false);
          }}
          className={cn("absolute top-11 z-50 w-[min(17.5rem,calc(100vw-1.5rem))] rounded-card border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-elevated))] p-1.5 shadow-modal", variant === "sidebar" ? "left-0" : "right-0")}
        >
          <div className="flex min-w-0 items-center gap-2.5 px-2.5 py-2">
            <WorkspaceIdentityMark displayName={resolvedDisplayName} initials={identityPreview?.initials} />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[rgb(var(--foreground))]" title={resolvedDisplayName}>{resolvedDisplayName}</p><p className="mt-0.5 truncate text-xs text-[rgb(var(--text-secondary))]" title={userEmail || identity}>{userEmail || identity}</p></div>
          </div>

          <div className="mt-1 grid gap-0.5 border-t border-[rgb(var(--border))] pt-1.5">
            {canViewSettings ? (
              <Link role="menuitem" tabIndex={-1} href="/settings" onClick={() => setOpen(false)} className="focus-ring flex min-h-9 items-center gap-2 rounded-control px-2.5 py-1.5 text-sm font-medium text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]">
                <Cog6ToothIcon className="h-4 w-4 shrink-0 text-[rgb(var(--text-faint))]" aria-hidden="true" />
                Setări spațiu de lucru
              </Link>
            ) : null}
            <button role="menuitem" tabIndex={-1} type="button" onClick={logout} className="focus-ring flex min-h-9 w-full items-center gap-2 rounded-control px-2.5 py-1.5 text-left text-sm font-medium text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]">
              <ArrowRightOnRectangleIcon className="h-4 w-4 shrink-0 text-[rgb(var(--text-faint))]" aria-hidden="true" />
              Ieșire din cont
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
