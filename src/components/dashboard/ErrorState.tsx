import { Button } from "@/components/ui/Button";

export function ErrorState({ title = "Nu am putut încărca informațiile.", description = "Verifică conexiunea și încearcă din nou." }: { title?: string; description?: string }) {
  return (
    <div className="rounded-xl border border-[rgb(var(--danger)_/_0.35)] bg-[rgb(var(--danger)_/_0.08)] p-6">
      <h2 className="text-lg font-semibold text-[rgb(var(--foreground))]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{description}</p>
      <div className="mt-4">
        <Button href="/dashboard" variant="secondary">Reîncearcă</Button>
      </div>
    </div>
  );
}
