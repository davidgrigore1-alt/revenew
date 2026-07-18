import Link from "next/link";
import { cn } from "@/lib/utils";

export type AttentionSummaryItem = {
  label: string;
  value: number;
  tone: "brand" | "warning" | "danger" | "neutral";
  href?: string;
};

const toneStyles = {
  brand: { bar: "bg-[rgb(var(--brand-500))]", dot: "bg-[rgb(var(--brand-500))]" },
  warning: { bar: "bg-[rgb(var(--warning-text))]", dot: "bg-[rgb(var(--warning-text))]" },
  danger: { bar: "bg-[rgb(var(--danger-text))]", dot: "bg-[rgb(var(--danger-text))]" },
  neutral: { bar: "bg-[rgb(var(--text-faint))]", dot: "bg-[rgb(var(--text-faint))]" }
};

export function AttentionSummary({ items }: { items: AttentionSummaryItem[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div>
      <div
        className="flex h-2 overflow-hidden rounded-full bg-[rgb(var(--surface-muted))]"
        role="img"
        aria-label={`Distribuție operațională: ${items.map((item) => `${item.label} ${item.value}`).join(", ")}`}
      >
        {items.filter((item) => item.value > 0).map((item) => (
          <span key={item.label} className={toneStyles[item.tone].bar} style={{ width: `${(item.value / Math.max(total, 1)) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {items.map((item) => {
          const share = total > 0 ? Math.round((item.value / total) * 100) : 0;
          const content = (
            <div className="w-full">
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", toneStyles[item.tone].dot)} aria-hidden="true" />
                <span className="min-w-0 flex-1 text-sm text-[rgb(var(--text-secondary))]">{item.label}</span>
                <strong className="text-sm tabular-nums text-[rgb(var(--foreground))]">{item.value}</strong>
                <span className="w-8 text-right text-xs tabular-nums text-[rgb(var(--text-faint))]">{share}%</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[rgb(var(--surface-muted))]" aria-hidden="true">
                <span className={cn("block h-full rounded-full", toneStyles[item.tone].bar)} style={{ width: `${share}%` }} />
              </div>
            </div>
          );

          return (
            <li key={item.label}>
              {item.href ? (
                <Link href={item.href} className="focus-ring flex min-h-12 items-center rounded-control px-2.5 py-2 transition-colors duration-fast hover:bg-[rgb(var(--surface-muted))]">
                  {content}
                </Link>
              ) : (
                <div className="flex min-h-12 items-center px-2.5 py-2">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs leading-5 text-[rgb(var(--text-faint))]">Distribuție operațională pe baza înregistrărilor accesibile în workspace. Stările se pot suprapune.</p>
    </div>
  );
}
