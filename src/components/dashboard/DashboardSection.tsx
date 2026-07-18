import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DashboardSectionProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function DashboardSection({ title, description, eyebrow, action, children, className }: DashboardSectionProps) {
  return (
    <section className={cn("min-w-0", className)} aria-labelledby={`dashboard-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">{eyebrow}</p> : null}
          <h2 id={`dashboard-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className={cn("text-lg font-semibold tracking-[-0.015em] text-[rgb(var(--foreground))]", eyebrow && "mt-1.5")}>
            {title}
          </h2>
          {description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-[rgb(var(--text-muted))]">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
