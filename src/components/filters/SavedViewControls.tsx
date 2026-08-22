"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BookmarkIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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

  return <details className="group border-t border-[rgb(var(--border))] pt-2" aria-label="Vizualizări private">
    <summary className="focus-ring inline-flex min-h-9 cursor-pointer list-none items-center rounded-button px-2 text-xs font-semibold text-[rgb(var(--text-secondary))] marker:hidden hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]">
      Vizualizări private
      <span className="ml-2 rounded-full bg-[rgb(var(--surface-muted))] px-2 py-0.5 text-[0.6875rem] text-[rgb(var(--text-muted))]">{views.length}</span>
      <span aria-hidden="true" className="ml-2 text-[rgb(var(--primary))] group-open:hidden">+</span><span aria-hidden="true" className="ml-2 hidden text-[rgb(var(--primary))] group-open:inline">−</span>
    </summary>
    <div className="mt-2 grid gap-3 border-l-2 border-[rgb(var(--primary)/0.28)] pl-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-xs font-semibold text-[rgb(var(--text-secondary))]">Salvează filtrele curente
          <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Exemplu: Follow-up urgent" className="mt-1.5 min-h-9 bg-[rgb(var(--surface-elevated))] font-normal" />
        </label>
        <Button type="button" variant="secondary" size="small" onClick={save} disabled={pending || !name.trim()} className="min-h-9">
          <BookmarkIcon className="h-4 w-4" aria-hidden="true" /> Salvează
        </Button>
      </div>
      {message ? <p className="text-xs text-[rgb(var(--text-muted))]" role="status">{message}</p> : null}
      {views.length ? <div className="flex flex-wrap gap-1.5">{views.map((view) => {
        const query = new URLSearchParams(view.filter_state ?? {}).toString();
        return <span key={view.id} className="inline-flex items-center rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))]">
          <button type="button" onClick={() => router.push(`/${targetPage}${query ? `?${query}` : ""}`)} className="focus-ring min-h-8 rounded-l-control px-3 text-xs font-semibold text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--foreground))]">{view.name}</button>
          <button type="button" aria-label={`Șterge vizualizarea ${view.name}`} onClick={() => startTransition(async () => { await deleteSavedView(view.id); router.refresh(); })} className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-r-control border-l border-[rgb(var(--border))] text-[rgb(var(--text-faint))] hover:bg-[rgb(var(--danger-background))] hover:text-[rgb(var(--danger-text))]">
            <TrashIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </span>;
      })}</div> : <p className="text-xs text-[rgb(var(--text-muted))]">Nu ai încă vizualizări private salvate pentru această pagină.</p>}
    </div>
  </details>;
}
