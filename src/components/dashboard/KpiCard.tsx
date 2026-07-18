import type { ReactNode } from "react";
import { ArrowUpRightIcon } from "@heroicons/react/20/solid";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: string;
  detail: string;
  icon?: ReactNode;
  tone?: "neutral" | "brand" | "warning" | "danger";
  methodology?: string;
};

const accents = {
  neutral: "bg-[rgb(var(--text-faint))]",
  brand: "bg-[rgb(var(--brand-400))]",
  warning: "bg-[rgb(var(--warning-text))]",
  danger: "bg-[rgb(var(--danger-text))]"
};

export function KpiCard({ label, value, detail, icon, tone = "neutral", methodology }: KpiCardProps) {
  return (
    <article className="group relative min-w-0 overflow-hidden rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-card transition-[border-color,transform,box-shadow] duration-normal ease-standard hover:-translate-y-0.5 hover:border-[rgb(var(--border-strong))] hover:shadow-elevated sm:p-5">
      <span aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-0.5", accents[tone])} />
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.11em] text-[rgb(var(--text-muted))]">{label}</p>
        {icon ? <span className="text-[rgb(var(--text-faint))] transition-colors duration-fast group-hover:text-[rgb(var(--text-secondary))]">{icon}</span> : null}
      </div>
      <p className="mt-4 break-words text-[1.75rem] font-semibold leading-none tracking-[-0.035em] text-[rgb(var(--foreground))] sm:text-[2rem]">{value}</p>
      <p className="mt-3 text-sm leading-5 text-[rgb(var(--text-muted))]">{detail}</p>
      {methodology ? (
        <p className="mt-3 flex items-start gap-1.5 border-t border-[rgb(var(--border))] pt-3 text-xs leading-5 text-[rgb(var(--text-faint))]">
          <ArrowUpRightIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{methodology}</span>
        </p>
      ) : null}
    </article>
  );
}
