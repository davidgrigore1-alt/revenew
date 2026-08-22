import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-[rgb(var(--border))] pb-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 max-w-3xl">
        <p className="text-xs font-medium text-[rgb(var(--text-muted))]">{eyebrow}</p>
        <h1 className="mt-1 font-display text-page-title font-semibold text-[rgb(var(--foreground))]">{title}</h1>
        <p className="mt-1 max-w-2xl text-[0.8125rem] leading-5 text-[rgb(var(--text-muted))]">{description}</p>
      </div>
      {children ? <div className="flex shrink-0 flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}
