export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-8 text-center">
      <h2 className="text-lg font-semibold text-[rgb(var(--foreground))]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[rgb(var(--muted-foreground))]">{description}</p>
    </div>
  );
}
