import Link from "next/link";
import { PriorityBadge } from "@/components/dashboard/PriorityBadge";
import { CompleteTaskButton } from "@/components/revenue/TaskControls";
import type { RecoveryAction } from "@/lib/recovery";
import { formatCurrency, formatDate } from "@/lib/utils";

export function TodayActionCard({ action, compact = false }: { action: RecoveryAction; compact?: boolean }) {
  return (
    <article data-guide-anchor="today-action" className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-[rgb(var(--foreground))]">{action.title}</h3>
          <p className="mt-1 truncate text-sm text-[rgb(var(--muted-foreground))]">{action.company}</p>
        </div>
        <PriorityBadge priority={action.priority} />
      </div>
      <div className="mt-3 border-l-2 border-[rgb(var(--brand-500)/0.55)] pl-3">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">De ce contează acum</p>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{action.reason}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <p><span className="text-[rgb(var(--muted-foreground))]">Valoare estimată, neconfirmată:</span> <span className="font-semibold text-[rgb(var(--foreground))]">{formatCurrency(action.estimatedValue, action.currency)}</span></p>
        <p><span className="text-[rgb(var(--muted-foreground))]">Dovadă · termen înregistrat:</span> <span className="font-semibold text-[rgb(var(--foreground))]">{formatDate(action.dueAt)}</span></p>
      </div>
      {compact ? null : (
        <details className="mt-3 text-sm text-[rgb(var(--muted-foreground))]">
          <summary className="cursor-pointer font-semibold text-[rgb(var(--foreground))]">De ce?</summary>
          <p className="mt-2">Valoare comercială, pas următor clar și risc de pierdere fără răspuns.</p>
        </details>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={action.opportunityId ? `/opportunities/${action.opportunityId}` : "/today"} className="focus-ring inline-flex min-h-11 items-center rounded-lg bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-[rgb(var(--primary-foreground))]">
          Revizuiește acțiunea
        </Link>
        {action.opportunityId && action.status === "pending" ? <CompleteTaskButton opportunityId={action.opportunityId} actionId={action.id} /> : null}
      </div>
    </article>
  );
}
