import Link from "next/link";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { CompanyBusinessMemory, CompanyMemoryItem } from "@/lib/company-intelligence";
import { formatDate } from "@/lib/utils";

function EvidenceLine({ label, timestamp }: { label: string; timestamp: string | null }) {
  return (
    <p className="mt-2 text-[0.6875rem] leading-5 text-[rgb(var(--text-faint))]">
      Bazat pe: {label}{timestamp ? <> · <time dateTime={timestamp}>{formatDate(timestamp)}</time></> : " · Dată neconfirmată"}
    </p>
  );
}

function MemoryItem({ item, emphasized = false }: { item: CompanyMemoryItem; emphasized?: boolean }) {
  const content = (
    <>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[rgb(var(--foreground))] group-hover:text-[rgb(var(--primary))]">{item.title}</span>
        <span className="mt-1 block text-xs leading-5 text-[rgb(var(--text-muted))]">{item.description}</span>
        <EvidenceLine label={item.evidence.label} timestamp={item.occurredAt ?? item.evidence.sourceTimestamp} />
      </span>
      {item.href ? (
        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[rgb(var(--primary))]">
          {item.actionLabel}<ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      ) : null}
    </>
  );
  const className = `focus-ring group grid gap-3 rounded-card border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${emphasized ? "border-[rgb(var(--gold-500)/0.38)] bg-[rgb(var(--gold-50)/0.36)] dark:bg-[rgb(var(--surface-muted))]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface))]"}`;
  return item.href ? <Link href={item.href} className={className}>{content}</Link> : <div className={className}>{content}</div>;
}

export function CompanyBusinessMemory({ memory }: { memory: CompanyBusinessMemory }) {
  return (
    <Card as="section" variant="default" padding="default" aria-labelledby="business-memory-title">
      <SectionHeader
        eyebrow="Memorie operațională"
        title="Ce trebuie să știe conducerea acum"
        description="Riscuri, bucle deschise și fapte dovedite, ordonate pentru o decizie rapidă."
      />

      <div className="mt-6 grid gap-5">
        <section aria-labelledby="business-memory-title">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-[rgb(var(--primary))]" aria-hidden="true" />
            <h3 id="business-memory-title" className="font-semibold">De reținut</h3>
          </div>
          <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Cele mai importante lucruri care pot afecta execuția comercială.</p>
          {memory.mustRemember.length > 0 ? (
            <div className="mt-3 grid gap-3">{memory.mustRemember.map((item) => <MemoryItem key={item.id} item={item} emphasized />)}</div>
          ) : (
            <div className="mt-3 flex items-center gap-2 rounded-card border border-[rgb(var(--success-border))] bg-[rgb(var(--success-bg))] p-4 text-sm text-[rgb(var(--success-text))]">
              <CheckCircleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />Nu există un risc sau un pas critic dovedit în datele disponibile.
            </div>
          )}
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section aria-labelledby="open-loops-title" className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-[rgb(var(--warning-text))]" aria-hidden="true" />
              <h3 id="open-loops-title" className="font-semibold">Bucle deschise</h3>
            </div>
            <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Elemente nerezolvate suplimentare, fiecare cu o acțiune sigură.</p>
            {memory.openLoops.length > 0 ? (
              <div className="mt-3 grid gap-3">{memory.openLoops.map((item) => <MemoryItem key={item.id} item={item} />)}</div>
            ) : <p className="mt-4 text-sm leading-6 text-[rgb(var(--text-secondary))]">Nu există alte bucle deschise după elementele prioritare.</p>}
          </section>

          <section aria-labelledby="recent-evidence-title" className="rounded-card border border-[rgb(var(--border))] p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-[rgb(var(--primary))]" aria-hidden="true" />
              <h3 id="recent-evidence-title" className="font-semibold">Dovezi recente</h3>
            </div>
            <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Doar activitatea recentă care nu este deja rezumată mai sus.</p>
            {memory.recentEvidence.length > 0 ? (
              <ol className="mt-3 divide-y divide-[rgb(var(--border))]">
                {memory.recentEvidence.map((item) => (
                  <li key={item.id} className="py-3 first:pt-1 last:pb-0">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{item.description}</p>
                    <EvidenceLine label={item.evidence.label} timestamp={item.occurredAt} />
                    {item.href ? <Link href={item.href} className="focus-ring mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[rgb(var(--primary))] hover:underline">Deschide dovada<ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" /></Link> : null}
                  </li>
                ))}
              </ol>
            ) : <p className="mt-4 text-sm leading-6 text-[rgb(var(--text-secondary))]">Nu există alte dovezi recente relevante.</p>}
          </section>
        </div>

        <section aria-labelledby="critical-gaps-title" className="border-t border-[rgb(var(--border))] pt-5">
          <h3 id="critical-gaps-title" className="font-semibold">Informații lipsă</h3>
          <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Numai lipsurile care pot bloca ownership-ul, follow-up-ul sau continuitatea relației.</p>
          {memory.criticalGaps.length > 0 ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {memory.criticalGaps.map((gap) => (
                <Link key={gap.code} href={gap.href} className="focus-ring group flex items-center justify-between gap-3 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] p-4">
                  <span className="min-w-0"><span className="block text-sm font-semibold">{gap.label}</span><EvidenceLine label={gap.evidence.label} timestamp={gap.evidence.sourceTimestamp} /></span>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[rgb(var(--primary))]">{gap.actionLabel}<ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" /></span>
                </Link>
              ))}
            </div>
          ) : <p className="mt-3 text-sm text-[rgb(var(--text-secondary))]">Informațiile critice pentru execuție sunt disponibile.</p>}
        </section>
      </div>
    </Card>
  );
}
