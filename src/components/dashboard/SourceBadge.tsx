import { sourceLabel } from "@/lib/recovery";

export function SourceBadge({ source }: { source: string }) {
  return (
    <span className="inline-flex rounded border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] px-2 py-1 text-xs font-semibold text-[rgb(var(--muted-foreground))]">
      Sursă: {sourceLabel(source)}
    </span>
  );
}
