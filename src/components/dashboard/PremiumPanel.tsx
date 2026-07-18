import type { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type PremiumPanelProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  tone?: "default" | "subtle" | "emphasis";
};

const tones = {
  default: "border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-card",
  subtle: "border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]",
  emphasis:
    "border-[rgb(var(--brand-500)/0.34)] bg-[linear-gradient(145deg,rgb(var(--brand-50)/0.76),rgb(var(--surface))_52%,rgb(var(--surface-subtle)))] shadow-elevated dark:border-[rgb(var(--brand-700)/0.3)] dark:bg-[linear-gradient(145deg,rgb(var(--surface-muted)),rgb(var(--surface))_54%,rgb(var(--surface-subtle)))]"
};

export function PremiumPanel({ as: Component = "section", tone = "default", className, ...props }: PremiumPanelProps) {
  return <Component className={cn("rounded-panel border", tones[tone], className)} {...props} />;
}
