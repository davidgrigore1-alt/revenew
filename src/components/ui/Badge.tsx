import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "brand" | "success" | "info" | "warning" | "danger" | "gold";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  size?: "small" | "default";
};

const tones: Record<BadgeTone, string> = {
  neutral: "border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] text-[rgb(var(--text-secondary))]",
  brand: "border-[rgb(var(--brand-300))] bg-[rgb(var(--brand-50))] text-[rgb(var(--brand-800))] dark:border-[rgb(var(--brand-700))] dark:bg-[rgb(var(--brand-950))] dark:text-[rgb(var(--brand-300))]",
  success: "border-[rgb(var(--success-border))] bg-[rgb(var(--success-background))] text-[rgb(var(--success-text))]",
  info: "border-[rgb(var(--info-border))] bg-[rgb(var(--info-background))] text-[rgb(var(--info-text))]",
  warning: "border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] text-[rgb(var(--warning-text))]",
  danger: "border-[rgb(var(--danger-border))] bg-[rgb(var(--danger-background))] text-[rgb(var(--danger-text))]",
  gold: "border-[rgb(var(--gold-300))] bg-[rgb(var(--gold-100))] text-[rgb(var(--gold-700))] dark:border-[rgb(var(--gold-700))] dark:bg-[rgb(var(--gold-700)/0.18)] dark:text-[rgb(var(--gold-300))]"
};

export function Badge({ tone = "neutral", size = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-[var(--radius-pill)] border font-semibold leading-none",
        size === "small" ? "min-h-5 px-2 text-[0.6875rem]" : "min-h-6 px-2.5 text-xs",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
