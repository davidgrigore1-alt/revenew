import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { getScorePresentation } from "@/lib/ui/domain-state-presentation";

type ScoreBadgeProps = {
  label?: string;
  score: number;
  info?: ReactNode;
};

const scoreInfo: Record<string, string> = {
  Fit: "Cât de bine se potrivește oportunitatea cu serviciile, locația și publicul țintă al firmei.",
  Urgență: "Cât de repede trebuie acționat, în funcție de deadline și context.",
  Bani: "Estimare a valorii comerciale posibile. Nu este venit garantat.",
  Încredere: "Cât de sigură este analiza în funcție de datele disponibile."
};

export function ScoreBadge({ label = "Scor", score, info }: ScoreBadgeProps) {
  const presentation = getScorePresentation(score);

  return (
    <Badge tone={presentation.tone} className="gap-1.5">
      <span>{label}: {score}</span>
      {info || scoreInfo[label] ? <InfoTooltip content={info ?? scoreInfo[label]} /> : null}
    </Badge>
  );
}
