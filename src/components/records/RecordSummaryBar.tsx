import type { ReactNode } from "react";

export type RecordSummaryItem = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: "default" | "attention" | "success";
};

const toneClasses = {
  default: "border-l-transparent",
  attention: "border-l-[rgb(var(--warning-border))]",
  success: "border-l-[rgb(var(--success-border))]"
};

export function RecordSummaryBar({ items, label }: { items: RecordSummaryItem[]; label: string }) {
  return (
    <section className="border-y border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))]" aria-label={label}>
      <dl className="grid sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
        {items.map((item) => (
          <div key={item.label} className={`min-w-0 border-b border-l-2 border-[rgb(var(--border-subtle))] px-3 py-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0 ${toneClasses[item.tone ?? "default"]}`}>
            <dt className="text-micro font-semibold text-[rgb(var(--text-muted))]">{item.label}</dt>
            <dd className="mt-1 truncate text-label font-semibold text-[rgb(var(--foreground))]" title={typeof item.value === "string" ? item.value : undefined}>{item.value}</dd>
            {item.detail ? <p className="mt-0.5 truncate text-micro text-[rgb(var(--text-faint))]" title={typeof item.detail === "string" ? item.detail : undefined}>{item.detail}</p> : null}
          </div>
        ))}
      </dl>
    </section>
  );
}
