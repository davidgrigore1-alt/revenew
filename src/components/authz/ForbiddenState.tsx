import { Button } from "@/components/ui/Button";

export function ForbiddenState({
  title = "Acces restricționat",
  description = "Nu ai permisiunea necesară pentru această zonă."
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">Permisiuni ReveNew</p>
      <h2 className="mt-3 text-2xl font-semibold text-[rgb(var(--foreground))]">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[rgb(var(--muted-foreground))]">{description}</p>
      <div className="mt-5">
        <Button href="/dashboard" variant="secondary">Înapoi la dashboard</Button>
      </div>
    </div>
  );
}
