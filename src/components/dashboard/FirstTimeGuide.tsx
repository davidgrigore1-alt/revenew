"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

const storageKey = "revenew-guide-dismissed";

export function FirstTimeGuide() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem(storageKey) !== "true");
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <aside className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[rgb(var(--foreground))]">Începe recuperarea în trei pași</h2>
          <ol className="mt-3 grid gap-2 text-sm text-[rgb(var(--muted-foreground))] sm:grid-cols-3">
            <li><strong className="text-[rgb(var(--foreground))]">1. Adu datele</strong><span className="block">Importă un CSV sau adaugă un semnal.</span></li>
            <li><strong className="text-[rgb(var(--foreground))]">2. Revizuiește</strong><span className="block">Verifică analiza, valoarea și contactul.</span></li>
            <li><strong className="text-[rgb(var(--foreground))]">3. Decide</strong><span className="block">Aprobă doar cazurile care merită urmărite.</span></li>
          </ol>
          <p className="mt-3 text-xs text-[rgb(var(--muted-foreground))]">ReveNew nu trimite mesaje externe fără decizia echipei.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button href="/inbox/import" className="min-h-10 px-4">
            Importă un CSV
          </Button>
          <Button href="/inbox" variant="secondary" className="min-h-10 px-4">Deschide Inbox</Button>
          <button
            type="button"
            className="focus-ring rounded-lg px-3 py-2 text-sm font-semibold text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))]"
            onClick={() => {
              window.localStorage.setItem(storageKey, "true");
              setVisible(false);
            }}
          >
            Ascunde
          </button>
        </div>
      </div>
    </aside>
  );
}
