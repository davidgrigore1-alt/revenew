"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowTopRightOnSquareIcon,
  ArrowUturnLeftIcon,
  CheckIcon,
  DocumentMagnifyingGlassIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

import { IntegrationBrandIcon } from "@/components/ui/IntegrationBrandIcon";
import type { OwnedGoogleEmailDetail } from "@/lib/google-workspace/types";
import { formatProductDateTime, formatUserFacingText, presentCommunicationState } from "@/lib/ui/presentation";

type ThreadMessage = {
  id: string;
  sentAt: string;
  sender: { email: string; name: string | null } | null;
  subject: string | null;
  body: string;
  direction: "inbound" | "outbound";
};
type Draft = {
  id: string;
  to_recipients: string[];
  cc_recipients: string[];
  subject: string;
  body: string;
  status: "draft" | "ready" | "sending" | "sent" | "discarded" | "failed";
  prepared_by: "human" | "ai";
  safe_failure_code: string | null;
  sent_at: string | null;
};
type CommunicationTemplate = { id: string; name: string; subject: string; body: string };
type ActionResult = { answer: string; preparedAction?: { subject?: string; body?: string; contextUsed?: string[] } | null };

const dateTime = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Bucharest" });
function partyLabel(party: { email: string; name: string | null }) { return party.name ? `${party.name} <${party.email}>` : party.email; }

export function EmailDetailDrawer({ messageId, onClose, onAsk }: {
  messageId: string | null;
  onClose: () => void;
  onAsk?: (question: string) => void;
}) {
  const [email, setEmail] = useState<OwnedGoogleEmailDetail | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [html, setHtml] = useState<string | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);
  const [actionLoading, setActionLoading] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [draftBusy, setDraftBusy] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const closeButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const mutationLock = useRef(false);
  const activeMessageId = messageId ?? "";

  useEffect(() => {
    if (!messageId) return;
    const controller = new AbortController();
    if (!returnFocus.current && document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    setEmail(null); setThread([]); setError(""); setLoading(true); setHtml(null); setImagesLoaded(false); setShowOriginal(false);
    setActionResult(null); setDraft(null); setTemplates([]); setDraftMessage("");
    fetch(`/api/integrations/google/email/${encodeURIComponent(activeMessageId)}`, {
      signal: controller.signal, credentials: "same-origin", headers: { Accept: "application/json" }
    }).then(async (response) => {
      const payload = await response.json() as { email?: OwnedGoogleEmailDetail; thread?: ThreadMessage[]; error?: string };
      if (!response.ok || !payload.email) throw new Error(payload.error || "Emailul nu poate fi încărcat.");
      setEmail(payload.email); setThread(payload.thread ?? []);
    }).catch((reason) => {
      if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "Emailul nu poate fi încărcat.");
    }).finally(() => setLoading(false));
    fetch(`/api/integrations/google/email/${encodeURIComponent(activeMessageId)}?view=html`, {
      signal: controller.signal, credentials: "same-origin", headers: { Accept: "application/json" }
    }).then(async (response) => {
      const payload = await response.json() as { html?: string | null };
      if (response.ok && payload.html) setHtml(payload.html);
    }).catch(() => undefined);
    const frame = requestAnimationFrame(() => closeButton.current?.focus({ preventScroll: true }));
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      controller.abort(); cancelAnimationFrame(frame); document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [activeMessageId, messageId, onClose]);

  useEffect(() => {
    if (messageId) return;
    const target = returnFocus.current;
    returnFocus.current = null;
    if (target) requestAnimationFrame(() => target.focus({ preventScroll: true }));
  }, [messageId]);
  if (!messageId) return null;

  async function runSourceAction(action: "summarize_email" | "explain_email_relevance" | "prepare_email_followup") {
    setActionLoading(action); setActionResult(null);
    try {
      const response = await fetch(`/api/integrations/google/email/${encodeURIComponent(activeMessageId)}`, {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action })
      });
      const payload = await response.json() as { result?: ActionResult; error?: string };
      if (!response.ok || !payload.result) throw new Error(payload.error || "Acțiunea nu este disponibilă.");
      setActionResult(payload.result);
    } catch (reason) {
      setActionResult({ answer: reason instanceof Error ? reason.message : "Acțiunea nu este disponibilă." });
    } finally { setActionLoading(""); }
  }

  async function prepareReply() {
    setDraftBusy("prepare"); setDraftMessage("");
    try {
      const response = await fetch(`/api/integrations/google/email/${encodeURIComponent(activeMessageId)}`, {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action: "prepare_reply_draft" })
      });
      const payload = await response.json() as { draft?: Draft; templates?: CommunicationTemplate[]; error?: string };
      if (!response.ok || !payload.draft) throw new Error(payload.error || "Draftul nu a putut fi pregătit.");
      setDraft(payload.draft); setTemplates(payload.templates ?? []);
    } catch (reason) { setDraftMessage(reason instanceof Error ? reason.message : "Draftul nu a putut fi pregătit."); }
    finally { setDraftBusy(""); }
  }

  async function mutateDraft(action: "save" | "ready" | "send") {
    if (!draft || mutationLock.current) return;
    mutationLock.current = true;
    setDraftBusy(action); setDraftMessage("");
    try {
      const response = await fetch(`/api/integrations/google/drafts/${encodeURIComponent(draft.id)}`, {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          action,
          to: draft.to_recipients,
          cc: draft.cc_recipients,
          subject: draft.subject,
          body: draft.body,
          finalConfirmation: action === "send"
        })
      });
      const payload = await response.json() as { draft?: Draft; error?: string; code?: string; auditPending?: boolean };
      if (!response.ok || !payload.draft) throw new Error(payload.error || "Draftul nu a putut fi actualizat.");
      setDraft(payload.draft);
      setDraftMessage(action === "save" ? "Draft salvat." : action === "ready" ? "Versiunea este aprobată pentru confirmarea finală." : payload.auditPending ? "Mesaj trimis prin Gmail. Jurnalizarea va fi reconciliată; nu vom retrimite automat." : "Mesaj trimis prin Gmail și înregistrat în jurnal.");
    } catch (reason) { setDraftMessage(reason instanceof Error ? reason.message : "Operațiunea nu a putut fi finalizată."); }
    finally { mutationLock.current = false; setDraftBusy(""); }
  }

  async function saveAndReadyDraft() {
    if (!draft || draft.status === "sent") return;
    setDraftBusy("ready"); setDraftMessage("");
    try {
      const endpoint = `/api/integrations/google/drafts/${encodeURIComponent(draft.id)}`;
      const saveResponse = await fetch(endpoint, {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action: "save", to: draft.to_recipients, cc: draft.cc_recipients, subject: draft.subject, body: draft.body })
      });
      const saved = await saveResponse.json() as { draft?: Draft; error?: string };
      if (!saveResponse.ok || !saved.draft) throw new Error(saved.error || "Draftul nu a putut fi salvat înainte de aprobare.");
      const readyResponse = await fetch(endpoint, {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action: "ready" })
      });
      const ready = await readyResponse.json() as { draft?: Draft; error?: string };
      if (!readyResponse.ok || !ready.draft) throw new Error(ready.error || "Versiunea nu a putut fi aprobată.");
      setDraft(ready.draft);
      setDraftMessage("Versiunea este aprobată pentru confirmarea finală.");
    } catch (reason) { setDraftMessage(reason instanceof Error ? reason.message : "Versiunea nu a putut fi aprobată."); }
    finally { setDraftBusy(""); }
  }
  async function refineDraft(mode: "rewrite" | "shorten" | "formal" | "concise") {
    if (!draft || draft.status === "sent") return;
    setDraftBusy("refine-" + mode); setDraftMessage("");
    try {
      const endpoint = `/api/integrations/google/drafts/${encodeURIComponent(draft.id)}`;
      const saveResponse = await fetch(endpoint, {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action: "save", to: draft.to_recipients, cc: draft.cc_recipients, subject: draft.subject, body: draft.body })
      });
      const saved = await saveResponse.json() as { draft?: Draft; error?: string };
      if (!saveResponse.ok || !saved.draft) throw new Error(saved.error || "Draftul nu a putut fi salvat înainte de rescriere.");
      const response = await fetch(endpoint, {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action: "refine", mode })
      });
      const payload = await response.json() as { draft?: Draft; rationale?: string; aiInvolved?: boolean; error?: string };
      if (!response.ok || !payload.draft) throw new Error(payload.error || "Rescrierea nu a putut fi aplicată.");
      setDraft(payload.draft);
      setDraftMessage(`${payload.aiInvolved ? "Rescriere AI" : "Rescriere sigură"}: ${payload.rationale || "draft actualizat"}`);
    } catch (reason) { setDraftMessage(reason instanceof Error ? reason.message : "Rescrierea nu a putut fi aplicată."); }
    finally { setDraftBusy(""); }
  }

  async function discardDraft() {
    if (!draft || !window.confirm("Abandonezi acest draft? Mesajul nu va fi trimis.")) return;
    setDraftBusy("discard"); setDraftMessage("");
    try {
      const response = await fetch(`/api/integrations/google/drafts/${encodeURIComponent(draft.id)}`, {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action: "discard" })
      });
      const payload = await response.json() as { draft?: Draft; error?: string };
      if (!response.ok || !payload.draft) throw new Error(payload.error || "Draftul nu a putut fi abandonat.");
      setDraft(null); setDraftMessage("Draft abandonat. Niciun mesaj nu a fost trimis.");
    } catch (reason) { setDraftMessage(reason instanceof Error ? reason.message : "Draftul nu a putut fi abandonat."); }
    finally { setDraftBusy(""); }
  }
  async function loadImages() {
    const response = await fetch(`/api/integrations/google/email/${encodeURIComponent(activeMessageId)}?view=html&images=1`, { credentials: "same-origin" });
    const payload = await response.json() as { html?: string | null };
    if (response.ok && payload.html) { setHtml(payload.html); setImagesLoaded(true); }
  }

  const subject = email?.subject || "Fără subiect";
  const sender = email?.sender ? partyLabel(email.sender) : "Expeditor neidentificat";

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-3 backdrop-blur-[2px] sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="flex h-[min(920px,calc(100dvh-24px))] w-[min(1320px,calc(100vw-24px))] flex-col overflow-hidden rounded-[16px] border border-white/[0.14] bg-[#090909] shadow-[0_32px_120px_rgba(0,0,0,0.72)] sm:h-[min(920px,calc(100dvh-40px))] sm:w-[min(1320px,calc(100vw-40px))]" role="dialog" aria-modal="true" aria-labelledby="email-detail-title">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
          <div className="flex min-w-0 items-start gap-3"><IntegrationBrandIcon provider="gmail" /><div className="min-w-0">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-[#929292]">Gmail · conversație autorizată</p>
            <h2 id="email-detail-title" className="mt-1 truncate text-lg font-semibold tracking-[-0.02em] text-white">{subject}</h2>
          </div></div>
          <button ref={closeButton} type="button" className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border border-white/10 text-[#aaa] hover:bg-white/[0.05] hover:text-white" onClick={onClose} aria-label="Închide conversația"><XMarkIcon className="h-5 w-5" /></button>
        </header>

        {loading ? <div className="grid flex-1 place-items-center"><div className="w-full max-w-xl animate-pulse space-y-3"><div className="h-4 w-48 rounded bg-white/10"/><div className="h-24 rounded-[10px] bg-white/[0.05]"/><div className="h-40 rounded-[10px] bg-white/[0.05]"/></div></div>
        : error ? <div className="grid flex-1 place-items-center px-6 text-center"><div><DocumentMagnifyingGlassIcon className="mx-auto h-7 w-7 text-[#888]"/><p className="mt-3 text-sm font-semibold text-white">Conversația nu este disponibilă</p><p className="mt-1 text-xs text-[#999]">{error}</p></div></div>
        : email ? <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_380px]">
          <main className="min-h-0 min-w-0 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8">
            <div className="grid gap-2 border-b border-white/10 pb-4 text-xs sm:grid-cols-[5rem_minmax(0,1fr)]">
              <span className="text-[#7f7f7f]">De la</span><span className="break-all font-medium text-[#eee]">{sender}</span>
              <span className="text-[#7f7f7f]">Către</span><span className="break-all text-[#bbb]">{email.recipients.length ? email.recipients.map(partyLabel).join(", ") : "Nespecificat"}</span>
              <span className="text-[#7f7f7f]">Moment</span><time className="text-[#bbb]">{formatProductDateTime(email.sentAt, { year: false })}</time>
            </div>

            {thread.length > 1 ? <section className="mt-6">
              <div className="flex items-center justify-between"><p className="micro-label">Fir conversație</p><span className="text-[0.6875rem] tabular-nums text-[#777]">{thread.length} mesaje păstrate în fereastra autorizată</span></div>
              <div className="mt-3 divide-y divide-white/[0.07] border-y border-white/[0.08]">
                {thread.map((item) => <details key={item.id} open={item.id === messageId} className="group py-3">
                  <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 rounded-[6px] text-xs">
                    <span className="min-w-0 truncate font-semibold text-[#ddd]">{item.direction === "outbound" ? "Tu" : item.sender?.name || item.sender?.email || "Expeditor"} · {item.subject || "Fără subiect"}</span>
                    <time className="shrink-0 text-[0.6875rem] text-[#777]">{formatProductDateTime(item.sentAt, { year: false })}</time>
                  </summary>
                  <p className="mt-3 whitespace-pre-wrap break-words pl-3 text-xs leading-6 text-[#aaa]">{item.body || "Conținut indisponibil."}</p>
                </details>)}
              </div>
            </section> : null}

            <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
              <div><p className="micro-label">Mesaj selectat</p><p className="mt-1 text-[0.6875rem] text-[#777]">Vizualizare curată pentru citire. Originalul HTML rămâne izolat și sanitizat.</p></div>
              <div className="flex items-center gap-1 rounded-[8px] border border-white/10 bg-black/30 p-1">
                <button type="button" onClick={() => setShowOriginal(false)} aria-pressed={!showOriginal} className="focus-ring rounded-[6px] px-2.5 py-1.5 text-[0.6875rem] font-semibold text-[#aaa] aria-pressed:bg-white/[0.08] aria-pressed:text-white">Curat</button>
                <button type="button" disabled={!html} onClick={() => setShowOriginal(true)} aria-pressed={showOriginal} className="focus-ring rounded-[6px] px-2.5 py-1.5 text-[0.6875rem] font-semibold text-[#aaa] aria-pressed:bg-white/[0.08] aria-pressed:text-white disabled:cursor-not-allowed disabled:opacity-40">Original</button>
              </div>
            </div>
            {showOriginal && html ? <div className="mt-3 overflow-hidden rounded-[12px] border border-neutral-300 bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50 px-3 py-2"><span className="text-[0.6875rem] font-semibold text-neutral-500">HTML sanitizat</span>{!imagesLoaded ? <button type="button" onClick={loadImages} className="focus-ring rounded-[6px] border border-neutral-300 bg-white px-2.5 py-1.5 text-[0.6875rem] font-semibold text-neutral-700 hover:bg-neutral-100">Încarcă imaginile externe</button> : <span className="text-[0.6875rem] font-semibold text-neutral-500">Imagini încărcate</span>}</div>
                <iframe title="Conținutul sigur al emailului" sandbox="" referrerPolicy="no-referrer" srcDoc={html} className="h-[min(620px,62dvh)] w-full bg-white"/>
              </div>
              : <article className="mt-3 min-h-[320px] rounded-[12px] border border-neutral-200 bg-white px-6 py-6 text-sm leading-7 text-neutral-900">{email.body ? <div className="whitespace-pre-wrap break-words">{email.body}</div> : <div className="grid min-h-[250px] place-items-center text-center text-neutral-500"><div><p className="font-semibold text-neutral-700">Conținut text indisponibil</p><p className="mt-1">Folosește vizualizarea Original dacă mesajul conține doar HTML.</p></div></div>}</article>}
            <p className="mt-4 text-[0.6875rem] leading-5 text-[#777]">Conținutul este tratat ca date neîncrezute. Scripturile, formularele și resursele remote sunt blocate implicit.</p>
          </main>

          <aside className="min-h-0 overflow-y-auto overscroll-contain border-t border-white/10 bg-[#0d0d0d] px-5 py-6 lg:border-l lg:border-t-0">
            <p className="micro-label">Context comercial</p>
            {onAsk ? <button type="button" disabled={Boolean(draftBusy || actionLoading)} onClick={() => onAsk("Ce contează comercial în acest email?")} className="focus-ring mt-3 inline-flex items-center gap-2 rounded-control border border-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/[0.04]"><SparklesIcon className="h-4 w-4" aria-hidden="true" />Întreabă ReveNew</button> : null}
            <p className="mt-2 text-xs leading-5 text-[#aaa]">{email.commercialRelevance === "unlinked" ? "Fără legătură CRM confirmată. Nu este creată nicio asociere speculativă." : "Asociere confirmată cu datele CRM."}</p>
            {email.relatedRecords.length ? <div className="mt-4 space-y-2">{email.relatedRecords.map((record) => <Link key={record.id} href={record.href} className="focus-ring flex items-center justify-between gap-3 rounded-[8px] border border-white/10 px-3 py-2.5 hover:border-[#d9b969]/40"><span className="min-w-0 truncate text-xs font-semibold text-white">{record.label}</span><ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0 text-[#777]"/></Link>)}</div> : null}

            <div className="mt-7 border-t border-white/[0.08] pt-5"><p className="micro-label">Inteligență</p><div className="mt-3 grid grid-cols-2 gap-2">
              <button disabled={Boolean(actionLoading)} type="button" className="focus-ring rounded-[8px] border border-white/10 px-3 py-2 text-xs font-semibold text-[#ddd] hover:bg-white/[0.04]" onClick={() => runSourceAction("summarize_email")}><SparklesIcon className="mr-1 inline h-4 w-4 text-[#d9b969]"/>Rezumat</button>
              <button disabled={Boolean(actionLoading)} type="button" className="focus-ring rounded-[8px] border border-white/10 px-3 py-2 text-xs font-semibold text-[#ddd] hover:bg-white/[0.04]" onClick={() => runSourceAction("explain_email_relevance")}>De ce contează?</button>
            </div>{actionResult ? <div className="mt-3 border-l-2 border-[#d9b969]/40 pl-3 text-xs leading-5 text-[#bbb]">{formatUserFacingText(actionResult.answer, { stripUrls: true })}</div> : null}</div>

            <div className="mt-7 border-t border-white/[0.08] pt-5">
              <div className="flex items-center justify-between gap-3"><p className="micro-label">Răspuns pregătit</p>{draft ? <span className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-[#d9b969]">{presentCommunicationState(draft.status).label}</span> : null}</div>
              {!draft ? <><p className="mt-2 text-xs leading-5 text-[#888]">Răspunsul rămâne editabil. Nimic nu se trimite fără aprobarea și confirmarea ta finală.</p><button type="button" disabled={Boolean(draftBusy)} onClick={prepareReply} className="focus-ring mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-[8px] bg-[#d9b969] text-xs font-semibold text-black hover:bg-[#e3c77e] disabled:opacity-60"><ArrowUturnLeftIcon className="h-4 w-4"/>{draftBusy ? "Se pregătește…" : "Deschide composerul"}</button></>
              : <div className="mt-3 space-y-3">
                {templates.length && draft.status !== "sent" ? <label className="block"><span className="text-[0.6875rem] text-[#888]">Șablon</span><select defaultValue="" onChange={(event) => { const template = templates.find((item) => item.id === event.target.value); if (template) setDraft({ ...draft, subject: template.subject || draft.subject, body: template.body + draft.body, status: "draft" }); }} className="focus-ring mt-1 h-9 w-full rounded-[7px] border border-white/10 bg-black px-2.5 text-xs text-white"><option value="">Alege un șablon…</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label> : null}
                <label className="block"><span className="text-[0.6875rem] text-[#888]">Către</span><input value={draft.to_recipients.join(", ")} disabled={draft.status === "sent"} onChange={(event) => setDraft({ ...draft, to_recipients: event.target.value.split(",").map((value) => value.trim()) })} className="focus-ring mt-1 h-9 w-full rounded-[7px] border border-white/10 bg-black px-2.5 text-xs text-white"/></label>
                <label className="block"><span className="text-[0.6875rem] text-[#888]">CC</span><input value={draft.cc_recipients.join(", ")} disabled={draft.status === "sent"} onChange={(event) => setDraft({ ...draft, cc_recipients: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} className="focus-ring mt-1 h-9 w-full rounded-[7px] border border-white/10 bg-black px-2.5 text-xs text-white"/></label>
                <label className="block"><span className="text-[0.6875rem] text-[#888]">Subiect</span><input value={draft.subject} disabled={draft.status === "sent"} onChange={(event) => setDraft({ ...draft, subject: event.target.value, status: "draft" })} className="focus-ring mt-1 h-9 w-full rounded-[7px] border border-white/10 bg-black px-2.5 text-xs text-white"/></label>
                <label className="block"><span className="text-[0.6875rem] text-[#888]">Mesaj</span><textarea value={draft.body} disabled={draft.status === "sent"} onChange={(event) => setDraft({ ...draft, body: event.target.value, status: "draft" })} rows={9} className="focus-ring mt-1 w-full resize-y rounded-[7px] border border-white/10 bg-black p-2.5 text-xs leading-5 text-white"/></label>                {draft.status !== "sent" ? <div><p className="text-[0.6875rem] text-[#888]">Asistență de redactare · versiunea rămâne editabilă</p><div className="mt-1.5 grid grid-cols-2 gap-1.5"><button type="button" disabled={Boolean(draftBusy)} onClick={() => refineDraft("rewrite")} className="focus-ring h-8 rounded-[7px] border border-white/10 text-[0.6875rem] font-semibold text-[#bbb] hover:bg-white/[0.04]">Rescrie</button><button type="button" disabled={Boolean(draftBusy)} onClick={() => refineDraft("shorten")} className="focus-ring h-8 rounded-[7px] border border-white/10 text-[0.6875rem] font-semibold text-[#bbb] hover:bg-white/[0.04]">Scurtează</button><button type="button" disabled={Boolean(draftBusy)} onClick={() => refineDraft("formal")} className="focus-ring h-8 rounded-[7px] border border-white/10 text-[0.6875rem] font-semibold text-[#bbb] hover:bg-white/[0.04]">Mai formal</button><button type="button" disabled={Boolean(draftBusy)} onClick={() => refineDraft("concise")} className="focus-ring h-8 rounded-[7px] border border-white/10 text-[0.6875rem] font-semibold text-[#bbb] hover:bg-white/[0.04]">Mai concis</button></div></div> : null}
                {draft.status === "ready" ? <div className="rounded-[8px] border border-[#d9b969]/25 bg-[#d9b969]/[0.06] p-3 text-[0.6875rem] leading-5 text-[#d8c28d]"><CheckIcon className="mr-1 inline h-3.5 w-3.5"/>Versiune aprobată. Următorul click inițiază trimiterea reală prin Gmail.</div> : null}
                {draft.status === "sent" ? <div className="rounded-[8px] border border-emerald-800/40 bg-emerald-950/20 p-3 text-xs text-emerald-300"><CheckIcon className="mr-1 inline h-4 w-4"/>Trimitere confirmată și auditată.</div> : <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={Boolean(draftBusy)} onClick={() => mutateDraft("save")} className="focus-ring h-9 rounded-[8px] border border-white/10 text-xs font-semibold text-white hover:bg-white/[0.04]">Salvează</button>
                  {draft.status === "ready" ? <button type="button" disabled={Boolean(draftBusy)} onClick={() => mutateDraft("send")} className="focus-ring flex h-9 items-center justify-center gap-1.5 rounded-[8px] bg-[#d9b969] text-xs font-semibold text-black disabled:opacity-60"><PaperAirplaneIcon className="h-4 w-4"/>{draftBusy === "send" ? "Se trimite…" : "Confirmă și trimite"}</button>
                    : <button type="button" disabled={Boolean(draftBusy) || !draft.body.trim()} onClick={saveAndReadyDraft} className="focus-ring h-9 rounded-[8px] bg-[#d9b969] text-xs font-semibold text-black disabled:opacity-60">Revizuiește și aprobă</button>}<button type="button" disabled={Boolean(draftBusy)} onClick={discardDraft} className="focus-ring col-span-2 h-8 text-[0.6875rem] font-semibold text-[#888] hover:text-red-300">Abandonează draftul</button>
                </div>}
              </div>}
              {draftMessage ? <p role="status" className="mt-3 text-[0.6875rem] leading-5 text-[#c9b372]">{draftMessage}{draftMessage.includes("permisiunea") ? <> <Link href="/apps" className="underline">Deschide Aplicații</Link></> : null}</p> : null}
            </div>
          </aside>
        </div> : null}
      </section>
    </div>,
    document.body
  );
}
