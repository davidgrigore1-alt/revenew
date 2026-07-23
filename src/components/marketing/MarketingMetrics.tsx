import { CheckCircleIcon, ClockIcon, UserGroupIcon } from "@heroicons/react/24/outline";

const coverage = [
  { label: "Cu responsabil", value: 83, icon: UserGroupIcon, color: "bg-[rgb(var(--brand-600))]" },
  { label: "Cu acțiune următoare", value: 67, icon: CheckCircleIcon, color: "bg-[rgb(var(--brand-400))]" },
  { label: "În termen", value: 75, icon: ClockIcon, color: "bg-[rgb(var(--info-text))]" }
] as const;

export function MarketingMetrics() {
  return (
    <div className="grid overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#24211c] text-[#f7f1e7] shadow-elevated lg:grid-cols-[1.18fr_0.82fr]">
      <section className="relative overflow-hidden border-b border-white/10 p-5 sm:p-8 lg:border-b-0 lg:border-r" aria-labelledby="tracked-value-title">
        <div aria-hidden="true" className="marketing-grid pointer-events-none absolute inset-0 opacity-[0.08]" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="relative">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#d8bd82]">Exemplu ilustrativ</p>
            <h3 id="tracked-value-title" className="mt-3 max-w-2xl text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Unde este valoarea și ce blochează următorul pas.</h3>
          </div>
          <div className="relative text-right"><p className="text-[0.68rem] uppercase tracking-[0.14em] text-[#9f978a]">Potențial urmărit</p><p className="mt-1 text-xl font-semibold tabular-nums text-white">40.100 RON</p></div>
        </div>

        <div className="relative mt-10" role="img" aria-label="Distribuție ilustrativă: 46% follow-up restant, 32% fără următorul pas și 22% în revizuire">
          <div className="flex h-12 overflow-hidden rounded-card bg-white/[0.06] p-1.5">
            <span className="marketing-progress-fill flex w-[46%] items-center rounded-l-lg bg-[#a9564d] px-3 text-xs font-semibold text-white">46%</span>
            <span className="marketing-progress-fill flex w-[32%] items-center bg-[#b8833f] px-3 text-xs font-semibold text-white">32%</span>
            <span className="marketing-progress-fill flex w-[22%] items-center rounded-r-lg bg-[#cdb070] px-3 text-xs font-semibold text-[#29231a]">22%</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["Follow-up restant", "18.400 RON", "bg-[rgb(var(--danger-text))]"],
              ["Fără acțiune următoare", "12.800 RON", "bg-[rgb(var(--warning-text))]"],
              ["În revizuire", "8.900 RON", "bg-[rgb(var(--brand-500))]"]
            ].map(([label, value, dot]) => (
              <div key={label} className="rounded-card border border-white/10 bg-white/[0.045] p-4">
                <p className="flex items-center gap-2 text-xs text-[#aaa195]"><span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />{label}</p>
                <p className="mt-2 text-base font-semibold tabular-nums text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#2b2822] p-5 sm:p-8" aria-labelledby="coverage-title">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#d8bd82]">Disciplină operațională</p>
        <h3 id="coverage-title" className="mt-3 text-xl font-semibold tracking-[-0.025em]">Poate echipa executa?</h3>
        <div className="mt-7 space-y-5">
          {coverage.map(({ label, value, icon: Icon, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="inline-flex items-center gap-2 font-medium text-[#d9d1c5]"><Icon className="h-4 w-4 text-[#9f978a]" aria-hidden="true" />{label}</span>
                <strong className="tabular-nums">{value}%</strong>
              </div>
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/[0.08]">
                <div className={`marketing-progress-fill h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-7 border-t border-white/10 pt-5 text-xs leading-5 text-[#8e877d]">Date ilustrative pentru metodologie. Nu sunt rezultate ale unui client și nu promit venit.</p>
      </section>
    </div>
  );
}
