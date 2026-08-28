"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, ChevronDownIcon, CheckCircleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { IntegrationBrandIcon } from "@/components/ui/IntegrationBrandIcon";
import { PreparedActionCard } from "@/components/intelligence/CopilotConversation";
import { formatProductCurrency, formatProductDateTime, formatProductTime } from "@/lib/ui/presentation";
import type { InterventionBrief, InterventionView } from "@/lib/commercial-interventions-server";
import type { CopilotPreparedAction } from "@/lib/ai/copilot-types";

const priorities = { critical: "Critică", important: "Importantă", watch: "De urmărit" };
const stages: Record<string, string> = { lead: "Prospect", qualified: "Calificată", proposal: "Ofertă" };
const tone = { critical: "text-[rgb(var(--danger-text))]", important: "text-[rgb(var(--warning-text))]", watch: "text-[rgb(var(--text-muted))]" };
function amount(value: number, currency: string) {
  return formatProductCurrency(value, currency);
}

export function InterventionRow({ item, index, compact = false }: { item: InterventionView; index: number; compact?: boolean }) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [action, setAction] = useState<CopilotPreparedAction | null>(null);
  const pending = useRef(false);
  const request = useRef<AbortController | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  useEffect(() => () => request.current?.abort(), []);
  async function prepare() {
    if (pending.current || action) return;
    pending.current = true; setBusy(true); setError("");
    const controller = new AbortController(); request.current = controller;
    try {
      const response = await fetch("/api/ai/interventions", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ operation: "prepare", opportunityId: item.opportunityId, version: item.version }) });
      const data = await response.json() as { action?: CopilotPreparedAction; error?: string };
      if (!response.ok || !data.action) { setError(data.error || "Nu am putut pregăti intervenția. Actualizează contextul și încearcă din nou."); return; }
      setAction(data.action);
    } catch { if (!controller.signal.aborted) setError("Conexiunea a fost întreruptă. Reîncercarea recuperează același plan, fără a duplica acțiunea."); }
    finally { pending.current = false; if (!controller.signal.aborted) setBusy(false); }
  }
  return <li className="border-b border-[rgb(var(--border))]" onKeyDown={(event) => { if (event.key === "Escape" && open) { event.stopPropagation(); setOpen(false); trigger.current?.focus(); } }}>
    <div className={`grid gap-3 px-1 py-4 lg:grid-cols-[28px_minmax(0,1fr)_auto] lg:gap-4 ${open ? "bg-[rgb(var(--surface-subtle))]" : ""}`}>
      <span className={`pt-0.5 text-xs font-semibold tabular-nums ${tone[item.priority]}`} aria-label={priorities[item.priority]}>{String(index + 1).padStart(2, "0")}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><h3 className="break-words text-sm font-semibold">{item.company}</h3><span className={`text-xs font-medium ${tone[item.priority]}`}>{priorities[item.priority]}</span></div>
        <p className="mt-0.5 break-words text-xs text-[rgb(var(--text-muted))]">{item.title}</p>
        <p className="mt-2 max-w-3xl text-sm leading-5">{item.summary}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[rgb(var(--text-muted))]">
          {item.estimatedExposure !== null ? <span className="tabular-nums">{amount(item.estimatedExposure, item.currency)} <span>estimat</span></span> : <span>Expunere neconfirmată</span>}
          <span>{item.owner}</span>{item.meetingAt ? <span>Întâlnire · {formatProductDateTime(item.meetingAt, { year: false })}</span> : null}
        </div>
      </div>
      <div className="flex items-start lg:pt-1"><button ref={trigger} type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)} className="focus-ring inline-flex min-h-8 items-center gap-2 rounded-control border border-[rgb(var(--border))] px-3 text-xs font-semibold transition-colors hover:bg-[rgb(var(--surface-elevated))] motion-reduce:transition-none">{open ? "Închide detaliile" : "Revizuiește intervenția"}<ChevronDownIcon className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden="true" /></button></div>
    </div>
    <section id={panelId} hidden={!open} aria-label={`Intervenție · ${item.company}`} className="border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-5 lg:ml-11">
      <p className="mb-4 text-xs leading-5 text-[rgb(var(--text-muted))]">De ce este prioritară: {item.rankingReasons.join(" ")}</p>
      <div className={compact ? "grid gap-5" : "grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(240px,.55fr)]"}>
        <div><h4 className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Ce s-a schimbat · de ce acum</h4><ul className="mt-3 space-y-2">{item.reasons.map((reason) => <li key={reason.type} className="text-sm leading-5">{reason.label}{reason.at ? <time dateTime={reason.at} className="mt-0.5 block text-xs text-[rgb(var(--text-muted))]">{formatProductDateTime(reason.at)}</time> : null}</li>)}</ul></div>
        <div className="border-l border-[rgb(var(--border))] pl-4"><h4 className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">Următorul pas sigur</h4><p className="mt-3 text-sm font-medium leading-5">{item.recommendation}</p><p className="mt-2 text-xs text-[rgb(var(--text-muted))]">{stages[item.stage] ?? "Oportunitate activă"} · {item.owner}</p>
          <div className="mt-4">{item.reviewHref ? <Button href={item.reviewHref} size="small">Revizuiește înregistrarea<ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" /></Button> : !action ? <Button size="small" loading={busy} onClick={() => void prepare()}>{busy ? "Verific și pregătesc…" : "Pregătește intervenția"}</Button> : <p className="text-xs text-[rgb(var(--text-muted))]">Revizuiește propunerea de mai jos.</p>}</div>
          <p className="mt-3 flex gap-1.5 text-xs leading-5 text-[rgb(var(--text-muted))]"><ShieldCheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />Pregătirea nu trimite mesaje și nu modifică oportunitatea.</p>
        </div>
      </div>
      <details className="group mt-5 border-y border-[rgb(var(--border))]"><summary className="focus-ring flex min-h-9 cursor-pointer list-none items-center gap-2 text-xs font-semibold"><ChevronDownIcon className="h-3.5 w-3.5 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />Dovezi · {item.evidence.length} surse</summary><ul className="divide-y divide-[rgb(var(--border))]">{item.evidence.map((source) => <li key={source.id}><Link href={source.href} className="focus-ring flex items-center gap-3 py-2 text-xs hover:text-[rgb(var(--primary))]">{source.source !== "crm" ? <IntegrationBrandIcon provider={source.source === "gmail" ? "gmail" : "google_calendar"} size="small" withContainer={false} className="shrink-0" /> : <ShieldCheckIcon className="h-4 w-4 shrink-0" aria-hidden="true" />}<span className="min-w-0 break-words">{source.label}</span>{source.at ? <time className="ml-auto shrink-0 text-[rgb(var(--text-muted))]" dateTime={source.at}>{formatProductDateTime(source.at, { year: false })}</time> : null}</Link></li>)}</ul></details>
      {error ? <div role="alert" className="mt-4 text-sm text-[rgb(var(--danger-text))]"><p>{error}</p><button type="button" className="focus-ring mt-2 rounded text-xs font-semibold underline" onClick={() => router.refresh()}>Actualizează intervențiile</button></div> : null}
      {action ? <PreparedActionCard action={action} approvalEndpoint="/api/ai/interventions" approvalContext={{ operation: "approve", opportunityId: item.opportunityId, version: item.version }} completionHref={action.actionType === "prepare_email" ? item.evidence.find((source) => source.label === "Gmail · ultimul mesaj primit")?.href : `/opportunities/${item.opportunityId}`} /> : null}
      <Link href={`/opportunities/${item.opportunityId}`} className="focus-ring mt-4 inline-flex rounded text-xs font-semibold text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))]">Deschide oportunitatea →</Link>
    </section>
  </li>;
}

export function CommercialInterventions({ brief }: { brief: InterventionBrief }) {
  const [showAll, setShowAll] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const router = useRouter();
  const critical = brief.items.filter((item) => item.priority === "critical").length;
  const important = brief.items.filter((item) => item.priority === "important").length;
  return <section aria-labelledby="commercial-interventions-title" aria-busy={refreshing}>
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgb(var(--border))] pb-5">
      <div><p className="text-xs font-semibold uppercase tracking-[.12em] text-[rgb(var(--primary))]">Intervenții comerciale</p><h1 id="commercial-interventions-title" className="mt-2 text-2xl font-semibold tracking-tight">{brief.items.length ? `${brief.items.length} ${brief.items.length === 1 ? "intervenție merită" : "intervenții merită"} atenția ta.` : "Nicio intervenție identificată în datele disponibile."}</h1>
        {brief.items.length ? <p className="mt-2 text-xs text-[rgb(var(--text-muted))]">{critical} {critical === 1 ? "critică" : "critice"} · {important} {important === 1 ? "importantă" : "importante"} · {brief.items.length - critical - important} de urmărit</p> : null}
      </div><div className="text-xs text-[rgb(var(--text-muted))]"><time dateTime={brief.checkedAt}>Evaluat la {formatProductTime(brief.checkedAt)}</time><button type="button" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())} className="focus-ring ml-3 rounded font-semibold hover:text-[rgb(var(--foreground))]">{refreshing ? "Actualizez…" : "Actualizează"}</button></div>
    </header>
    {brief.items.length ? <><div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-[rgb(var(--border))] py-3 text-xs"><span className="text-[rgb(var(--text-muted))]">Expunere estimată · nu venit confirmat</span>{Object.entries(brief.exposure).sort(([a], [b]) => a.localeCompare(b)).map(([currency, value]) => <span key={currency} className="font-semibold tabular-nums">{amount(value, currency)}</span>)}</div><ol>{brief.items.slice(0, showAll ? undefined : 5).map((item, index) => <InterventionRow key={`${item.id}:${item.version}`} item={item} index={index} />)}</ol>{brief.items.length > 5 ? <button type="button" aria-expanded={showAll} onClick={() => setShowAll(!showAll)} className="focus-ring mt-3 rounded text-xs font-semibold text-[rgb(var(--text-muted))]">{showAll ? "Arată doar primele 5" : `Vezi toate cele ${brief.items.length} intervenții`}</button> : null}</>
    : <p className="flex items-center gap-2 py-6 text-sm text-[rgb(var(--text-muted))]"><CheckCircleIcon className="h-5 w-5" aria-hidden="true" />Nu există un pas urgent identificat. Lista se actualizează pe baza datelor disponibile.</p>}
    <footer className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{brief.waitingCount ? <span>{brief.waitingCount} {brief.waitingCount === 1 ? "oportunitate așteaptă" : "oportunități așteaptă"} clientul în fereastra de răspuns.</span> : null}<span>{brief.externalState === "available" ? "Include sursele Google sincronizate autorizate pentru tine." : brief.externalState === "not_connected" ? "Context CRM disponibil. Conectează Google pentru conversații și întâlniri." : "Context Google parțial sau indisponibil. Evaluarea poate fi incompletă."}</span><Link href="/apps" className="focus-ring rounded underline">Starea surselor</Link></footer>
  </section>;
}
