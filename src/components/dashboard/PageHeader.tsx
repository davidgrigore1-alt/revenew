import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-[rgb(var(--border))] pb-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[rgb(var(--foreground))] sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[rgb(var(--text-muted))]">{description}</p>
      </div>
      {children ? <div className="flex shrink-0 flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}
