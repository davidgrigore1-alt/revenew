type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
};

export function PageHeader({ eyebrow, title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[rgb(var(--primary))]">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[rgb(var(--foreground))] sm:text-4xl">{title}</h1>
        <p className="mt-3 text-base leading-7 text-[rgb(var(--muted-foreground))]">{description}</p>
      </div>
      {children ? <div className="flex shrink-0 flex-wrap gap-3">{children}</div> : null}
    </div>
  );
}
