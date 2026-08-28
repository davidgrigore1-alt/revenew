"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircleIcon, ChevronRightIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import type { CopilotMultiRecordPlanPreview, CopilotMultiRecordResult } from "@/lib/ai/copilot-types";
import type { AskActionProposal } from "@/lib/ai/action-planner";
import { Button } from "@/components/ui/Button";
import { formatProductCurrency, presentExecutionState } from "@/lib/ui/presentation";

export function MultiRecordResultView({ result, onSelectionChange, onAsk }: { result: CopilotMultiRecordResult; onSelectionChange: (resultSetId: string, ids: string[]) => void; onAsk: (question: string) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((value) => value !== id) : selected.length < result.maxSelection ? [...selected, id] : selected;
    setSelected(next); onSelectionChange(result.resultSetId, next);
  }
  return <section className="mt-5 overflow-hidden rounded-panel border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))]" aria-label="Selecție oportunități">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgb(var(--border))] px-4 py-3">
      <div><h5 className="text-sm font-semibold text-[rgb(var(--foreground))]">{result.title}</h5><p className="mt-0.5 text-xs text-[rgb(var(--text-muted))]">{result.summary} · selectate {selected.length}/{result.maxSelection}</p></div>
      <div className="flex flex-wrap gap-2">{result.totals.map((total) => <span key={total.currency} className="text-xs font-semibold tabular-nums text-[rgb(var(--text-secondary))]">{formatProductCurrency(total.estimatedValue, total.currency)} <span className="font-normal text-[rgb(var(--text-faint))]">estimat</span></span>)}</div>
    </header>
    <div className="divide-y divide-[rgb(var(--border)/0.76)]">{result.records.map((record) => { const state = presentExecutionState(record.executionState); return <div key={record.id} className={`grid min-h-16 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 transition-colors ${selected.includes(record.id) ? "bg-[rgb(var(--primary)/0.055)] shadow-[inset_3px_0_0_rgb(var(--primary)/0.72)]" : "hover:bg-[rgb(var(--surface-subtle))]"}`}>
      <label
        className="group grid h-8 w-8 cursor-pointer place-items-center rounded-[8px] transition-colors hover:bg-white/[0.035]"
        aria-label={`Selectează ${record.title}`}
      >
        <input
          type="checkbox"
          checked={selected.includes(record.id)}
          onChange={() => toggle(record.id)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="grid h-[18px] w-[18px] place-items-center rounded-[5px] border border-white/[0.18] bg-[#1a1a1a] text-[11px] font-black leading-none text-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_1px_2px_rgba(0,0,0,0.35)] transition-all duration-150 group-hover:border-white/[0.30] group-hover:bg-[#202020] peer-focus-visible:ring-2 peer-focus-visible:ring-[rgb(var(--primary)/0.34)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[rgb(var(--surface))] peer-checked:border-[rgb(var(--primary))] peer-checked:bg-[rgb(var(--primary))] peer-checked:text-black peer-checked:shadow-[0_0_0_1px_rgb(var(--primary)/0.16),0_2px_7px_rgba(0,0,0,0.34)]"
        >
          ✓
        </span>
      </label>
      <div className="min-w-0"><Link href={record.route} className="focus-ring block truncate rounded-button text-sm font-semibold text-[rgb(var(--foreground))] hover:text-[rgb(var(--primary))]">{record.title}</Link><p className="mt-0.5 truncate text-xs text-[rgb(var(--text-muted))]">{record.company ?? "Companie neconfirmată"} · {record.ownerName ?? "Responsabil neatribuit"}</p><p className="mt-1 line-clamp-1 text-[0.6875rem] text-[rgb(var(--text-faint))]">{state.label} · {record.executionReason}</p></div>
      <div className="text-right"><p className="text-xs font-semibold tabular-nums text-[rgb(var(--foreground))]">{formatProductCurrency(record.estimatedValue, record.currency)}</p><p className="mt-1 text-[0.6875rem] text-[rgb(var(--text-faint))]">{record.responseAgeDays == null ? "Răspuns neconfirmat" : `${record.responseAgeDays} zile fără răspuns`}</p></div>
    </div>; })}</div>
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-3"><p className="text-xs text-[rgb(var(--text-muted))]">Selecția rămâne editabilă. Nicio acțiune nu este executată din listă.</p><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" size="small" onClick={() => onAsk("Creează task-uri interne pentru selecția curentă.")}>Pregătește task-uri</Button><Button type="button" size="small" onClick={() => onAsk("Pregătește follow-up pentru selecția curentă.")}>Pregătește follow-up</Button></div></footer>
  </section>;
}

type PreparedItem = { recordId: string; planId: string; replay: boolean; proposal: AskActionProposal; actionType: string; title: string };
type PrepareResponse = { prepared: PreparedItem[]; skipped: Array<{ recordId: string; reason: string }>; externalSend: false; sentCount: 0 };
export function MultiRecordPlanView({ preview }: { preview: CopilotMultiRecordPlanPreview }) {
  const [submitting, setSubmitting] = useState(false); const [response, setResponse] = useState<PrepareResponse | null>(null); const [error, setError] = useState("");
  const [proposals, setProposals] = useState<Record<string, AskActionProposal>>({}); const [approved, setApproved] = useState<Record<string, "done" | "failed">>({});
  async function prepare() {
    if (submitting || response) return;

    setSubmitting(true);
    setError("");

    try {
      const request = await fetch("/api/ai/multi-record-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultSetId: preview.resultSetId,
          confirmationId: preview.confirmationId,
          actionType: preview.actionType,
          selectedRecordIds: preview.selectedRecordIds,
        }),
      });

      const payload = (await request.json()) as PrepareResponse | { error?: string };

      if (!request.ok || !("prepared" in payload)) {
        const errorMessage = "error" in payload ? payload.error : undefined;
        throw new Error(errorMessage || "Planurile nu au putut fi pregătite.");
      }

      setResponse(payload);
      setProposals(
        Object.fromEntries(
          payload.prepared.map((item) => [item.planId, item.proposal]),
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Planurile nu au putut fi pregătite.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function approve(item: PreparedItem) {
    if (approved[item.planId]) return;
    try { const request = await fetch(`/api/ai/action-plans/${item.planId}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proposal: proposals[item.planId] ?? item.proposal }) }); if (!request.ok) { const payload = await request.json() as { error?: string }; throw new Error(payload.error || "Acțiunea nu a putut fi aplicată."); } setApproved((current) => ({ ...current, [item.planId]: "done" })); }
    catch { setApproved((current) => ({ ...current, [item.planId]: "failed" })); }
  }

  return <section className="mt-5 overflow-hidden rounded-panel border border-[rgb(var(--primary)/0.34)] bg-[rgb(var(--surface))]" aria-label="Plan multi-record">
    <header className="flex items-start gap-3 border-b border-[rgb(var(--border))] px-4 py-3"><ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" /><div><h5 className="text-sm font-semibold">Plan comercial multi-record</h5><p className="mt-0.5 text-xs leading-5 text-[rgb(var(--text-muted))]">{preview.summary}</p></div></header>
    {!response ? <div className="px-4 py-4"><div className="grid divide-y divide-[rgb(var(--border))]">{preview.records.map((record) => <div key={record.id} className="flex items-center justify-between gap-3 py-2"><span className="truncate text-sm font-medium">{record.title}</span><span className="text-xs text-[rgb(var(--text-muted))]">{preview.actionType === "prepare_email" ? "Draft email" : "Acțiune internă"}</span></div>)}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[rgb(var(--text-muted))]">{preview.actionType === "prepare_email" ? "Emailuri trimise: 0. După confirmare se pregătesc numai drafturi." : "Fiecare țintă va primi propriul Safe Action Plan."}</p><Button type="button" size="small" loading={submitting} onClick={() => void prepare()}>Pregătește planurile</Button></div>{error ? <p className="mt-3 text-xs text-[rgb(var(--danger-text))]" role="alert">{error}</p> : null}</div> : <div>
      <div className="divide-y divide-[rgb(var(--border))]">{response.prepared.map((item) => { const proposal = proposals[item.planId] ?? item.proposal; return <div key={item.planId} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><p className="text-sm font-semibold">{item.title}</p><input value={proposal.title ?? proposal.subject ?? ""} onChange={(event) => setProposals((current) => ({ ...current, [item.planId]: { ...proposal, ...(item.actionType === "prepare_email" ? { subject: event.target.value } : { title: event.target.value }) } }))} className="focus-ring mt-2 min-h-9 w-full rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] px-3 text-xs" aria-label={`Titlu pentru ${item.title}`} />{item.actionType === "prepare_email" ? <textarea value={proposal.body ?? ""} onChange={(event) => setProposals((current) => ({ ...current, [item.planId]: { ...proposal, body: event.target.value } }))} rows={3} className="focus-ring mt-2 w-full resize-y rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] px-3 py-2 text-xs leading-5" aria-label={`Mesaj pentru ${item.title}`} /> : null}</div><div className="flex items-center gap-2">{approved[item.planId] === "done" ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-[rgb(var(--success-text))]"><CheckCircleIcon className="h-4 w-4" />{item.actionType === "prepare_email" ? "Draft pregătit" : "Aplicat"}</span> : <Button type="button" variant="secondary" size="small" onClick={() => void approve(item)}>{approved[item.planId] === "failed" ? "Reîncearcă" : item.actionType === "prepare_email" ? "Confirmă draftul" : "Aprobă"}<ChevronRightIcon className="h-3.5 w-3.5" /></Button>}</div></div>; })}</div>
      {response.skipped.length ? <div className="border-t border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] px-4 py-3"><p className="text-xs font-semibold text-[rgb(var(--warning-text))]">Omise în siguranță · {response.skipped.length}</p>{response.skipped.map((item) => <p key={item.recordId} className="mt-1 text-xs text-[rgb(var(--text-muted))]">{item.reason}</p>)}</div> : null}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-3"><p className="text-xs text-[rgb(var(--text-muted))]">Pregătite {response.prepared.length} · omise {response.skipped.length} · trimise {response.sentCount}</p><span className="text-xs text-[rgb(var(--text-faint))]">Aprobarea se face separat pentru fiecare înregistrare.</span></footer>
    </div>}
  </section>;
}
