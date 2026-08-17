import { ArrowRightIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ExplanationDisclosure } from "@/components/intelligence/ExplanationDisclosure";
import type { OperationalIntelligenceRecommendation } from "@/lib/operational-intelligence";
import { explanationForRecommendation } from "@/lib/revenew-explanation-adapters";
import { formatCurrency, formatDate } from "@/lib/utils";

const strengthTone: Record<OperationalIntelligenceRecommendation["evidenceStrength"], BadgeTone> = {
  sufficient: "success",
  partial: "info",
  verify: "warning"
};

export function RecommendationExplanationCard({ recommendation, compact = false, position }: {
  recommendation: OperationalIntelligenceRecommendation;
  compact?: boolean;
  position?: number;
}) {
  const primaryEvidence = recommendation.evidence[0];
  const primaryGap = recommendation.missingInformation[0] ?? "Nu a fost identificată o lipsă critică în datele disponibile.";

  return (
    <article className="overflow-hidden rounded-panel border border-[rgb(var(--gold-500)/0.3)] bg-[rgb(var(--surface))] shadow-card" aria-labelledby={`recommendation-${recommendation.id}`}>
      <div className={`border-b border-[rgb(var(--border))] ${compact ? "p-4" : "p-5"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.11em] text-[rgb(var(--gold-700))] dark:text-[rgb(var(--gold-300))]">Recomandare explicată</p>
          {position ? <span className="text-xs text-[rgb(var(--text-faint))]">Prioritatea {position}</span> : null}
          <Badge tone={strengthTone[recommendation.evidenceStrength]} size="small" className="sm:ml-auto">{recommendation.evidenceStrengthLabel}</Badge>
        </div>
        <h3 id={`recommendation-${recommendation.id}`} className={`mt-2 font-semibold tracking-[-0.02em] ${compact ? "text-lg" : "text-xl"}`}>{recommendation.title}</h3>
        <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]"><strong className="text-[rgb(var(--foreground))]">Situație:</strong> {recommendation.situation}</p>
      </div>

      <div className={`grid gap-px bg-[rgb(var(--border))] ${compact ? "sm:grid-cols-3" : "lg:grid-cols-3"}`}>
        <div className="bg-[rgb(var(--surface-subtle))] p-3.5">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-[rgb(var(--text-faint))]">De ce contează acum</p>
          <p className="mt-2 text-sm leading-5 text-[rgb(var(--text-secondary))]">{recommendation.whyNow}</p>
        </div>
        <div className="bg-[rgb(var(--surface-subtle))] p-3.5">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-[rgb(var(--text-faint))]">Dovadă</p>
          <p className="mt-2 text-sm font-medium leading-5 text-[rgb(var(--foreground))]">{primaryEvidence?.label ?? "Dovada trebuie completată înainte de decizie."}</p>
          {primaryEvidence?.observedAt ? <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Înregistrată: {formatDate(primaryEvidence.observedAt)}</p> : null}
        </div>
        <div className="bg-[rgb(var(--surface-subtle))] p-3.5">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-[rgb(var(--text-faint))]">Ce lipsește</p>
          <p className="mt-2 text-sm leading-5 text-[rgb(var(--text-secondary))]">{primaryGap}</p>
        </div>
      </div>

      <div className={`grid gap-4 border-t border-[rgb(var(--border))] ${compact ? "p-4" : "p-5"} md:grid-cols-[minmax(0,1fr)_auto] md:items-center`}>
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--primary))]">Acțiune sigură</p>
          <p className="mt-1 text-sm font-semibold text-[rgb(var(--foreground))]">{recommendation.safeNextAction.label}</p>
          <p className="mt-1 flex items-start gap-2 text-xs leading-5 text-[rgb(var(--text-muted))]"><ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />Decizie umană necesară. Nu există execuție externă automată.</p>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          {recommendation.estimatedValue && recommendation.currency ? (
            <div className="md:text-right">
              <p className="text-xs text-[rgb(var(--text-muted))]">Valoare estimată, neconfirmată</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">{formatCurrency(recommendation.estimatedValue, recommendation.currency)}</p>
              <p className="text-xs text-[rgb(var(--text-muted))]">{recommendation.confirmedValueLabel}</p>
            </div>
          ) : <p className="text-xs text-[rgb(var(--text-muted))]">Valoarea și venitul confirmat nu sunt disponibile.</p>}
          <Button href={recommendation.safeNextAction.href} size="small">{recommendation.safeNextAction.label}<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>
        </div>
      </div>

      <div className="border-t border-[rgb(var(--border))] p-4 sm:p-5"><ExplanationDisclosure explanation={explanationForRecommendation(recommendation)} /></div>
    </article>
  );
}
