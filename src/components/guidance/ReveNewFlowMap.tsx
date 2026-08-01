const flowSteps = [
  "Semnal",
  "Dovezi",
  "Recomandare",
  "Decizie umană",
  "Acțiune sigură",
  "Audit / pilot"
] as const;

export function ReveNewFlowMap({ activeStep = 0, compact = false }: { activeStep?: number; compact?: boolean }) {
  return (
    <ol
      aria-label="Fluxul ReveNew: semnal, dovezi, recomandare, decizie umană, acțiune sigură și audit sau pilot"
      className={`grid gap-px overflow-hidden rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--border))] ${compact ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6" : "sm:grid-cols-2 lg:grid-cols-3"}`}
    >
      {flowSteps.map((step, index) => {
        const active = index === activeStep;
        return (
          <li
            key={step}
            aria-current={active ? "step" : undefined}
            className={`flex min-h-14 items-center gap-2.5 bg-[rgb(var(--surface-subtle))] px-3 py-2.5 ${active ? "shadow-[inset_3px_0_0_rgb(var(--primary))]" : ""}`}
          >
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[0.6875rem] font-semibold tabular-nums ${active ? "border-[rgb(var(--primary))] bg-[rgb(var(--gold-100)/0.35)] text-[rgb(var(--gold-700))] dark:text-[rgb(var(--gold-300))]" : "border-[rgb(var(--border-strong))] text-[rgb(var(--text-faint))]"}`}>
              {index + 1}
            </span>
            <span className={`text-xs font-semibold leading-4 ${active ? "text-[rgb(var(--foreground))]" : "text-[rgb(var(--text-muted))]"}`}>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
