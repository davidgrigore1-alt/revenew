import {
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentCheckIcon,
  UserCircleIcon
} from "@heroicons/react/24/outline";

function ShowcaseFrame({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <div className="marketing-card-lift overflow-hidden rounded-[1.35rem] border border-[rgb(var(--border-strong)/0.72)] bg-[rgb(var(--surface))] shadow-elevated">
      <div className="flex items-center justify-between gap-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-[rgb(var(--primary))] text-[0.625rem] font-black text-[rgb(var(--primary-foreground))]">RN</span>
          <div className="min-w-0"><p className="truncate text-xs font-semibold">{title}</p><p className="text-[0.625rem] text-[rgb(var(--text-muted))]">{label} · date ilustrative</p></div>
        </div>
        <span className="hidden rounded-full border border-[rgb(var(--success-border))] bg-[rgb(var(--success-background))] px-2.5 py-1 text-[0.625rem] font-bold text-[rgb(var(--success-text))] sm:inline-flex">Control uman</span>
      </div>
      {children}
    </div>
  );
}

export function OpportunityExecutionPreview() {
  return (
    <ShowcaseFrame label="Vizualizare produs" title="Execuție oportunitate">
      <div className="grid lg:grid-cols-[1.12fr_0.88fr]">
        <div className="border-b border-[rgb(var(--border))] p-5 lg:border-b-0 lg:border-r sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[rgb(var(--primary))]">Carpathia Industrial Group SRL</p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.025em] sm:text-2xl">Implementare operațională enterprise</h3>
              <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">Contact: Oprea Constantin · Director operațional</p>
            </div>
            <span className="rounded-full border border-[rgb(var(--success-border))] bg-[rgb(var(--success-background))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--success-text))]">Decizie în analiză</span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ["Valoare estimată", "214.000 RON"],
              ["Responsabil", "Ioana Pavel"],
              ["Termen", "22 iulie"]
            ].map(([label, value], index) => <div key={label} className={`rounded-card border p-3.5 ${index === 0 ? "border-[rgb(var(--brand-500)/0.42)] bg-[rgb(var(--brand-50))] dark:bg-[rgb(var(--brand-950)/0.5)]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]"}`}><p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[rgb(var(--text-muted))]">{label}</p><p className="mt-2 text-sm font-semibold tabular-nums">{value}</p></div>)}
          </div>

          <div className="mt-4 rounded-card border border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] p-4">
            <div className="flex items-start gap-3"><ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-[rgb(var(--warning-text))]" aria-hidden="true" /><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-[rgb(var(--warning-text))]">Următoarea acțiune</p><p className="mt-1.5 text-sm font-semibold">Validarea scopului tehnic cu echipa clientului</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Responsabil confirmat · termen stabilit · fără trimitere automată</p></div></div>
          </div>
        </div>

        <div className="bg-[rgb(var(--surface-subtle))] p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[rgb(var(--text-muted))]">Activitate relevantă</p>
          <div className="mt-4 space-y-4 border-l border-[rgb(var(--border-strong))] pl-4">
            {[
              ["Astăzi · 10:30", "Ioana Pavel a confirmat agenda reviziei."],
              ["Ieri · 16:20", "Oprea Constantin a transmis cerințele operaționale."],
              ["16 iulie", "Oferta a fost actualizată cu calendarul de implementare."]
            ].map(([time, activity]) => <div key={time} className="relative"><span className="absolute -left-[1.18rem] top-1 h-2 w-2 rounded-full bg-[rgb(var(--primary))] ring-4 ring-[rgb(var(--surface-subtle))]" /><p className="text-[0.65rem] font-semibold text-[rgb(var(--text-muted))]">{time}</p><p className="mt-1 text-xs leading-5 text-[rgb(var(--text-secondary))]">{activity}</p></div>)}
          </div>
          <div className="mt-6 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
            <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-sm font-semibold"><DocumentCheckIcon className="h-5 w-5 text-[rgb(var(--primary))]" aria-hidden="true" />Draft de follow-up</span><span className="text-xs font-semibold text-[rgb(var(--success-text))]">Pregătit pentru revizie</span></div>
            <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">Conținutul rămâne editabil și necesită aprobarea utilizatorului.</p>
          </div>
        </div>
      </div>
    </ShowcaseFrame>
  );
}

const portfolioRows = [
  ["Delta Construct Solutions SRL", "Contract flotă regională", "318.000 RON", "În execuție"],
  ["Nova Medical Systems SRL", "Parteneriat distribuție medicală", "132.000 RON", "Revizie astăzi"],
  ["Meridian Logistic Systems SRL", "Revizuire ofertă logistică națională", "86.500 RON", "Acțiune următoare clară"]
] as const;

export function PortfolioSummaryPreview() {
  return (
    <ShowcaseFrame label="Sumar executiv" title="Portofoliu comercial">
      <div className="p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-panel border border-[rgb(var(--brand-500)/0.42)] bg-[linear-gradient(135deg,rgb(var(--brand-50)),rgb(var(--surface)))] p-5 dark:bg-[linear-gradient(135deg,rgb(var(--brand-950)/0.55),rgb(var(--surface)))] sm:col-span-2">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.13em] text-[rgb(var(--primary))]">Portofoliu estimat urmărit</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.035em] tabular-nums sm:text-4xl">1.263.500 RON</p>
            <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">Estimare ilustrativă, separată de rezultatele confirmate.</p>
          </div>
          <div className="rounded-panel border border-[rgb(var(--success-border))] bg-[rgb(var(--success-background))] p-5">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.13em] text-[rgb(var(--success-text))]">Rezultate confirmate</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] tabular-nums">186.000 RON</p>
            <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">Înregistrate distinct în acest scenariu.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4">
            <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">Distribuție operațională</p><ArrowTrendingUpIcon className="h-5 w-5 text-[rgb(var(--primary))]" aria-hidden="true" /></div>
            <div className="mt-5 space-y-4">
              {[
                ["Cu responsabil confirmat", "92%", "w-[92%]"],
                ["Cu acțiune următoare", "83%", "w-[83%]"],
                ["În termen", "76%", "w-[76%]"]
              ].map(([label, value, width]) => <div key={label}><div className="flex justify-between text-xs text-[rgb(var(--text-muted))]"><span>{label}</span><span className="font-semibold tabular-nums text-[rgb(var(--foreground))]">{value}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--surface-muted))]"><div className={`marketing-progress-fill h-full rounded-full bg-[rgb(var(--primary))] ${width}`} /></div></div>)}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-[rgb(var(--border))] pt-4"><div><p className="text-2xl font-semibold">6</p><p className="text-[0.65rem] text-[rgb(var(--text-muted))]">oportunități active</p></div><div><p className="text-2xl font-semibold text-[rgb(var(--warning-text))]">2</p><p className="text-[0.65rem] text-[rgb(var(--text-muted))]">intervenții prioritare</p></div></div>
          </div>

          <div className="overflow-hidden rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
            <div className="flex items-center justify-between border-b border-[rgb(var(--border))] px-4 py-3"><p className="text-sm font-semibold">Oportunități urmărite</p><span className="text-[0.65rem] font-semibold text-[rgb(var(--text-muted))]">RON · fără conversie valutară</span></div>
            <div className="divide-y divide-[rgb(var(--border))]">
              {portfolioRows.map(([company, opportunity, value, state]) => <div key={company} className="grid gap-2 px-4 py-3.5 sm:grid-cols-[1fr_auto] sm:items-center"><div className="min-w-0"><p className="truncate text-xs font-semibold">{company}</p><p className="mt-1 truncate text-[0.65rem] text-[rgb(var(--text-muted))]">{opportunity}</p></div><div className="flex items-center justify-between gap-3 sm:block sm:text-right"><p className="text-xs font-bold tabular-nums">{value}</p><p className="mt-1 inline-flex items-center gap-1 text-[0.62rem] font-semibold text-[rgb(var(--success-text))]"><CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />{state}</p></div></div>)}
            </div>
          </div>
        </div>
        <p className="mt-4 inline-flex items-center gap-2 text-[0.65rem] text-[rgb(var(--text-muted))]"><UserCircleIcon className="h-4 w-4" aria-hidden="true" />Scenariu ilustrativ. Valorile nu reprezintă rezultate ale unui client real.</p>
      </div>
    </ShowcaseFrame>
  );
}
