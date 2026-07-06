"use client";

import { ComputerDesktopIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useTheme } from "@/components/theme/ThemeProvider";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const Icon = theme === "light" ? SunIcon : theme === "dark" ? MoonIcon : ComputerDesktopIcon;
  const label = theme === "light" ? "Tema luminoasă" : theme === "dark" ? "Tema întunecată" : "Tema sistemului";

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      title="Schimbă tema"
      aria-label={`Schimbă tema. Activă: ${label}`}
      className="focus-ring inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm font-semibold text-[rgb(var(--foreground))] shadow-sm transition hover:bg-[rgb(var(--muted))]"
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      {compact ? null : <span>{label}</span>}
    </button>
  );
}
