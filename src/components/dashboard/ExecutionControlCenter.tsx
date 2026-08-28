"use client";

import type { ReportingFxRate } from "@/lib/reporting-currency";
import { ControlCenterVisuals } from "@/components/dashboard/ControlCenterVisuals";
import { CaseReadiness } from "@/components/ui/CaseReadiness";
import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { EvidenceList } from "@/components/evidence/EvidenceList";
import type { ExecutionCase, ExecutionControlCenterModel } from "@/lib/execution-control-center";
import { formatProductCurrency, formatProductDateTime, formatProductDate, presentOpportunityState } from "@/lib/ui/presentation";
import { cn } from "@/lib/utils";

const filters = [
  { id: "all", label: "Toate" }, { id: "attention", label: "Necesită atenție" },
  { id: "overdue", label: "Restante" }, { id: "unassigned", label: "Fără responsabil" }
] as const;
type Filter = typeof filters[number]["id"];
const matches = (item: ExecutionCase, filter: Filter) => filter === "all" || (filter === "attention" && item.severity !== "informative")
  || (filter === "overdue" && item.overdue) || (filter === "unassigned" && !item.owner.id);
const sectionTitle = "text-xs font-semibold text-[rgb(var(--foreground))]";
const muted = "text-xs leading-5 text-[rgb(var(--text-muted))]";

function CaseDetail({ item,impactHref }: { item: ExecutionCase;impactHref?:string }) {
  return <article aria-labelledby="selected-execution-title" className="min-w-0 px-5 py-5 xl:px-6">
    <header className="border-b border-[rgb(var(--border))] pb-4">
      <p className="text-metadata font-semibold uppercase tracking-[0.1em] text-[rgb(var(--primary))]">Caz selectat</p>
      <h2 id="selected-execution-title" className="mt-2 break-words text-lg font-semibold leading-6">{item.organization}</h2>
      <p className="mt-1 break-words text-sm leading-5 text-[rgb(var(--text-secondary))]">{item.opportunityTitle}</p>
      {impactHref?<Link href={impactHref} className="focus-ring mt-2 inline-block text-xs hover:underline">Impact urmărit · Vezi impactul →</Link>:null}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="font-semibold tabular-nums">{formatProductCurrency(item.value, item.currency)} <span className="font-normal text-[rgb(var(--text-muted))]">estimat</span></span>
        <span className="text-[rgb(var(--text-muted))]">{presentOpportunityState(item.status).label}</span>
      </div>
    </header>

    <section className="py-4" aria-labelledby="execution-why-now">
      <h3 id="execution-why-now" className={sectionTitle}>De ce acum</h3>
      <ul className="mt-2 space-y-2">{item.reasons.slice(0, 4).map((reason) => <li key={reason} className="flex gap-2 text-[13px] leading-5"><span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[rgb(var(--text-muted))]" />{reason}</li>)}</ul>
      <details className="mt-3"><summary className="focus-ring cursor-pointer text-metadata text-[rgb(var(--text-muted))]">Cum este stabilită prioritatea</summary>
        <ul className="mt-2 space-y-1">{item.rankingReasons.map((reason) => <li key={reason} className={muted}>{reason}</li>)}{item.reasons.slice(4).map((reason) => <li key={reason} className={muted}>{reason}</li>)}</ul>
      </details>
    </section>

    <section className="border-y border-[rgb(var(--border))] py-4" aria-labelledby="execution-next-action">
      <div className="flex items-baseline justify-between gap-3"><h3 id="execution-next-action" className={sectionTitle}>Următorul pas</h3><span className="text-metadata text-[rgb(var(--text-muted))]">Control uman</span></div>
      {item.nextAction ? <div className="mt-2"><p className="text-sm font-medium">{item.nextAction.title}</p><p className={muted}>{item.nextAction.owner ?? "Responsabil de confirmat"} · {formatProductDateTime(item.nextAction.dueAt)}</p></div> : <p className="mt-2 text-sm">Nu există o acțiune următoare confirmată.</p>}
      <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{item.intervention.explanation}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3"><Button href={item.intervention.href} size="small">{item.intervention.label}<ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" /></Button>
        <Link href={"/opportunities/" + encodeURIComponent(item.opportunityId)} className="focus-ring rounded text-xs text-[rgb(var(--text-muted))] hover:underline">Deschide oportunitatea</Link>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[rgb(var(--border))] pt-3">
        <div><dt className={muted}>Responsabil comercial</dt><dd className="mt-0.5 break-words text-xs font-medium">{item.owner.name}</dd></div>
        <div><dt className={muted}>Termen comercial</dt><dd className="mt-0.5 text-xs">{item.deadline ? formatProductDate(item.deadline) : "Neconfirmat"}</dd></div>
        <div><dt className={muted}>Ultima activitate</dt><dd className="mt-0.5 text-xs">{item.lastActivityAt ? formatProductDate(item.lastActivityAt) : "Neconfirmată"}</dd></div>
        {item.nextMeetingAt ? <div><dt className={muted}>Următoarea întâlnire</dt><dd className="mt-0.5 text-xs">{formatProductDateTime(item.nextMeetingAt)}</dd></div> : null}
      </dl>
    </section>
    <section className="pt-4" aria-labelledby="execution-evidence"><h3 id="execution-evidence" className={sectionTitle}>Dovezi <span className="ml-1 font-normal text-[rgb(var(--text-muted))]">· {item.evidence.length}</span></h3><EvidenceList items={item.evidence} /></section>
    <section className="mt-3 border-t border-[rgb(var(--border))] pt-4" aria-labelledby="execution-recent"><h3 id="execution-recent" className={sectionTitle}>Activitate recentă</h3><EvidenceList items={item.recentActivity} limit={3} label="Activitate recentă" /></section>
  </article>;
}

export function ExecutionControlCenter({ model,impactLinks={},fx,asOf }: { model: ExecutionControlCenterModel;impactLinks?:Record<string,string>;fx:ReportingFxRate|null;asOf:string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const visible = model.cases.filter((item) => matches(item, filter));
  // Selection is always resolved against the latest props/filter, never stale content.
  const selected = visible.find((item) => item.id === selectedId) ?? visible[0] ?? null;
  return <section aria-labelledby="execution-center-title" className="pt-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 id="execution-center-title" className="text-page-heading font-semibold tracking-tight">Control Center</h1><p className="mt-1 text-sm text-[rgb(var(--text-muted))]">Situațiile comerciale care necesită intervenție.</p></div>
      <Link href="/opportunities" className="focus-ring rounded text-xs text-[rgb(var(--text-muted))] hover:underline">Toate oportunitățile →</Link>
    </header>
    <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-y border-[rgb(var(--border))] py-3 text-xs">
      <span><strong className="tabular-nums">{model.cases.length}</strong> <span className="text-[rgb(var(--text-muted))]">{model.cases.length === 1 ? "situație" : "situații"} de revizuit</span></span>
      <span><strong className="tabular-nums">{model.overdueCount}</strong> <span className="text-[rgb(var(--text-muted))]">cu termen depășit</span></span>
      {Object.keys(model.exposure).length ? <span className="flex flex-wrap gap-x-2"><span className="text-[rgb(var(--text-muted))]">Expunere estimată</span>{Object.entries(model.exposure).map(([currency, amount]) => <strong className="tabular-nums" key={currency}>{formatProductCurrency(amount, currency)}</strong>)}</span> : null}
    </div>
    <ControlCenterVisuals cases={model.cases} fx={fx} asOf={asOf}/>
    {model.sourceState === "fallback" ? <p role="status" className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">Afișăm evaluarea disponibilă din înregistrări. Pregătirea intervențiilor nu este disponibilă momentan.</p> : null}
    <div role="group" aria-label="Filtrează situațiile" className="flex flex-wrap gap-1 border-b border-[rgb(var(--border))] py-3">
      {filters.map((option) => <button key={option.id} type="button" aria-pressed={filter === option.id} onClick={() => setFilter(option.id)}
        className={cn("focus-ring inline-flex h-[var(--control-height)] items-center rounded-control px-3 text-xs transition-colors duration-fast", filter === option.id ? "bg-[rgb(var(--surface-elevated))] font-semibold text-[rgb(var(--foreground))]" : "text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface))]")}>{option.label}<span className="ml-1.5 text-metadata tabular-nums text-[rgb(var(--text-muted))]">{model.cases.filter((item) => matches(item, option.id)).length}</span></button>)}
    </div>
    {visible.length ? <div className="grid min-w-0 border-b border-[rgb(var(--border))] lg:grid-cols-[minmax(0,1.1fr)_minmax(350px,1fr)]">
      <div className="min-w-0 lg:max-h-[min(720px,65vh)] lg:overflow-y-auto lg:overscroll-contain">
        <p className="px-3 py-3 text-metadata text-[rgb(var(--text-muted))]">Ordine de intervenție · selectează un caz</p>
        <ul aria-label="Coada de execuție comercială" className="divide-y divide-[rgb(var(--border))]">{visible.map((item) => <li key={item.id}>
          <button type="button" aria-pressed={selected?.id === item.id} aria-controls="execution-case-detail" onClick={() => setSelectedId(item.id)}
            className={cn("focus-ring relative flex w-full min-w-0 gap-3 border-l-2 px-3.5 py-4 text-left transition-colors duration-fast", selected?.id === item.id ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary-soft))]" : "border-transparent hover:bg-[rgb(var(--surface))]")}>
            <span aria-label={item.severity === "critical" ? "Prioritate critică" : item.severity === "attention" ? "Necesită atenție" : "De urmărit"} className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", item.severity === "critical" ? "bg-[rgb(var(--danger-text))]" : item.severity === "attention" ? "bg-[rgb(var(--warning-text))]" : "bg-[rgb(var(--text-muted))]")} />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-3"><span title={item.organization} className="truncate text-sm font-semibold">{item.organization}</span><span className="shrink-0 text-xs font-medium tabular-nums">{formatProductCurrency(item.value, item.currency)}</span></span>
              <span title={item.opportunityTitle} className="mt-0.5 block truncate text-xs text-[rgb(var(--text-secondary))]">{item.opportunityTitle}</span>
              <span className="mt-2 block text-xs leading-5">{item.primaryReason}</span>
              <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-metadata text-[rgb(var(--text-muted))]"><span>{item.owner.name}</span>
                {item.overdue ? <span>{item.overdueDays ? "Restant · " + item.overdueDays + (item.overdueDays === 1 ? " zi" : " zile") : "Termen depășit"}</span> : null}
                <CaseReadiness owner={Boolean(item.owner.id)} action={Boolean(item.nextAction)} dated={Boolean(item.nextAction?.dueAt)} overdue={item.overdue} evidence={item.evidence.length}/>
              </span>
            </span>
            <ChevronRightIcon aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 text-[rgb(var(--text-muted))]" />
          </button>
        </li>)}</ul>
      </div>
      <div key={selected?.id} id="execution-case-detail" className="min-w-0 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface))] lg:max-h-[min(720px,65vh)] lg:overflow-y-auto lg:overscroll-contain lg:border-l lg:border-t-0">
        <p role="status" className="sr-only">{selected ? "Caz selectat: " + selected.organization + " — " + selected.opportunityTitle : ""}</p>
        {selected ? <CaseDetail key={selected.id} item={selected} impactHref={impactLinks[selected.opportunityId]} /> : null}
      </div>
    </div> : <div className="border-b border-[rgb(var(--border))] py-10">
      <h2 className="text-sm font-semibold">{model.cases.length ? "Nicio situație în acest filtru." : "Nicio intervenție în coada disponibilă."}</h2>
      <p className="mt-2 text-xs text-[rgb(var(--text-muted))]">{model.cases.length ? "Alege Toate pentru restul situațiilor comerciale." : "Poți continua lucrul din oportunități sau verifica semnalele de mai jos."}</p>
    </div>}
    {model.waitingCount > 0 ? <p className="mt-3 text-xs text-[rgb(var(--text-muted))]">{model.waitingCount} {model.waitingCount === 1 ? "situație așteaptă" : "situații așteaptă"} clientul în fereastra de răspuns. Fără revenire prematură.</p> : null}
  </section>;
}
