import { cn } from "@/lib/utils";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

type ScoreBadgeProps = {
  label?: string;
  score: number;
  info?: React.ReactNode;
};

const scoreInfo: Record<string, string> = {
  Fit: "Cat de bine se potriveste oportunitatea cu serviciile, locatia si publicul tinta al firmei.",
  Urgenta: "Cat de repede trebuie actionat, in functie de deadline si context.",
  Bani: "Estimare a valorii comerciale posibile. Nu este venit garantat.",
  Incredere: "Cat de sigura este analiza in functie de datele disponibile.",
  "Încredere": "Cat de sigura este analiza in functie de datele disponibile."
};

export function ScoreBadge({ label = "Scor", score, info }: ScoreBadgeProps) {
  const tone =
    score >= 85
      ? "border-mint-400/25 bg-mint-400/10 text-mint-400"
      : score >= 70
        ? "border-gold-400/25 bg-gold-400/10 text-gold-400"
        : "border-white/10 bg-white/[0.06] text-zinc-300";

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold", tone)}>
      <span>
        {label}: {score}
      </span>
      {info || scoreInfo[label] ? <InfoTooltip content={info ?? scoreInfo[label]} /> : null}
    </span>
  );
}
