"use client";

import { useState, useTransition } from "react";
import { ArrowPathIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { detectStaleCommercialSignals } from "@/lib/commercial-ingestion-actions";

export function InboxIngestionActions({ showDetection = true }: { showDetection?: boolean }) {
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
    <Button href="/inbox/import" variant="secondary"><ArrowPathIcon className="h-4 w-4" />Importă semnale</Button>
    {showDetection ? <Button onClick={detect} loading={pending}><MagnifyingGlassIcon className="h-4 w-4" />Detectează oportunități neglijate</Button> : null}
    {message ? <p className="basis-full text-sm text-[rgb(var(--muted-foreground))]" role="status">{message}</p> : null}
  </div>;
}

