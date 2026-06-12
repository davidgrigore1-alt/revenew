import { InfoTooltip } from "@/components/ui/InfoTooltip";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  tone?: "mint" | "gold" | "zinc";
  info?: React.ReactNode;
};

const toneClasses = {
  mint: "text-mint-400 bg-mint-400/10 border-mint-400/20",
  gold: "text-gold-400 bg-gold-400/10 border-gold-400/20",
  zinc: "text-zinc-200 bg-white/[0.045] border-white/10"
};

export function MetricCard({ label, value, detail, tone = "zinc", info }: MetricCardProps) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.045] p-5">
      <div className={`mb-4 inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
        <span>{label}</span>
        {info ? <InfoTooltip content={info} /> : null}
      </div>
      <p className="text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{detail}</p>
    </article>
  );
}
