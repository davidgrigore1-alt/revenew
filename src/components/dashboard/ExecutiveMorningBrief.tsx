import Link from "next/link";
import { ArrowRightIcon, ClockIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ExplanationDisclosure } from "@/components/intelligence/ExplanationDisclosure";
import type { ExecutiveBriefPriority, ExecutiveDailyBrief } from "@/lib/executive-morning-brief";
import { explanationForExecutivePriority } from "@/lib/revenew-explanation-adapters";
import { formatCurrency, formatDate } from "@/lib/utils";

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
  return (
    <section aria-labelledby="executive-brief-title" className="rounded-panel border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] p-5 shadow-card sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgb(var(--border))] pb-4">
        <div>
          <p className="text-sm font-semibold text-[rgb(var(--text-secondary))]">{brief.salutation}</p>
          <h1 id="executive-brief-title" className="mt-1 text-xl font-semibold tracking-[-0.025em] text-[rgb(var(--foreground))] sm:text-2xl">{brief.headline}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--text-muted))]">{brief.summary}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-[rgb(var(--text-faint))]">
          <ClockIcon className="h-4 w-4" aria-hidden="true" />{brief.period.label}
        </div>
      </header>

      {brief.state === "ready" && primary ? (
        <div className="grid gap-5 pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.34fr)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={severityTone[primary.severity]} size="small">{primary.kindLabel}</Badge>
              <span className="text-xs font-semibold text-[rgb(var(--text-muted))]">{primary.statusLabel}</span>
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-[-0.015em] text-[rgb(var(--foreground))] sm:text-xl">{primary.title}</h2>
            {(primary.company || primary.opportunity) ? <p className="mt-1 text-sm font-semibold text-[rgb(var(--text-secondary))]">{[primary.company, primary.opportunity].filter(Boolean).join(" · ")}</p> : null}
            <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-muted))]"><strong className="text-[rgb(var(--foreground))]">De ce contează:</strong> {primary.whyItMatters}</p>
            {primary.amount !== undefined && primary.currency ? (
              <p className="mt-3 text-sm text-[rgb(var(--text-muted))]"><strong className="font-semibold tabular-nums text-[rgb(var(--foreground))]">{formatCurrency(primary.amount, primary.currency)}</strong> · valoare estimată, neconfirmată</p>
            ) : null}
            <ExplanationDisclosure explanation={explanationForExecutivePriority(primary)} controlLabel="De ce este prioritar?" className="mt-4" />
          </div>

          <aside className="rounded-card border border-[rgb(var(--brand-500)/0.24)] bg-[rgb(var(--surface-subtle))] p-4" aria-label="Prima acțiune sigură">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--primary))]">Prima acțiune sigură</p>
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">{primary.reason}</p>
            <Button href={primary.safeAction.href} className="mt-4 w-full">{primary.safeAction.label}<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>
            <div className="mt-4 flex gap-2 text-xs leading-5 text-[rgb(var(--text-muted))]">
              <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />
              <p>Decizia și orice acțiune externă rămân sub control uman.</p>
            </div>
          </aside>
        </div>
      ) : (
        <div className="pt-5">
          <p className="text-sm leading-6 text-[rgb(var(--text-muted))]">{brief.state === "clear" ? "Poți continua cu activitatea planificată sau verifica registrul complet." : "Adaugă sau actualizează oportunitățile și acțiunile pentru o prioritizare utilă."}</p>
          <Button href={brief.state === "clear" ? "/today" : "/opportunities"} variant="secondary" size="small" className="mt-3">{brief.state === "clear" ? "Vezi activitatea mea" : "Vezi oportunitățile"}</Button>
        </div>
      )}

      {brief.secondaryPriorities.length > 0 ? <ol className="mt-4">{brief.secondaryPriorities.map((priority) => <SecondaryPriority key={priority.id} priority={priority} />)}</ol> : null}
      {(brief.hiddenPriorityCount > 0 || brief.state === "ready") ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--border))] pt-3 text-xs text-[rgb(var(--text-muted))]">
          <span>{brief.hiddenPriorityCount > 0 ? `${brief.hiddenPriorityCount} priorități suplimentare rămân în registrul complet.` : "Prioritățile sunt deduplicate după oportunitatea comercială."}</span>
          <Link href={brief.allPrioritiesHref} className="focus-ring rounded font-semibold text-[rgb(var(--primary))] hover:underline">Vezi toate prioritățile</Link>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 border-t border-[rgb(var(--border))] pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <h2 className="text-sm font-semibold text-[rgb(var(--foreground))]">Ce s-a schimbat</h2>
          {brief.recentChanges.length > 0 ? (
            <ul className="mt-2 grid gap-2">
              {brief.recentChanges.map((change) => (
                <li key={change.id} className="text-xs leading-5 text-[rgb(var(--text-muted))]">
                  {change.href ? <Link href={change.href} className="focus-ring rounded font-semibold text-[rgb(var(--foreground))] hover:text-[rgb(var(--primary))] hover:underline">{change.label}</Link> : <strong className="text-[rgb(var(--foreground))]">{change.label}</strong>}
                  <span> · {change.context} · {formatDate(change.occurredAt)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">Nu există schimbări comerciale semnificative înregistrate în ultimele 24 de ore.</p>}
        </div>
        <div className="md:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.09em] text-[rgb(var(--text-faint))]">Activitatea mea</p>
          <p className="mt-1 text-sm font-semibold text-[rgb(var(--foreground))]">{brief.assignedTodaySummary.dueToday} azi · {brief.assignedTodaySummary.overdue} restante</p>
          <Link href={brief.assignedTodaySummary.href} className="focus-ring mt-1 inline-flex min-h-8 items-center rounded text-xs font-semibold text-[rgb(var(--primary))] hover:underline">Deschide activitatea mea</Link>
        </div>
      </div>
    </section>
  );
}
