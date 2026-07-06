type DataCardProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
};

export function DataCard({ title, description, children, action }: DataCardProps) {
  return (
    <section className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[rgb(var(--foreground))]">{title}</h2>
          {description ? <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{description}</p> : null}
        </div>
        {action}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}
