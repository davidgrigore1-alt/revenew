const labels = {
  low: "Scăzută",
  medium: "Medie",
  high: "Ridicată",
  urgent: "Urgentă"
};

export function PriorityBadge({ priority }: { priority?: "low" | "medium" | "high" | "urgent" }) {
  const tone = priority === "high" || priority === "urgent" ? "text-[rgb(var(--warning))]" : "text-[rgb(var(--muted-foreground))]";

  return (
    <span className={`inline-flex rounded border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] px-2 py-1 text-xs font-semibold ${tone}`}>
      Prioritate {labels[priority ?? "medium"]}
    </span>
  );
}
