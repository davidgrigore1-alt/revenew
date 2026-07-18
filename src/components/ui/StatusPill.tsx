import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Badge, type BadgeTone } from "@/components/ui/Badge";

export type StatusPillProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  showDot?: boolean;
};

const dots: Record<BadgeTone, string> = {
  neutral: "bg-[rgb(var(--text-faint))]",
  brand: "bg-[rgb(var(--brand-600))] dark:bg-[rgb(var(--brand-400))]",
  success: "bg-[rgb(var(--success-text))]",
  info: "bg-[rgb(var(--info-text))]",
  warning: "bg-[rgb(var(--warning-text))]",
  danger: "bg-[rgb(var(--danger-text))]",
  gold: "bg-[rgb(var(--gold-500))]"
};

export function StatusPill({ tone = "neutral", showDot = true, className, children, ...props }: StatusPillProps) {
  return (
    <Badge tone={tone} className={cn("gap-1.5", className)} {...props}>
      {showDot ? <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dots[tone])} /> : null}
      <span className="truncate">{children}</span>
    </Badge>
  );
}
