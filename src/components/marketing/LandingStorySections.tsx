import {
  ArrowRightIcon,
  BoltIcon,
  ChartBarIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  UserIcon
} from "@heroicons/react/24/outline";
import { Reveal } from "@/components/marketing/Reveal";

const companies = [
  ["Nordline Systems", "Reînnoire în atenție", "Responsabil confirmat"],
  ["Arcadia Services", "Follow-up depășit", "Dovadă disponibilă"],
  ["Vertex Advisory", "Cerere nouă", "Context de verificat"],
  ["Mosaic Operations", "Ofertă în așteptare", "Aprobare necesară"]
] as const;

const workflow = [
  [MagnifyingGlassIcon, "Semnal detectat", "Termenul unei acțiuni a fost depășit."],
  [DocumentTextIcon, "Context verificat", "Sursa și relația comercială sunt vizibile."],
  [UserIcon, "Responsabil clarificat", "Proprietarul deciziei rămâne explicit."],
  [ShieldCheckIcon, "Acțiune aprobată", "Echipa verifică draftul înainte de trimitere."]
] as const;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-[0.18em] text-[rgb(var(--primary))]">{children}</p>;
}

export function ControlledWorkflowSection({ id }: { id: string }) {
  return (
    <section id={id} className="scroll-mt-28 border-y border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
      <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <Reveal className="grid gap-7 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <Eyebrow>Flux operațional controlat</Eyebrow>
            <h2 className="mt-4 max-w-xl text-[clamp(2.25rem,4.6vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.045em]">Semnalul devine acțiune, fără să sară peste decizie.</h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-[rgb(var(--text-secondary))] lg:justify-self-end">ReveNew leagă dovezile, responsabilitatea și aprobarea într-un traseu lizibil. Niciun pas extern nu este executat în afara controlului echipei.</p>
        </Reveal>

        <Reveal delay={80} className="mt-10 overflow-hidden rounded-[1.25rem] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] shadow-card">
          <div className="grid gap-px bg-[rgb(var(--border))] lg:grid-cols-4">
            {workflow.map(([Icon, title, description], index) => (
              <article key={title} className="marketing-flow-node relative min-h-52 bg-[rgb(var(--surface))] p-6" style={{ animationDelay: `${index * 900}ms` }}>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-card border border-[rgb(var(--primary)/0.24)] bg-[rgb(var(--brand-50))] text-[rgb(var(--primary))]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <span className="text-xs font-semibold tabular-nums text-[rgb(var(--text-faint))]">0{index + 1}</span>
                </div>
                <h3 className="mt-8 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">{description}</p>
                {index < workflow.length - 1 ? <span className="marketing-flow-line absolute -right-px top-12 hidden h-px w-1/3 bg-[rgb(var(--border-strong))] lg:block" aria-hidden="true" /> : null}
              </article>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--border))] px-6 py-4 text-xs text-[rgb(var(--text-muted))]">
            <span>Secvență ilustrativă: activarea arată ordinea, nu o acțiune autonomă.</span>
            <span className="inline-flex items-center gap-2 font-semibold text-[rgb(var(--primary))]"><ShieldCheckIcon className="h-4 w-4" aria-hidden="true" />Control uman la fiecare decizie</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function IntelligenceSection() {
  return (
    <section className="border-b border-[rgb(var(--border))] bg-[rgb(var(--background))]">
      <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <Reveal>
          <Eyebrow>Inteligență continuă</Eyebrow>
          <h2 className="mt-4 max-w-[980px] text-[clamp(2.35rem,5vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.05em]">Sistemul care nu pierde firul. <span className="text-[rgb(var(--text-muted))]">Observă semnalele târzii, reînnoirile expuse și întrebările care trebuie puse înainte ca echipa să le caute.</span></h2>
        </Reveal>
        <div className="mt-12 grid overflow-hidden rounded-[1.25rem] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] lg:grid-cols-2">
          <Reveal className="border-b border-[rgb(var(--border))] p-6 lg:border-b-0 lg:border-r lg:p-9">
            <p className="text-lg font-semibold">Echipa vede ce merită atenție.</p>
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Semnalele sunt ordonate după termen, dovadă și lipsa următorului pas.</p>
            <div className="mt-8 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4">
              <div className="flex items-center justify-between text-xs text-[rgb(var(--text-muted))]"><span>Întreabă ReveNew…</span><BoltIcon className="h-4 w-4 text-[rgb(var(--primary))]" /></div>
              <div className="mt-5 space-y-3">
                {['Follow-up depășit · sursă verificabilă', 'Reînnoire fără responsabil confirmat', 'Ofertă pregătită · aprobare deschisă'].map((item, index) => <div key={item} className="flex items-center gap-3 border-t border-[rgb(var(--border))] pt-3 text-sm"><span className="h-2 w-2 rounded-full bg-[rgb(var(--primary))]" /><span className="flex-1">{item}</span><span className="text-xs tabular-nums text-[rgb(var(--text-faint))]">0{index + 1}</span></div>)}
              </div>
            </div>
          </Reveal>
          <Reveal delay={80} className="p-6 lg:p-9">
            <p className="text-lg font-semibold">ReveNew pregătește. Omul decide.</p>
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Orice recomandare importantă păstrează sursa, limita și aprobarea necesară.</p>
            <div className="mt-8 grid place-items-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background-soft))] p-8">
              <div className="relative flex h-56 w-56 items-center justify-center rounded-full border border-[rgb(var(--border))]">
                <div className="absolute inset-7 rounded-full border border-[rgb(var(--primary)/0.24)]" />
                <span className="absolute left-0 top-9 rounded-pill border border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--brand-50))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--primary))]">Termen depășit</span>
                <span className="absolute -right-4 bottom-12 rounded-pill border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-1.5 text-xs font-semibold">Draft pregătit</span>
                <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[rgb(var(--foreground))] text-[rgb(var(--background))]"><ShieldCheckIcon className="h-8 w-8" /></span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function PreparedActionSection() {
  return (
    <section className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
      <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <Reveal className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div><Eyebrow>Context care devine acțiune</Eyebrow><h2 className="mt-4 text-[clamp(2.25rem,4.5vw,3.8rem)] font-semibold leading-[1.03] tracking-[-0.045em]">Companiile prioritizate și follow-up-ul pregătit, în același cadru.</h2></div>
          <p className="max-w-xl text-base leading-7 text-[rgb(var(--text-secondary))] lg:justify-self-end">Semnalele și contextul comercial pregătesc un draft editabil. Trimiterea rămâne o decizie explicită.</p>
        </Reveal>
        <Reveal delay={90} className="mt-10 grid overflow-hidden rounded-[1.25rem] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] shadow-elevated lg:grid-cols-[1.25fr_0.75fr]">
          <div className="min-w-0 border-b border-[rgb(var(--border))] lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between border-b border-[rgb(var(--border))] px-5 py-4"><p className="font-semibold">Companii de urmărit</p><span className="rounded-pill bg-[rgb(var(--brand-50))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--primary))]">Scenariu ilustrativ</span></div>
            <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr] border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-5 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-muted))]"><span>Companie</span><span>Semnal</span><span>Control</span></div>
            {companies.map(([company, signal, control], index) => <div key={company} className="grid grid-cols-[1.2fr_0.9fr_0.9fr] items-center gap-3 border-b border-[rgb(var(--border))] px-5 py-4 text-sm last:border-b-0"><span className="font-semibold"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded bg-[rgb(var(--brand-50))] text-xs text-[rgb(var(--primary))]">{index + 1}</span>{company}</span><span className="text-[rgb(var(--text-secondary))]">{signal}</span><span className="text-xs text-[rgb(var(--text-muted))]">{control}</span></div>)}
          </div>
          <aside className="p-5" aria-label="Exemplu de draft comercial">
            <p className="text-xs font-semibold text-[rgb(var(--text-muted))]">Draft de follow-up</p>
            <h3 className="mt-2 text-lg font-semibold">Clarificare pentru următorul pas</h3>
            <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">Pregătit din contextul disponibil; necesită revizuire.</p>
            <div className="mt-5 overflow-hidden rounded-xl border border-[rgb(var(--border))]">
              <div className="flex items-center gap-2 border-b border-[rgb(var(--border))] px-4 py-3 text-sm"><EnvelopeIcon className="h-4 w-4 text-[rgb(var(--primary))]" /><span className="text-[rgb(var(--text-muted))]">Către</span><span className="font-medium">Responsabil comercial</span></div>
              <div className="space-y-4 p-4 text-sm leading-6"><p>Bună ziua,</p><p>Revenim pentru a confirma responsabilul și termenul următoarei decizii comerciale.</p><p className="text-[rgb(var(--text-muted))]">Conținutul rămâne editabil înainte de aprobare.</p></div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]"><ShieldCheckIcon className="h-4 w-4" />Nicio trimitere automată</span><button type="button" className="rounded-button bg-[rgb(var(--primary))] px-3 py-2 text-xs font-semibold text-[rgb(var(--primary-foreground))]">Revizuiește</button></div>
          </aside>
        </Reveal>
      </div>
    </section>
  );
}

function PipelineAndPerformanceSection() {
  const stages = ["Semnal", "Calificat", "Propunere", "Decizie"];
  return (
    <section className="border-b border-[rgb(var(--border))] bg-[rgb(var(--background))]">
      <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <Reveal><Eyebrow>Execuție vizibilă</Eyebrow><h2 className="mt-4 max-w-[900px] text-[clamp(2.4rem,5vw,4.4rem)] font-semibold leading-[1.02] tracking-[-0.05em]">Păstrezi mai mult. Crești mai sănătos. <span className="text-[rgb(var(--text-muted))]">Fiecare mișcare are responsabil, termen și stare verificabilă.</span></h2></Reveal>
        <div className="mt-12 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal className="overflow-hidden rounded-[1.25rem] border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-5">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Pipeline operațional</h3><span className="text-xs text-[rgb(var(--text-muted))]">Mișcare ilustrativă</span></div>
            <div className="mt-6 grid grid-cols-4 gap-4">
              {stages.map((stage) => <div key={stage} className="min-h-56 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3"><p className="text-xs font-semibold">{stage}</p></div>)}
              <article className="marketing-pipeline-card col-start-1 row-start-1 m-3 self-start rounded-lg border border-[rgb(var(--primary)/0.35)] bg-[rgb(var(--surface-elevated))] p-3 shadow-card">
                <span className="rounded-pill bg-[rgb(var(--brand-50))] px-2 py-1 text-[0.65rem] font-semibold text-[rgb(var(--primary))]">În revizuire</span><p className="mt-3 text-sm font-semibold">Extindere servicii</p><p className="mt-2 text-xs text-[rgb(var(--text-muted))]">Următorul pas confirmat</p>
              </article>
            </div>
          </Reveal>
          <Reveal delay={80} className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-[1.25rem] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 sm:col-span-2"><div className="flex items-center justify-between"><h3 className="font-semibold">Expunere urmărită</h3><ChartBarIcon className="h-5 w-5 text-[rgb(var(--primary))]" /></div><svg viewBox="0 0 520 150" className="mt-6 h-36 w-full" role="img" aria-label="Grafic ilustrativ al expunerii urmărite"><path d="M10 120 C90 115 135 100 205 105 S330 55 510 38" fill="none" stroke="rgb(var(--primary))" strokeWidth="4"/><path d="M10 130 C90 126 170 121 235 114 S390 105 510 88" fill="none" stroke="rgb(var(--text-faint))" strokeWidth="3"/><line x1="10" y1="140" x2="510" y2="140" stroke="rgb(var(--border))" /></svg></article>
            <article className="rounded-[1.25rem] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5"><p className="text-xs text-[rgb(var(--text-muted))]">Stări operaționale</p><div className="mt-6 flex h-24 items-end gap-3">{[42,68,54,82,61].map((height, index) => <span key={index} className="flex-1 rounded-t bg-[rgb(var(--primary)/0.78)]" style={{ height: `${height}%` }} />)}</div></article>
            <article className="rounded-[1.25rem] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5"><p className="text-xs text-[rgb(var(--text-muted))]">Confirmat vs. estimat</p><div className="mt-8 space-y-5"><div><div className="mb-2 flex justify-between text-xs"><span>Confirmat</span><span>Separat</span></div><div className="h-2 rounded-full bg-[rgb(var(--surface-muted))]"><div className="h-full w-[38%] rounded-full bg-[rgb(var(--primary))]" /></div></div><div><div className="mb-2 flex justify-between text-xs"><span>În analiză</span><span>Prudent</span></div><div className="h-2 rounded-full bg-[rgb(var(--surface-muted))]"><div className="h-full w-[72%] rounded-full bg-[rgb(var(--text-faint))]" /></div></div></div></article>
          </Reveal>
        </div>
        <p className="mt-4 text-xs text-[rgb(var(--text-faint))]">Vizualizări de produs ilustrative; nu reprezintă rezultate financiare sau date ale unor clienți.</p>
      </div>
    </section>
  );
}

function EarlyValueSection() {
  return (
    <section className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:px-8">
        <Reveal><Eyebrow>Util din prima etapă</Eyebrow><h2 className="mt-4 text-[clamp(2.35rem,4.8vw,4.2rem)] font-semibold leading-[1.02] tracking-[-0.05em]">Începi cu puține date. Decizi pe dovezi.</h2><p className="mt-5 max-w-xl text-base leading-7 text-[rgb(var(--text-secondary))]">Un audit controlat poate porni dintr-un set limitat de cazuri, fără conectarea completă a inboxului sau calendarului. Sursele și accesul sunt stabilite înainte de analiză.</p><div className="mt-7 space-y-3">{['Set controlat de oportunități', 'Reguli și permisiuni explicite', 'Criterii de continuare verificabile'].map((item) => <p key={item} className="flex items-center gap-3 text-sm font-medium"><CheckCircleIcon className="h-5 w-5 text-[rgb(var(--primary))]" />{item}</p>)}</div></Reveal>
        <Reveal delay={80} className="rounded-[1.25rem] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] p-5 shadow-elevated">
          <div className="flex items-center justify-between border-b border-[rgb(var(--border))] pb-4"><div><p className="text-xs text-[rgb(var(--text-muted))]">Registru comercial</p><p className="mt-1 font-semibold">Audit controlat · scenariu ilustrativ</p></div><span className="inline-flex items-center gap-2 rounded-pill bg-[rgb(var(--brand-50))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--primary))]"><ShieldCheckIcon className="h-4 w-4" />Control uman</span></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">{[['01','Semnal','Caz identificat'],['02','Context','Dovezi verificate'],['03','Decizie','Aprobare necesară']].map(([n,t,d]) => <div key={n} className="rounded-xl border border-[rgb(var(--border))] p-4"><p className="text-xs font-semibold text-[rgb(var(--primary))]">{n}</p><p className="mt-5 font-semibold">{t}</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{d}</p></div>)}</div>
          <div className="mt-4 divide-y divide-[rgb(var(--border))] rounded-xl border border-[rgb(var(--border))]">{['Follow-up restant · termen depășit','Cerere nouă · context de verificat','Ofertă în așteptare · aprobare umană'].map((row) => <div key={row} className="flex items-center justify-between gap-4 px-4 py-3 text-sm"><span>{row}</span><ArrowRightIcon className="h-4 w-4 text-[rgb(var(--primary))]" /></div>)}</div>
        </Reveal>
      </div>
    </section>
  );
}

export function LandingStorySections() {
  return <><IntelligenceSection /><PreparedActionSection /><PipelineAndPerformanceSection /><EarlyValueSection /></>;
}
