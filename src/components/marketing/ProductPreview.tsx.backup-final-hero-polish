import { IntegrationBrandIcon } from "@/components/ui/IntegrationBrandIcon";
import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  CheckCircleIcon,
  DocumentCheckIcon,
  EnvelopeIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";

const navigationGroups = [
  { label: "Control", items: [["Control Center", HomeIcon], ["Activitatea mea", CheckCircleIcon]] },
  { label: "Flux comercial", items: [["Inbox Comercial", EnvelopeIcon], ["Aprobări", DocumentCheckIcon], ["Oportunități", BuildingOffice2Icon], ["Recuperare venituri", CheckCircleIcon], ["Pipeline", ChartBarIcon]] },
  { label: "Inteligență", items: [["Inteligență operațională", SparklesIcon]] }
] as const;

const recordNavigation = [["Companii", BuildingOffice2Icon], ["Contacte", UserGroupIcon], ["Documente", DocumentCheckIcon]] as const;

const connectedSources = [
  { provider: "gmail" as const, name: "Gmail", detail: "12 mesaje", state: "Verificat" },
  { provider: "google_calendar" as const, name: "Calendar", detail: "2 întâlniri", state: "Verificat" },
  { provider: "google_drive" as const, name: "Drive", detail: "1 document", state: "Verificat" }
] as const;

function ProductSidebar() {
  return (
    <aside className="hidden border-r border-slate-200 bg-[#f7f8fa] px-2.5 py-3 md:block" aria-label="Exemplu de navigare ReveNew">
      <div className="flex items-center gap-2 px-2 py-1.5"><IntegrationBrandIcon provider="revenew" size="small" /><span className="truncate text-xs font-semibold text-slate-900">ReveNew</span></div>
      <div className="mt-2.5 flex min-h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-[0.68rem] text-slate-600"><MagnifyingGlassIcon className="h-3.5 w-3.5" aria-hidden="true" />Caută</div>
      <nav className="mt-2.5" aria-label="Structura produsului ilustrativ">
        {navigationGroups.map((group) => (
          <div key={group.label} className="mt-2 first:mt-0">
            <p className="px-2 text-[0.52rem] font-semibold uppercase tracking-[0.11em] text-slate-400">{group.label}</p>
            <div className="mt-0.5 grid">
              {group.items.map(([label, Icon]) => {
                const active = label === "Inteligență operațională";
                return <div key={label} className={`flex min-h-7 items-center gap-2 rounded-md px-2 text-[0.67rem] font-medium ${active ? "bg-[#e9eef8] text-slate-950 shadow-[inset_2px_0_#285fd3]" : "text-slate-600"}`}><Icon className={`h-3.5 w-3.5 ${active ? "text-blue-700" : "text-slate-500"}`} aria-hidden="true" />{label}</div>;
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-3 border-t border-slate-200 pt-2.5"><p className="px-2 text-[0.52rem] font-semibold uppercase tracking-[0.11em] text-slate-400">Relații</p><div className="mt-0.5 grid">{recordNavigation.map(([label, Icon]) => <div key={label} className="flex min-h-7 items-center gap-2 rounded-md px-2 text-[0.65rem] text-slate-600"><Icon className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />{label}</div>)}</div></div>
    </aside>
  );
}

function OperationalIntelligenceScreen() {
  return (
    <div className="grid min-h-[31rem] bg-white md:grid-cols-[11.5rem_minmax(0,1fr)] lg:min-h-[37rem]">
      <ProductSidebar />
      <section className="min-w-0 text-slate-950" aria-label="Exemplu de inteligență operațională ReveNew">
        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 px-4 sm:px-5">
          <div className="min-w-0"><p className="text-[0.57rem] font-semibold text-slate-400">Control Center / Inteligență operațională</p><p className="mt-0.5 truncate text-sm font-semibold tracking-[-0.02em]">Inteligență operațională</p></div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.62rem] font-semibold text-emerald-800"><ShieldCheckIcon className="h-3.5 w-3.5" aria-hidden="true" />Control uman activ</span>
        </header>
        <nav className="flex min-h-9 gap-4 overflow-hidden border-b border-slate-200 px-4 sm:px-5" aria-label="Secțiuni ilustrative de inteligență"><span className="inline-flex items-center border-b-2 border-blue-700 text-[0.65rem] font-semibold text-slate-950">Întreabă</span>{["Descoperiri", "Recomandări", "Capabilități"].map(label => <span key={label} className="inline-flex items-center border-b-2 border-transparent text-[0.64rem] font-medium text-slate-500">{label}</span>)}</nav>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_16.25rem]">
          <main className="min-w-0 border-b border-slate-200 p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <div className="marketing-demo-command rounded-[0.8rem] border border-slate-300 bg-white p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.07)]">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2"><p className="flex items-center gap-1.5 text-[0.61rem] font-semibold text-slate-600"><ShieldCheckIcon className="h-3.5 w-3.5 text-blue-700" />Context autorizat · Întregul spațiu de lucru</p><span className="text-[0.56rem] text-slate-400">3 surse disponibile</span></div>
              <div className="mt-2.5 flex items-start gap-2"><SparklesIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" /><p className="marketing-demo-command-text min-h-10 text-[0.8rem] font-semibold leading-5 text-slate-950">Ce necesită atenție astăzi și pe ce dovezi se bazează?</p></div>
              <div className="marketing-demo-processing mt-2.5 flex items-center justify-between gap-3 border-t border-slate-200 pt-2.5"><p className="flex items-center gap-1.5 text-[0.6rem] font-medium text-slate-600"><CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" />Context verificat · fără acțiune externă</p><span className="rounded-md bg-blue-700 px-3 py-1.5 text-[0.65rem] font-semibold text-white">Analizează</span></div>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5 text-[0.58rem] text-slate-600"><span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">Unde lipsește responsabilul?</span><span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">Ce dovadă este insuficientă?</span></div>

            <article className="marketing-demo-answer mt-3.5 overflow-hidden rounded-[0.85rem] border border-slate-300 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3.5 py-2.5"><div><p className="text-[0.57rem] font-bold uppercase tracking-[0.11em] text-blue-700">Necesită atenție</p><h3 className="mt-1 text-[0.82rem] font-semibold">3 situații cer verificarea echipei</h3></div><span className="inline-flex items-center gap-1 text-[0.57rem] font-semibold text-emerald-700"><CheckCircleIcon className="h-3.5 w-3.5" />3 surse verificate</span></div>
              <div className="grid sm:grid-cols-[1.05fr_0.95fr]">
                <div className="p-3.5 sm:border-r sm:border-slate-200">
                  <p className="text-[0.59rem] font-bold uppercase tracking-[0.1em] text-slate-500">Concluzie ReveNew</p>
                  <p className="mt-2 text-[0.74rem] font-semibold leading-5 text-slate-900">Follow-up-ul Meridian necesită o decizie înaintea termenului comercial.</p>
                  <dl className="mt-3 grid gap-2 border-t border-slate-200 pt-3">
                    <div className="marketing-demo-proof grid grid-cols-[4.2rem_1fr] gap-2 text-[0.62rem] leading-4"><dt className="font-semibold text-slate-500">Dovadă</dt><dd className="text-slate-700">Email asociat și ofertă v4</dd></div>
                    <div className="marketing-demo-proof grid grid-cols-[4.2rem_1fr] gap-2 text-[0.62rem] leading-4"><dt className="font-semibold text-slate-500">Lipsește</dt><dd className="text-slate-700">Confirmarea responsabilului</dd></div>
                    <div className="marketing-demo-proof grid grid-cols-[4.2rem_1fr] gap-2 text-[0.62rem] leading-4"><dt className="font-semibold text-slate-500">Valoare</dt><dd className="font-semibold text-slate-800">42.000 RON · estimată, neconfirmată</dd></div>
                  </dl>
                </div>
                <div className="bg-[#f7f9fc] p-3.5">
                  <p className="text-[0.59rem] font-bold uppercase tracking-[0.1em] text-[#956118]">Următorul pas pregătit</p><p className="mt-2 text-[0.72rem] font-semibold leading-5">Clarifică responsabilul și confirmă revenirea</p><p className="mt-1.5 text-[0.6rem] leading-4 text-slate-600">Editabil · neaprobat · neexecutat</p>
                  <div className="mt-3 rounded-[0.6rem] border border-amber-200 bg-amber-50 px-2.5 py-2"><p className="flex items-center gap-1.5 text-[0.62rem] font-semibold text-amber-900"><DocumentCheckIcon className="h-3.5 w-3.5" />Aprobare umană necesară</p><p className="mt-1 text-[0.57rem] leading-4 text-amber-900/70">Nicio acțiune externă nu pornește automat.</p></div>
                  <div className="mt-2.5 flex items-center justify-between rounded-md border border-slate-200 bg-white px-2.5 py-2 text-[0.61rem] font-semibold text-slate-700"><span>Pregătește revizuirea</span><ArrowRightIcon className="h-3.5 w-3.5" /></div>
                </div>
              </div>
            </article>
          </main>

          <aside className="marketing-demo-context bg-[#f7f8fa] p-4" aria-labelledby="preview-context-title">
            <p className="text-[0.57rem] font-bold uppercase tracking-[0.12em] text-blue-700">Context pentru decizie</p><h3 id="preview-context-title" className="mt-1.5 text-[0.8rem] font-semibold">Dovezi și surse conectate</h3><p className="mt-1.5 text-[0.62rem] leading-4 text-slate-600">Răspunsul folosește doar contextul autorizat disponibil.</p>
            <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">{connectedSources.map(source => <div key={source.name} className="marketing-demo-source-row flex items-center justify-between gap-2 py-2"><span className="flex min-w-0 items-center gap-2 text-[0.62rem] font-semibold"><IntegrationBrandIcon provider={source.provider} size="small" /><span className="truncate">{source.name}</span></span><span className="grid shrink-0 justify-items-end text-[0.54rem]"><b className="font-semibold text-slate-600">{source.detail}</b><i className="not-italic font-semibold text-emerald-700">{source.state}</i></span></div>)}</div>
            <div className="marketing-demo-email mt-3 border-l-2 border-red-400 bg-white px-3 py-2.5"><p className="flex items-center gap-1.5 text-[0.58rem] font-semibold text-slate-500"><IntegrationBrandIcon provider="gmail" size="small" withContainer={false} />Email asociat · Meridian</p><p className="mt-1 text-[0.64rem] font-semibold leading-4 text-slate-900">„Putem confirma agenda pentru joi?”</p><p className="mt-1 text-[0.55rem] text-slate-500">Astăzi · 09:18</p></div>
            <div className="marketing-demo-source-ready mt-3 rounded-[0.65rem] border border-blue-200 bg-blue-50 p-2.5"><p className="flex items-center gap-1.5 text-[0.61rem] font-semibold text-blue-950"><ShieldCheckIcon className="h-3.5 w-3.5" />Sursele susțin răspunsul</p><p className="mt-1 text-[0.57rem] leading-4 text-blue-950/70">Informația lipsă rămâne vizibilă. Nicio execuție automată.</p></div>
          </aside>
        </div>
      </section>
    </div>
  );
}

export function ProductPreview() {
  return (
    <figure className="marketing-product-demo mx-auto w-full max-w-[1240px]" aria-labelledby="product-preview-caption">
      <div className="relative isolate" data-marketing-product-frame>
        <div aria-hidden="true" className="absolute inset-x-[4%] bottom-[-0.6rem] -z-10 h-10 rounded-[50%] bg-slate-950/10 blur-xl" />

        <div aria-hidden="true" className="marketing-demo-conversation landing-v3-floating-surface landing-v3-conversation-surface pointer-events-none absolute -left-10 top-[9rem] z-20 hidden w-60 p-4 xl:block 2xl:-left-24 2xl:w-64"><div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3"><div className="min-w-0"><p className="text-[0.56rem] font-bold uppercase tracking-[0.15em] text-emerald-700">Control activ</p><p className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-slate-700">Conversație controlată</p></div><span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[0.56rem] font-semibold text-slate-500">3 surse</span></div><div className="marketing-demo-question mt-3 rounded-[0.7rem] border border-slate-200 bg-slate-50 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,.9)]"><p className="flex items-center gap-1.5 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-slate-500"><MagnifyingGlassIcon className="h-3.5 w-3.5 text-blue-700" />Întrebare</p><p className="mt-2 text-[0.74rem] font-semibold leading-5 text-slate-900">Ce necesită atenție astăzi?</p></div><p className="marketing-demo-analyzing mt-2.5 flex items-center gap-1.5 text-[0.62rem] font-semibold text-slate-600"><CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" />Context și surse verificate</p><div className="marketing-demo-answer mt-2.5 rounded-[0.72rem] border border-blue-200 bg-[linear-gradient(145deg,#f5f9ff,#eaf2ff)] px-3 py-3 shadow-[0_8px_20px_rgba(37,99,235,.08)]"><p className="text-[0.56rem] font-bold uppercase tracking-[0.12em] text-blue-700">Răspuns verificabil</p><p className="mt-1.5 text-[0.75rem] font-semibold leading-5 text-slate-950">3 situații necesită verificarea echipei.</p></div><div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3 text-[0.65rem] font-medium text-slate-600"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50"><ShieldCheckIcon className="h-3.5 w-3.5 text-blue-700" /></span>Doar date autorizate</div></div>

        <div aria-hidden="true" className="marketing-demo-sources landing-v3-floating-surface landing-v3-context-surface pointer-events-none absolute -right-10 top-[5.25rem] z-20 hidden w-56 p-4 text-slate-900 xl:block 2xl:-right-20"><div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3"><p className="text-[0.64rem] font-bold uppercase tracking-[0.13em] text-slate-600">Context conectat</p><span className="inline-flex items-center gap-1 text-[0.62rem] font-semibold text-emerald-700"><CheckCircleIcon className="h-3.5 w-3.5" />Activ</span></div>{connectedSources.map(source => <div key={source.name} className="marketing-demo-source-row flex items-center justify-between gap-2 border-b border-slate-100 py-2.5"><span className="inline-flex min-w-0 items-center gap-2 text-[0.67rem] font-semibold"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white"><IntegrationBrandIcon provider={source.provider} size="small" withContainer={false} /></span>{source.name}</span><span className="grid shrink-0 justify-items-end text-[0.56rem]"><b className="font-semibold text-slate-700">{source.detail}</b><i className="not-italic font-semibold text-emerald-700">{source.state}</i></span></div>)}<div className="marketing-demo-source-ready mt-2.5 grid gap-1.5 text-[0.61rem] leading-4 text-slate-600"><p className="flex items-center gap-1.5"><CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" />Sursele susțin răspunsul.</p><p className="flex items-center gap-1.5"><ShieldCheckIcon className="h-3.5 w-3.5 text-blue-700" />Nicio acțiune automată.</p></div></div>

        <div aria-hidden="true" className="marketing-demo-log landing-v3-audit-surface pointer-events-none absolute -right-10 bottom-[2rem] z-20 hidden w-72 overflow-hidden p-4 text-slate-200 xl:block 2xl:-right-20"><div className="flex items-center justify-between gap-2 border-b border-slate-700/70 pb-3"><div><p className="text-[0.56rem] font-bold uppercase tracking-[0.14em] text-slate-500">Jurnal verificabil</p><p className="mt-1 text-[0.7rem] font-semibold text-white">Control operațional</p></div><span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-2 py-1 text-[0.55rem] font-semibold text-emerald-300">Auditabil</span></div><div className="mt-3 grid gap-2"><p className="marketing-demo-log-step flex items-start gap-2 text-[0.66rem] leading-4 text-slate-300"><CheckCircleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" /><span><b className="font-semibold text-white">Context verificat</b><br />sursele și lipsurile sunt vizibile</span></p><p className="marketing-demo-log-step flex items-center gap-2 text-[0.66rem] leading-4 text-slate-300"><CheckCircleIcon className="h-3.5 w-3.5 shrink-0 text-blue-300" />3 surse autorizate</p><p className="marketing-demo-log-step flex items-center gap-2 text-[0.66rem] leading-4 text-slate-300"><CheckCircleIcon className="h-3.5 w-3.5 shrink-0 text-blue-300" />1 responsabil de confirmat</p><p className="marketing-demo-log-step flex items-center gap-2 text-[0.66rem] leading-4 text-slate-300"><CheckCircleIcon className="h-3.5 w-3.5 shrink-0 text-blue-300" />2 dovezi inspectabile</p></div><div className="marketing-demo-log-ready mt-3 flex items-end justify-between gap-3 border-t border-slate-700/70 pt-3"><div><p className="text-[0.56rem] font-bold uppercase tracking-[0.14em] text-amber-300">Pregătit</p><p className="mt-1 text-[0.62rem] text-slate-400">Așteaptă revizuirea umană</p></div><span className="mb-1 h-2 w-2 rounded-full bg-blue-400 ring-4 ring-blue-400/10" /></div></div>

        <div data-marketing-product-surface className="marketing-product-surface landing-v3-device-frame overflow-hidden rounded-[1.35rem] border-[4px] border-[#11141a] bg-[#11141a]"><div className="landing-v3-browser-chrome grid min-h-12 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 sm:px-4" aria-hidden="true"><div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /></div><div className="mx-auto hidden w-full max-w-sm rounded-md border border-slate-200 bg-white px-3 py-1.5 text-center text-[0.67rem] text-slate-500 sm:block">revenew.app/inteligenta-operationala</div><span className="text-[0.67rem] font-semibold text-slate-500">ReveNew</span></div><OperationalIntelligenceScreen /></div>
      </div>
      <figcaption id="product-preview-caption" className="mx-auto mt-4 max-w-2xl text-center text-xs leading-5 text-[rgb(var(--text-muted))]">Suprafață ilustrativă de produs. Analiza folosește context autorizat; pasul afișat este pregătit pentru revizuire, nu executat.</figcaption>
    </figure>
  );
}
