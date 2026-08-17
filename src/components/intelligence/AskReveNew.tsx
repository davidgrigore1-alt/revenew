"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRightIcon, MagnifyingGlassIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { suggestedCommercialQueries, type CommercialSearchResponse } from "@/lib/commercial-search";
import { searchWorkspace } from "@/lib/search/actions";

export function AskReveNew() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<CommercialSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function runSearch(value: string) {
    const normalized = value.trim();
    if (normalized.length < 2) return;
    setQuery(normalized);
    setLoading(true);
    try {
      setResponse(await searchWorkspace(normalized));
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(query);
  }

  return (
    <section className="rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-card sm:p-6" aria-labelledby="ask-revenew-title">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--primary))]">Căutare comercială controlată</p>
          <h2 id="ask-revenew-title" className="mt-2 text-xl font-semibold tracking-[-0.02em]">Întreabă ReveNew</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[rgb(var(--text-muted))]">Caută în informațiile comerciale disponibile în spațiul de lucru. Răspunsurile folosesc reguli verificabile și indică dovezile existente.</p>

          <form onSubmit={submit} className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex.: Oportunități fără următor pas" aria-label="Întrebare comercială" className="min-w-0 flex-1" />
            <Button type="submit" loading={loading} disabled={query.trim().length < 2}>
              <MagnifyingGlassIcon className="h-4 w-4" aria-hidden="true" />{loading ? "Se verifică" : "Verifică"}
            </Button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2" aria-label="Întrebări sugerate">
            {suggestedCommercialQueries.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => void runSearch(suggestion)} className="focus-ring rounded-pill border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-3 py-1.5 text-left text-xs font-medium text-[rgb(var(--text-muted))] transition-colors hover:border-[rgb(var(--border-strong))] hover:text-[rgb(var(--foreground))]">
                {suggestion}
              </button>
            ))}
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[rgb(var(--text-muted))]"><ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />Nu execută acțiuni și nu trimite comunicări. Utilizatorul verifică dovezile și decide pasul sigur.</p>
        </div>

        <div className="min-h-44 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4" aria-live="polite">
          {!response ? (
            <div className="flex min-h-36 items-center justify-center text-center"><p className="max-w-sm text-sm leading-6 text-[rgb(var(--text-muted))]">Formulează o întrebare despre companii, oportunități, responsabil, următor pas, termene sau lipsa activității.</p></div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-[rgb(var(--foreground))]">{response.summary}</p>
              {response.results.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {response.results.slice(0, 5).map((result) => (
                    <article key={`${result.entityType}-${result.id}`} className="rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{result.title}</p>
                          <p className="mt-0.5 text-xs leading-5 text-[rgb(var(--text-muted))]">{result.context}</p>
                        </div>
                        <Link href={result.href} className="focus-ring inline-flex shrink-0 items-center gap-1 rounded-button px-2 py-1 text-xs font-semibold text-[rgb(var(--primary))] hover:bg-[rgb(var(--surface-muted))]">{result.entityType === "opportunity" ? "Deschide oportunitatea" : "Deschide"} <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" /></Link>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]"><strong className="text-[rgb(var(--foreground))]">De ce apare:</strong> {result.reason}</p>
                      <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]"><strong className="text-[rgb(var(--foreground))]">Dovezi:</strong> {result.evidence[0]?.label ?? "Nu există suficiente dovezi în datele disponibile."}</p>
                      {result.missingInformation.length > 0 ? <p className="mt-1 text-xs leading-5 text-[rgb(var(--warning-text))]"><strong>Informații lipsă:</strong> {result.missingInformation.slice(0, 2).join(" · ")}</p> : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs leading-5 text-[rgb(var(--text-muted))]">Nu completăm răspunsul prin presupuneri. Verifică denumirea sau alege una dintre întrebările sugerate.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
