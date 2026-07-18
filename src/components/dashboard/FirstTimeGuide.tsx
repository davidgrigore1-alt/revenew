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
    <aside className="overflow-hidden rounded-panel border border-[rgb(var(--primary)/0.3)] bg-[linear-gradient(135deg,rgb(var(--surface-elevated)),rgb(var(--primary)/0.07))] p-5 shadow-card sm:p-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[rgb(var(--primary))]">Primul rezultat util</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[rgb(var(--foreground))]">Construiește o oportunitate care poate fi decisă, nu doar un rând într-un tabel.</h2>
          <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Nu există încă intervenții pentru că spațiul de lucru nu conține suficiente date revizuite. Pornește cu un import controlat sau adaugă manual prima oportunitate.</p>
          <ol className="mt-5 grid gap-2 text-sm text-[rgb(var(--text-muted))] sm:grid-cols-3">
            {[['01', 'Adu contextul', 'Importă sau adaugă date reale.'], ['02', 'Revizuiește semnalul', 'Confirmă relevanța și valoarea estimată.'], ['03', 'Stabilește execuția', 'Atribuie owner, acțiune și termen.']].map(([number, title, copy]) => <li key={number} className="rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.72)] p-3"><span className="text-xs font-semibold text-[rgb(var(--primary))]">{number}</span><strong className="mt-2 block text-[rgb(var(--foreground))]">{title}</strong><span className="mt-1 block text-xs leading-5">{copy}</span></li>)}
          </ol>
          <p className="mt-3 text-xs text-[rgb(var(--text-muted))]">ReveNew recomandă. Echipa decide. Niciun mesaj extern nu este trimis automat.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button href="/inbox/import" className="min-h-10 px-4">
            Importă un CSV
          </Button>
          <Button href="/opportunities/analyze" variant="secondary" className="min-h-10 px-4">Adaugă oportunitate</Button>
          <button
            type="button"
            className="focus-ring rounded-button px-3 py-2 text-sm font-semibold text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))]"
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
