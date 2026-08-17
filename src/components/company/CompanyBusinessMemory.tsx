import Link from "next/link";
import { ArrowRightIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { CompanyBusinessMemory, CompanyMemoryItem } from "@/lib/company-intelligence";
import type { ExecutiveDecisionSnapshot } from "@/lib/opportunity-discovery";
import { formatCurrency, formatDate } from "@/lib/utils";

function evidenceKey(sourceType: string, sourceId: string) {
  return `${sourceType}:${sourceId}`;
}

function EvidenceLine({ label, timestamp, href }: { label: string; timestamp: string | null; href?: string }) {
  return <p className="mt-1.5 text-[0.6875rem] leading-5 text-[rgb(var(--text-faint))]">Bazat pe: {href ? <Link href={href} className="focus-ring font-semibold text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] hover:underline">{label}</Link> : label}{timestamp ? <> · <time dateTime={timestamp}>{formatDate(timestamp)}</time></> : " · Dată neconfirmată"}</p>;
}

function MemoryRow({ item }: { item: CompanyMemoryItem }) {
  const href = item.href ?? item.evidence.href;
  return <article className="border-t border-[rgb(var(--border))] py-3 first:border-t-0 first:pt-0 last:pb-0">
    <h4 className="text-sm font-semibold">{item.title}</h4>
    <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{item.description}</p>
    <EvidenceLine label={item.evidence.label} timestamp={item.occurredAt ?? item.evidence.sourceTimestamp} href={item.evidence.href} />
    {href ? <Link href={href} className="focus-ring mt-1 inline-flex min-h-8 items-center gap-1 rounded-button text-xs font-semibold text-[rgb(var(--primary))] hover:underline">{item.actionLabel}<ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" /></Link> : null}
  </article>;
}

export function CompanyBusinessMemory({ memory, executiveDecision, recoverableValueByCurrency }: { memory: CompanyBusinessMemory; executiveDecision: ExecutiveDecisionSnapshot; recoverableValueByCurrency: Record<string, number> }) {
  const primaryEvidence = new Set(executiveDecision.evidence.map((item) => evidenceKey(item.sourceType, item.sourceId)));
  const additionalMemory = memory.mustRemember.filter((item) => !primaryEvidence.has(evidenceKey(item.evidence.sourceType, item.evidence.sourceId))).slice(0, 4);
  const primaryEvidenceLabel = executiveDecision.evidence.map((item) => item.label).join(" · ") || "Date comerciale disponibile";
  const statusClasses = executiveDecision.relationshipStatus === "critical"
    ? "border-[rgb(var(--danger-border))] bg-[rgb(var(--danger-background))] text-[rgb(var(--danger-text))]"
    : executiveDecision.relationshipStatus === "attention"
      ? "border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] text-[rgb(var(--warning-text))]"
      : "border-[rgb(var(--success-border))] bg-[rgb(var(--success-background))] text-[rgb(var(--success-text))]";

  return <Card id="company-memory" as="section" variant="default" padding="default" aria-labelledby="company-memory-title" className="scroll-mt-24">
    <SectionHeader eyebrow="Decizie executivă" title="Ce contează acum" description="Fapte, bucle și lipsuri care pot afecta următoarea decizie comercială." />

    <section aria-labelledby="company-memory-title" className="mt-5">
      <div className="flex items-center gap-2"><ExclamationTriangleIcon className="h-5 w-5 text-[rgb(var(--warning-text))]" aria-hidden="true" /><h3 id="company-memory-title" className="font-semibold">De reținut</h3></div>
      <div className="mt-3 rounded-card border border-[rgb(var(--gold-500)/0.36)] bg-[rgb(var(--gold-50)/0.25)] p-4 dark:bg-[rgb(var(--brand-950)/0.34)] sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
          <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses}`}>{executiveDecision.statusLabel}</span>
          <div className="min-w-0">
            <h4 className="text-base font-semibold">{executiveDecision.primaryRisk}</h4>
            <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-secondary))]">{executiveDecision.primaryRiskDetail}</p>
            <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]"><strong className="text-[rgb(var(--foreground))]">De ce contează:</strong> {executiveDecision.whyItMatters}</p>
            {Object.keys(recoverableValueByCurrency).length > 0 ? <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]"><strong className="text-[rgb(var(--foreground))]">Valoare recuperabilă estimată:</strong> {Object.entries(recoverableValueByCurrency).map(([currency, value]) => formatCurrency(value, currency)).join(" · ")} · Separată de venitul confirmat.</p> : null}
            <EvidenceLine label={primaryEvidenceLabel} timestamp={executiveDecision.evidence[0]?.sourceTimestamp ?? null} href={executiveDecision.evidence[0]?.href} />
          </div>
          <Link href={executiveDecision.safeNextActionHref} className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-control bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-[rgb(var(--primary-foreground))] hover:bg-[rgb(var(--primary-hover))]">{executiveDecision.safeNextActionLabel}<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        {additionalMemory.length > 0 ? <div className="mt-4 border-t border-[rgb(var(--border))] pt-4">{additionalMemory.map((item) => <MemoryRow key={item.id} item={item} />)}</div> : null}
      </div>
    </section>

    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <section aria-labelledby="open-loops-title" className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] p-4 sm:p-5">
        <div className="flex items-center gap-2"><ExclamationTriangleIcon className="h-5 w-5 text-[rgb(var(--warning-text))]" aria-hidden="true" /><h3 id="open-loops-title" className="font-semibold">Bucle deschise</h3></div>
        <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Numai elementele nerezolvate care cer atenție și nu dublează prioritatea principală.</p>
        {memory.openLoops.length > 0 ? <div className="mt-3">{memory.openLoops.slice(0, 3).map((item) => <MemoryRow key={item.id} item={item} />)}</div> : <div className="mt-4 flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]"><CheckCircleIcon className="h-4 w-4 text-[rgb(var(--success-text))]" aria-hidden="true" />Nu există alte elemente restante identificate.</div>}
      </section>

      <section aria-labelledby="recent-evidence-title" className="rounded-card border border-[rgb(var(--border))] p-4 sm:p-5">
        <div className="flex items-center gap-2"><ClockIcon className="h-5 w-5 text-[rgb(var(--primary))]" aria-hidden="true" /><h3 id="recent-evidence-title" className="font-semibold">Dovezi recente</h3></div>
        <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Istoric comercial compact, fără evenimente neutre sau duplicate.</p>
        {memory.recentEvidence.length > 0 ? <ol className="mt-3 divide-y divide-[rgb(var(--border))]">{memory.recentEvidence.slice(0, 3).map((item) => <li key={item.id} className="py-3 first:pt-0 last:pb-0"><p className="text-sm font-semibold">{item.label}</p><p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{item.description}</p><EvidenceLine label={item.evidence.label} timestamp={item.occurredAt} href={item.evidence.href} /></li>)}</ol> : <p className="mt-4 text-sm text-[rgb(var(--text-secondary))]">Nu există încă suficient istoric comercial.</p>}
      </section>
    </div>

    <section aria-labelledby="knowledge-gaps-title" className="mt-5 border-t border-[rgb(var(--border))] pt-5">
      <div className="flex items-center gap-2"><QuestionMarkCircleIcon className="h-5 w-5 text-[rgb(var(--text-muted))]" aria-hidden="true" /><h3 id="knowledge-gaps-title" className="font-semibold">Informații lipsă</h3></div>
      <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Numai lipsurile care afectează execuția comercială.</p>
      {memory.criticalGaps.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{memory.criticalGaps.map((gap) => <Link key={gap.code} href={gap.href} className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-3 py-2 text-xs font-semibold hover:border-[rgb(var(--primary)/0.4)]"><span>{gap.label}</span><span className="text-[rgb(var(--primary))]">{gap.actionLabel}</span></Link>)}</div> : <p className="mt-3 text-sm text-[rgb(var(--text-secondary))]">Nu există lipsuri critice identificate în datele disponibile.</p>}
    </section>
  </Card>;
}
