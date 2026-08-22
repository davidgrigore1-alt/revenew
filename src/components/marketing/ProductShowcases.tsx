import {
  CheckCircleIcon,
  ClockIcon,
  DocumentCheckIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";

function ShowcaseFrame({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <div className="marketing-card-lift overflow-hidden rounded-[1.2rem] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] shadow-[0_20px_54px_rgba(15,23,42,0.09)]">
      <div className="flex items-center justify-between gap-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-[rgb(var(--primary))] text-[0.625rem] font-black text-[rgb(var(--primary-foreground))]">RN</span>
          <div className="min-w-0"><p className="truncate text-xs font-semibold">{title}</p><p className="text-[0.625rem] text-[rgb(var(--text-muted))]">{label} · stare ilustrativă</p></div>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full border border-[rgb(var(--success-border))] bg-[rgb(var(--success-background))] px-2.5 py-1 text-[0.625rem] font-bold text-[rgb(var(--success-text))] sm:inline-flex"><ShieldCheckIcon className="h-3.5 w-3.5" aria-hidden="true" />Control uman</span>
      </div>
      {children}
    </div>
  );
}

export function OpportunityExecutionPreview() {
  return (
    <ShowcaseFrame label="Suprafață de produs" title="Execuție oportunitate">
      <div className="grid lg:grid-cols-[1.12fr_0.88fr]">
        <section className="border-b border-[rgb(var(--border))] p-5 sm:p-6 lg:border-b-0 lg:border-r" aria-labelledby="opportunity-preview-title">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[rgb(var(--primary))]">Oportunitate selectată</p>
              <h3 id="opportunity-preview-title" className="mt-2 text-xl font-semibold tracking-[-0.025em] sm:text-2xl">Extindere servicii — în revizuire</h3>
              <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">Relație comercială existentă · contact principal identificat</p>
            </div>
            <span className="rounded-full border border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--warning-text))]">Decizie în analiză</span>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ["Valoare comercială", "Estimată"],
              ["Responsabil", "De confirmat"],
              ["Termen", "În revizuire"]
            ].map(([label, value]) => <div key={label} className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-3.5"><dt className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[rgb(var(--text-muted))]">{label}</dt><dd className="mt-2 text-sm font-semibold">{value}</dd></div>)}
          </dl>

          <div className="mt-4 rounded-card border border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] p-4">
            <div className="flex items-start gap-3"><ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-[rgb(var(--warning-text))]" aria-hidden="true" /><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-[rgb(var(--warning-text))]">Următoarea acțiune</p><p className="mt-1.5 text-sm font-semibold">Clarifică scopul și confirmă responsabilul</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Context pregătit · decizie umană necesară · fără trimitere automată</p></div></div>
          </div>
        </section>

        <aside className="bg-[rgb(var(--surface-subtle))] p-5 sm:p-6" aria-labelledby="opportunity-evidence-title">
          <p id="opportunity-evidence-title" className="text-xs font-bold uppercase tracking-[0.12em] text-[rgb(var(--text-muted))]">Dovezi relevante</p>
          <div className="mt-4 space-y-4 border-l border-[rgb(var(--border-strong))] pl-4">
            {[
              ["Acțiune restantă", "Termenul ultimei acțiuni a fost depășit."],
              ["Context disponibil", "Sursa și relația comercială sunt identificate."],
              ["Informație lipsă", "Responsabilul trebuie confirmat înainte de continuare."]
            ].map(([label, detail]) => <div key={label} className="relative"><span className="absolute -left-[1.18rem] top-1 h-2 w-2 rounded-full bg-[rgb(var(--primary))] ring-4 ring-[rgb(var(--surface-subtle))]" /><p className="text-[0.65rem] font-semibold text-[rgb(var(--foreground))]">{label}</p><p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{detail}</p></div>)}
          </div>
          <div className="mt-6 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
            <div className="flex items-start gap-2"><DocumentCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" /><div><p className="text-sm font-semibold">Draft de follow-up</p><p className="mt-1 text-xs font-semibold text-[rgb(var(--warning-text))]">Pregătit, neexpediat</p></div></div>
            <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">Conținutul rămâne editabil și necesită aprobarea utilizatorului.</p>
          </div>
        </aside>
      </div>
    </ShowcaseFrame>
  );
}

const portfolioRows = [
  ["Follow-up restant", "Termen depășit", "Responsabil de confirmat", "Revizuire"],
  ["Cerere comercială nouă", "Sursă identificată", "Context de verificat", "Analiză"],
  ["Ofertă în așteptare", "Draft pregătit", "Aprobare umană", "Control"]
] as const;

export function PortfolioSummaryPreview() {
  return (
    <ShowcaseFrame label="Sumar executiv" title="Registru comercial">
      <div className="p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-5">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.13em] text-[rgb(var(--primary))]">Expunere estimată</p>
            <p className="mt-3 text-xl font-semibold tracking-[-0.025em]">Urmărită separat</p>
            <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">Valoarea menționată susține prioritatea, nu promite un rezultat financiar.</p>
          </div>
          <div className="rounded-panel border border-[rgb(var(--success-border))] bg-[rgb(var(--success-background))] p-5">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.13em] text-[rgb(var(--success-text))]">Venit confirmat</p>
            <p className="mt-3 text-xl font-semibold tracking-[-0.025em]">Numai după rezultat</p>
            <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">Rămâne distinct de estimări și necesită confirmarea explicită a echipei.</p>
          </div>
        </div>

        <ol className="mt-4 grid overflow-hidden rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] sm:grid-cols-3" aria-label="Firul deciziei comerciale">
          {[
            ["01", "Semnal", "Caz identificat"],
            ["02", "Context", "Dovezi verificate"],
            ["03", "Decizie", "Aprobare necesară"]
          ].map(([number, title, description], index) => <li key={title} className={`p-4 ${index < 2 ? "border-b border-[rgb(var(--border))] sm:border-b-0 sm:border-r" : ""}`}><p className="text-[0.62rem] font-bold text-[rgb(var(--primary))]">{number}</p><p className="mt-2 text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{description}</p></li>)}
        </ol>

        <div className="mt-4 overflow-hidden rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
          <div className="flex items-center justify-between border-b border-[rgb(var(--border))] px-4 py-3"><p className="text-sm font-semibold">Oportunități urmărite</p><span className="text-[0.65rem] font-semibold text-[rgb(var(--text-muted))]">Stări operaționale</span></div>
          <div className="divide-y divide-[rgb(var(--border))]">
            {portfolioRows.map(([opportunity, evidence, nextStep, state]) => <div key={opportunity} className="grid gap-3 px-4 py-3.5 md:grid-cols-[1.05fr_0.9fr_1fr_auto] md:items-center"><div><p className="text-xs font-semibold">{opportunity}</p><p className="mt-1 text-[0.65rem] text-[rgb(var(--text-muted))]">Oportunitate comercială</p></div><p className="text-[0.68rem] text-[rgb(var(--text-secondary))]">{evidence}</p><p className="text-[0.68rem] font-medium">{nextStep}</p><span className="inline-flex w-fit items-center gap-1 text-[0.65rem] font-semibold text-[rgb(var(--success-text))]"><CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />{state}</span></div>)}
          </div>
        </div>
        <p className="mt-4 text-[0.65rem] leading-5 text-[rgb(var(--text-muted))]">Scenariu de produs, fără date de client și fără afirmații despre rezultate obținute.</p>
      </div>
    </ShowcaseFrame>
  );
}
