import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  success: "border-emerald-700/[0.15] bg-emerald-700/5 text-emerald-800 dark:border-emerald-300/[0.15] dark:bg-emerald-300/[0.06] dark:text-emerald-200/[0.85]",
  gold: "border-[rgb(var(--primary)/0.2)] bg-[rgb(var(--primary)/0.06)] text-[rgb(var(--primary))]",
  warning: "border-[rgb(var(--primary)/0.2)] bg-[rgb(var(--primary)/0.06)] text-[rgb(var(--primary))]",
  neutral: "border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] text-[rgb(var(--text-muted))]"
} as const;

/** Apps-only status grammar: one indicator, quiet semantics, stable 24px height. */
export function ApplicationStatus({ tone = "neutral", icon, children, className, ...props }: HTMLAttributes<HTMLSpanElement> & {
  tone?: keyof typeof tones;
  icon?: ReactNode;
}) {
  return <span {...props} className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-[11px] font-medium leading-none", tones[tone], className)}>
    {icon ?? <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-75" />}
    {children}
  </span>;
}
