import { CheckCircleIcon, DocumentTextIcon, PencilSquareIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import type { PreparedWorkItem } from "@/lib/prepared-work";
import { formatProductDateTime } from "@/lib/ui/presentation";

const statusLabels: Record<PreparedWorkItem["status"], string> = {
  prepared: "Pregătit",
  ready_for_review: "Gata de revizuire",
  approved: "Aprobat",
  rejected: "Respins",
  executed: "Executat",
  expired: "Expirat"
};

const typeLabels: Record<PreparedWorkItem["type"], string> = {
  prepared_email: "Mesaj pregătit",
  prepared_task: "Task pregătit",
  prepared_next_action: "Următoare acțiune",
  prepared_owner_assignment: "Propunere de responsabil",
  prepared_opportunity_update: "Actualizare comercială",
  prepared_meeting_brief: "Brief de întâlnire",
  prepared_followup_plan: "Plan de follow-up"
};

export function ActionPreview({ item, compact = false }: { item: PreparedWorkItem; compact?: boolean }) {
  return (
    <section aria-labelledby={"prepared-work-" + item.id} className="overflow-hidden rounded-panel border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-elevated))] shadow-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgb(var(--border))] px-4 py-3.5">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] text-[rgb(var(--primary))]"><DocumentTextIcon className="h-4 w-4" aria-hidden="true" /></span>
          <div className="min-w-0"><p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--primary))]">{typeLabels[item.type]}</p><h3 id={"prepared-work-" + item.id} className="mt-1 truncate text-sm font-semibold">{item.title}</h3><p className="mt-0.5 truncate text-xs text-[rgb(var(--text-muted))]">{item.target.label}{item.preparedAt ? ` · pregătit ${formatProductDateTime(item.preparedAt, { year: false })}` : ""}</p></div>
        </div>
        <span className={item.status === "approved" ? "status-pill status-pill-success" : "status-pill status-pill-warning"}><CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />{statusLabels[item.status]}</span>
      </header>
      <div className={compact ? "px-4 py-3" : "grid gap-5 p-4 md:grid-cols-[minmax(0,1.35fr)_minmax(14rem,.65fr)]"}>
        <div className="min-w-0"><p className="text-xs font-semibold text-[rgb(var(--text-muted))]">Ce este propus</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--text-secondary))]">{item.proposal}</p><p className="mt-3 text-xs leading-5 text-[rgb(var(--text-muted))]"><strong className="text-[rgb(var(--foreground))]">Motiv:</strong> {item.reason}</p></div>
        {!compact ? <aside className="border-t border-[rgb(var(--border))] pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0"><p className="flex items-center gap-1.5 text-xs font-semibold"><ShieldCheckIcon className="h-4 w-4 text-[rgb(var(--primary))]" aria-hidden="true" />Controlul schimbării</p><ul className="mt-3 space-y-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{item.willNotChange.map((value) => <li key={value}>— {value}</li>)}</ul><p className="mt-4 text-xs"><span className="text-[rgb(var(--text-muted))]">Aprobă:</span> <strong>{item.approver}</strong></p></aside> : null}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-3">
        <div className="min-w-0"><p className="text-[0.6875rem] font-semibold text-[rgb(var(--foreground))]">Neexecutat · necesită acțiune umană</p><p className="mt-0.5 truncate text-[0.6875rem] text-[rgb(var(--text-muted))]">Dovezi: {item.evidence.map((source) => source.label).join(" · ")}</p></div>
        <Button href={item.reviewHref} variant="secondary" size="small">{item.editable ? <PencilSquareIcon className="h-4 w-4" aria-hidden="true" /> : null}Revizuiește</Button>
      </footer>
    </section>
  );
}