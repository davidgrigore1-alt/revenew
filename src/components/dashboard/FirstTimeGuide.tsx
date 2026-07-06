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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[rgb(var(--foreground))]">Spațiul firmei este pregătit</h2>
          <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">
            Adaugă prima cerere comercială pentru ca ReveNew să identifice oportunitățile recuperabile.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button href="/inbox" className="min-h-10 px-4">
            Adaugă primul semnal
          </Button>
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
