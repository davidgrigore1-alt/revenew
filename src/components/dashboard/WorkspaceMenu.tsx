"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRightOnRectangleIcon, CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/outline";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/status";

type WorkspaceMenuProps = {
  businessName?: string;
  userEmail?: string;
  userName?: string;
  isDemo?: boolean;
  canViewSettings?: boolean;
};

const themeOptions = [
  { value: "system", label: "Sistem" },
  { value: "light", label: "Luminos" },
  { value: "dark", label: "Întunecat" }
] as const;

export function WorkspaceMenu({ businessName, userEmail, userName, isDemo = false, canViewSettings = true }: WorkspaceMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { theme, setTheme } = useTheme();
  const displayName = businessName ? (isDemo ? `Demo · ${businessName}` : businessName) : "Spațiu de lucru activ";
  const identity = userName || userEmail || "Cont ReveNew";
  const initial = (businessName || userName || userEmail || "R").slice(0, 1).toUpperCase();

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
        onClick={() => setOpen((current) => !current)}
        className="focus-ring flex h-10 w-10 items-center justify-center rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-left shadow-sm transition-colors duration-fast hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-muted))] md:w-[220px] md:justify-start md:gap-2.5 md:px-2.5"
        aria-label={`Cont și spațiu de lucru: ${displayName}`}
        aria-haspopup="dialog"
        aria-controls="workspace-account-menu"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-[rgb(var(--brand-50))] text-xs font-bold text-[rgb(var(--brand-800))] dark:bg-[rgb(var(--brand-950))] dark:text-[rgb(var(--brand-300))]">
          {initial}
        </span>
        <span className="hidden min-w-0 flex-1 md:block">
          <span className="block truncate text-sm font-semibold text-[rgb(var(--foreground))]">{displayName}</span>
          <span className="block truncate text-[0.6875rem] text-[rgb(var(--text-muted))]">{identity}</span>
        </span>
        <ChevronUpDownIcon className="hidden h-4 w-4 shrink-0 text-[rgb(var(--text-faint))] md:block" aria-hidden="true" />
      </button>

      {open ? (
        <div id="workspace-account-menu" role="dialog" aria-label="Cont și preferințe pentru spațiul de lucru" className="absolute right-0 top-12 z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 shadow-elevated">
          <div className="rounded-control bg-[rgb(var(--surface-subtle))] px-3 py-2.5">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Spațiu de lucru activ</p>
            <p className="mt-1 truncate text-sm font-semibold text-[rgb(var(--foreground))]">{displayName}</p>
            <p className="mt-1 truncate text-xs text-[rgb(var(--text-muted))]">{identity}</p>
            {userEmail && userName ? <p className="mt-0.5 truncate text-xs text-[rgb(var(--text-faint))]">{userEmail}</p> : null}
          </div>

          <div className="mt-3 border-t border-[rgb(var(--border))] pt-3">
            <p className="px-1 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Aspect</p>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-control bg-[rgb(var(--surface-muted))] p-1">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "focus-ring flex min-h-9 items-center justify-center gap-1 rounded-md px-2 text-xs font-semibold transition-colors duration-fast",
                    theme === option.value
                      ? "bg-[rgb(var(--surface))] text-[rgb(var(--foreground))] shadow-sm"
                      : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))]"
                  )}
                  aria-pressed={theme === option.value}
                >
                  {theme === option.value ? <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 grid gap-1 border-t border-[rgb(var(--border))] pt-3">
            {canViewSettings ? (
              <Link href="/settings" onClick={() => setOpen(false)} className="focus-ring rounded-control px-3 py-2.5 text-sm font-medium text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]">
                Setări spațiu de lucru
              </Link>
            ) : null}
            <button type="button" onClick={logout} className="focus-ring flex w-full items-center gap-2 rounded-control px-3 py-2.5 text-left text-sm font-medium text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]">
              <ArrowRightOnRectangleIcon className="h-4 w-4" aria-hidden="true" />
              Ieșire din cont
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
