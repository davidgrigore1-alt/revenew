"use client";

import Link from "next/link";
import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowRightIcon, BookOpenIcon, CheckIcon, ChevronDownIcon, ClockIcon, DocumentTextIcon, ShieldCheckIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import type { CopilotAnswer, CopilotConversationTurn, CopilotPageContext, CopilotSelectionContext } from "@/lib/ai/copilot-types";
import { CommercialTruthSnapshot } from "@/components/commercial-truth/CommercialTruthSnapshot";
import { CopilotResultCards } from "@/components/intelligence/CopilotResultCards";
import { WorkflowDraftPreview } from "@/components/intelligence/WorkflowDraftPreview";
import { MultiRecordPlanView, MultiRecordResultView } from "@/components/intelligence/MultiRecordPlanning";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { formatProductDateTime, formatProductTime, formatUserFacingText, presentSourceIdentity } from "@/lib/ui/presentation";
import { applicationDateKey, applicationLocalDateTimeToIso } from "@/lib/opportunity-domain";
import { isWorkflowDraftRequest } from "@/lib/workflow-drafting";

type ConversationItem = { id: string; question: string; answer: CopilotAnswer };
const progressStages = ["Verific contextul autorizat", "Caut informația relevantă", "Pregătesc răspunsul"] as const;
const workflowProgressStages = ["Interpretez regula comercială", "Verific pașii suportați", "Pregătesc preview-ul"] as const;


export function contextForPath(pathname: string, lockedContext?: Partial<CopilotPageContext>, contextLabel?: string): CopilotPageContext {
  const companyMatch = pathname.match(/^\/crm\/organizations\/([0-9a-z-]+)/i);
  const opportunityMatch = pathname.match(/^\/opportunities\/([0-9a-z-]+)/i);
  const contactMatch = pathname.match(/^\/crm\/contacts\/([0-9a-z-]+)/i);
  const pageType = lockedContext?.pageType ?? (companyMatch ? "company" : opportunityMatch ? "opportunity" : pathname === "/dashboard" ? "dashboard" : pathname === "/ai" ? "ai" : "other");
  return {
    route: pathname,
    pageType,
    ...(lockedContext?.organizationId ?? companyMatch?.[1] ? { organizationId: lockedContext?.organizationId ?? companyMatch?.[1] } : {}),
    ...(lockedContext?.opportunityId ?? opportunityMatch?.[1] ? { opportunityId: lockedContext?.opportunityId ?? opportunityMatch?.[1] } : {}),
    ...(lockedContext?.selectedRecordId ? { selectedRecordId: lockedContext.selectedRecordId } : {}),
    ...(lockedContext?.contactId ?? contactMatch?.[1] ? { contactId: lockedContext?.contactId ?? contactMatch?.[1] } : {}),
    ...((contextLabel ?? (contactMatch ? "Contactul curent" : pathname === "/inbox" ? lockedContext?.selectedRecordId ? "Emailul selectat · context privat" : "Inbox Comercial · context privat" : undefined)) ? { contextLabel: contextLabel ?? (contactMatch ? "Contactul curent" : lockedContext?.selectedRecordId ? "Emailul selectat · context privat" : "Inbox Comercial · context privat") } : {})
  };
}

export function suggestionsFor(context: CopilotPageContext) {
  if (context.contactId) return ["Care este ultima interacțiune relevantă?", "Ce oportunități sunt asociate?", "Există ceva care necesită răspuns?"];
  if (context.route === "/inbox") return context.selectedRecordId ? ["Rezumă conversația.", "De ce contează comercial?", "Există o oportunitate asociată?", "Pregătește un răspuns."] : ["Ce emailuri recente contează?", "Ce conversații sunt legate de oportunități?"];
  if (context.pageType === "company") return ["Ce se întâmplă cu această companie?", "Ce oportunități necesită atenție?", "Ce conversații recente contează?", "Ce trebuie făcut mai departe?"];
  if (context.pageType === "opportunity") return ["Ce blochează această oportunitate?", "Ce s-a schimbat recent?", "Care este următorul pas sigur?", "Pregătește următorul pas."];
  if (context.pageType === "dashboard" || context.pageType === "ai") return ["Ce necesită atenție astăzi?", "Ce s-a schimbat recent?", "Ce oportunități nu au următor pas?", "Unde avem valoare expusă?"];
  return ["Arată-mi top 5 oportunități după valoare.", "Ce follow-up-uri sunt restante?", "Ce oportunități nu au următor pas?", "Ce s-a schimbat recent?", "Explică această pagină."];
}

export function PreparedActionCard({ action, approvalEndpoint, approvalContext, completionHref, provenance }: { action: NonNullable<CopilotAnswer["preparedAction"]>; approvalEndpoint?: string; approvalContext?: Record<string, string>; completionHref?: string; provenance?: { label: string; href: string } }) {
  const initial = action.proposal ?? {};
  const [subject, setSubject] = useState(action.subject ?? "");
  const [body, setBody] = useState(action.body ?? "");
  const [dueAt, setDueAt] = useState(typeof initial.dueAt === "string" && Number.isFinite(Date.parse(initial.dueAt)) ? `${applicationDateKey(new Date(initial.dueAt))}T${formatProductTime(initial.dueAt)}` : "");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"" | "success" | "replay">("");
  const [actionError, setActionError] = useState("");

  async function approve() {
    if (!action.planId || submitting || result) return;
    setSubmitting(true); setActionError("");
    const proposal: Record<string, unknown> = { ...initial };
    if (action.actionType === "create_task" || action.actionType === "update_next_action") {
      const [date, time] = dueAt.split("T");
      const instant = dueAt ? applicationLocalDateTimeToIso(date, time) : null;
      if ((approvalContext && !instant) || (dueAt && (!instant || Date.parse(instant) <= Date.now()))) { setActionError("Alege un termen viitor în fusul orar al produsului."); setSubmitting(false); return; }
      proposal.title = subject; proposal.description = body; proposal.dueAt = instant;
    }
    else if (action.actionType === "add_note") proposal.note = body;
    else if (action.actionType === "prepare_email") { proposal.subject = subject; proposal.body = body; }
    try {
      const response = await fetch(approvalEndpoint ?? `/api/ai/action-plans/${action.planId}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...approvalContext, planId: action.planId, proposal }) });
      const payload = await response.json() as { ok?: boolean; replay?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Acțiunea nu a putut fi aplicată.");
      setResult(payload.replay ? "replay" : "success");
    } catch (error) { setActionError(error instanceof Error ? error.message : "Acțiunea nu a putut fi aplicată."); }
    finally { setSubmitting(false); }
  }

  const editableText = action.actionType === "create_task" || action.actionType === "update_next_action" || action.actionType === "add_note" || action.type === "email_draft";
  return (
    <section className="mt-5 overflow-hidden rounded-panel border border-[rgb(var(--primary-border))] bg-[rgb(var(--surface-elevated))]" aria-label={action.title}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgb(var(--border))] px-4 py-3.5">
        <div className="flex min-w-0 items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-control bg-[rgb(var(--primary-soft))] text-[rgb(var(--primary))]"><DocumentTextIcon className="h-4 w-4" aria-hidden="true" /></span><div className="min-w-0"><p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--primary))]">Acțiune pregătită</p><h4 className="mt-1 text-sm font-semibold text-[rgb(var(--foreground))]">{action.title}</h4><p className="mt-0.5 truncate text-xs text-[rgb(var(--text-muted))]">{action.target?.label ?? "Context autorizat"}</p></div></div>
        <span className="status-pill status-pill-warning">{action.riskLevel === "external" ? "Efect extern" : action.riskLevel === "review" ? "Necesită revizuire" : "Risc redus"}</span>
      </header>
      {provenance ? <Link href={provenance.href} className="focus-ring mx-4 mt-3 block text-xs text-[rgb(var(--text-muted))]">Generat de workflow · {provenance.label} →</Link> : null}
      <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="grid gap-3">
          {(action.actionType === "create_task" || action.actionType === "update_next_action" || action.type === "email_draft") ? <label className="grid gap-1 text-xs font-semibold text-[rgb(var(--text-secondary))]">{action.type === "email_draft" ? "Subiect" : "Titlu"}<input value={subject} onChange={(event) => setSubject(event.target.value.slice(0, 500))} disabled={Boolean(result)} className="focus-ring min-h-9 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm font-normal" /></label> : null}
          {editableText ? <label className="grid gap-1 text-xs font-semibold text-[rgb(var(--text-secondary))]">{action.actionType === "add_note" ? "Notă" : action.type === "email_draft" ? "Mesaj" : "Context"}<textarea value={body} onChange={(event) => setBody(event.target.value.slice(0, action.type === "email_draft" ? 100000 : 5000))} disabled={Boolean(result)} rows={action.type === "email_draft" ? 7 : 4} className="focus-ring resize-y rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-normal leading-5" /></label> : <p className="whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--text-secondary))]">{body || subject}</p>}
          {(action.actionType === "create_task" || action.actionType === "update_next_action") ? <label className="grid max-w-xs gap-1 text-xs font-semibold text-[rgb(var(--text-secondary))]">Termen propus · confirmă sau modifică<input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} disabled={Boolean(result)} className="focus-ring min-h-9 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm font-normal" /><span className="font-normal text-[rgb(var(--text-muted))]">Ora București · pas nou, nu termenul istoric</span></label> : null}
          <p className="text-xs leading-5 text-[rgb(var(--text-muted))]">{action.rationale}</p>
        </div>
        <aside className="border-t border-[rgb(var(--border))] pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0"><p className="flex items-center gap-1.5 text-xs font-semibold"><ShieldCheckIcon className="h-4 w-4 text-[rgb(var(--primary))]" aria-hidden="true" />Control înainte de aplicare</p><p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{action.executionNotice}</p><p className="mt-3 text-xs text-[rgb(var(--text-muted))]">Se modifică doar înregistrarea indicată. Accesul extern și celelalte câmpuri rămân neschimbate.</p></aside>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-3">
        <p className="text-xs text-[rgb(var(--text-muted))]">{result ? (result === "replay" ? "Acțiunea era deja aplicată. Nu a fost executată din nou." : "Acțiune aplicată și înregistrată în audit.") : action.ownerResolutionRequired ? "Responsabilul trebuie selectat explicit înainte de aprobare." : "Pregătit · neexecutat · editabil"}</p>
        {action.planId ? <Button type="button" size="small" loading={submitting} disabled={Boolean(result) || action.ownerResolutionRequired} onClick={() => void approve()}>{result ? "Aplicat" : "Aprobă și aplică"}</Button> : null}
        {result && completionHref ? <Link href={completionHref} className="focus-ring rounded text-xs font-semibold text-[rgb(var(--primary))]">{action.actionType === "prepare_email" ? "Deschide conversația și draftul" : "Deschide oportunitatea"} →</Link> : null}
        {actionError ? <p className="w-full text-xs text-[rgb(var(--danger-text))]" role="alert">{actionError}</p> : null}
      </footer>
    </section>
  );
}
export function CopilotConversation({ className, lockedContext, contextLabel, autoFocus = false, initialSuggestions, initialQuestion = "" }: { className?: string; lockedContext?: Partial<CopilotPageContext>; contextLabel?: string; autoFocus?: boolean; initialSuggestions?: string[]; initialQuestion?: string }) {
  const pathname = usePathname();

  const inputId = useId();
  const pageContext = useMemo(() => contextForPath(pathname, lockedContext, contextLabel), [contextLabel, lockedContext, pathname]);
  const [scope,setScope]=useState<"current"|"workspace">("current");
  const context=scope==="workspace"?{route:"/ai",pageType:"ai" as const,contextLabel:"Workspace autorizat"}:pageContext;
  const suggestions = initialSuggestions ?? suggestionsFor(context);
  useEffect(()=>{setScope("current");},[pathname]);
  const [question, setQuestion] = useState(initialQuestion.slice(0, 3000));
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [revealStep, setRevealStep] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selection, setSelection] = useState<CopilotSelectionContext | undefined>(undefined);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const activeProgressStages = isWorkflowDraftRequest(question) ? workflowProgressStages : progressStages;

  useEffect(() => {
    if (autoFocus) window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [autoFocus]);

  useEffect(() => {
    if (!loading) { setProgressIndex(0); return; }
    const timer = window.setInterval(() => setProgressIndex((current) => Math.min(current + 1, progressStages.length - 1)), 900);
    return () => window.clearInterval(timer);
  }, [loading]);

  const activeResponseId = conversation[0]?.id;
  useEffect(() => {
    if (!activeResponseId) return;
    setRevealStep(1);
    const cardsTimer = window.setTimeout(() => setRevealStep(2), 120);
    const detailsTimer = window.setTimeout(() => setRevealStep(3), 320);
    return () => { window.clearTimeout(cardsTimer); window.clearTimeout(detailsTimer); };
  }, [activeResponseId]);

  async function ask(value: string) {
    const normalized = value.trim();
    if (normalized.length < 2 || loading) return;
    setQuestion(normalized);
    setLoading(true);
    setError("");
    const history: CopilotConversationTurn[] = conversation.slice(0, 4).reverse().flatMap((item) => [{ role: "user" as const, content: item.question }, { role: "assistant" as const, content: item.answer.answer }]);
    try {
      const response = await fetch("/api/ai/copilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: normalized, context, history, ...(selection ? { selection } : {}) }) });
      const payload = await response.json() as CopilotAnswer | { error?: string };
      if (!response.ok || !("answer" in payload)) throw new Error("Nu am putut finaliza verificarea. Datele și acțiunile existente au rămas neschimbate.");
      if (payload.multiRecordResult) setSelection({ resultSetId: payload.multiRecordResult.resultSetId, selectedRecordIds: [] });
      setConversation((current) => [{ id: `${Date.now()}-${current.length}`, question: normalized, answer: payload }, ...current].slice(0, 8));
      setQuestion("");
    } catch (requestError) {
      setError(requestError instanceof Error && requestError.message ? requestError.message : "Nu am putut finaliza verificarea. Datele și acțiunile existente au rămas neschimbate.");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  const previousCount = loading ? conversation.length : Math.max(0, conversation.length - 1);
  return (
    <div className={cn("grid min-h-0 gap-3", className)}>
      <form onSubmit={submit} className="grid gap-2 rounded-panel border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-elevated))] p-2.5 transition-[background-color,border-color,box-shadow] duration-normal ease-standard focus-within:border-[rgb(var(--primary)/0.72)] focus-within:bg-[rgb(var(--surface))] focus-within:shadow-[0_0_0_3px_rgb(var(--primary)/0.08)]">
        <p className="px-2 pt-1 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Context activ · {context.contextLabel ?? (context.pageType === "opportunity" ? "Oportunitatea curentă" : context.pageType === "company" ? "Compania curentă" : context.pageType === "dashboard" ? "Control Center" : "Întregul spațiu de lucru")}</p>
        {pageContext.opportunityId||pageContext.organizationId?<label className="flex items-center gap-2 px-2 text-xs text-[rgb(var(--text-muted))]">Caută în
         <select aria-label="Contextul verificării" disabled={loading} value={scope} onChange={event=>{setScope(event.target.value as "current"|"workspace");setConversation([]);setSelection(undefined);}} className="focus-ring h-8 rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2">
          <option value="current">{pageContext.opportunityId?"Această oportunitate":"Compania selectată"}</option><option value="workspace">Workspace autorizat</option>
         </select>
        </label>:null}
        <label htmlFor={inputId} className="sr-only">Întrebarea ta</label>
        <textarea ref={inputRef} data-copilot-input id={inputId} aria-describedby={`${inputId}-trust`} aria-keyshortcuts="Enter" value={question} onChange={(event) => setQuestion(event.target.value.slice(0, 3000))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void ask(question); } }} rows={3} maxLength={3000} placeholder="Întreabă ReveNew…" className="focus-ring min-h-24 w-full resize-none rounded-control border-0 bg-transparent px-2 py-2 text-sm leading-5 outline-none placeholder:text-[rgb(var(--text-faint))]" />
        <div className="flex items-center justify-between gap-3"><p id={`${inputId}-trust`} className="flex items-start gap-1.5 text-[0.6875rem] leading-4 text-[rgb(var(--text-muted))]"><ShieldCheckIcon className="mt-px h-3.5 w-3.5 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />Doar informații autorizate. Decizia și orice acțiune rămân la utilizator.</p><Button type="submit" size="small" loading={loading} disabled={question.trim().length < 2}>Analizează</Button></div>
      </form>

      <div className="grid gap-5" aria-live="polite" aria-busy={loading}>
        {conversation.length || loading ? (
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">{loading ? "Răspuns în pregătire" : "Răspuns activ"}</p>
            <div className="flex items-center gap-2">
              {previousCount > 0 ? <button type="button" aria-expanded={historyOpen} onClick={() => setHistoryOpen((value) => !value)} className="focus-ring inline-flex min-h-8 items-center gap-1.5 rounded-button px-2 text-xs font-semibold text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-subtle))] hover:text-[rgb(var(--foreground))]"><ClockIcon className="h-4 w-4" aria-hidden="true" />Istoric · {previousCount}</button> : null}
              <button type="button" onClick={() => { setConversation([]); setHistoryOpen(false); setSelection(undefined); }} className="focus-ring inline-flex min-h-8 items-center gap-1.5 rounded-button px-2 text-xs font-semibold text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-subtle))] hover:text-[rgb(var(--foreground))]"><TrashIcon className="h-4 w-4" aria-hidden="true" />Șterge conversația</button>
            </div>
          </div>
        ) : null}
        {loading ? (
          <article className="intelligence-reveal overflow-hidden product-work-surface" aria-label="Răspuns în pregătire">
            <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-3"><p className="text-sm font-medium text-[rgb(var(--text-secondary))]">{question}</p></div>
            <div className="p-4 sm:p-5">
              <p className="sr-only" role="status">Verific informațiile disponibile.</p>
              <div className="grid divide-y divide-[rgb(var(--border)/0.72)]">{activeProgressStages.map((stage, index) => <div key={stage} className={`flex items-center gap-3 border-l-2 px-2 py-2.5 transition-[border-color,color,opacity] duration-normal ease-standard ${index === progressIndex ? "border-l-[rgb(var(--primary))] text-[rgb(var(--foreground))]" : index < progressIndex ? "border-l-transparent text-[rgb(var(--text-muted))]" : "border-l-transparent text-[rgb(var(--text-faint))] opacity-60"}`}><span className={`grid h-5 w-5 place-items-center rounded-full border ${index < progressIndex ? "border-[rgb(var(--success-border))] bg-[rgb(var(--success-background))] text-[rgb(var(--success-text))]" : index === progressIndex ? "border-[rgb(var(--primary))]" : "border-[rgb(var(--border-strong))]"}`}>{index < progressIndex ? <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" /> : index === progressIndex ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[rgb(var(--primary))] motion-reduce:animate-none" aria-hidden="true" /> : null}</span><span className="text-xs font-semibold">{stage}</span></div>)}</div>
              <div className="mt-4 grid gap-2" aria-hidden="true"><span className="h-4 w-2/5 animate-pulse rounded bg-[rgb(var(--surface-muted))] motion-reduce:animate-none"/><span className="h-3 w-full animate-pulse rounded bg-[rgb(var(--surface-subtle))] motion-reduce:animate-none"/><span className="h-3 w-4/5 animate-pulse rounded bg-[rgb(var(--surface-subtle))] motion-reduce:animate-none"/></div>
            </div>
          </article>
        ) : null}
        {conversation.length === 0 && !loading ? (
          <section aria-labelledby="copilot-suggestions-title">
            <h3 id="copilot-suggestions-title" className="sr-only">Întrebări utile aici</h3>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 4).map((suggestion) => <button key={suggestion} type="button" disabled={loading} className="focus-ring min-h-8 rounded-control border border-[rgb(var(--border))] bg-transparent px-3 py-1.5 text-left text-xs font-medium text-[rgb(var(--text-muted))] transition-colors hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-subtle))] hover:text-[rgb(var(--foreground))] disabled:cursor-not-allowed disabled:opacity-60" onClick={() => void ask(suggestion)}>{suggestion}</button>)}
            </div>
          </section>
        ) : conversation.map((item, index) => (
          <article key={item.id} className={cn("intelligence-reveal overflow-hidden rounded-panel border", index === 0 && !loading ? "border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-elevated))] shadow-card" : historyOpen ? "border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]" : "hidden")} aria-labelledby={`${item.id}-answer`}>
            <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 rounded-control bg-[rgb(var(--surface-subtle))] px-3 py-2">
              <p className="text-sm font-medium text-[rgb(var(--text-secondary))]">{item.question}</p>
              <button type="button" onClick={() => setConversation((current) => current.filter((turn) => turn.id !== item.id))} className="focus-ring -mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-button text-[rgb(var(--text-faint))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]" aria-label="Elimină acest răspuns"><XMarkIcon className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            <div className="mt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--primary))]">Răspuns</h4>
                <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium text-[rgb(var(--text-faint))]">
                  <ShieldCheckIcon className="h-3.5 w-3.5 text-[rgb(var(--primary))]" aria-hidden="true" />
                  {item.answer.commercialTruth ? "Surse evaluate · verificare umană" : item.answer.summaryType === "product_help" ? "Context produs" : item.answer.summaryType === "insufficient_information" ? "Limită de date explicită" : "Context verificat"}
                  {item.answer.evidence.length ? ` · ${item.answer.evidence.length} ${item.answer.evidence.length === 1 ? "sursă" : "surse"}` : ""}
                </span>
              </div>
              <p id={`${item.id}-answer`} className="mt-2 max-w-[46rem] whitespace-pre-line text-[0.95rem] leading-7 text-[rgb(var(--foreground))]">{formatUserFacingText(item.answer.answer)}</p>
              {item.answer.commercialTruth?<div className="mt-4 space-y-3">{item.answer.commercialTruth.items.map(truth=><CommercialTruthSnapshot key={truth.opportunityId} truth={truth} compact prepareLabel={context.opportunityId===truth.opportunityId?"Pregătește următorul pas":"Deschide oportunitatea"} onPrepare={()=>{if(context.opportunityId===truth.opportunityId)void ask("Pregătește următorul pas.");else window.location.assign("/opportunities/"+truth.opportunityId);}}/>)}</div>:null}
              {item.answer.workflowDraft && (index > 0 || revealStep >= 2) ? <WorkflowDraftPreview preview={item.answer.workflowDraft} onModify={(request) => { setQuestion(request); window.setTimeout(() => inputRef.current?.focus(), 0); }} /> : null}
              {item.answer.multiRecordResult && (index > 0 || revealStep >= 2) ? <MultiRecordResultView result={item.answer.multiRecordResult} onSelectionChange={(resultSetId, selectedRecordIds) => setSelection({ resultSetId, selectedRecordIds })} onAsk={(nextQuestion) => void ask(nextQuestion)} /> : null}
              {item.answer.multiRecordPlan && (index > 0 || revealStep >= 2) ? <MultiRecordPlanView preview={item.answer.multiRecordPlan} /> : null}
              {item.answer.presentation && (index > 0 || revealStep >= 2) ? <CopilotResultCards presentation={item.answer.presentation} onAsk={(nextQuestion) => void ask(nextQuestion)} /> : null}
              {!item.answer.workflowDraft && !item.answer.multiRecordResult && !item.answer.multiRecordPlan && !item.answer.presentation && (item.answer.findings ?? []).length > 0 && (index > 0 || revealStep >= 2) ? (
                <section className="mt-5" aria-label="Puncte relevante">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Puncte relevante</h4>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {item.answer.findings.slice(0, 4).map((finding, findingIndex) => <li key={`${finding.label}-${findingIndex}`} className="rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-3"><p className="text-xs font-semibold text-[rgb(var(--foreground))]">{finding.label}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{formatUserFacingText(finding.detail)}</p><p className="mt-2 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">{finding.kind === "derived" ? "Interpretare prudentă" : "Context verificat"}</p></li>)}
                  </ul>
                </section>
              ) : null}
              {!item.answer.workflowDraft && item.answer.preparedAction && (index > 0 || revealStep >= 2) ? <PreparedActionCard action={item.answer.preparedAction} /> : null}
              {!item.answer.commercialTruth && !item.answer.workflowDraft && item.answer.evidence.length > 0 && (index > 0 || revealStep >= 3) ? (
                <details className="group mt-5 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]" aria-label={`Dovezi, ${item.answer.evidence.length}`}>
                  <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-control px-3 py-2 marker:hidden"><span className="flex items-center gap-2 text-xs font-semibold text-[rgb(var(--text-secondary))]"><BookOpenIcon className="h-4 w-4" aria-hidden="true" />Dovezi · {item.answer.evidence.length} · trasabilitate<span className="sr-only">Surse verificate</span></span><ChevronDownIcon className="h-4 w-4 text-[rgb(var(--text-faint))] transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" /></summary>
                  <div className="divide-y divide-[rgb(var(--border))] border-t border-[rgb(var(--border))] px-3">
                    {item.answer.evidence.map((evidence) => {
                      const content = <><span className="flex flex-wrap items-center gap-2 font-semibold text-[rgb(var(--foreground))]"><span className="status-pill status-pill-neutral">{presentSourceIdentity(evidence.sourceType)}</span>{formatUserFacingText(evidence.label)}</span><span className="text-xs leading-5 text-[rgb(var(--text-muted))]">{formatUserFacingText(evidence.fact)}{evidence.observedAt ? <time dateTime={evidence.observedAt} className="ml-1 text-[rgb(var(--text-faint))]">· {formatProductDateTime(evidence.observedAt, { year: false })}</time> : null}</span></>;
                      return evidence.route ? <Link key={evidence.sourceId} href={evidence.route} className="focus-ring flex min-h-11 flex-col justify-center gap-0.5 rounded-button px-1 py-2 hover:text-[rgb(var(--primary))]">{content}</Link> : <div key={evidence.sourceId} className="flex min-h-11 flex-col justify-center gap-0.5 py-2">{content}</div>;
                    })}
                  </div>
                  {(item.answer.checkedSources ?? []).length > 0 ? <div className="flex flex-wrap gap-1.5 border-t border-[rgb(var(--border))] px-3 py-2.5">{item.answer.checkedSources.slice(0, 8).map((checked) => <span key={checked.providerId} title={checked.detail} className="status-pill status-pill-neutral">{checked.label} · {checked.state === "available" ? "verificat" : checked.state === "not_connected" ? "neconectat" : checked.state === "forbidden" ? "interzis" : "indisponibil"}</span>)}</div> : null}
                </details>
              ) : null}
              {!item.answer.workflowDraft && item.answer.missingInformation.length > 0 && (index > 0 || revealStep >= 2) ? <section className="mt-3 border-t border-[rgb(var(--border))] pt-3"><h4 className="text-xs font-medium text-[rgb(var(--text-muted))]">Ce nu pot confirma</h4><ul className="mt-1 grid gap-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{item.answer.missingInformation.map((missing) => <li key={missing}>— {formatUserFacingText(missing)}</li>)}</ul></section> : null}
              {!item.answer.workflowDraft && item.answer.caveats.length > 0 ? <p className="mt-3 text-xs leading-5 text-[rgb(var(--text-muted))]">{formatUserFacingText(item.answer.caveats.join(" "))}</p> : null}
              {!item.answer.commercialTruth && !item.answer.workflowDraft && item.answer.suggestedAction && (index > 0 || revealStep >= 3) ? <div className="mt-4"><Button href={item.answer.suggestedAction.route} size="small">{item.answer.suggestedAction.label}<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button></div> : null}
              {!item.answer.workflowDraft && item.answer.followUps.length > 0 && (index > 0 || revealStep >= 3) ? <div className="mt-5 border-t border-[rgb(var(--border))] pt-3"><p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">Continuă analiza</p><div className="flex flex-wrap gap-2">{item.answer.followUps.map((followUp) => <button key={followUp} type="button" disabled={loading} className="focus-ring rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-3 py-2 text-left text-xs font-medium text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--border-strong))] hover:text-[rgb(var(--foreground))] disabled:cursor-not-allowed disabled:opacity-60" onClick={() => void ask(followUp)}>{followUp}<ArrowRightIcon className="ml-2 inline h-3.5 w-3.5" aria-hidden="true" /></button>)}</div></div> : null}
            </div>
            </div>
          </article>
        ))}
        {error ? <div className="rounded-control border border-[rgb(var(--danger-border))] bg-[rgb(var(--danger-background))] p-3" role="alert"><p className="text-sm text-[rgb(var(--danger-text))]">{error}</p><button type="button" className="focus-ring mt-2 rounded-button text-xs font-semibold underline" onClick={() => void ask(question)}>Reîncearcă</button></div> : null}
      </div>
    </div>
  );
}
