const flowSteps = [
  { label: "Semnal", detail: "de verificat", full: "Semnal comercial de verificat" },
  { label: "Dovezi", detail: "și lipsuri", full: "Dovezi și informații lipsă" },
  { label: "Recomandare", detail: "explicată", full: "Recomandare explicată" },
  { label: "Decizie", detail: "umană", full: "Decizie umană" },
  { label: "Acțiune", detail: "sigură", full: "Acțiune sigură" },
  { label: "Audit / Pilot", detail: "validare", full: "Audit sau pilot controlat" }
] as const;

export function ReveNewFlowMap({ activeStep = 0, compact = false }: { activeStep?: number; compact?: boolean }) {
  return (
    <div className="max-w-full">
      <ol
        aria-label="Fluxul ReveNew: semnal, dovezi, recomandare, decizie umană, acțiune sigură și audit sau pilot"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--border))] sm:grid-cols-3"
      >
        {flowSteps.map((step, index) => {
          const active = index === activeStep;
          return (
            <li
              key={step.label}
              aria-current={active ? "step" : undefined}
              aria-label={`${index + 1}. ${step.full}`}
              title={step.full}
              className={`flex min-h-[4.75rem] min-w-0 items-center gap-3 bg-[rgb(var(--surface-subtle))] px-3.5 py-3 ${active ? "shadow-[inset_3px_0_0_rgb(var(--primary))]" : ""} ${compact ? "sm:min-h-[4.5rem]" : ""}`}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[0.6875rem] font-semibold tabular-nums ${active ? "border-[rgb(var(--primary))] bg-[rgb(var(--gold-100)/0.35)] text-[rgb(var(--gold-700))] dark:text-[rgb(var(--gold-300))]" : "border-[rgb(var(--border-strong))] text-[rgb(var(--text-faint))]"}`}>
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className={`block break-words text-xs font-semibold leading-4 ${active ? "text-[rgb(var(--foreground))]" : "text-[rgb(var(--text-muted))]"}`}>{step.label}</span>
                <span className="mt-0.5 block text-[0.6875rem] leading-4 text-[rgb(var(--text-faint))]">{step.detail}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
