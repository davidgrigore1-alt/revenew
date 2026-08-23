"use client";

import { ComputerDesktopIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useTheme } from "@/components/theme/ThemeProvider";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const options = [
    { id: "light", label: "Luminos", description: "Suprafețe clare pentru lucru de zi", Icon: SunIcon },
    { id: "dark", label: "Întunecat", description: "Contrast redus în spații cu lumină scăzută", Icon: MoonIcon },
    { id: "system", label: "Sistem", description: "Urmează preferința dispozitivului", Icon: ComputerDesktopIcon }
  ] as const;

  if (compact) {
    const active = options.find((option) => option.id === theme) ?? options[2];
    const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    const ActiveIcon = active.Icon;
    return (
      <button type="button" onClick={() => setTheme(nextTheme)} title="Schimbă tema" aria-label={`Schimbă tema. Activă: ${active.label}`} className="focus-ring inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-[rgb(var(--foreground))] shadow-sm transition hover:bg-[rgb(var(--muted))]">
        <ActiveIcon className="h-5 w-5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <fieldset className="w-full">
      <legend className="sr-only">Temă de interfață</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map(({ id, label, description, Icon }) => {
          const selected = theme === id;
          return (
            <label key={id} className={`focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[rgb(var(--focus-ring))] cursor-pointer overflow-hidden rounded-panel border transition-colors ${selected ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary-muted))]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] hover:border-[rgb(var(--border-strong))]"}`}>
              <input type="radio" name="interface-theme" value={id} checked={selected} onChange={() => setTheme(id)} className="sr-only" />
              <span className="block h-20 border-b border-[rgb(var(--border))] p-3"><span className={`block h-full rounded-md border ${id === "dark" ? "border-slate-700 bg-slate-950" : id === "system" ? "border-slate-300 bg-gradient-to-r from-white from-50% to-slate-950 to-50%" : "border-slate-200 bg-white"}`} aria-hidden="true" /></span>
              <span className="flex items-start gap-2.5 p-3"><Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span><strong className="block text-sm">{label}</strong><span className="mt-0.5 block text-xs leading-4 text-[rgb(var(--text-muted))]">{description}</span></span></span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
