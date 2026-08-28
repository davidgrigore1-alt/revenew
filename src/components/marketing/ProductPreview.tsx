import { IntegrationBrandIcon } from "@/components/ui/IntegrationBrandIcon";
import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckCircleIcon,
  DocumentCheckIcon,
  EnvelopeIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  UserGroupIcon
} from "@heroicons/react/24/outline";

const navigation = [
  ["Control Center", HomeIcon],
  ["Inbox Comercial", EnvelopeIcon],
  ["Oportunități", BuildingOffice2Icon],
  ["Recuperare venituri", CheckCircleIcon],
  ["Rapoarte", ChartBarIcon],
  ["Aplicații", Squares2X2Icon]
] as const;

const records = [
  ["Companii", BuildingOffice2Icon],
  ["Contacte", UserGroupIcon],
  ["Calendar comercial", CalendarDaysIcon]
] as const;

const attentionRows = [
  {
    title: "Follow-up restant · Nordline Retail",
    context: "Termen: 18 aug · Responsabil: Andrei M.",
    exposure: "76.000 RON expunere estimată",
    evidence: "Email și notiță CRM",
    nextAction: "Confirmă răspunsul",
    state: "Restant"
  },
  {
    title: "Reînnoire · Atlas Distribution",
    context: "Termen: 20 aug · Responsabil neconfirmat",
    exposure: "36.000 RON expunere estimată",
    evidence: "Contract disponibil",
    nextAction: "Atribuie responsabil",
    state: "De revizuit"
  },
  {
    title: "Ofertă · Meridian Services",
    context: "Termen: 21 aug · Responsabil: Ioana P.",
    exposure: "42.000 RON expunere estimată",
    evidence: "Ofertă v4 atașată",
    nextAction: "Verifică aprobarea",
    state: "În așteptare"
  }
] as const;

export function ProductPreview() {
  return (
    <figure className="marketing-product-demo mx-auto w-full max-w-[1240px]" aria-labelledby="product-preview-caption">
      <div className="relative isolate" data-marketing-product-frame>
        <div aria-hidden="true" className="absolute inset-x-[4%] bottom-[-0.6rem] -z-10 h-10 rounded-[50%] bg-slate-950/10 blur-xl" />

        <div aria-hidden="true" className="marketing-demo-conversation pointer-events-none absolute -left-10 top-[9rem] z-20 hidden w-60 rounded-xl border border-slate-300 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.2)] xl:block 2xl:-left-24 2xl:w-64">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3"><span className="flex items-center gap-1.5" aria-hidden="true"><i className="h-1.5 w-1.5 rounded-full bg-rose-400" /><i className="h-1.5 w-1.5 rounded-full bg-amber-400" /><i className="h-1.5 w-1.5 rounded-full bg-emerald-400" /></span><p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-slate-600">Conversație controlată</p></div>
          <div className="marketing-demo-question mt-3 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-[0.74rem] font-medium leading-5 text-slate-800">Ce necesită atenție astăzi?</div>
          <div className="marketing-demo-analyzing mt-2 flex items-center gap-2 px-2 py-1 text-[0.69rem] font-medium text-blue-800"><span>Verific 3 surse autorizate</span><span className="marketing-demo-dots inline-flex gap-1"><i /><i /><i /></span></div>
          <div className="marketing-demo-answer ml-5 mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-[0.72rem] font-semibold leading-5 text-slate-950">3 situații necesită verificarea echipei.</div>
          <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3 text-[0.69rem] text-slate-600"><ShieldCheckIcon className="h-3.5 w-3.5 text-blue-700" />Doar date autorizate</div>
        </div>

        <div aria-hidden="true" className="marketing-demo-sources pointer-events-none absolute -right-10 top-[6.25rem] z-20 hidden w-56 rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-[0_22px_64px_rgba(15,23,42,0.18)] xl:block 2xl:-right-20">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3"><p className="text-[0.64rem] font-bold uppercase tracking-[0.13em] text-slate-600">Context conectat</p><span className="inline-flex items-center gap-1 text-[0.64rem] font-semibold text-emerald-700"><CheckCircleIcon className="h-3.5 w-3.5" />Activ</span></div>
          <div className="marketing-demo-source-row mt-3 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-[0.72rem] font-semibold"><IntegrationBrandIcon provider="gmail" size="small" withContainer={false} />Gmail</span><span className="grid justify-items-end text-[0.62rem] text-slate-500"><b className="font-semibold text-slate-700">12 mesaje</b><i className="not-italic text-emerald-700">● sincronizat</i></span></div>
          <div className="marketing-demo-source-row mt-2.5 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-[0.72rem] font-semibold"><IntegrationBrandIcon provider="google_calendar" size="small" withContainer={false} />Google Calendar</span><span className="grid justify-items-end text-[0.62rem] text-slate-500"><b className="font-semibold text-slate-700">2 întâlniri</b><i className="not-italic text-emerald-700">● sincronizat</i></span></div>
          <p className="marketing-demo-source-ready mt-3 border-t border-slate-200 pt-3 text-[0.66rem] leading-4 text-slate-600">Sursele susțin răspunsul.<br />Nicio acțiune automată.</p>
        </div>
        <div aria-hidden="true" className="marketing-demo-log pointer-events-none absolute -right-10 bottom-[2rem] z-20 hidden w-72 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-slate-200 shadow-[0_22px_70px_rgba(15,23,42,0.3)] xl:block 2xl:-right-20">
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-3"><span className="h-2 w-2 rounded-full bg-rose-400" /><span className="h-2 w-2 rounded-full bg-amber-400" /><span className="h-2 w-2 rounded-full bg-blue-400" /><span className="ml-2 text-[0.62rem] uppercase tracking-[0.12em] text-slate-400">jurnal de execuție</span></div>
          <p className="marketing-demo-log-step mt-3 text-[0.7rem] leading-5 text-white">&gt; verifică acțiuni restante</p>
          <p className="marketing-demo-log-step mt-2 text-[0.68rem] leading-5 text-blue-300">✓ 3 surse autorizate</p>
          <p className="marketing-demo-log-step text-[0.68rem] leading-5 text-blue-300">✓ 1 responsabil de atribuit</p>
          <p className="marketing-demo-log-step text-[0.68rem] leading-5 text-blue-300">✓ 2 dovezi confirmate</p>
          <div className="marketing-demo-log-ready mt-3 border-t border-slate-800 pt-3"><p className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-amber-300">Prepared</p><p className="mt-1 text-[0.64rem] text-slate-400">revizuire umană necesară <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" /></p></div>
        </div>
        <div data-marketing-product-surface className="marketing-product-surface overflow-hidden rounded-[1.2rem] border-[5px] border-slate-950 bg-slate-950 shadow-[0_38px_110px_rgba(15,23,42,0.24),0_0_0_1px_rgba(255,255,255,0.12)]">
          <div className="grid min-h-11 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 sm:px-4" aria-hidden="true">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            </div>
            <div className="mx-auto hidden w-full max-w-sm rounded-md border border-slate-200 bg-white px-3 py-1.5 text-center text-[0.67rem] text-slate-500 sm:block">revenew.app/control-center</div>
            <span className="text-[0.67rem] font-semibold text-slate-500">ReveNew</span>
          </div>

          <div className="grid min-h-[31rem] bg-white md:grid-cols-[11.5rem_minmax(0,1fr)] lg:min-h-[37rem]">
            <aside className="hidden border-r border-slate-200 bg-slate-50/80 p-3 md:block" aria-label="Exemplu de navigare ReveNew">
              <div className="flex items-center gap-2 px-2 py-2">
                <IntegrationBrandIcon provider="revenew" size="small" />
                <span className="truncate text-xs font-semibold text-slate-900">ReveNew</span>
              </div>
              <div className="mt-3 flex min-h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-[0.72rem] text-slate-600">
                <MagnifyingGlassIcon className="h-3.5 w-3.5" aria-hidden="true" /> Caută
              </div>
              <nav className="mt-3 grid gap-1">
                {navigation.map(([label, Icon], index) => (
                  <div key={label} className={`flex min-h-8 items-center gap-2 rounded-md px-2.5 text-[0.75rem] ${index === 0 ? "bg-slate-200/70 font-semibold text-slate-950" : "text-slate-600"}`}>
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}
                  </div>
                ))}
              </nav>
              <div className="mt-4 border-t border-slate-200 pt-3">
                <p className="px-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Înregistrări</p>
                <div className="mt-2 grid gap-1">
                  {records.map(([label, Icon]) => (
                    <div key={label} className="flex min-h-7 items-center gap-2 rounded-md px-2.5 text-[0.7rem] text-slate-600"><Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}</div>
                  ))}
                </div>
              </div>
            </aside>

            <section className="min-w-0 text-slate-950" aria-label="Exemplu de suprafață de lucru ReveNew">
              <header className="flex min-h-12 items-center justify-between gap-3 border-b border-slate-200 px-4 sm:px-5">
                <p className="text-xs font-semibold">Control Center</p>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.68rem] font-semibold text-emerald-800"><CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />Control uman activ</span>
              </header>

              <div className="grid lg:grid-cols-[minmax(0,1fr)_17.5rem]">
                <div className="min-w-0 border-b border-slate-200 p-4 sm:p-6 lg:border-b-0 lg:border-r">
                  <div className="mx-auto max-w-[650px]">
                    <p className="text-lg font-semibold tracking-[-0.025em] sm:text-xl">Bună dimineața.</p>
                    <div className="marketing-demo-command mt-4 rounded-xl border border-slate-300 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
                      <div className="flex items-center gap-2 text-[0.72rem] font-semibold text-slate-500"><MagnifyingGlassIcon className="h-4 w-4 text-blue-700" /><span>Întreabă ReveNew</span></div>
                      <p className="marketing-demo-command-text mt-4 min-h-6 text-sm font-semibold text-slate-950">Ce necesită atenție astăzi?</p>
                      <div className="marketing-demo-processing mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                        <span className="marketing-demo-lifecycle inline-flex min-w-0 items-center gap-2 text-[0.68rem] font-medium text-slate-700"><span className="marketing-demo-spinner h-3.5 w-3.5 shrink-0 rounded-full border-[2px] border-blue-200 border-t-blue-700" /><span className="marketing-demo-stage">Verific contextul</span><span className="marketing-demo-stage">Caut sursele</span><span className="marketing-demo-stage">Organizez răspunsul</span></span>
                        <span className="rounded-md bg-blue-700 px-3 py-1.5 text-[0.72rem] font-semibold text-white">Analizează</span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-[0.7rem] text-slate-600">
                      <span className="rounded-md border border-slate-200 px-2.5 py-1.5">Ce necesită atenție?</span>
                      <span className="rounded-md border border-slate-200 px-2.5 py-1.5">Unde lipsește responsabilul?</span>
                    </div>

                    <dl className="marketing-demo-metrics mt-4 grid grid-cols-2 border-y border-slate-200 text-left sm:grid-cols-4">
                      {[["3", "Necesită atenție"], ["154k RON", "Expunere estimată"], ["2", "Aprobări deschise"]].map(([value, label]) => (
                        <div key={label} className="border-r border-slate-200 px-3 py-2.5 last:border-r-0"><dt className="text-[0.6rem] uppercase tracking-[0.08em] text-slate-500">{label}</dt><dd className="mt-1 text-xs font-semibold tabular-nums text-slate-950">{value}</dd></div>
                      ))}
                      <div className="px-3 py-2.5"><dt className="inline-flex items-center gap-1 text-[0.6rem] uppercase tracking-[0.08em] text-slate-500"><ChartBarIcon className="h-3 w-3" />Activitate 7 zile</dt><dd className="mt-1 flex h-4 items-end gap-0.5" aria-label="Activitate comercială în creștere">{[4,7,5,10,8,12,14].map((height,index) => <span key={index} className="marketing-demo-chart-bar w-1.5 rounded-sm bg-blue-600/75" style={{ height: `${height}px`, animationDelay: `${0.62 + index * 0.06}s` }} />)}</dd></div>
                    </dl>

                    <section className="mt-7" aria-labelledby="preview-attention-title">
                      <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-2.5">
                        <div><p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-blue-700">Astăzi</p><h3 id="preview-attention-title" className="mt-1 text-xs font-semibold">Necesită atenție</h3></div>
                        <span className="text-[0.67rem] text-slate-500">Prioritate explicabilă</span>
                      </div>
                      <div className="divide-y divide-slate-200">
                        {attentionRows.map((row, index) => (
                          <article key={row.title} className={`marketing-demo-result-row grid gap-2.5 py-3 ${index === 0 ? "bg-blue-50/80" : ""} sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-2.5`} style={{ animationDelay: String(0.72 + index * 0.12) + "s" }}>
                            <div className="min-w-0">
                              <p className="truncate text-[0.76rem] font-semibold text-slate-950">{row.title}</p>
                              <p className="mt-1 truncate text-[0.68rem] font-medium text-slate-600">{row.context}</p>
                              <p className="mt-1 truncate text-[0.65rem] font-semibold tabular-nums text-slate-800">{row.exposure}</p>
                              <p className="mt-1 truncate text-[0.65rem] text-blue-800">Următoarea acțiune: {row.nextAction}</p>
                            </div>
                            <div className="grid justify-items-end gap-1.5 text-[0.63rem]">
                              <span className="max-w-36 truncate text-slate-500">{row.evidence}</span>
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">{row.state}</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>

                <aside className="marketing-demo-context bg-slate-50 p-4 sm:p-5" aria-labelledby="preview-context-title">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-blue-700">Semnal selectat</p>
                  <h3 id="preview-context-title" className="mt-2 text-sm font-semibold">Context pentru decizie</h3>
                  <p className="mt-2 text-[0.75rem] leading-5 text-slate-700">ReveNew separă faptele disponibile de informațiile care trebuie confirmate.</p>
                  <p className="marketing-demo-context-answer mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-[0.75rem] font-semibold leading-5 text-slate-950">3 situații necesită verificarea echipei.</p>
                  <div className="marketing-demo-email mt-3 border-l-2 border-red-400 bg-white px-3 py-2.5"><p className="flex items-center gap-1.5 text-[0.65rem] font-semibold text-slate-500"><IntegrationBrandIcon provider="gmail" size="small" withContainer={false} />Ultimul email · Meridian</p><p className="mt-1 text-[0.72rem] font-semibold text-slate-900">„Putem confirma agenda pentru joi?”</p><p className="mt-1 text-[0.64rem] text-slate-500">Astăzi · 09:18</p></div>

                  <dl className="mt-5 divide-y divide-slate-200 border-y border-slate-300">
                    <div className="marketing-demo-proof py-3"><dt className="text-[0.63rem] font-semibold uppercase tracking-[0.1em] text-slate-500">Dovadă</dt><dd className="mt-1 text-[0.73rem] font-medium text-slate-700">Termen înregistrat și depășit</dd></div>
                    <div className="marketing-demo-proof py-3"><dt className="text-[0.63rem] font-semibold uppercase tracking-[0.1em] text-slate-500">Responsabil</dt><dd className="mt-1 text-[0.73rem] font-medium text-slate-700">Andrei M. · confirmat</dd></div>
                    <div className="marketing-demo-proof py-3"><dt className="text-[0.63rem] font-semibold uppercase tracking-[0.1em] text-slate-500">Acțiune următoare</dt><dd className="mt-1 text-[0.73rem] font-medium text-slate-700">Confirmă răspunsul primit</dd></div>
                  </dl>

                  <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold text-blue-950"><DocumentCheckIcon className="h-3.5 w-3.5" aria-hidden="true" />Aprobare umană</p>
                    <p className="mt-1.5 text-[0.68rem] leading-5 text-blue-950/75">Recomandarea poate fi verificată, editată sau respinsă înainte de orice acțiune.</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-[0.7rem] font-semibold text-slate-700">
                    <span>Deschide revizuirea</span><ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                </aside>
              </div>
            </section>
          </div>
        </div>
      </div>

      <figcaption id="product-preview-caption" className="mx-auto mt-4 max-w-2xl text-center text-xs leading-5 text-[rgb(var(--text-muted))]">Suprafață ilustrativă de produs. Stările afișate descriu fluxul de verificare; conținutul real depinde de datele și permisiunile spațiului de lucru.</figcaption>
    </figure>
  );
}
