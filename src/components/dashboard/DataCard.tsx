type DataCardProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
};

export function DataCard({ title, description, children, action }: DataCardProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.045] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          {description ? <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p> : null}
        </div>
        {action}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}
