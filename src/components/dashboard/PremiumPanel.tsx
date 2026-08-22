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
    "border-[rgb(var(--primary)/0.42)] bg-[rgb(var(--surface-elevated))] shadow-elevated"
};

export function PremiumPanel({ as: Component = "section", tone = "default", className, ...props }: PremiumPanelProps) {
  return <Component className={cn("rounded-panel border", tones[tone], className)} {...props} />;
}
