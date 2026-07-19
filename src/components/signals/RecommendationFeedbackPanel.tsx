import { CheckCircleIcon, ClockIcon, PencilSquareIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { recommendationFeedbackForSignal } from "@/lib/recommendation-feedback";
import type { CommercialSignal } from "@/lib/types";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDateTimeWithSeconds } from "@/lib/utils";

type RecommendationFeedbackPanelProps = {
  signal: CommercialSignal;
  auditHref?: string;
};

export function RecommendationFeedbackPanel({ signal, auditHref }: RecommendationFeedbackPanelProps) {
  const feedback = recommendationFeedbackForSignal(signal);
  const Icon = feedback.state === "applied"
    ? CheckCircleIcon
    : feedback.state === "rejected" || feedback.state === "not_useful"
      ? XCircleIcon
      : feedback.wasEdited
        ? PencilSquareIcon
        : ClockIcon;
  const tone = feedback.state === "applied" ? "success" as const
    : feedback.state === "rejected" || feedback.state === "not_useful" ? "neutral" as const
      : feedback.wasEdited ? "info" as const : "warning" as const;

  return (
    <section aria-labelledby={`recommendation-feedback-${signal.id}`} className="rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text-muted))]">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h3 id={`recommendation-feedback-${signal.id}`} className="text-sm font-semibold">Feedback recomandare</h3>
            <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Înregistrează decizia echipei; nu declanșează învățare sau acțiuni automate.</p>
          </div>
        </div>
        <StatusPill tone={tone}>{feedback.statusLabel}</StatusPill>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-[rgb(var(--text-muted))]">Sursă pregătire</dt><dd className="mt-1 font-semibold">{feedback.modeLabel}</dd></div>
        <div><dt className="text-xs text-[rgb(var(--text-muted))]">Decizie umană</dt><dd className="mt-1 font-semibold">{feedback.decisionLabel}</dd></div>
        {feedback.wasEdited ? <div className="sm:col-span-2"><dt className="text-xs text-[rgb(var(--text-muted))]">Modificare</dt><dd className="mt-1 font-medium">Recomandarea a fost modificată înainte de aprobare.</dd></div> : null}
        {feedback.rejectionReason ? <div className="sm:col-span-2"><dt className="text-xs text-[rgb(var(--text-muted))]">Motiv înregistrat</dt><dd className="mt-1 leading-5 text-[rgb(var(--text-secondary))]">{feedback.rejectionReason}</dd></div> : null}
        {feedback.wasEdited && feedback.originalAction && feedback.finalAction ? <>
          <div><dt className="text-xs text-[rgb(var(--text-muted))]">Recomandare inițială</dt><dd className="mt-1 leading-5 text-[rgb(var(--text-secondary))]">{feedback.originalAction}</dd></div>
          <div><dt className="text-xs text-[rgb(var(--text-muted))]">{feedback.state === "applied" ? "Acțiune aprobată" : "Recomandare revizuită"}</dt><dd className="mt-1 leading-5 text-[rgb(var(--text-secondary))]">{feedback.finalAction}</dd></div>
        </> : null}
      </dl>

      {(feedback.decidedAt || auditHref) ? <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[rgb(var(--border))] pt-3 text-xs text-[rgb(var(--text-muted))]">
        <span>{feedback.decidedAt ? formatDateTimeWithSeconds(feedback.decidedAt) : "Decizie încă neînregistrată"}</span>
        {auditHref ? <a href={auditHref} className="focus-ring font-semibold text-[rgb(var(--primary))] hover:underline">Vezi auditul</a> : null}
      </div> : null}
    </section>
  );
}
