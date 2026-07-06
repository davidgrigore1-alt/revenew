import Link from "next/link";
import { clsx } from "clsx";
import type { AdminBusinessSummary, MarginStatus } from "@/lib/admin/insights";
import { formatMicros, marginStatusLabel } from "@/lib/admin/insights";

export function AdminHeader({
  title,
  description,
  rangeLabel,
  actions
}: {
  title: string;
  description: string;
  rangeLabel?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4 border-b border-[rgb(var(--border))] pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">Founder Control Center</p>
        <h1 className="mt-2 break-words text-3xl font-semibold tracking-normal text-[rgb(var(--foreground))]">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--muted-foreground))]">{description}</p>
        {rangeLabel ? <p className="mt-2 text-xs text-[rgb(var(--muted-foreground))]">Perioadă: {rangeLabel}</p> : null}
      </div>
      {actions ? <div className="flex min-w-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminRangeLinks({ active }: { active: string }) {
  const ranges = [
    ["today", "Astăzi"],
    ["7d", "7 zile"],
    ["30d", "30 zile"],
    ["current_month", "Luna curentă"],
    ["last_month", "Luna trecută"],
    ["90d", "90 zile"]
  ];

  return (
    <div className="flex flex-wrap gap-2" aria-label="Interval raportare">
      {ranges.map(([key, label]) => (
        <Link
          key={key}
          href={`?range=${key}`}
          className={clsx(
            "focus-ring rounded-lg border px-3 py-2 text-sm font-semibold",
            active === key
              ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary)_/_0.12)] text-[rgb(var(--primary))]"
              : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

export function AdminMetricCard({ label, value, detail, status }: { label: string; value: string; detail: string; status?: MarginStatus }) {
  return (
    <div className="min-w-0 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[rgb(var(--muted-foreground))]">{label}</p>
        {status ? <MarginStatusBadge status={status} /> : null}
      </div>
      <p className="mt-3 break-words text-2xl font-semibold text-[rgb(var(--foreground))]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[rgb(var(--muted-foreground))]">{detail}</p>
    </div>
  );
}

export function AdminSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 min-w-0">
        <h2 className="break-words text-lg font-semibold text-[rgb(var(--foreground))]">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function AdminEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-dashed border-[rgb(var(--border))] p-5 text-sm">
      <p className="font-semibold text-[rgb(var(--foreground))]">{title}</p>
      <p className="mt-2 leading-6 text-[rgb(var(--muted-foreground))]">{description}</p>
    </div>
  );
}

export function MarginStatusBadge({ status }: { status: MarginStatus }) {
  const styles: Record<MarginStatus, string> = {
    healthy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    watch: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    critical: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    insufficient_data: "border-[rgb(var(--border))] bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]"
  };

  return (
    <span className={clsx("inline-flex shrink-0 rounded-full border px-2 py-1 text-xs font-semibold", styles[status])}>
      {marginStatusLabel(status)}
    </span>
  );
}

export function BusinessCostTable({ businesses, limit }: { businesses: AdminBusinessSummary[]; limit?: number }) {
  const rows = [...businesses]
    .sort((a, b) => (b.providerCostMicros ?? -1) - (a.providerCostMicros ?? -1))
    .slice(0, limit ?? businesses.length);

  if (!rows.length) {
    return <AdminEmptyState title="Nu există firme de afișat" description="Lista va apărea după configurarea firmelor și accesul intern la baza de date." />;
  }

  return (
    <div className="app-scrollbar max-w-full overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.12em] text-[rgb(var(--muted-foreground))]">
          <tr>
            <th className="py-2 pr-3">Firmă</th>
            <th className="py-2 pr-3">Owner</th>
            <th className="py-2 pr-3">Plan</th>
            <th className="py-2 pr-3">Cereri</th>
            <th className="py-2 pr-3">Cost API</th>
            <th className="py-2 pr-3">Valoare plan</th>
            <th className="py-2 pr-3">Marjă</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((business) => (
            <tr key={business.id} className="border-t border-[rgb(var(--border))]">
              <td className="max-w-[260px] py-3 pr-3">
                <Link href={`/admin/businesses/${business.id}`} className="focus-ring break-words font-semibold text-[rgb(var(--foreground))] hover:text-[rgb(var(--primary))]">
                  {business.name}
                </Link>
                <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">{business.accessStatus}</p>
              </td>
              <td className="py-3 pr-3 text-[rgb(var(--muted-foreground))]">{business.ownerEmail ?? "Indisponibil"}</td>
              <td className="py-3 pr-3">{business.planId ?? "Fără plan confirmat"}</td>
              <td className="py-3 pr-3">{business.requestCount ?? "Indisponibil"}</td>
              <td className="py-3 pr-3">{formatMicros(business.providerCostMicros)}</td>
              <td className="py-3 pr-3">{formatMicros(business.configuredMonthlyValueMicros)}</td>
              <td className="py-3 pr-3"><MarginStatusBadge status={business.marginStatus} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RatioBar({ value, label }: { value: number | null; label: string }) {
  const percent = value === null ? 0 : Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div>
      <div className="flex justify-between gap-3 text-xs text-[rgb(var(--muted-foreground))]">
        <span>{label}</span>
        <span>{value === null ? "Indisponibil" : `${percent}%`}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-[rgb(var(--muted))]">
        <div className="h-2 rounded-full bg-[rgb(var(--primary))]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
