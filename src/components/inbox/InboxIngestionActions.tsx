"use client";

import { useState, useTransition } from "react";
import { ArrowPathIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { detectStaleCommercialSignals } from "@/lib/commercial-ingestion-actions";

export function InboxIngestionActions() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  function detect() {
    if (pending) return;
    setMessage("");
    startTransition(async () => {
      const result = await detectStaleCommercialSignals();
      setMessage(result.ok
        ? result.duplicateBatch
          ? "Detectarea a fost rulată deja pentru aceleași oportunități. Nu au fost create duplicate."
          : `Detectare finalizată: ${result.created} semnale noi, ${result.duplicates} duplicate omise.`
        : result.error ?? "Detectarea nu a putut fi finalizată.");
    });
  }
  return <div className="flex flex-wrap items-center gap-3">
    <a href="/inbox/import" className="focus-ring inline-flex h-11 items-center gap-2 border border-[rgb(var(--border))] px-4 text-sm font-semibold"><ArrowPathIcon className="h-4 w-4" />Importă CSV</a>
    <button type="button" onClick={detect} disabled={pending} className="focus-ring inline-flex h-11 items-center gap-2 bg-[rgb(var(--primary))] px-4 text-sm font-semibold text-[rgb(var(--primary-foreground))] disabled:opacity-50"><MagnifyingGlassIcon className="h-4 w-4" />{pending ? "Se detectează…" : "Detectează oportunități neglijate"}</button>
    {message ? <p className="basis-full text-sm text-[rgb(var(--muted-foreground))]" role="status">{message}</p> : null}
  </div>;
}

