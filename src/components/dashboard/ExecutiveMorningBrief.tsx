import Link from "next/link";
import { ArrowRightIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { PremiumPanel } from "@/components/dashboard/PremiumPanel";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ExecutiveMorningBrief as ExecutiveMorningBriefModel, ExecutiveMorningBriefStatus } from "@/lib/executive-morning-brief";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusTone: Record<ExecutiveMorningBriefStatus, BadgeTone> = {
  critical: "danger",
  attention: "warning",
  stable: "success",
  incomplete: "neutral"
};

const countLabels: Array<[keyof ExecutiveMorningBriefModel["counts"], string]> = [
  ["overdueFollowUps", "follow-up-uri întârziate"],
  ["pendingApprovals", "aprobări în așteptare"],
  ["unresolvedSignals", "semnale nerezolvate"],
  ["missingNextActions", "acțiuni următoare lipsă"],
  ["missingOwners", "responsabili lipsă"],
  ["missingPrimaryContacts", "contacte principale lipsă"]
];

export function ExecutiveMorningBrief({ brief }: { brief: ExecutiveMorningBriefModel }) {
  const visibleCounts = countLabels.filter(([key]) => brief.counts[key] > 0).slice(0, 4);

  return (
    <PremiumPanel tone="emphasis" className="relative overflow-hidden p-5 sm:p-6 lg:p-7" aria-labelledby="executive-morning-brief-title">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[rgb(var(--brand-500)/0.09)] blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--brand-300))]">Brief executiv de dimineață</p>
          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[rgb(var(--text-faint))]" />
          <time className="text-xs font-medium text-[rgb(var(--text-muted))]">{brief.dateLabel}</time>
          <Badge tone={statusTone[brief.status]} size="small" className="sm:ml-auto">{brief.statusLabel}</Badge>
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)] xl:gap-8">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[rgb(var(--text-muted))]">Control Center</p>
            <h1 id="executive-morning-brief-title" className="mt-1 max-w-4xl text-2xl font-semibold tracking-[-0.03em] text-[rgb(var(--foreground))] sm:text-3xl">{brief.headline}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[rgb(var(--text-secondary))] sm:text-base">{brief.summary}</p>

            {brief.bullets.length > 0 ? (
              <ol className="mt-5 grid gap-2.5 sm:grid-cols-3" aria-label="Primele decizii ale zilei">
                {brief.bullets.map((item, index) => (
                  <li key={item.id} className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.74)] p-3.5">
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Prioritatea {index + 1}</p>
                    <p className="mt-1.5 text-sm font-semibold text-[rgb(var(--foreground))]">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{item.detail}</p>
                  </li>
                ))}
              </ol>
            ) : null}

            {(visibleCounts.length > 0 || brief.estimatedExposedValueByCurrency.length > 0) ? (
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-[rgb(var(--border))] pt-4 text-xs text-[rgb(var(--text-muted))]">
                {visibleCounts.map(([key, label]) => <span key={key}><strong className="text-[rgb(var(--foreground))]">{brief.counts[key]}</strong> {label}</span>)}
                {brief.estimatedExposedValueByCurrency.map(({ currency, value }) => (
                  <span key={currency}><strong className="text-[rgb(var(--foreground))]">Valoare estimată expusă:</strong> {formatCurrency(value, currency)} · nu este venit confirmat</span>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="rounded-card border border-[rgb(var(--brand-500)/0.28)] bg-[rgb(var(--surface)/0.86)] p-4 shadow-card sm:p-5" aria-label="Prima acțiune sigură">
            <p className="text-xs font-semibold uppercase tracking-[0.11em] text-[rgb(var(--primary))]">Prima acțiune sigură</p>
            <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[rgb(var(--foreground))]">{brief.primaryRisk}</h2>
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">{brief.whyItMatters}</p>

            {brief.evidence ? (
              <div className="mt-4 rounded-card bg-[rgb(var(--surface-subtle))] p-3 text-xs leading-5 text-[rgb(var(--text-muted))]">
                <p><strong className="text-[rgb(var(--foreground))]">Bazat pe:</strong> {brief.evidence.label}</p>
                {brief.evidence.sourceTimestamp ? <p className="mt-1">Dovadă datată: {formatDate(brief.evidence.sourceTimestamp)}</p> : null}
                <Link href={brief.evidence.href} className="focus-ring mt-2 inline-flex items-center gap-1 font-semibold text-[rgb(var(--primary))] hover:underline">Deschide dovada <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" /></Link>
              </div>
            ) : null}

            <Button href={brief.firstSafeActionHref} className="mt-4 w-full">{brief.firstSafeActionLabel} <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>
            <div className="mt-4 flex gap-2 text-xs leading-5 text-[rgb(var(--text-muted))]">
              <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />
              <p>Aprobarea umană rămâne obligatorie. Nicio comunicare externă nu este trimisă fără acțiune și aprobare umană.</p>
            </div>
            <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-[rgb(var(--border))] pt-3 text-xs font-semibold text-[rgb(var(--text-muted))]" aria-label="Navigare operațională secundară">
              <Link href="/companies" className="focus-ring hover:text-[rgb(var(--foreground))]">Vezi companiile</Link>
              <Link href="/recoverable" className="focus-ring hover:text-[rgb(var(--foreground))]">Vezi coada de recuperare</Link>
            </nav>
          </aside>
        </div>
      </div>
    </PremiumPanel>
  );
}
