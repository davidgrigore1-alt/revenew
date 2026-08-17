import Link from "next/link";
import { ArrowRightIcon, DocumentMagnifyingGlassIcon, ExclamationTriangleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { CommercialOpportunityDiscoveryResult, DiscoveryEvidenceStrength } from "@/lib/commercial-opportunity-discovery";
import { formatDate } from "@/lib/utils";

const strengthCopy: Record<DiscoveryEvidenceStrength, { label: string; tone: "brand" | "info" | "neutral" }> = {
  strong: { label: "Dovezi puternice", tone: "brand" },
  partial: { label: "Dovezi parțiale", tone: "info" },
  limited: { label: "Dovezi limitate", tone: "neutral" }
};

function EmptyDiscoveryState({ state }: { state: "clean" | "insufficient_data" }) {
  const clean = state === "clean";
  return (
    <div className="rounded-card border border-dashed border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-subtle))] p-5">
      <h3 className="font-semibold">{clean ? "Nu există semnale noi de verificat" : "Nu există suficiente date-sursă"}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[rgb(var(--text-muted))]">{clean ? "Semnalele comerciale calificate din datele disponibile sunt deja legate sau au o decizie înregistrată." : "Sursele disponibile nu conțin încă suficiente indicii comerciale verificabile pentru o descoperire sigură."}</p>
      <Button href={clean ? "/inbox" : "/inbox/import"} variant="secondary" size="small" className="mt-4">{clean ? "Vezi sursele" : "Importă date comerciale"}</Button>
    </div>
  );
}

export function CommercialDiscoveries({ result, error = false }: { result?: CommercialOpportunityDiscoveryResult; error?: boolean }) {
  if (error || !result) {
    return (
      <section className="rounded-panel border border-[rgb(var(--danger-border))] bg-[rgb(var(--surface))] p-5 shadow-card sm:p-6" aria-labelledby="commercial-discoveries-title">
        <ExclamationTriangleIcon className="h-6 w-6 text-[rgb(var(--danger-text))]" aria-hidden="true" />
        <h2 id="commercial-discoveries-title" className="mt-3 text-xl font-semibold">Nu am putut verifica semnalele comerciale</h2>
        <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Datele nu au fost interpretate ca zero rezultate. Reîncearcă verificarea în siguranță.</p>
        <Button href="/ai" variant="secondary" size="small" className="mt-4">Reîncearcă</Button>
      </section>
    );
  }

  return (
    <section id="commercial-discoveries" className="rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-card sm:p-6" aria-labelledby="commercial-discoveries-title">
      <div className="flex flex-col gap-4 border-b border-[rgb(var(--border))] pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--primary))]">Observă · verifică · decide</p>
          <h2 id="commercial-discoveries-title" className="mt-2 text-xl font-semibold tracking-[-0.02em]">Descoperiri comerciale</h2>
          {result.state === "ready" ? (
            <>
              <p className="mt-2 text-lg font-semibold">{result.totalCandidates} {result.totalCandidates === 1 ? "semnal comercial merită verificat" : "semnale comerciale merită verificate"}</p>
              <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">{result.strongEvidenceCount} cu dovezi puternice · {result.explicitValueCount} cu valoare menționată explicit</p>
            </>
          ) : <p className="mt-2 max-w-2xl text-sm leading-6 text-[rgb(var(--text-muted))]">ReveNew verifică doar indicii susținute de sursele disponibile și nu transformă automat semnalele în oportunități.</p>}
        </div>
        <p className="flex max-w-md items-start gap-2 text-xs leading-5 text-[rgb(var(--text-muted))]"><ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />Asocierea și pregătirea necesită decizie umană.</p>
      </div>

      {result.state !== "ready" ? <div className="pt-5"><EmptyDiscoveryState state={result.state} /></div> : (
        <div className="divide-y divide-[rgb(var(--border))]">
          {result.candidates.slice(0, 10).map((candidate, index) => {
            const strength = strengthCopy[candidate.evidenceStrength];
            return (
              <article key={candidate.id} className={`py-4 first:pt-5 ${index === 0 ? "relative" : ""}`}>
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {index === 0 ? <Badge tone="gold" size="small">Prima verificare</Badge> : null}
                      <Badge tone={strength.tone} size="small">{strength.label}</Badge>
                      {candidate.candidateType === "possible_existing_match" ? <Badge tone="warning" size="small">Posibil deja urmărit</Badge> : null}
                    </div>
                    <h3 className="mt-2 text-base font-semibold tracking-[-0.01em]">{candidate.companyName || candidate.sourceTitle}</h3>
                    {candidate.companyName ? <p className="mt-0.5 text-xs text-[rgb(var(--text-muted))]">{candidate.sourceTitle}</p> : null}
                    <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{candidate.reason}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button href={candidate.reviewHref} size="small" className="scroll-mb-24">Revizuiește <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>
                    <Button href={candidate.sourceHref} variant="ghost" size="small" className="scroll-mb-24">Deschide sursa</Button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[rgb(var(--text-muted))]">
                  {candidate.amountLabel ? <span className="font-semibold text-[rgb(var(--foreground))]">{candidate.amountLabel} · nu este venit confirmat</span> : null}
                  {candidate.occurredAt ? <span>Sursă: {formatDate(candidate.occurredAt)}</span> : <span>Data sursei nu este disponibilă</span>}
                </div>

                <details className="group mt-3 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
                  <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-control px-3 py-2 text-sm font-semibold marker:hidden">
                    <span className="flex items-center gap-2"><DocumentMagnifyingGlassIcon className="h-4 w-4 text-[rgb(var(--primary))]" aria-hidden="true" />De ce apare?</span>
                    <span className="text-[rgb(var(--primary))] group-open:hidden">+</span>
                  </summary>
                  <div className="grid gap-4 border-t border-[rgb(var(--border))] p-3 text-xs leading-5 md:grid-cols-3">
                    <div>
                      <p className="font-semibold text-[rgb(var(--foreground))]">Dovezi</p>
                      <ul className="mt-1 grid gap-1 text-[rgb(var(--text-muted))]">{candidate.evidence.slice(0, 5).map((item, evidenceIndex) => <li key={`${candidate.id}-evidence-${evidenceIndex}`}>• {item.label}</li>)}</ul>
                    </div>
                    <div>
                      <p className="font-semibold text-[rgb(var(--foreground))]">Ce lipsește</p>
                      {candidate.missingInformation.length > 0 ? <ul className="mt-1 grid gap-1 text-[rgb(var(--text-muted))]">{candidate.missingInformation.slice(0, 4).map((item) => <li key={item}>• {item}</li>)}</ul> : <p className="mt-1 text-[rgb(var(--text-muted))]">Nu există lacune critice identificate în datele disponibile.</p>}
                    </div>
                    <div>
                      <p className="font-semibold text-[rgb(var(--foreground))]">Ce poți face</p>
                      <p className="mt-1 text-[rgb(var(--text-muted))]">{candidate.safeNextAction}</p>
                      {candidate.possibleExistingOpportunities.map((opportunity) => <Link key={opportunity.id} href={opportunity.href} className="focus-ring mt-2 block rounded-button font-semibold text-[rgb(var(--primary))] hover:underline">Compară: {opportunity.title}</Link>)}
                    </div>
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
