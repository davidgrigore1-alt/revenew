import { ArrowRightIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import type { FirstValueJourney } from "@/lib/first-value-journey";

export function FirstTimeGuide({ journey }: { journey: FirstValueJourney }) {
  return (
    <section
      aria-labelledby="first-value-journey-title"
      className="overflow-hidden rounded-panel border border-[rgb(var(--gold-500)/0.3)] bg-[linear-gradient(135deg,rgb(var(--surface-elevated)),rgb(var(--gold-100)/0.24))] shadow-card dark:bg-[linear-gradient(135deg,rgb(var(--surface-elevated)),rgb(var(--gold-700)/0.08))]"
    >
      <div className="flex flex-col gap-4 border-b border-[rgb(var(--border))] p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--gold-700))] dark:text-[rgb(var(--gold-300))]">Primul flux de valoare</p>
          <h2 id="first-value-journey-title" className="mt-2 font-display text-2xl font-semibold tracking-tight text-[rgb(var(--foreground))]">
            De la un semnal comercial la o decizie controlată
          </h2>
          <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">
            ReveNew transformă contextul comercial într-o analiză explicabilă, o acțiune pregătită și o decizie umană auditabilă.
          </p>
        </div>
        <Button href={journey.nextHref} className="shrink-0">
          {journey.nextAction}
          <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <ol className="grid sm:grid-cols-2 xl:grid-cols-4" aria-label="Pașii primului flux de valoare">
        {journey.steps.map((step, index) => (
          <li key={step.id} className="border-b border-[rgb(var(--border))] p-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0 xl:[&:nth-child(odd)]:border-r">
            <div className="flex items-center gap-2">
              {step.state === "complete" ? (
                <CheckCircleIcon className="h-5 w-5 shrink-0 text-[rgb(var(--success-text))]" aria-label="Confirmat din datele workspace-ului" />
              ) : (
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-semibold ${step.state === "current" ? "border-[rgb(var(--gold-500))] text-[rgb(var(--gold-700))] dark:text-[rgb(var(--gold-300))]" : "border-[rgb(var(--border-strong))] text-[rgb(var(--text-faint))]"}`} aria-hidden="true">
                  {index + 1}
                </span>
              )}
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">
                {step.state === "complete" ? "Confirmat" : step.state === "current" ? "Acțiunea următoare" : "Pas ulterior"}
              </span>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-[rgb(var(--foreground))]">{step.label}</h3>
            <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{step.description}</p>
          </li>
        ))}
      </ol>

      <p className="border-t border-[rgb(var(--border))] px-5 py-3 text-xs leading-5 text-[rgb(var(--text-muted))] sm:px-6">
        Stările confirmate provin exclusiv din datele existente. Un draft sau o recomandare nu înseamnă trimitere externă și nu confirmă venit.
      </p>
    </section>
  );
}
