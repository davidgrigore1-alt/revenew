import type { ReactNode } from "react";

export function CompactEmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-12 flex-col justify-center gap-2 rounded-button border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-3 text-sm text-[rgb(var(--text-muted))] sm:flex-row sm:items-center sm:justify-between">
      <p>{children}</p>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
