import type { ReactNode } from "react";

export type DataSummaryItem = {
  label: string;
  value: ReactNode;
  note?: string;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger";
};

const toneClasses = {
  neutral: "bg-[rgb(var(--text-faint))]",
  brand: "bg-[rgb(var(--primary))]",
  success: "bg-[rgb(var(--success-text))]",
  warning: "bg-[rgb(var(--warning-text))]",
  danger: "bg-[rgb(var(--danger-text))]"
};

export function DataSummaryStrip({ items, label }: { items: DataSummaryItem[]; label: string }) {
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-card xl:grid-cols-4" aria-label={label}>
      {items.map((item) => (
        <div key={item.label} className="relative min-w-0 border-b border-[rgb(var(--border))] p-3.5 last:border-b-0 [&:nth-child(odd)]:border-r [&:nth-last-child(-n+2)]:border-b-0 sm:p-4 xl:border-b-0 xl:border-r xl:last:border-r-0">
          <span aria-hidden="true" className={`absolute inset-x-4 top-0 h-px ${toneClasses[item.tone ?? "neutral"]}`} />
          <dt className="text-[0.68rem] font-bold uppercase tracking-[0.13em] text-[rgb(var(--text-muted))]">{item.label}</dt>
          <dd className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[rgb(var(--foreground))]">{item.value}</dd>
          {item.note ? <p className="mt-1.5 text-xs leading-5 text-[rgb(var(--text-muted))]">{item.note}</p> : null}
        </div>
      ))}
    </dl>
  );
}
