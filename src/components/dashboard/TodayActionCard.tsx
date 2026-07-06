import Link from "next/link";
import { PriorityBadge } from "@/components/dashboard/PriorityBadge";
import type { RecoveryAction } from "@/lib/recovery";
import { formatCurrency, formatDate } from "@/lib/utils";

export function TodayActionCard({ action, compact = false }: { action: RecoveryAction; compact?: boolean }) {
  return (
    <article className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-[rgb(var(--foreground))]">{action.title}</h3>
          <p className="mt-1 truncate text-sm text-[rgb(var(--muted-foreground))]">{action.company}</p>
        </div>
        <PriorityBadge priority={action.priority} />
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{action.reason}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <p><span className="text-[rgb(var(--muted-foreground))]">Potențial:</span> <span className="font-semibold text-[rgb(var(--foreground))]">{formatCurrency(action.estimatedValue)}</span></p>
        <p><span className="text-[rgb(var(--muted-foreground))]">Termen:</span> <span className="font-semibold text-[rgb(var(--foreground))]">{formatDate(action.dueAt)}</span></p>
      </div>
      {compact ? null : (
        <details className="mt-3 text-sm text-[rgb(var(--muted-foreground))]">
          <summary className="cursor-pointer font-semibold text-[rgb(var(--foreground))]">De ce?</summary>
          <p className="mt-2">Valoare comercială, pas următor clar și risc de pierdere fără răspuns.</p>
        </details>
      )}
      <Link href={action.opportunityId ? `/opportunities/${action.opportunityId}` : "/today"} className="focus-ring mt-4 inline-flex rounded-lg bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-[rgb(var(--primary-foreground))]">
        Deschide
      </Link>
    </article>
  );
}
