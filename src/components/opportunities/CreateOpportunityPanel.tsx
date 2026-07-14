"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { createCrmOpportunity } from "@/lib/crm/workspace-actions";
import type { CrmOrganization } from "@/lib/types";

export function CreateOpportunityPanel({ organizations }: { organizations: CrmOrganization[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>("select, input, textarea")?.focus();
  }, [open]);

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createCrmOpportunity(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError("");
      setOpen(false);
      if (result.id) router.push(`/opportunities/${result.id}`);
      else router.refresh();
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={organizations.length === 0} className="gap-2">
        <PlusIcon className="h-4 w-4" aria-hidden="true" />
        Adaugă oportunitate
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/45" role="dialog" aria-modal="true" aria-label="Adaugă oportunitate" onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
          <button type="button" className="absolute inset-0" aria-label="Închide formularul" onClick={() => setOpen(false)} />
          <div ref={panelRef} className="relative h-full w-full max-w-xl overflow-y-auto border-l border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-lg font-semibold">Adaugă oportunitate</h2><p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">Leagă oportunitatea de compania reală. Contactele și acțiunile se adaugă apoi în pagina oportunității.</p></div>
              <button type="button" className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[rgb(var(--border))]" aria-label="Închide" onClick={() => setOpen(false)}><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <form action={submit} className="mt-6 grid gap-4">
              {error ? <StatusNotice tone="warning">{error}</StatusNotice> : null}
              <label className="grid gap-2 text-sm font-semibold">Companie<select name="organizationId" required className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3"><option value="">Alege compania</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>
              <label className="grid gap-2 text-sm font-semibold">Titlu<input name="title" required maxLength={180} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3" placeholder="Reactivare contract servicii" /></label>
              <label className="grid gap-2 text-sm font-semibold">Context comercial<textarea name="summary" required maxLength={1200} rows={5} className="resize-y rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-2" placeholder="Ce s-a întâmplat, de ce merită urmărit și ce trebuie confirmat." /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">Valoare estimată (RON)<input name="estimatedValue" inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3" /></label>
                <label className="grid gap-2 text-sm font-semibold">Termen<input name="deadline" type="date" className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3" /></label>
              </div>
              <div className="flex flex-wrap gap-2"><Button type="submit" disabled={isPending}>{isPending ? "Se creează..." : "Creează oportunitatea"}</Button><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Renunță</Button></div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
