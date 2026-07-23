import { ArrowRightIcon, CheckCircleIcon, MinusCircleIcon } from "@heroicons/react/24/outline";

const comparisonRows = [
  ["Stochează contacte și note", "Urmărește execuția comercială până la rezultat"],
  ["Înregistrează activitatea", "Prioritizează ce cere intervenție acum"],
  ["Păstrează pipeline-ul", "Clarifică responsabilul, acțiunea următoare și termenul"],
  ["Raportează statusuri", "Arată unde se rupe firul execuției"],
  ["Centralizează informația", "Transformă semnalul într-o acțiune urmărită"],
  ["Afișează progresul", "Păstrează auditul și controlul uman"]
] as const;

export function WhyReveNewComparison() {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-[rgb(var(--border-strong)/0.78)] bg-[rgb(var(--surface))] shadow-elevated">
      <div className="grid border-b border-[rgb(var(--border))] lg:grid-cols-2">
        <div className="hidden items-center gap-3 bg-[rgb(var(--surface-subtle))] px-6 py-5 text-sm font-semibold text-[rgb(var(--text-muted))] lg:flex">
          <MinusCircleIcon className="h-5 w-5" aria-hidden="true" /> CRM generalist
        </div>
        <div className="flex items-center justify-between gap-4 bg-[#292722] px-6 py-5 text-[#f4efe5] dark:bg-[rgb(var(--surface-muted))]">
          <span className="inline-flex items-center gap-3 text-sm font-semibold"><CheckCircleIcon className="h-5 w-5 text-[rgb(var(--brand-300))]" aria-hidden="true" /> ReveNew</span>
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[rgb(var(--brand-300))]">Execuție urmărită</span>
        </div>
      </div>

      <div className="divide-y divide-[rgb(var(--border))]">
        {comparisonRows.map(([generic, revenew], index) => (
          <div key={generic} className="group grid lg:grid-cols-2">
            <div className="flex items-center gap-3 bg-[rgb(var(--surface-subtle))] px-5 py-4 text-sm text-[rgb(var(--text-muted))] transition-colors group-hover:bg-[rgb(var(--surface-muted))] sm:px-6">
              <span className="inline-flex min-w-0 items-center gap-2 lg:hidden"><span className="text-[0.62rem] font-bold uppercase tracking-[0.12em]">CRM</span><ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" /></span>
              <span className="hidden h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[rgb(var(--border))] text-[0.6rem] font-bold lg:inline-flex">{index + 1}</span>
              <span>{generic}</span>
            </div>
            <div className="flex items-center gap-3 border-t border-[rgb(var(--border))] bg-[linear-gradient(90deg,rgb(var(--brand-50)),rgb(var(--surface))_72%)] px-5 py-4 text-sm font-semibold text-[rgb(var(--foreground))] transition-colors group-hover:bg-[rgb(var(--brand-100))] dark:bg-[linear-gradient(90deg,rgb(var(--brand-950)/0.55),rgb(var(--surface))_72%)] lg:border-l lg:border-t-0 sm:px-6">
              <CheckCircleIcon className="h-5 w-5 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />
              <span>{revenew}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
