"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRightOnRectangleIcon, CheckIcon } from "@heroicons/react/24/outline";
import { clsx } from "clsx";
import { useTheme } from "@/components/theme/ThemeProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/status";

type WorkspaceMenuProps = {
  businessName?: string;
  userEmail?: string;
  userName?: string;
  isDemo?: boolean;
};

const themeOptions = [
  { value: "system", label: "Sistem" },
  { value: "light", label: "Luminos" },
  { value: "dark", label: "Întunecat" }
] as const;

export function WorkspaceMenu({ businessName, userEmail, userName, isDemo = false }: WorkspaceMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const displayName = businessName ? (isDemo ? `Demo ${businessName}` : businessName) : "Workspace";
  const initial = (businessName || userName || userEmail || "M").slice(0, 1).toUpperCase();

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
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
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="focus-ring flex h-11 w-[180px] items-center justify-between gap-3 rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2.5 text-left shadow-sm transition hover:bg-[rgb(var(--muted))]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-[rgb(var(--foreground))]">{displayName}</span>
          <span className="block text-xs text-[rgb(var(--muted-foreground))]">Workspace activ</span>
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--primary)_/_0.12)] text-xs font-semibold text-[rgb(var(--primary))]">
          {initial}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-[300px] rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 shadow-[var(--shadow-card)]"
        >
          <div className="px-2 py-2">
            <p className="truncate text-sm font-semibold text-[rgb(var(--foreground))]">{displayName}</p>
            <p className="mt-1 truncate text-xs text-[rgb(var(--muted-foreground))]">{userName || userEmail || "Workspace activ"}</p>
            {userEmail ? <p className="mt-1 truncate text-xs text-[rgb(var(--muted-foreground))]">{userEmail}</p> : null}
          </div>

          <div className="my-2 border-t border-[rgb(var(--border))]" />

          <div className="px-2 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--muted-foreground))]">Aspect</p>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-[rgb(var(--muted))] p-1">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={clsx(
                    "focus-ring flex min-h-9 items-center justify-center gap-1 rounded-md px-2 text-xs font-semibold transition",
                    theme === option.value
                      ? "bg-[rgb(var(--surface))] text-[rgb(var(--foreground))] shadow-sm"
                      : "text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
                  )}
                  aria-pressed={theme === option.value}
                >
                  {theme === option.value ? <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="my-2 border-t border-[rgb(var(--border))]" />

          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="focus-ring flex rounded-lg px-2 py-2 text-sm font-medium text-[rgb(var(--foreground))] hover:bg-[rgb(var(--muted))]"
          >
            Setări
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className="focus-ring flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" aria-hidden="true" />
            Ieșire
          </button>
        </div>
      ) : null}
    </div>
  );
}
