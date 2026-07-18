import type { ReactNode } from "react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  tone?: "mint" | "gold" | "zinc";
  info?: ReactNode;
};

const tones: Record<NonNullable<MetricCardProps["tone"]>, BadgeTone> = {
  mint: "success",
  gold: "gold",
  zinc: "neutral"
};

export function MetricCard({ label, value, detail, tone = "zinc", info }: MetricCardProps) {
  return (
    <Card as="article">
      <Badge tone={tones[tone]} className="gap-1.5">
        <span>{label}</span>
        {info ? <InfoTooltip content={info} /> : null}
      </Badge>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-[rgb(var(--foreground))]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">{detail}</p>
    </Card>
  );
}
