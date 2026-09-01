import Link from "next/link";
import { ArrowRightIcon, ClockIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ExplanationDisclosure } from "@/components/intelligence/ExplanationDisclosure";
import type { ExecutiveBriefPriority, ExecutiveDailyBrief } from "@/lib/executive-morning-brief";
import { explanationForExecutivePriority } from "@/lib/revenew-explanation-adapters";
import { formatCurrency } from "@/lib/utils";

const severityTone: Record<ExecutiveBriefPriority["severity"], BadgeTone> = {
  critical: "danger",
  attention: "warning",
  informative: "neutral"
};

function SecondaryPriority({ priority }: { priority: ExecutiveBriefPriority }) {
  return (
    <li className="border-t border-[rgb(var(--border))] py-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={severityTone[priority.severity]} size="small">{priority.kindLabel}</Badge>
            <p className="font-semibold text-[rgb(var(--foreground))]">{priority.title}</p>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{[priority.company, priority.opportunity, priority.reason].filter(Boolean).join(" · ")}</p>
        </div>
        <Link href={priority.safeAction.href} className="focus-ring inline-flex min-h-10 items-center gap-1 rounded-button text-sm font-semibold text-[rgb(var(--primary))] hover:underline">
          {priority.safeAction.label}<ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <ExplanationDisclosure explanation={explanationForExecutivePriority(priority)} controlLabel="De ce este prioritar?" className="mt-3" />
    </li>
  );
}

export function ExecutiveMorningBrief({ brief }: { brief: ExecutiveDailyBrief | null }) {
  if (!brief) {
    return (
      <section aria-labelledby="executive-brief-title" className="rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-card sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.11em] text-[rgb(var(--text-muted))]">Brief executiv zilnic</p>
        <h1 id="executive-brief-title" className="mt-2 text-xl font-semibold text-[rgb(var(--foreground))]">Briefingul nu a putut fi încărcat</h1>
        <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Înregistrările comerciale rămân disponibile în paginile operaționale. Reîncarcă pagina înainte de a lua o decizie.</p>
      </section>
    );
  }

  const primary = brief.primaryPriority;
  const latestChange = brief.recentChanges[0];
  return (
    <section aria-labelledby="executive-brief-title" className="overflow-hidden border-y border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] shadow-card sm:rounded-panel sm:border">
      <header className="grid gap-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-5 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.62fr)] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-sm font-semibold text-[rgb(var(--foreground))]">{brief.salutation}</p>
            <span className="flex items-center gap-1.5 text-xs font-medium text-[rgb(var(--text-faint))]"><ClockIcon className="h-4 w-4" aria-hidden="true" />{brief.period.label}</span>
          </div>
          <h1 id="executive-brief-title" className="mt-1 text-xl font-semibold tracking-[-0.025em] text-[rgb(var(--foreground))] sm:text-2xl">{brief.headline}</h1>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[rgb(var(--text-muted))]">{brief.summary}</p>
        </div>
        <div className="border-l-2 border-[rgb(var(--primary))] pl-4">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-muted))]">Ce s-a schimbat</p>
          {latestChange ? <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-secondary))]">{latestChange.href ? <Link href={latestChange.href} className="focus-ring rounded font-semibold text-[rgb(var(--foreground))] hover:text-[rgb(var(--primary))] hover:underline">{latestChange.label}</Link> : <strong>{latestChange.label}</strong>}<span> · {latestChange.context}</span></p> : <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Nicio schimbare comercială semnificativă în ultimele 24 de ore.</p>}
        </div>
      </header>

      {brief.state === "ready" && primary ? (
        <div className="grid lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.55fr)]">
          <div className="min-w-0 px-5 py-6 sm:px-6 sm:py-7 lg:px-8">
            <div className="flex flex-wrap items-center gap-2"><span className="text-[0.6875rem] font-semibold tabular-nums text-[rgb(var(--text-faint))]">DECIZIA 01</span><Badge tone={severityTone[primary.severity]} size="small">{primary.kindLabel}</Badge><span className="text-xs font-semibold text-[rgb(var(--text-muted))]">{primary.statusLabel}</span></div>
            <h2 className="mt-4 max-w-3xl font-display text-2xl font-semibold tracking-[-0.035em] text-[rgb(var(--foreground))] sm:text-3xl">{primary.title}</h2>
            {(primary.company || primary.opportunity) ? <p className="mt-1 text-sm font-semibold text-[rgb(var(--text-secondary))]">{[primary.company, primary.opportunity].filter(Boolean).join(" · ")}</p> : null}
            <p className="mt-5 max-w-3xl text-sm leading-6 text-[rgb(var(--text-muted))]"><strong className="text-[rgb(var(--foreground))]">Costul întârzierii:</strong> {primary.whyItMatters}</p>
            {primary.amount !== undefined && primary.currency ? <p className="mt-4 text-sm text-[rgb(var(--text-muted))]"><strong className="font-semibold tabular-nums text-[rgb(var(--foreground))]">{formatCurrency(primary.amount, primary.currency)}</strong> · valoare estimată, neconfirmată</p> : null}
            <ExplanationDisclosure explanation={explanationForExecutivePriority(primary)} controlLabel="De ce apare?" className="mt-4" />
          </div>
          <aside className="border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] p-5 sm:p-6 lg:border-l lg:border-t-0" aria-label="Prima acțiune sigură">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--primary))]">Acum</p>
            <p className="mt-3 text-sm font-semibold leading-6 text-[rgb(var(--foreground))]">{primary.reason}</p>
            <Button href={primary.safeAction.href} className="mt-4 w-full">{primary.safeAction.label}<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>
            <div className="mt-5 flex gap-2 border-t border-[rgb(var(--border))] pt-4 text-xs leading-5 text-[rgb(var(--text-muted))]"><ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" /><p>Decizia și orice acțiune externă rămân sub control uman.</p></div>
            <div className="mt-4 border-t border-[rgb(var(--border))] pt-4"><p className="text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-[rgb(var(--text-faint))]">Activitatea mea</p><p className="mt-1 text-sm font-semibold text-[rgb(var(--foreground))]">{brief.assignedTodaySummary.dueToday} azi · {brief.assignedTodaySummary.overdue} restante</p><Link href={brief.assignedTodaySummary.href} className="focus-ring mt-1 inline-flex min-h-8 items-center rounded text-xs font-semibold text-[rgb(var(--primary))] hover:underline">Deschide lista mea</Link></div>
          </aside>
        </div>
      ) : <div className="px-5 py-6 sm:px-6"><p className="text-sm leading-6 text-[rgb(var(--text-muted))]">{brief.state === "clear" ? "Poți continua cu activitatea planificată sau verifica registrul complet." : "Adaugă sau actualizează oportunitățile și acțiunile pentru o prioritizare utilă."}</p><Button href={brief.state === "clear" ? "/today" : "/opportunities"} variant="secondary" size="small" className="mt-3">{brief.state === "clear" ? "Vezi activitatea mea" : "Vezi oportunitățile"}</Button></div>}

      {brief.secondaryPriorities.length > 0 ? <div className="border-t border-[rgb(var(--border))] px-5 py-2 sm:px-6"><div className="flex items-center justify-between gap-3 py-2"><h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-muted))]">Următoarele priorități</h2><span className="text-xs text-[rgb(var(--text-faint))]">în ordinea intervenției</span></div><ol>{brief.secondaryPriorities.map((priority) => <SecondaryPriority key={priority.id} priority={priority} />)}</ol></div> : null}
      {(brief.hiddenPriorityCount > 0 || brief.state === "ready") ? <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--border))] px-5 py-3 text-xs text-[rgb(var(--text-muted))] sm:px-6"><span>{brief.hiddenPriorityCount > 0 ? `${brief.hiddenPriorityCount} priorități suplimentare rămân în registrul complet.` : "Prioritățile sunt deduplicate după oportunitatea comercială."}</span><Link href={brief.allPrioritiesHref} className="focus-ring rounded font-semibold text-[rgb(var(--primary))] hover:underline">Vezi toate prioritățile</Link></div> : null}
    </section>
  );
}
