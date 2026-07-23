import Link from "next/link";
import { ArrowRightIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { CompanyBusinessMemory, CompanyMemoryItem } from "@/lib/company-intelligence";
import type { ExecutiveDecisionSnapshot, OpportunityDiscoveryCandidate } from "@/lib/opportunity-discovery";
import { formatCurrency, formatDate } from "@/lib/utils";

function evidenceKey(sourceType: string, sourceId: string) {
  return `${sourceType}:${sourceId}`;
}

function EvidenceLine({ label, timestamp, href }: { label: string; timestamp: string | null; href?: string }) {
  return (
    <p className="mt-1.5 text-[0.6875rem] leading-5 text-[rgb(var(--text-faint))]">
      Bazat pe: {href ? <Link href={href} className="focus-ring font-semibold text-[rgb(var(--text-muted))] hover:text-[rgb(var(--primary))] hover:underline">{label}</Link> : label}{timestamp ? <> · <time dateTime={timestamp}>{formatDate(timestamp)}</time></> : " · Dată neconfirmată"}
    </p>
  );
}

const severityLabel = { critical: "Critic", attention: "Necesită atenție", informative: "Informativ" } as const;

function DiscoveryRow({ candidate }: { candidate: OpportunityDiscoveryCandidate }) {
  const evidence = candidate.evidence[0];
  return (
    <div className="group grid gap-2 border-t border-[rgb(var(--border))] py-3 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <span className="min-w-0">
        <span className={`text-[0.6875rem] font-semibold uppercase tracking-[0.08em] ${candidate.severity === "critical" ? "text-[rgb(var(--danger-text))]" : candidate.severity === "attention" ? "text-[rgb(var(--warning-text))]" : "text-[rgb(var(--text-faint))]"}`}>{severityLabel[candidate.severity]}</span>
        <span className="mt-1 block text-sm font-semibold group-hover:text-[rgb(var(--primary))]">{candidate.title}</span>
        <span className="mt-1 block text-xs leading-5 text-[rgb(var(--text-muted))]">De ce contează: {candidate.whyItMatters}</span>
        {candidate.estimatedValue !== undefined && candidate.currency ? <span className="mt-1 block text-xs font-semibold text-[rgb(var(--text-secondary))]">Valoare recuperabilă estimată: {formatCurrency(candidate.estimatedValue, candidate.currency)} · Separată de venitul confirmat</span> : null}
        {evidence ? <EvidenceLine label={evidence.label} timestamp={evidence.sourceTimestamp} href={evidence.href} /> : null}
      </span>
      <Link href={candidate.actionHref} className="focus-ring flex shrink-0 items-center gap-1 text-xs font-semibold text-[rgb(var(--primary))] hover:underline">{candidate.actionLabel}<ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" /></Link>
    </div>
  );
}

function OpenLoopRow({ item }: { item: CompanyMemoryItem }) {
  const href = item.href ?? item.evidence.href;
  return (
    <div className="group block border-t border-[rgb(var(--border))] py-3 first:border-t-0 first:pt-0 last:pb-0">
      <span className="block text-sm font-semibold group-hover:text-[rgb(var(--primary))]">{item.title}</span>
      {item.whyItMatters ? <span className="mt-1 block text-xs leading-5 text-[rgb(var(--text-muted))]">De ce contează: {item.whyItMatters}</span> : null}
      <EvidenceLine label={item.evidence.label} timestamp={item.occurredAt ?? item.evidence.sourceTimestamp} href={item.evidence.href} />
      {href ? <Link href={href} className="focus-ring mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[rgb(var(--primary))] hover:underline">{item.actionLabel}<ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" /></Link> : null}
    </div>
  );
}

export function CompanyBusinessMemory({
  memory,
  executiveDecision,
  discoveryCandidates
}: {
  memory: CompanyBusinessMemory;
  executiveDecision: ExecutiveDecisionSnapshot;
  discoveryCandidates: OpportunityDiscoveryCandidate[];
}) {
  const primaryEvidence = new Set(discoveryCandidates.flatMap((candidate) => candidate.evidence.map((item) => evidenceKey(item.sourceType, item.sourceId))));
  const secondaryLoops = memory.openLoops.filter((item) => !primaryEvidence.has(evidenceKey(item.evidence.sourceType, item.evidence.sourceId))).slice(0, 3);
  const secondaryDecisions = discoveryCandidates.slice(1, 5);
  const primaryEvidenceLabel = executiveDecision.evidence.map((item) => item.label).join(" · ");
  const statusClasses = executiveDecision.relationshipStatus === "critical"
    ? "border-[rgb(var(--danger-border))] bg-[rgb(var(--danger-background))] text-[rgb(var(--danger-text))]"
    : executiveDecision.relationshipStatus === "attention"
      ? "border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] text-[rgb(var(--warning-text))]"
      : "border-[rgb(var(--success-border))] bg-[rgb(var(--success-background))] text-[rgb(var(--success-text))]";

  return (
    <Card as="section" variant="default" padding="default" aria-labelledby="business-memory-title">
      <SectionHeader eyebrow="Decizie executivă" title="Ce necesită atenție acum" description="Un rezumat dovedit, urmat de maximum patru priorități suplimentare." />

      <section aria-labelledby="business-memory-title" className="mt-5 rounded-card border border-[rgb(var(--gold-500)/0.42)] bg-[rgb(var(--gold-50)/0.34)] p-4 dark:bg-[rgb(var(--brand-950)/0.34)] sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
          <div className="lg:self-start">
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses}`}>{executiveDecision.statusLabel}</span>
            <p className="mt-2 max-w-[12rem] text-[0.6875rem] leading-5 text-[rgb(var(--text-muted))]">
              {executiveDecision.relationshipStatus === "critical" ? "Intervenție prioritară necesară." : executiveDecision.relationshipStatus === "attention" ? "Nu există un element critic dovedit; aceasta este prioritatea curentă." : "Nu există un element critic dovedit."}
            </p>
          </div>
          <div className="min-w-0">
            <h3 id="business-memory-title" className="text-lg font-semibold tracking-[-0.01em]">{executiveDecision.primaryRisk}</h3>
            <p className="mt-1 text-sm leading-5 text-[rgb(var(--text-muted))]">{executiveDecision.primaryRiskDetail}</p>
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]"><span className="font-semibold text-[rgb(var(--foreground))]">De ce contează:</span> {executiveDecision.whyItMatters}</p>
            <EvidenceLine label={primaryEvidenceLabel} timestamp={executiveDecision.evidence[0]?.sourceTimestamp ?? null} href={executiveDecision.evidence[0]?.href} />
          </div>
          <Link href={executiveDecision.safeNextActionHref} className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-control bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-[rgb(var(--primary-foreground))] shadow-sm hover:bg-[rgb(var(--primary-hover))]">
            {executiveDecision.safeNextActionLabel}<ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="review-today-title" className="mt-5 border-t border-[rgb(var(--border))] pt-5">
        <div className="flex items-center gap-2"><ShieldCheckIcon className="h-5 w-5 text-[rgb(var(--primary))]" aria-hidden="true" /><h3 id="review-today-title" className="font-semibold">De revizuit astăzi</h3></div>
        <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Riscuri și oportunități de investigat, ordonate după impactul operațional.</p>
        {secondaryDecisions.length > 0 ? <div className="mt-3 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">{secondaryDecisions.map((candidate) => <DiscoveryRow key={candidate.id} candidate={candidate} />)}</div> : <p className="mt-3 text-sm text-[rgb(var(--text-secondary))]">Nu există alte priorități dovedite după decizia principală.</p>}
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="open-loops-title" className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] p-4 sm:p-5">
          <div className="flex items-center gap-2"><ExclamationTriangleIcon className="h-5 w-5 text-[rgb(var(--warning-text))]" aria-hidden="true" /><h3 id="open-loops-title" className="font-semibold">Bucle deschise</h3></div>
          <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Numai elementele nerezolvate care nu apar deja în decizia principală.</p>
          {secondaryLoops.length > 0 ? <div className="mt-3">{secondaryLoops.map((item) => <OpenLoopRow key={item.id} item={item} />)}</div> : <div className="mt-4 flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]"><CheckCircleIcon className="h-4 w-4 text-[rgb(var(--success-text))]" aria-hidden="true" />Nu există alte bucle deschise relevante.</div>}
        </section>

        <section aria-labelledby="recent-evidence-title" className="rounded-card border border-[rgb(var(--border))] p-4 sm:p-5">
          <div className="flex items-center gap-2"><ClockIcon className="h-5 w-5 text-[rgb(var(--primary))]" aria-hidden="true" /><h3 id="recent-evidence-title" className="font-semibold">Dovezi recente</h3></div>
          <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Maximum trei activități care nu dublează prioritățile de mai sus.</p>
          {memory.recentEvidence.length > 0 ? (
            <ol className="mt-3 divide-y divide-[rgb(var(--border))]">{memory.recentEvidence.map((item) => <li key={item.id} className="py-3 first:pt-0 last:pb-0"><p className="text-sm font-semibold">{item.label}</p><EvidenceLine label={item.evidence.label} timestamp={item.occurredAt} href={item.evidence.href} />{item.href ? <Link href={item.href} className="focus-ring mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[rgb(var(--primary))] hover:underline">Deschide dovada<ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" /></Link> : null}</li>)}</ol>
          ) : <p className="mt-4 text-sm text-[rgb(var(--text-secondary))]">Nu există alte dovezi recente relevante.</p>}
        </section>
      </div>
    </Card>
  );
}
