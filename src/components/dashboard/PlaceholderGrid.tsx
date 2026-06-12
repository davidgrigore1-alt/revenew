type PlaceholderGridProps = {
  items: Array<{
    title: string;
    description: string;
    value?: string;
  }>;
};

export function PlaceholderGrid({ items }: PlaceholderGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <article key={item.title} className="rounded-xl border border-white/10 bg-white/[0.045] p-5">
          {item.value ? <p className="text-2xl font-semibold text-white">{item.value}</p> : null}
          <h2 className="mt-2 text-base font-semibold text-white">{item.title}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{item.description}</p>
        </article>
      ))}
    </div>
  );
}
