import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, children }: PageHeaderProps) {
  return (
    <div className="flex min-h-14 flex-col justify-center gap-3 border-b border-[rgb(var(--border-subtle))] pb-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 max-w-3xl">
        <p className="text-micro font-semibold tracking-[0.01em] text-[rgb(var(--text-muted))]">{eyebrow}</p>
        <h1 className="mt-1 font-display text-page-heading font-semibold leading-8 tracking-[-0.025em] text-[rgb(var(--foreground))]">{title}</h1>
        <p className="mt-1 max-w-2xl text-label leading-5 text-[rgb(var(--text-secondary))]">{description}</p>
      </div>
      {children ? <div className="flex w-full min-w-0 max-w-full flex-wrap gap-2 md:w-auto md:shrink-0 md:justify-end">{children}</div> : null}
    </div>
  );
}
