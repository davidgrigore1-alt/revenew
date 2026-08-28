import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, children }: PageHeaderProps) {
  return (
    <div className="flex min-h-14 flex-col justify-center gap-3 border-b border-[rgb(var(--border)/0.78)] pb-3.5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 max-w-3xl">
        <p className="text-micro font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">{eyebrow}</p>
        <h1 className="mt-0.5 font-display text-page-heading font-semibold leading-8 tracking-[-0.025em] text-[rgb(var(--foreground))]">{title}</h1>
        <p className="mt-0.5 max-w-2xl text-label leading-5 text-[rgb(var(--text-muted))]">{description}</p>
      </div>
      {children ? <div className="flex shrink-0 flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}
