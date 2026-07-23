import { ArrowRightIcon, CheckIcon, ClockIcon, UserIcon } from "@heroicons/react/24/outline";

const stages = [
  { label: "Semnal", meta: "Context comercial", state: "capturat" },
  { label: "Responsabil", meta: "Atribuire explicită", state: "verificată" },
  { label: "Acțiune următoare", meta: "Pas și termen", state: "neclară" },
  { label: "Rezultat", meta: "Urmărit până la închidere", state: "în atenție" }
] as const;

export function RevenueLeakMap() {
  return (
    <div className="relative overflow-hidden rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-card sm:p-7">
      <div aria-hidden="true" className="marketing-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative flex items-start justify-between gap-5">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">Traseu operațional</p>
          <h3 className="mt-2 max-w-xl text-xl font-semibold tracking-[-0.025em] sm:text-2xl">Valoarea devine vulnerabilă când firul execuției se rupe.</h3>
        </div>
        <span className="hidden rounded-full border border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--warning-text))] sm:inline-flex">Intervenție necesară</span>
      </div>

      <div className="relative mt-8 grid gap-3 md:grid-cols-4" aria-label="Exemplu de traseu comercial cu următoarea acțiune neclară">
        {stages.map((stage, index) => (
          <div key={stage.label} className={`relative rounded-card border p-4 ${index === 2 ? "border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]"}`}>
            <div className="flex items-center justify-between gap-3">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${index === 2 ? "bg-[rgb(var(--warning-text))] text-white" : "bg-[rgb(var(--brand-100))] text-[rgb(var(--brand-800))] dark:bg-[rgb(var(--surface-muted))] dark:text-[rgb(var(--brand-300))]"}`}>
                {index === 1 ? <UserIcon className="h-4 w-4" aria-hidden="true" /> : index === 2 ? <ClockIcon className="h-4 w-4" aria-hidden="true" /> : <CheckIcon className="h-4 w-4" aria-hidden="true" />}
              </span>
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[rgb(var(--text-faint))]">0{index + 1}</span>
            </div>
            <p className="mt-4 font-semibold">{stage.label}</p>
            <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{stage.meta}</p>
            <p className={`mt-4 text-xs font-semibold ${index === 2 ? "text-[rgb(var(--warning-text))]" : "text-[rgb(var(--text-secondary))]"}`}>{stage.state}</p>
            {index < stages.length - 1 ? <ArrowRightIcon className="absolute -right-2.5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-1 text-[rgb(var(--text-faint))] md:block" aria-hidden="true" /> : null}
          </div>
        ))}
      </div>

      <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--border))] pt-5 text-xs text-[rgb(var(--text-muted))]">
        <span>ReveNew evidențiază ruptura înainte ca oportunitatea să dispară din atenție.</span>
        <span className="font-semibold text-[rgb(var(--foreground))]">Control uman la fiecare decizie</span>
      </div>
    </div>
  );
}
