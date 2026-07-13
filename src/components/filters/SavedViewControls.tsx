"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BookmarkIcon, TrashIcon } from "@heroicons/react/24/outline";
import { createSavedView, deleteSavedView } from "@/lib/saved-views/actions";

type SavedView = { id: string; name: string; filter_state: Record<string, string> | null };

export function SavedViewControls({ views, currentQuery, targetPage }: { views: SavedView[]; currentQuery: string; targetPage: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    const formData = new FormData();
    formData.set("name", name);
    formData.set("targetPage", targetPage);
    formData.set("query", currentQuery);
    startTransition(async () => {
      const result = await createSavedView(formData);
      setMessage(result.ok ? "Vizualizarea a fost salvată." : result.error ?? "Salvarea a eșuat.");
      if (result.ok) { setName(""); router.refresh(); }
    });
  }

  return <section className="grid gap-3 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4" aria-label="Vizualizări private">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label className="min-w-0 flex-1 text-sm font-semibold">Salvează filtrele curente
        <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Exemplu: Follow-up urgent" className="mt-2 h-10 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 font-normal" />
      </label>
      <button type="button" onClick={save} disabled={pending || !name.trim()} className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[rgb(var(--border))] px-3 text-sm font-semibold disabled:opacity-50 sm:mt-7">
        <BookmarkIcon className="h-4 w-4" aria-hidden="true" /> Salvează
      </button>
    </div>
    {message ? <p className="text-sm text-[rgb(var(--muted-foreground))]" role="status">{message}</p> : null}
    {views.length ? <div className="flex flex-wrap gap-2">{views.map((view) => {
      const query = new URLSearchParams(view.filter_state ?? {}).toString();
      return <span key={view.id} className="inline-flex items-center rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))]">
        <button type="button" onClick={() => router.push(`/${targetPage}${query ? `?${query}` : ""}`)} className="focus-ring px-3 py-2 text-sm font-semibold">{view.name}</button>
        <button type="button" aria-label={`Șterge vizualizarea ${view.name}`} onClick={() => startTransition(async () => { await deleteSavedView(view.id); router.refresh(); })} className="focus-ring inline-flex h-9 w-9 items-center justify-center border-l border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))]">
          <TrashIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </span>;
    })}</div> : <p className="text-sm text-[rgb(var(--muted-foreground))]">Nu ai vizualizări private salvate pentru această pagină.</p>}
  </section>;
}
