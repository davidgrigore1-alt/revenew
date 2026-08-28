import {
  ArrowRightIcon,
  BoltIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  UserIcon
} from "@heroicons/react/24/outline";
import { Reveal } from "@/components/marketing/Reveal";

const companies = [
  ["Nordline Systems", "Reînnoire", "18.400 EUR", "Andrei Pop", "În 3 zile", "Prioritate"],
  ["Arcadia Services", "Follow-up depășit", "12.800 EUR", "Mara Ionescu", "Astăzi", "Restant"],
  ["Vertex Advisory", "Cerere nouă", "9.600 EUR", "Radu Neagu", "Mâine", "De verificat"],
  ["Mosaic Operations", "Ofertă în așteptare", "24.200 EUR", "Ioana Ene", "Vineri", "Aprobare"]
] as const;

const workflow = [
  [MagnifyingGlassIcon, "Semnal detectat", "Follow-up depășit", "Detectat"],
  [DocumentTextIcon, "Context verificat", "Sursă și istoric atașate", "Verificat"],
  [UserIcon, "Responsabil clarificat", "Andrei Pop · Revenue", "Alocat"],
  [EnvelopeIcon, "Draft pregătit", "Editabil înainte de trimitere", "Draft"],
  [ShieldCheckIcon, "Acțiune aprobată", "Decizie umană înregistrată", "Aprobat"]
] as const;

const pipelineStages = [
  { title: "Semnal", count: 8, value: "46,8k EUR", cards: [["Orion Logistics", "8.900 EUR", "M. Ionescu", "Verifică istoricul", "4 zile"], ["Lumen Works", "6.400 EUR", "R. Neagu", "Confirmă contactul", "2 zile"]] },
  { title: "Context verificat", count: 5, value: "38,1k EUR", cards: [["Northstar Labs", "14.600 EUR", "A. Pop", "Clarifică bugetul", "6 zile"], ["Atelier 44", "7.250 EUR", "I. Ene", "Atașează oferta", "3 zile"]] },
  { title: "Acțiune pregătită", count: 4, value: "31,7k EUR", cards: [["Meridian Cloud", "11.800 EUR", "A. Pop", "Revizuiește draftul", "Astăzi"], ["Cobalt Partners", "9.200 EUR", "M. Ionescu", "Confirmă termenul", "1 zi"]] },
  { title: "Decizie", count: 3, value: "27,4k EUR", cards: [["Atlas Industrial", "16.900 EUR", "I. Ene", "Aprobă trimiterea", "Astăzi"], ["Forma Studio", "5.700 EUR", "R. Neagu", "Înregistrează rezultatul", "2 zile"]] }
] as const;

function StatePill({ children, blue = false }: { children: React.ReactNode; blue?: boolean }) {
  const style = blue
    ? "border-[rgb(var(--product-blue)/0.35)] bg-[rgb(var(--product-blue-soft))] text-[rgb(var(--product-blue-strong))]"
    : "border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--brand-50))] text-[rgb(var(--primary-strong))]";
  return <span className={"rounded-pill border px-2 py-1 text-[0.64rem] font-semibold " + style}>{children}</span>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-[0.18em] text-[rgb(var(--primary))]">{children}</p>;
}

export function ControlledWorkflowSection({ id }: { id: string }) {
  return (
    <section id={id} className="scroll-mt-28 border-y border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
      <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <Reveal className="grid gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div><Eyebrow>Flux operațional controlat</Eyebrow><h2 className="mt-4 max-w-xl text-[clamp(2.15rem,4vw,3.35rem)] font-semibold leading-[1.04] tracking-[-0.04em]">De la semnal la acțiune, cu aprobarea la vedere.</h2></div>
          <p className="max-w-2xl text-base leading-7 text-[rgb(var(--text-secondary))] lg:justify-self-end">Fiecare nod păstrează starea, dovada și responsabilul. ReveNew pregătește execuția; echipa validează decizia comercială.</p>
        </Reveal>
        <Reveal delay={80} className="marketing-workflow-canvas mt-10 overflow-hidden rounded-[1.1rem] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] shadow-card">
          <div className="flex items-center justify-between border-b border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.9)] px-5 py-3.5"><div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-[rgb(var(--primary))]" /><p className="text-sm font-semibold">Execuție oportunitate · Arcadia Services</p></div><StatePill blue>Flux activ · ilustrativ</StatePill></div>
          <div className="relative px-6 py-14">
            <div className="absolute left-[8%] right-[8%] top-[6.75rem] hidden h-px bg-[rgb(var(--border-strong))] lg:block" aria-hidden="true" />
            <div className="marketing-workflow-progress absolute left-[8%] top-[6.75rem] hidden h-px w-[84%] origin-left bg-[rgb(var(--product-blue))] lg:block" aria-hidden="true" />
            <div className="relative grid gap-5 lg:grid-cols-5">
              {workflow.map(([Icon, title, detail, state], index) => <article key={title} className="marketing-flow-node marketing-motion-card min-h-44 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-4 shadow-card" style={{ animationDelay: String(index * 130) + "ms" }}><div className="flex items-start justify-between gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgb(var(--product-blue)/0.28)] bg-[rgb(var(--product-blue-soft))] text-[rgb(var(--product-blue-strong))]"><Icon className="h-4 w-4" aria-hidden="true" /></span><span className="text-[0.65rem] font-semibold tabular-nums text-[rgb(var(--text-faint))]">0{index + 1}</span></div><h3 className="mt-5 text-sm font-semibold">{title}</h3><p className="mt-1.5 min-h-10 text-xs leading-5 text-[rgb(var(--text-muted))]">{detail}</p><div className="mt-4"><StatePill blue={index < 4}>{state}</StatePill></div></article>)}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-5 py-3 text-xs text-[rgb(var(--text-muted))]"><span>Secvență ilustrativă; nu reprezintă o acțiune autonomă.</span><span className="inline-flex items-center gap-2 font-semibold text-[rgb(var(--primary-strong))]"><ShieldCheckIcon className="h-4 w-4" />Aprobarea umană închide fluxul</span></div>
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
      <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <Reveal className="grid gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:items-end"><div><Eyebrow>Companii și follow-up</Eyebrow><h2 className="mt-4 text-[clamp(2.15rem,4vw,3.4rem)] font-semibold leading-[1.04] tracking-[-0.04em]">Prioritatea și mesajul pregătit rămân în același context.</h2></div><p className="max-w-xl text-base leading-7 text-[rgb(var(--text-secondary))] lg:justify-self-end">Tabelul arată unde trebuie intervenit. Composerul păstrează mesajul editabil și solicită revizuire înainte de trimitere.</p></Reveal>
        <Reveal delay={80} className="mt-9 grid overflow-hidden rounded-[1.1rem] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] shadow-card lg:grid-cols-[1.35fr_0.65fr]">
          <div className="min-w-0 border-b border-[rgb(var(--border))] lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between border-b border-[rgb(var(--border))] px-5 py-4"><div><p className="text-sm font-semibold">Companii care necesită atenție</p><p className="mt-0.5 text-xs text-[rgb(var(--text-muted))]">4 oportunități · 65.000 EUR expunere ilustrativă</p></div><StatePill>Scenariu ilustrativ</StatePill></div>
            <div className="overflow-x-auto"><div className="min-w-[760px]">
              <div className="grid grid-cols-[1.35fr_1.05fr_.85fr_1fr_.72fr_.8fr] border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-5 py-2.5 text-[0.64rem] font-bold uppercase tracking-[0.09em] text-[rgb(var(--text-muted))]"><span>Companie</span><span>Semnal</span><span>Valoare</span><span>Responsabil</span><span>Pas următor</span><span>Stare</span></div>
              {companies.map(([company, signal, value, owner, next, status], index) => <div key={company} className="marketing-stagger-row grid grid-cols-[1.35fr_1.05fr_.85fr_1fr_.72fr_.8fr] items-center border-b border-[rgb(var(--border))] px-5 py-3.5 text-xs last:border-b-0"><span className="flex items-center gap-2.5 font-semibold"><span className="flex h-7 w-7 items-center justify-center rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] text-[0.65rem] text-[rgb(var(--text-muted))]">{company.slice(0, 2).toUpperCase()}</span>{company}</span><span className="text-[rgb(var(--text-secondary))]">{signal}</span><span className="font-semibold tabular-nums">{value}</span><span>{owner}</span><span className={index === 1 ? "font-semibold text-[rgb(var(--danger-text))]" : "text-[rgb(var(--text-secondary))]"}>{next}</span><span><StatePill blue={index !== 1}>{status}</StatePill></span></div>)}
            </div></div>
          </div>
          <aside className="bg-[rgb(var(--surface-subtle))] p-5" aria-label="Composer de follow-up ilustrativ">
            <div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-[rgb(var(--text-muted))]">Draft de follow-up</p><h3 className="mt-1 text-base font-semibold">Arcadia Services</h3></div><StatePill>Editabil</StatePill></div>
            <div className="mt-5 overflow-hidden rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))]"><div className="grid grid-cols-[4rem_1fr] border-b border-[rgb(var(--border))] px-4 py-3 text-xs"><span className="text-[rgb(var(--text-muted))]">Către</span><span className="font-medium">elena@arcadia.ro</span></div><div className="grid grid-cols-[4rem_1fr] border-b border-[rgb(var(--border))] px-4 py-3 text-xs"><span className="text-[rgb(var(--text-muted))]">Subiect</span><span className="marketing-composer-subject font-medium">Următorul pas pentru extinderea serviciilor</span></div><div className="marketing-composer-body space-y-3 p-4 text-xs leading-5"><p>Bună ziua, Elena,</p><p>Revin cu privire la propunerea discutată și la termenul pentru următoarea decizie.</p><p>Putem confirma responsabilul și intervalul potrivit pentru revizuire?</p><p>Mulțumesc,<br />Mara</p></div></div>
            <div className="mt-4 rounded-card border border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--brand-50))] p-3 text-xs leading-5 text-[rgb(var(--text-secondary))]"><span className="font-semibold text-[rgb(var(--primary-strong))]">Înainte de trimitere:</span> conținutul poate fi editat, iar aprobarea rămâne obligatorie.</div>
            <button type="button" className="marketing-approval-button mt-4 inline-flex w-full items-center justify-center gap-2 rounded-button bg-[rgb(var(--primary))] px-4 py-2.5 text-xs font-semibold text-[rgb(var(--primary-foreground))]"><DocumentTextIcon className="h-4 w-4" />Revizuiește și aprobă</button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[0.68rem] text-[rgb(var(--text-muted))]"><ShieldCheckIcon className="h-3.5 w-3.5" />Nicio trimitere automată</p>
          </aside>
        </Reveal>
      </div>
    </section>
  );
}

function PipelineAndPerformanceSection() {
  const months = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun"];
  const bars = [[34, 28, 18], [42, 25, 20], [38, 35, 17], [49, 28, 16], [55, 30, 12], [61, 33, 10]];
  const insights = [
    ["Mosaic Operations", "24.200 EUR", "Ofertă fără decizie", "Confirmă aprobarea până vineri", "Ridicat"],
    ["Nordline Systems", "18.400 EUR", "Reînnoire în 3 zile", "Alocă responsabil secundar", "Atenție"],
    ["Arcadia Services", "12.800 EUR", "Follow-up depășit", "Revizuiește draftul pregătit", "Restant"]
  ] as const;
  return (
    <>
      <section className="border-b border-[rgb(var(--border))] bg-[rgb(var(--background))]">
        <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <Reveal><Eyebrow>Pipeline operațional</Eyebrow><h2 className="mt-4 max-w-[850px] text-[clamp(2.15rem,4vw,3.4rem)] font-semibold leading-[1.04] tracking-[-0.04em]">Fiecare oportunitate avansează cu responsabil și pas următor.</h2></Reveal>
          <Reveal delay={80} className="mt-9 overflow-hidden rounded-[1.1rem] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-subtle))] shadow-card">
            <div className="flex items-center justify-between border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-5 py-4"><div><p className="text-sm font-semibold">Revenue recovery · vedere pe etape</p><p className="mt-0.5 text-xs text-[rgb(var(--text-muted))]">20 oportunități · 144.000 EUR valoare urmărită ilustrativă</p></div><StatePill blue>Actualizat acum 8 min.</StatePill></div>
            <div className="relative grid gap-3 p-4 lg:grid-cols-4">
              {pipelineStages.map((stage, stageIndex) => <div key={stage.title} className="marketing-pipeline-stage min-w-0 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--background-soft))] p-3" style={{ animationDelay: String(stageIndex * 90) + "ms" }}><div className="flex items-start justify-between border-b border-[rgb(var(--border))] pb-3"><div><p className="text-xs font-semibold">{stage.title}</p><p className="mt-1 text-[0.66rem] text-[rgb(var(--text-muted))]">{stage.value}</p></div><span className="rounded-full bg-[rgb(var(--surface-muted))] px-2 py-0.5 text-[0.65rem] font-semibold">{stage.count}</span></div><div className="mt-3 space-y-3">{stage.cards.map(([company, amount, owner, next, age]) => <article key={company} className="marketing-pipeline-opportunity rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 shadow-card"><div className="flex items-start justify-between gap-2"><p className="text-xs font-semibold">{company}</p><span className="text-[0.62rem] text-[rgb(var(--text-faint))]">{age}</span></div><p className="mt-2 text-sm font-semibold tabular-nums">{amount}</p><div className="mt-3 border-t border-[rgb(var(--border))] pt-2 text-[0.66rem] leading-4 text-[rgb(var(--text-muted))]"><p>{owner}</p><p className="mt-1 text-[rgb(var(--text-secondary))]">→ {next}</p></div></article>)}</div></div>)}
              <article className="marketing-pipeline-card absolute left-7 top-[5.55rem] z-10 hidden w-[calc((100%-5.25rem)/4)] rounded-lg border border-[rgb(var(--product-blue)/0.52)] bg-[rgb(var(--surface-elevated))] p-3 shadow-elevated lg:block"><div className="flex items-center justify-between"><StatePill blue>În tranziție</StatePill><span className="text-[0.62rem] text-[rgb(var(--text-faint))]">1 zi</span></div><p className="mt-3 text-xs font-semibold">Helios Consulting</p><p className="mt-1.5 text-sm font-semibold tabular-nums">13.500 EUR</p><p className="mt-3 border-t border-[rgb(var(--border))] pt-2 text-[0.66rem] text-[rgb(var(--text-muted))]">A. Pop · verifică contextul</p></article>
            </div>
            <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-5 py-3 text-xs text-[rgb(var(--text-muted))]">Mișcarea evidențiată este ilustrativă și arată schimbarea de etapă, nu o actualizare autonomă.</div>
          </Reveal>
        </div>
      </section>
      <section className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
        <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <Reveal className="grid gap-7 lg:grid-cols-[0.72fr_1.28fr] lg:items-end"><div><Eyebrow>Analiză pentru decizie</Eyebrow><h2 className="mt-4 text-[clamp(2.15rem,4vw,3.4rem)] font-semibold leading-[1.04] tracking-[-0.04em]">Vezi expunerea. Înțelegi cauza. Alegi intervenția.</h2></div><p className="max-w-xl text-base leading-7 text-[rgb(var(--text-secondary))] lg:justify-self-end">Graficele arată schimbarea și distribuția stărilor. Panoul de atenție leagă fiecare semnal de o acțiune recomandată.</p></Reveal>
          <Reveal delay={80} className="mt-9 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="grid gap-4">
              <article className="rounded-[1.1rem] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] p-5 shadow-card">
                <div className="flex items-start justify-between"><div><h3 className="text-sm font-semibold">Expunere urmărită</h3><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Valoare estimată în oportunități active · mii EUR</p></div><p className="text-right"><span className="block text-xl font-semibold tabular-nums">144,0k</span><span className="text-[0.66rem] text-[rgb(var(--text-muted))]">iunie · ilustrativ</span></p></div>
                <div className="marketing-chart-legend mt-4 flex items-center gap-5 text-[0.68rem]"><span className="flex items-center gap-2"><i className="h-0.5 w-5 bg-[rgb(var(--product-blue))]" />Expunere activă</span><span className="flex items-center gap-2 text-[rgb(var(--text-muted))]"><i className="h-0.5 w-5 bg-[rgb(var(--chart-secondary))]" />Acțiune confirmată</span></div>
                <svg viewBox="0 0 680 210" className="mt-3 h-[210px] w-full" role="img" aria-label="Grafic liniar ilustrativ cu două serii pentru expunerea urmărită"><g stroke="rgb(var(--border))" strokeWidth="1">{[25,65,105,145,185].map(y => <line key={y} x1="54" y1={y} x2="665" y2={y} />)}</g><g fill="rgb(var(--text-faint))" fontSize="10"><text x="10" y="29">160k</text><text x="10" y="69">120k</text><text x="16" y="109">80k</text><text x="16" y="149">40k</text><text x="28" y="189">0</text>{months.map((month,index) => <text key={month} x={62 + index * 119} y="207">{month}</text>)}</g><path d="M58 143 C98 136 135 128 177 130 S255 106 296 111 S376 82 415 88 S495 58 534 69 S615 31 654 38" className="marketing-chart-line marketing-chart-line-primary" fill="none" stroke="rgb(var(--product-blue))" strokeWidth="3" /><path d="M58 166 C104 160 135 151 177 154 S252 142 296 144 S374 126 415 131 S494 106 534 111 S615 88 654 91" className="marketing-chart-line marketing-chart-line-secondary" fill="none" stroke="rgb(var(--chart-secondary))" strokeWidth="2.5" /><g fill="rgb(var(--product-blue))">{[[58,143],[177,130],[296,111],[415,88],[534,69],[654,38]].map(([x,y]) => <circle key={String(x)+String(y)} cx={x} cy={y} r="3.5" />)}</g></svg>
              </article>
              <article className="rounded-[1.1rem] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] p-5 shadow-card">
                <div className="flex items-start justify-between"><div><h3 className="text-sm font-semibold">Stări operaționale</h3><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Distribuția oportunităților urmărite pe lună</p></div><StatePill blue>6 luni</StatePill></div>
                <div className="mt-5 grid grid-cols-[2.5rem_1fr] gap-3"><div className="flex h-36 flex-col justify-between pb-5 text-right text-[0.62rem] text-[rgb(var(--text-faint))]"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div className="relative flex h-36 items-end justify-around border-b border-l border-[rgb(var(--border))] bg-[linear-gradient(to_bottom,rgb(var(--border)/0.55)_1px,transparent_1px)] bg-[length:100%_25%] px-4">{bars.map(([active,review,blocked],index) => <div key={months[index]} className="flex h-full w-9 flex-col justify-end"><span className="marketing-chart-bar origin-bottom bg-[rgb(var(--chart-blocked))]" style={{height:String(blocked)+"%", animationDelay:String(index * 80 + 240)+"ms"}} /><span className="marketing-chart-bar origin-bottom bg-[rgb(var(--chart-secondary))]" style={{height:String(review)+"%", animationDelay:String(index * 80 + 160)+"ms"}} /><span className="marketing-chart-bar origin-bottom bg-[rgb(var(--product-blue))]" style={{height:String(active)+"%", animationDelay:String(index * 80 + 80)+"ms"}} /><span className="absolute translate-y-5 text-[0.62rem] text-[rgb(var(--text-faint))]">{months[index]}</span></div>)}</div></div>
                <div className="mt-7 flex flex-wrap gap-5 text-[0.68rem]"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 bg-[rgb(var(--product-blue))]" />În lucru</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 bg-[rgb(var(--chart-secondary))]" />În revizuire</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 bg-[rgb(var(--chart-blocked))]" />Blocat</span></div>
              </article>
            </div>
            <aside className="overflow-hidden rounded-[1.1rem] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] shadow-card"><div className="border-b border-[rgb(var(--border))] px-5 py-4"><p className="text-sm font-semibold">Necesită atenție</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Conturi ordonate după valoare și risc</p></div>{insights.map(([company,value,signal,action,status],index) => <article key={company} className="marketing-attention-card border-b border-[rgb(var(--border))] p-5 last:border-b-0" style={{ animationDelay: String(index * 100) + "ms" }}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold">{company}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p></div><span className={index===0 ? "rounded-pill bg-[rgb(var(--danger-background))] px-2 py-1 text-[0.62rem] font-semibold text-[rgb(var(--danger-text))]" : index===1 ? "rounded-pill bg-[rgb(var(--warning-background))] px-2 py-1 text-[0.62rem] font-semibold text-[rgb(var(--warning-text))]" : "rounded-pill bg-[rgb(var(--product-blue-soft))] px-2 py-1 text-[0.62rem] font-semibold text-[rgb(var(--product-blue-strong))]"}>{status}</span></div><div className="mt-4 space-y-3 text-xs"><div><p className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">Semnal</p><p className="mt-1 text-[rgb(var(--text-secondary))]">{signal}</p></div><div><p className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">Acțiune recomandată</p><p className="mt-1 font-semibold">{action}</p></div></div><button type="button" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[rgb(var(--product-blue-strong))]">Deschide contextul <ArrowRightIcon className="h-3.5 w-3.5" /></button></article>)}</aside>
          </Reveal>
          <p className="mt-4 text-xs text-[rgb(var(--text-faint))]">Date și vizualizări strict ilustrative pentru prezentarea produsului; nu reprezintă rezultate financiare sau informații ale unor clienți.</p>
        </div>
      </section>
    </>
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
