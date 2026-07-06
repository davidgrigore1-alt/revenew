import { InfoTooltip } from "@/components/ui/InfoTooltip";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  tone?: "mint" | "gold" | "zinc";
  info?: React.ReactNode;
};

const toneClasses = {
  mint: "text-[rgb(var(--success))] bg-[rgb(var(--success)_/_0.1)] border-[rgb(var(--success)_/_0.22)]",
  gold: "text-[rgb(var(--warning))] bg-[rgb(var(--warning)_/_0.1)] border-[rgb(var(--warning)_/_0.22)]",
  zinc: "text-[rgb(var(--foreground))] bg-[rgb(var(--muted))] border-[rgb(var(--border))]"
};

export function MetricCard({ label, value, detail, tone = "zinc", info }: MetricCardProps) {
  return (
    <article className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-[var(--shadow-card)]">
      <div className={`mb-4 inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
        <span>{label}</span>
        {info ? <InfoTooltip content={info} /> : null}
      </div>
      <p className="text-3xl font-semibold tracking-tight text-[rgb(var(--foreground))]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{detail}</p>
    </article>
  );
}
