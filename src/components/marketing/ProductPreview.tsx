import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  DocumentCheckIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";

const navigation = [
  ["Control Center", HomeIcon],
  ["Activitatea mea", CheckCircleIcon],
  ["Companii", BuildingOffice2Icon],
  ["Contacte", UserGroupIcon]
] as const;

const attentionRows = [
  {
    title: "Follow-up de verificat",
    context: "Termenul înregistrat a fost depășit",
    evidence: "Acțiune restantă",
    state: "Restant"
  },
  {
    title: "Responsabil de confirmat",
    context: "Oportunitatea nu are încă un proprietar explicit",
    evidence: "Date incomplete",
    state: "De revizuit"
  },
  {
    title: "Cerere comercială de clarificat",
    context: "Sursa este cunoscută; valoarea rămâne neconfirmată",
    evidence: "Dovadă disponibilă",
    state: "În analiză"
  }
] as const;

export function ProductPreview() {
  return (
    <figure className="mx-auto w-full max-w-[1240px]" aria-labelledby="product-preview-caption">
      <div className="relative isolate" data-marketing-product-frame>
        <div aria-hidden="true" className="absolute inset-x-[4%] bottom-[-0.6rem] -z-10 h-10 rounded-[50%] bg-slate-950/10 blur-xl" />

        <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-[8.25rem] z-20 hidden w-60 rounded-xl border border-blue-200/90 bg-white/95 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-sm 2xl:block">
          <p className="text-[0.63rem] font-bold uppercase tracking-[0.14em] text-blue-700">Conversație</p>
          <div className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-[0.7rem] leading-5 text-slate-700">Ce oportunități au termen depășit?</div>
          <div className="ml-5 mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[0.7rem] font-medium leading-5 text-slate-900">Am găsit trei cazuri care necesită verificarea echipei.</div>
          <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3 text-[0.67rem] text-slate-500"><ShieldCheckIcon className="h-3.5 w-3.5 text-blue-700" />Doar date autorizate</div>
        </div>

        <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-[6rem] z-20 hidden w-64 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-slate-200 shadow-[0_22px_70px_rgba(15,23,42,0.28)] 2xl:block">
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-3"><span className="h-2 w-2 rounded-full bg-rose-400" /><span className="h-2 w-2 rounded-full bg-amber-400" /><span className="h-2 w-2 rounded-full bg-blue-400" /><span className="ml-2 text-[0.6rem] uppercase tracking-[0.12em] text-slate-500">jurnal de execuție</span></div>
          <p className="mt-3 text-[0.68rem] leading-5 text-white">&gt; verifică acțiuni restante</p>
          <p className="mt-2 text-[0.65rem] leading-5 text-blue-300">✓ 3 surse autorizate</p>
          <p className="text-[0.65rem] leading-5 text-blue-300">✓ 2 responsabili de confirmat</p>
          <div className="mt-3 border-t border-slate-800 pt-3 text-[0.62rem] text-slate-500">pregătit pentru revizuire umană</div>
        </div>
        <div data-marketing-product-surface className="overflow-hidden rounded-[1.2rem] border border-slate-300 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.16),0_2px_8px_rgba(15,23,42,0.08)]">
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
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-950 text-[0.68rem] font-bold text-white">R</span>
                <span className="truncate text-xs font-semibold text-slate-900">Spațiu comercial</span>
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
              <div className="mt-6 border-t border-slate-200 pt-4">
                <p className="px-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Înregistrări</p>
                <div className="mt-2 grid gap-1 px-2 text-[0.73rem] text-slate-600">
                  <span>Oportunități</span>
                  <span>Recuperare venituri</span>
                  <span>Rapoarte</span>
                </div>
              </div>
            </aside>

            <section className="min-w-0 text-slate-950" aria-label="Exemplu de suprafață de lucru ReveNew">
              <header className="flex min-h-12 items-center justify-between gap-3 border-b border-slate-200 px-4 sm:px-5">
                <p className="text-xs font-semibold">Control Center</p>
                <span className="inline-flex items-center gap-1.5 text-[0.7rem] text-slate-600"><ShieldCheckIcon className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />Control uman activ</span>
              </header>

              <div className="grid lg:grid-cols-[minmax(0,1fr)_17.5rem]">
                <div className="min-w-0 border-b border-slate-200 p-4 sm:p-6 lg:border-b-0 lg:border-r">
                  <div className="mx-auto max-w-[650px]">
                    <p className="text-lg font-semibold tracking-[-0.025em] sm:text-xl">Bună dimineața.</p>
                    <div className="mt-4 rounded-xl border border-slate-300 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                      <p className="text-xs text-slate-500">Întreabă ReveNew despre datele comerciale disponibile…</p>
                      <div className="mt-10 flex flex-wrap items-end justify-between gap-3 sm:mt-12">
                        <span className="inline-flex items-center gap-1.5 text-[0.69rem] text-slate-600"><ShieldCheckIcon className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />Doar informații autorizate</span>
                        <span className="rounded-md bg-blue-700 px-3 py-1.5 text-[0.72rem] font-semibold text-white">Verifică</span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-[0.7rem] text-slate-600">
                      <span className="rounded-md border border-slate-200 px-2.5 py-1.5">Ce necesită atenție?</span>
                      <span className="rounded-md border border-slate-200 px-2.5 py-1.5">Unde lipsește responsabilul?</span>
                    </div>

                    <section className="mt-7" aria-labelledby="preview-attention-title">
                      <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-2.5">
                        <div><p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-blue-700">Astăzi</p><h3 id="preview-attention-title" className="mt-1 text-xs font-semibold">Necesită atenție</h3></div>
                        <span className="text-[0.67rem] text-slate-500">Prioritate explicabilă</span>
                      </div>
                      <div className="divide-y divide-slate-200">
                        {attentionRows.map((row, index) => (
                          <article key={row.title} className={`grid gap-2 py-3 ${index === 0 ? "bg-blue-50/60" : ""} sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-2`}>
                            <div className="min-w-0">
                              <p className="truncate text-[0.76rem] font-semibold">{row.title}</p>
                              <p className="mt-1 truncate text-[0.68rem] text-slate-600">{row.context}</p>
                            </div>
                            <div className="flex items-center gap-2 text-[0.65rem]">
                              <span className="text-slate-500">{row.evidence}</span>
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">{row.state}</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>

                <aside className="bg-slate-50/75 p-4 sm:p-5" aria-labelledby="preview-context-title">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-blue-700">Semnal selectat</p>
                  <h3 id="preview-context-title" className="mt-2 text-sm font-semibold">Context pentru decizie</h3>
                  <p className="mt-2 text-[0.73rem] leading-5 text-slate-600">ReveNew separă faptele disponibile de informațiile care trebuie confirmate.</p>

                  <dl className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
                    <div className="py-3"><dt className="text-[0.63rem] font-semibold uppercase tracking-[0.1em] text-slate-500">Dovadă</dt><dd className="mt-1 text-[0.73rem] font-medium text-slate-700">Termen înregistrat și depășit</dd></div>
                    <div className="py-3"><dt className="text-[0.63rem] font-semibold uppercase tracking-[0.1em] text-slate-500">Ce lipsește</dt><dd className="mt-1 text-[0.73rem] font-medium text-slate-700">Responsabil comercial confirmat</dd></div>
                    <div className="py-3"><dt className="text-[0.63rem] font-semibold uppercase tracking-[0.1em] text-slate-500">Valoare</dt><dd className="mt-1 text-[0.73rem] font-medium text-slate-700">Estimată; distinctă de venit</dd></div>
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
