"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { ArrowRightIcon, MagnifyingGlassIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { CompanyQuestionAnswer } from "@/lib/company-commercial-memory";
import { askAboutCompany } from "@/lib/company-memory/actions";
import { formatDate } from "@/lib/utils";

export function CompanyContextualAsk({ organizationId, companyName, suggestions }: { organizationId: string; companyName: string; suggestions: string[] }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<CompanyQuestionAnswer | null>(null);
  const [pending, startTransition] = useTransition();

  function run(value: string) {
    const normalized = value.trim();
    if (normalized.length < 2) return;
    setQuestion(normalized);
    startTransition(async () => setAnswer(await askAboutCompany(organizationId, normalized)));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(question);
  }

  return (
    <section id="company-ask" className="scroll-mt-24 rounded-panel border border-[rgb(var(--primary)/0.24)] bg-[rgb(var(--surface))] p-4 shadow-card sm:p-5" aria-labelledby="company-ask-title" data-guide-anchor="company-ask">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">Căutare în relația comercială</p>
          <h2 id="company-ask-title" className="mt-1 text-xl font-semibold tracking-[-0.02em]">Întreabă despre {companyName}</h2>
          <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Caută în informațiile comerciale asociate acestei companii. Răspunsul rămâne limitat la dovezile disponibile.</p>
          <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); run(question); } }} aria-label={`Întrebare despre ${companyName}`} placeholder="Ex.: Ce a rămas nerezolvat?" className="min-w-0 flex-1" />
            <Button type="submit" loading={pending} disabled={pending || question.trim().length < 2}><MagnifyingGlassIcon className="h-4 w-4" aria-hidden="true" />Verifică</Button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Întrebări sugerate despre companie">
            {suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => run(suggestion)} disabled={pending} className="focus-ring min-h-9 rounded-pill border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-3 py-1.5 text-left text-xs font-medium text-[rgb(var(--text-muted))] hover:border-[rgb(var(--border-strong))] hover:text-[rgb(var(--foreground))] disabled:opacity-60">{suggestion}</button>)}
          </div>
        </div>

        <div className="min-h-28 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4" aria-live="polite" aria-busy={pending}>
          {pending ? <p className="text-sm text-[rgb(var(--text-muted))]">Se verifică dovezile asociate companiei…</p> : answer ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--primary))]">Răspuns</p>
              <h3 className="mt-1 font-semibold">{answer.headline}</h3>
              <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{answer.answer}</p>
              {answer.evidence.length > 0 ? <div className="mt-3 border-t border-[rgb(var(--border))] pt-3"><p className="text-xs font-semibold">Dovezi</p><ul className="mt-1 grid gap-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{answer.evidence.slice(0, 3).map((item) => <li key={`${item.sourceType}:${item.sourceId}`}>{item.href ? <Link href={item.href} className="focus-ring font-semibold hover:text-[rgb(var(--primary))] hover:underline">{item.label}</Link> : item.label}{item.sourceTimestamp ? <> · {formatDate(item.sourceTimestamp)}</> : null}</li>)}</ul></div> : null}
              {answer.missingInformation.length > 0 ? <p className="mt-3 text-xs leading-5 text-[rgb(var(--warning-text))]"><strong>Ce lipsește:</strong> {answer.missingInformation.join(" · ")}</p> : null}
              {answer.continuation ? <Link href={answer.continuation.href} className="focus-ring mt-3 inline-flex min-h-9 items-center gap-1 rounded-button text-xs font-semibold text-[rgb(var(--primary))] hover:underline">{answer.continuation.label}<ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" /></Link> : null}
            </div>
          ) : <div className="flex min-h-20 items-center"><p className="text-sm leading-6 text-[rgb(var(--text-muted))]">Alege o întrebare sau formulează una despre activitate, oportunități, persoane, documente ori bucle deschise.</p></div>}
        </div>
      </div>
      <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[rgb(var(--text-muted))]"><ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />Întrebarea caută numai în informațiile acestei companii și nu produce acțiuni externe.</p>
    </section>
  );
}
