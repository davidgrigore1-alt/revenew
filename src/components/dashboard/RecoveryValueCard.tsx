import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";

export function RecoveryValueCard({ value, count }: { value: number; count: number }) {
  const hasData = value > 0 || count > 0;

  return (
    <section className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 shadow-[var(--shadow-card)] sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">Venit recuperabil</p>
          {hasData ? (
            <>
              <p className="mt-4 text-5xl font-semibold tracking-tight text-[rgb(var(--foreground))] sm:text-6xl">{formatCurrency(value)}</p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[rgb(var(--muted-foreground))]">
                Valoarea estimată a oportunităților care încă pot fi recuperate.
              </p>
              <p className="mt-2 text-xs text-[rgb(var(--muted-foreground))]">Calcul: oportunități deschise + cereri active. Nu este venit confirmat.</p>
            </>
          ) : (
            <>
              <p className="mt-4 text-2xl font-semibold text-[rgb(var(--foreground))]">Nu avem încă suficiente date.</p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[rgb(var(--muted-foreground))]">Adaugă o cerere ca ReveNew să găsească bani recuperabili.</p>
            </>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <Button href={hasData ? "/recoverable" : "/inbox"}>{hasData ? "Vezi oportunitățile" : "Adaugă primul semnal"}</Button>
          {hasData ? (
            <Link href="/recoverable" className="focus-ring rounded px-2 py-1 text-sm font-semibold text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]">
              Cum este calculat?
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
