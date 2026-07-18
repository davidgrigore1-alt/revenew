import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SectionHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  headingLevel?: "h2" | "h3";
  className?: string;
};

export function SectionHeader({
  title,
  description,
  eyebrow,
  actions,
  headingLevel = "h2",
  className
}: SectionHeaderProps) {
  const Heading = headingLevel as ElementType;

  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">{eyebrow}</p> : null}
        <Heading className="text-section-title font-semibold tracking-[-0.015em] text-[rgb(var(--foreground))]">{title}</Heading>
        {description ? <p className="mt-1.5 text-sm leading-6 text-[rgb(var(--text-muted))]">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
