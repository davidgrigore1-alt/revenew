"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { DataCard } from "@/components/dashboard/DataCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { getOpportunityTypeLabel } from "@/components/dashboard/OpportunityCard";
import { ScoreBadge } from "@/components/dashboard/ScoreBadge";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { OpportunityContactsPanel } from "@/components/opportunities/OpportunityContactsPanel";
import { StatusNotice } from "@/components/ui/StatusNotice";
import {
  generateCallScript,
  generateChecklist,
  generateFollowUpMessage,
  generateOfferDraft,
  generateOutreachEmail
} from "@/lib/mock-generators";
import { persistFollowUp, persistGeneratedDocument, persistOpportunityStatus, updateGeneratedDocument, updateOpportunityAction } from "@/lib/actions";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { applicationDateKey } from "@/lib/opportunity-domain";
import type { Business, Opportunity, OpportunityAction, OpportunityDocument, OpportunityStatus } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTimeWithSeconds } from "@/lib/utils";

type GeneratedDocument = OpportunityDocument & { content: string };
type ClientGeneratedDocument = {
  mode: "ai" | "local_fallback";
  document_type: NonNullable<GeneratedDocument["type"]>;
  title: string;
  content: string;
};

type PendingLocalDocument = {
  type: NonNullable<GeneratedDocument["type"]>;
  title: string;
  content: string;
};

const actionLabels: Array<[OpportunityAction["type"], string]> = [
  ["send_email", "Trimite email"],
  ["call_contact", "Sună contactul"],
  ["prepare_offer", "Pregătește oferta"],
  ["follow_up", "Follow-up"],
  ["research_more", "Cercetează mai mult"]
];

const isDevelopmentMode = process.env.NODE_ENV === "development";

const documentStatusLabels: Record<OpportunityDocument["status"], string> = {
  placeholder: "Draft",
  draft: "Draft",
  edited: "Revizuit",
  copied: "Revizuit",
  ready_to_send: "Pregătit",
  sent: "Trimis",
  approved: "Aprobat",
  archived: "Arhivat"
};

function documentTypeLabel(type?: OpportunityDocument["type"]) {
  if (type === "outreach_email") return "Email outreach";
  if (type === "follow_up_email") return "Email follow-up";
  if (type === "offer_draft") return "Draft ofertă";
  if (type === "call_script") return "Script apel";
  if (type === "procurement_checklist") return "Checklist operațional";
  if (type === "grant_summary") return "Rezumat grant";
  if (type === "linkedin_message") return "Mesaj LinkedIn";
  if (type === "whatsapp_message") return "Mesaj WhatsApp";
  return "Document";
}

export function OpportunityWorkflow({
  opportunity,
  business,
  openAIConfigured,
  existingContacts = []
}: {
  opportunity: Opportunity;
  business: Business;
  openAIConfigured: boolean;
  existingContacts?: Array<{ id: string; fullName: string; organizationName?: string | null; email?: string | null }>;
}) {
  const [status, setStatus] = useState<OpportunityStatus>(opportunity.status);
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [documentOverrides, setDocumentOverrides] = useState<Record<string, Partial<OpportunityDocument>>>({});
  const [actions, setActions] = useState<OpportunityAction[]>(opportunity.actions);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [editorTitle, setEditorTitle] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [savedEditorTitle, setSavedEditorTitle] = useState("");
  const [savedEditorContent, setSavedEditorContent] = useState("");
  const [savedRecipientEmail, setSavedRecipientEmail] = useState(opportunity.contact?.email ?? "");
  const [savedCcEmail, setSavedCcEmail] = useState("");
  const [recipientEmail, setRecipientEmail] = useState(opportunity.contact?.email ?? "");
  const [ccEmail, setCcEmail] = useState("");
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState(`Follow-up pentru ${opportunity.title}`);
  const [followUpDate, setFollowUpDate] = useState(applicationDateKey(new Date(Date.now() + 3 * 86400000)));
  const [followUpTime, setFollowUpTime] = useState("09:00");
  const [followUpPriority, setFollowUpPriority] = useState<"low" | "medium" | "high">("medium");
  const [followUpNote, setFollowUpNote] = useState(generateFollowUpMessage(opportunity, business));
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openAIUnavailable, setOpenAIUnavailable] = useState(false);
  const [pendingLocalDocument, setPendingLocalDocument] = useState<PendingLocalDocument | null>(null);
  const [highlightedDocumentId, setHighlightedDocumentId] = useState("");
  const pendingScrollToGeneratedDocumentId = useRef<string | null>(null);
  const documentsSectionRef = useRef<HTMLDivElement>(null);

  const source = opportunity.source ?? getOpportunityTypeLabel(opportunity.type);
  const savedDocuments = opportunity.documents.map((document) => ({ ...document, ...(documentOverrides[document.id] ?? {}) }));
  const allDocuments = [...documents, ...savedDocuments];
  const selectedDocument = allDocuments.find((document) => document.id === selectedDocumentId);
  const isEmailDocument = selectedDocument?.type === "outreach_email" || selectedDocument?.type === "follow_up_email";
  const hasUnsavedChanges = Boolean(
    selectedDocument &&
      (editorTitle !== savedEditorTitle ||
        editorContent !== savedEditorContent ||
        (isEmailDocument && (recipientEmail !== savedRecipientEmail || ccEmail !== savedCcEmail)))
  );
  const workflowDescription = isSupabaseConfigured
    ? openAIConfigured && openAIUnavailable
      ? "Poți continua cu un draft standard și îl poți personaliza înainte de trimitere."
      : openAIConfigured
      ? "Documentele sunt generate pe baza datelor oportunității și pot fi editate înainte de trimitere."
      : "Documentele sunt pregătite pe baza datelor oportunității și pot fi editate înainte de trimitere."
    : "Explorează workflow-ul comercial cu date demonstrative.";
  const topDetails = useMemo(
    () => [
      ["Valoare estimată", `${formatCurrency(opportunity.estimatedValueLow, opportunity.currency ?? "RON")} - ${formatCurrency(opportunity.estimatedValueHigh, opportunity.currency ?? "RON")}`],
      ["Deadline", formatDate(opportunity.deadline)],
      ["Sursa", source],
      ["Locație", `${opportunity.city}, ${opportunity.county}`]
    ],
    [opportunity, source]
  );

  function restoreScrollPosition(top: number, left = 0) {
    requestAnimationFrame(() => {
      window.scrollTo({ top, left, behavior: "auto" });
      requestAnimationFrame(() => window.scrollTo({ top, left, behavior: "auto" }));
    });
  }

  function captureScrollPosition() {
    return { top: window.scrollY, left: window.scrollX };
  }

  function scrollToGeneratedDocumentOnce(documentId: string) {
    window.setTimeout(() => {
      if (pendingScrollToGeneratedDocumentId.current !== documentId) return;
      pendingScrollToGeneratedDocumentId.current = null;
      documentsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function persistLocalOrGeneratedDocument(type: NonNullable<GeneratedDocument["type"]>, generated: ClientGeneratedDocument) {
    let persistedDocumentId = `${type}-${Date.now()}`;
    let persistedCreatedAt = new Date().toISOString();
    let persistedStatus: GeneratedDocument["status"] = "draft";
    let persistedMode = generated.mode;

    if (isSupabaseConfigured) {
      const result = await persistGeneratedDocument(opportunity.id, type, generated);
      if (!result.ok) {
        setError(result.error ?? "Nu am putut salva documentul.");
        setLoading("");
        return false;
      }
      persistedDocumentId = result.id ?? persistedDocumentId;
      persistedCreatedAt = result.createdAt ?? persistedCreatedAt;
      persistedStatus = result.status ?? persistedStatus;
      persistedMode = result.generationMode ?? generated.mode;
    }

    setDocuments((current) => [
      { id: persistedDocumentId, type, title: generated.title, content: generated.content, status: persistedStatus, generationMode: persistedMode, createdAt: persistedCreatedAt },
      ...current.filter((item) => item.type !== type)
    ]);
    pendingScrollToGeneratedDocumentId.current = persistedDocumentId;
    setSelectedDocumentId(persistedDocumentId);
    setEditorTitle(generated.title);
    setEditorContent(generated.content);
    setSavedEditorTitle(generated.title);
    setSavedEditorContent(generated.content);
    setSavedRecipientEmail(recipientEmail);
    setSavedCcEmail(ccEmail);
    setHighlightedDocumentId(persistedDocumentId);
    window.setTimeout(() => setHighlightedDocumentId(""), 3500);
    scrollToGeneratedDocumentOnce(persistedDocumentId);
    setStatus("action_generated");
    setSuccess(type === "outreach_email" ? "Emailul outreach este pregătit pentru revizuire." : "Documentul a fost pregătit mai jos.");
    setPendingLocalDocument(null);
    setLoading("");
    return true;
  }

  async function generateLocalDocument() {
    if (!pendingLocalDocument) return;
    setLoading(`local-${pendingLocalDocument.type}`);
    setError("");
    setSuccess("");
    await persistLocalOrGeneratedDocument(pendingLocalDocument.type, {
      mode: "local_fallback",
      document_type: pendingLocalDocument.type,
      title: pendingLocalDocument.title,
      content: pendingLocalDocument.content
    });
  }

  async function generateDocument(type: NonNullable<GeneratedDocument["type"]>, fallbackTitle: string, fallbackContent: string) {
    setLoading(type);
    setError("");
    setSuccess("");
    setPendingLocalDocument(null);
    let generated: ClientGeneratedDocument = {
      mode: "local_fallback" as const,
      document_type: type,
      title: fallbackTitle,
      content: fallbackContent
    };

    try {
      const response = await fetch("/api/ai/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: type,
          opportunityId: opportunity.id,
          tone: "profesionist, direct, B2B"
        })
      });
      const result = await response.json();
      if (!response.ok) {
        console.error("AI document API error", result);
        if (openAIConfigured) {
          if (result.code === "insufficient_quota") {
            setOpenAIUnavailable(true);
            setPendingLocalDocument({ type, title: fallbackTitle, content: fallbackContent });
            setError("Poți continua cu un draft standard și îl poți personaliza înainte de trimitere.");
          } else {
            setError(result.error ? `Documentul nu a putut fi generat: ${result.error}` : "Documentul nu a putut fi generat.");
          }
          setLoading("");
          return;
        }
      } else {
        generated = result;
      }
    } catch (apiError) {
      console.error("AI document client error", apiError);
      if (openAIConfigured) {
        setError("Poți continua cu un draft standard și îl poți personaliza înainte de trimitere.");
        setPendingLocalDocument({ type, title: fallbackTitle, content: fallbackContent });
        setLoading("");
        return;
      }
    }

    await persistLocalOrGeneratedDocument(type, generated);
  }

  async function scheduleFollowUp() {
    const scroll = captureScrollPosition();
    setLoading("follow_up");
    setError("");
    setSuccess("");
    let generated: ClientGeneratedDocument = {
      mode: "local_fallback" as const,
      document_type: "follow_up_email" as const,
      title: "Mesaj follow-up",
      content: generateFollowUpMessage(opportunity, business)
    };

    try {
      const response = await fetch("/api/ai/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: "follow_up_email",
          opportunityId: opportunity.id,
          tone: "scurt, politicos, orientat pe urmatorul pas"
        })
      });
      const result = await response.json();
      if (response.ok) {
        generated = result;
      } else if (openAIConfigured) {
        console.error("AI follow-up API error", result);
        if (result.code === "insufficient_quota") {
          setOpenAIUnavailable(true);
          setSuccess("Follow-up-ul va fi pregătit cu draft standard.");
        } else {
          setError(result.error ? `Documentul nu a putut fi generat: ${result.error}` : "Documentul nu a putut fi generat.");
          setLoading("");
          return;
        }
      }
    } catch (apiError) {
      console.error("AI follow-up client error", apiError);
      if (openAIConfigured) {
        setSuccess("Follow-up-ul va fi pregătit cu draft standard.");
      }
    }

    const dueAt = new Date(`${followUpDate}T${followUpTime || "09:00"}:00`).toISOString();

    let persistedActionId = `follow-up-${Date.now()}`;
    let persistedDueAt = dueAt;
    let persistedPriority = followUpPriority;
    let persistedActionStatus: OpportunityAction["status"] = "pending";

    if (isSupabaseConfigured) {
      const result = await persistFollowUp(opportunity.id, generated, {
        title: followUpTitle,
        dueAt,
        priority: followUpPriority,
        description: followUpNote || generated.content
      });
      if (!result.ok) {
        setError(result.error ?? "Nu am putut programa follow-up-ul.");
        setLoading("");
        restoreScrollPosition(scroll.top, scroll.left);
        return;
      }
      persistedActionId = result.id ?? persistedActionId;
      persistedDueAt = result.dueAt ?? persistedDueAt;
      persistedPriority = result.priority ?? persistedPriority;
      persistedActionStatus = result.status ?? persistedActionStatus;
    }

    setActions((current) => [
      {
        id: persistedActionId,
        type: "follow_up",
        title: followUpTitle,
        description: followUpNote || generated.content,
        status: persistedActionStatus,
        dueDate: persistedDueAt,
        priority: persistedPriority
      },
      ...current
    ]);
    setStatus("follow_up_needed");
    setShowFollowUpForm(false);
    setSuccess("Follow-up programat.");
    setDocuments((current) => [
      { id: `follow-up-doc-${Date.now()}`, type: "follow_up_email", title: generated.title, content: generated.content, status: "draft", generationMode: generated.mode, createdAt: new Date().toISOString() },
      ...current.filter((item) => item.type !== "follow_up_email")
    ]);
    setLoading("");
    restoreScrollPosition(scroll.top, scroll.left);
  }

  async function updateStatus(nextStatus: OpportunityStatus) {
    if ((nextStatus === "lost" || nextStatus === "ignored") && !window.confirm(nextStatus === "lost" ? "Ești sigur că vrei să marchezi această oportunitate ca pierdută?" : "Ești sigur că vrei să ignori această oportunitate?")) {
      return;
    }
    const scroll = captureScrollPosition();
    setLoading(nextStatus);
    setError("");
    setSuccess("");

    if (isSupabaseConfigured) {
      const result = await persistOpportunityStatus(opportunity.id, nextStatus);
      if (!result.ok) {
        setError(result.error ?? "Nu am putut actualiza statusul.");
        setLoading("");
        restoreScrollPosition(scroll.top, scroll.left);
        return;
      }
    }

    setStatus(nextStatus);
    setSuccess("Status actualizat.");
    setLoading("");
    restoreScrollPosition(scroll.top, scroll.left);
  }

  function openDocument(document: GeneratedDocument | OpportunityDocument) {
    setSelectedDocumentId(document.id);
    setEditorTitle(document.title);
    setEditorContent(document.content ?? "");
    setSavedEditorTitle(document.title);
    setSavedEditorContent(document.content ?? "");
    setSavedRecipientEmail(recipientEmail);
    setSavedCcEmail(ccEmail);
    setSuccess("");
    setError("");
  }

  async function saveDocumentEdits(status: "edited" | "approved" | "ready_to_send" | "archived" = "edited") {
    if (!selectedDocument) return;
    if (status === "edited" && !hasUnsavedChanges) return;
    const scroll = captureScrollPosition();
    setLoading(`doc-${status}`);
    setError("");
    const result = await updateGeneratedDocument(opportunity.id, selectedDocument.id, {
      title: editorTitle,
      content: editorContent,
      status
    });
    if (!result.ok) {
      setError(result.error ?? "Documentul nu a putut fi salvat.");
      setLoading("");
      restoreScrollPosition(scroll.top, scroll.left);
      return;
    }
    const timestamp = result.updatedAt ?? new Date().toISOString();
    const timestampUpdate = status === "edited" ? { editedAt: timestamp } : status === "ready_to_send" ? { readyAt: timestamp } : {};
    setDocuments((current) =>
      current.map((document) =>
        document.id === selectedDocument.id ? { ...document, title: editorTitle, content: editorContent, status, ...timestampUpdate } : document
      )
    );
    setDocumentOverrides((current) => ({
      ...current,
      [selectedDocument.id]: { title: editorTitle, content: editorContent, status, ...timestampUpdate }
    }));
    setSavedEditorTitle(editorTitle);
    setSavedEditorContent(editorContent);
    setSavedRecipientEmail(recipientEmail);
    setSavedCcEmail(ccEmail);
    if (status === "approved") setSuccess("Draftul a fost aprobat explicit. Nu a fost trimis extern.");
    else if (status === "ready_to_send") setSuccess("Draftul a fost pregătit pentru utilizare manuală.");
    else if (status === "archived") setSuccess("Draftul a fost arhivat.");
    else setSuccess("Modificările au fost salvate pentru revizuire.");
    setLoading("");
    restoreScrollPosition(scroll.top, scroll.left);
  }

  async function copyDocument() {
    if (!selectedDocument) return;
    const scroll = captureScrollPosition();
    try {
      await navigator.clipboard.writeText(editorContent);
    } catch (copyError) {
      console.error("Clipboard copy error", copyError);
      setError("Nu am putut copia automat. Selecteaza manual textul.");
      restoreScrollPosition(scroll.top, scroll.left);
      return;
    }
    const result = await updateGeneratedDocument(opportunity.id, selectedDocument.id, { markCopied: true });
    if (!result.ok) {
      setError(result.error ?? "Documentul a fost copiat, dar statusul nu a putut fi salvat.");
      restoreScrollPosition(scroll.top, scroll.left);
      return;
    }
    const copiedAt = result.updatedAt ?? new Date().toISOString();
    setDocuments((current) => current.map((document) => (document.id === selectedDocument.id ? { ...document, copiedAt } : document)));
    setDocumentOverrides((current) => ({
      ...current,
      [selectedDocument.id]: { copiedAt }
    }));
    setSuccess("Emailul a fost copiat.");
    restoreScrollPosition(scroll.top, scroll.left);
  }

  async function updateAction(actionId: string, action: "done" | "postpone" | "cancel") {
    const scroll = captureScrollPosition();
    setLoading(`action-${actionId}`);
    setError("");
    const result = await updateOpportunityAction(opportunity.id, actionId, action);
    if (!result.ok) {
      setError(result.error ?? "Acțiunea nu a putut fi actualizată.");
      setLoading("");
      restoreScrollPosition(scroll.top, scroll.left);
      return;
    }
    setActions((current) =>
      current.map((item) =>
        item.id === actionId
          ? {
              ...item,
              status: action === "cancel" ? "cancelled" : action === "done" ? "done" : item.status,
              dueDate: action === "postpone" ? new Date(Date.now() + 3 * 86400000).toISOString() : item.dueDate
            }
          : item
      )
    );
    setSuccess(action === "postpone" ? "Actiunea a fost amanata." : action === "cancel" ? "Actiunea a fost anulata." : "Actiunea a fost finalizata.");
    setLoading("");
    restoreScrollPosition(scroll.top, scroll.left);
  }

  function closeDocumentEditor() {
    const scroll = captureScrollPosition();
    setSelectedDocumentId("");
    setSuccess("");
    setError("");
    restoreScrollPosition(scroll.top, scroll.left);
  }

  function preserveScrollAfterUtilityClick() {
    const scroll = captureScrollPosition();
    restoreScrollPosition(scroll.top, scroll.left);
  }

  return (
    <div className="grid gap-6">
      {(success || (error && !pendingLocalDocument)) ? (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm print:hidden">
          <StatusNotice tone={error && !pendingLocalDocument ? "warning" : "success"}>
            {error && !pendingLocalDocument ? error : success}
          </StatusNotice>
        </div>
      ) : null}
      <DataCard title="Ce vezi aici?">
        <p className="text-sm leading-6 text-zinc-300">
          Această pagină transformă un semnal comercial într-o oportunitate concretă. Vezi scorurile, riscurile,
          următorul pas și poți genera documente sau acțiuni comerciale.
        </p>
      </DataCard>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-zinc-300">
          {getOpportunityTypeLabel(opportunity.type)}
        </span>
        <StatusBadge status={status} />
        <ScoreBadge label="Fit" score={opportunity.fitScore} />
        <ScoreBadge label="Urgenta" score={opportunity.urgencyScore} />
        <ScoreBadge label="Bani" score={opportunity.moneyScore} />
        <ScoreBadge label="Incredere" score={opportunity.confidenceScore} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <DataCard title="Detalii oportunitate">
          <dl className="grid gap-4 sm:grid-cols-2">
            {topDetails.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</dt>
                <dd className="mt-1 font-semibold text-white">{value}</dd>
              </div>
            ))}
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-[0.14em] text-zinc-500">Contact</dt>
              <dd className="mt-1 font-semibold text-white">
                {opportunity.contact
                  ? `${opportunity.contact.name}, ${opportunity.contact.role}, ${opportunity.contact.company}`
                  : "Contact neconfirmat"}
              </dd>
              {opportunity.contact?.email ? <p className="mt-1 text-sm text-zinc-400">{opportunity.contact.email}</p> : null}
              {opportunity.contact?.phone ? <p className="text-sm text-zinc-400">{opportunity.contact.phone}</p> : null}
            </div>
          </dl>
        </DataCard>

        <DataCard title="Proces comercial" description={workflowDescription}>
          <p className="mb-4 text-sm leading-6 text-zinc-400">
            Alege următorul pas comercial, apoi revizuiește documentul înainte de a-l folosi.
          </p>
          <div className="grid gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Comunicare</p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={Boolean(loading)} className="min-h-11 flex-1 rounded-lg bg-mint-500 px-4 py-3 text-sm font-semibold text-ink-950 hover:bg-mint-400 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => generateDocument("outreach_email", "Email outreach", generateOutreachEmail(opportunity, business))}>
                {loading === "outreach_email" ? "Se pregătește documentul..." : "Generează email outreach"}
              </button>
            </div>
              <div className="mt-2 flex items-center gap-2">
              <button type="button" disabled={Boolean(loading)} className="min-h-11 flex-1 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60" onClick={() => generateDocument("call_script", "Script apel", generateCallScript(opportunity, business))}>
                {loading === "call_script" ? "Se pregătește documentul..." : "Generează script apel"}
              </button>
            </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Materiale comerciale</p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={Boolean(loading)} className="min-h-11 flex-1 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60" onClick={() => generateDocument("offer_draft", "Draft oferta", generateOfferDraft(opportunity, business))}>
                {loading === "offer_draft" ? "Se pregătește documentul..." : "Generează draft ofertă"}
              </button>
            </div>
              <div className="mt-2 flex items-center gap-2">
              <button type="button" disabled={Boolean(loading)} className="min-h-11 flex-1 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60" onClick={() => generateDocument("procurement_checklist", "Checklist actiune", generateChecklist(opportunity, business))}>
                {loading === "procurement_checklist" ? "Se pregătește documentul..." : "Generează checklist"}
              </button>
            </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Follow-up</p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={Boolean(loading)} className="min-h-11 flex-1 rounded-lg border border-gold-400/25 bg-gold-400/10 px-4 py-3 text-sm font-semibold text-gold-400 hover:bg-gold-400/15 disabled:cursor-not-allowed disabled:opacity-60" onClick={scheduleFollowUp}>
                {loading === "follow_up" ? "Se salvează..." : "Programează follow-up"}
              </button>
            </div>
            </div>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Rezultat</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ["contacted", "Marchează contactat"]
            ].map(([nextStatus, label]) => (
              <span key={nextStatus} className="inline-flex items-center gap-2">
                <button
                  type="button"
                  disabled={Boolean(loading)}
                  onClick={() => updateStatus(nextStatus as OpportunityStatus)}
                  className="rounded-lg border border-white/10 bg-ink-900/80 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white"
                >
                  {label}
                </button>
              </span>
            ))}
          </div>
          {error ? (
            <StatusNotice
              tone="warning"
              className="mt-3"
              action={
                pendingLocalDocument ? (
                  <button type="button" onClick={generateLocalDocument} disabled={Boolean(loading)} className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.1] disabled:opacity-60">
                    Pregătește draft standard
                  </button>
                ) : null
              }
            >
              {error}
            </StatusNotice>
          ) : null}
        </DataCard>
      </div>

      <OpportunityContactsPanel opportunityId={opportunity.id} contacts={opportunity.contacts ?? []} existingContacts={existingContacts} />

      <div className="grid gap-6 lg:grid-cols-3">
        <DataCard title="Sumar tip AI">
          <p className="text-sm leading-6 text-zinc-300">{opportunity.summary}</p>
        </DataCard>
        <DataCard title="De ce conteaza">
          <ul className="space-y-3 text-sm leading-6 text-zinc-300">
            {opportunity.relevance.map((item, index) => (
              <li key={`${index}-${item}`}>{item}</li>
            ))}
          </ul>
        </DataCard>
        <DataCard title="Riscuri">
          <ul className="space-y-3 text-sm leading-6 text-zinc-300">
            {opportunity.risks.map((item, index) => (
              <li key={`${index}-${item}`}>{item}</li>
            ))}
          </ul>
        </DataCard>
      </div>

        <DataCard title="Acțiuni programate">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowFollowUpForm((current) => !current)}
            className="rounded-lg border border-gold-400/25 bg-gold-400/10 px-4 py-2 text-sm font-semibold text-gold-400 hover:bg-gold-400/15"
          >
            {showFollowUpForm ? "Închide formular follow-up" : "Configurează follow-up"}
          </button>
        </div>
        {showFollowUpForm ? (
          <div className="mb-5 grid gap-3 rounded-lg border border-white/10 bg-ink-900/70 p-4">
            <input value={followUpTitle} onChange={(event) => setFollowUpTitle(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950/80 px-4 text-white outline-none" />
            <div className="grid gap-3 sm:grid-cols-3">
              <input type="date" value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950/80 px-4 text-white outline-none" />
              <input type="time" value={followUpTime} onChange={(event) => setFollowUpTime(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950/80 px-4 text-white outline-none" />
              <select value={followUpPriority} onChange={(event) => setFollowUpPriority(event.target.value as "low" | "medium" | "high")} className="h-11 rounded-lg border border-white/10 bg-ink-950/80 px-4 text-white outline-none">
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </div>
            <textarea value={followUpNote} onChange={(event) => setFollowUpNote(event.target.value)} rows={5} className="rounded-lg border border-white/10 bg-ink-950/80 px-4 py-3 text-white outline-none" />
            <button type="button" onClick={scheduleFollowUp} disabled={Boolean(loading)} className="w-fit rounded-lg bg-mint-500 px-4 py-2 text-sm font-semibold text-ink-950 disabled:opacity-60">
              {loading === "follow_up" ? "Se salvează..." : "Salvează follow-up"}
            </button>
          </div>
        ) : null}
        {actions.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {actions.map((existing) => {
              const typeLabel = actionLabels.find(([type]) => type === existing.type)?.[1];
              return (
                <article key={existing.id} className="rounded-lg border border-white/10 bg-ink-900/70 p-4">
                  <p className="text-sm font-semibold text-white">{existing.title}</p>
                  {typeLabel && typeLabel !== existing.title ? <p className="mt-1 text-xs text-zinc-500">{typeLabel}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded border border-white/10 px-2 py-1 text-zinc-300">{existing.status}</span>
                    <span className="rounded border border-white/10 px-2 py-1 text-zinc-300">{existing.priority ?? "medium"}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {existing?.description ?? "Acțiune pregătită pentru acest tip de oportunitate."}
                  </p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-mint-400">
                    {existing ? formatDateTimeWithSeconds(existing.dueDate) : "Fără termen"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => updateAction(existing.id, "done")} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white">
                      Marchează finalizat
                    </button>
                    <button type="button" onClick={() => updateAction(existing.id, "postpone")} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white">
                      Amână 3 zile
                    </button>
                    <button type="button" onClick={() => updateAction(existing.id, "cancel")} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white">
                      Anulează
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState title="Nu există acțiuni programate" description="Programează un follow-up sau marchează oportunitatea ca contactată." />
        )}
      </DataCard>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <DataCard title="Text sursă brut">
          <p className="rounded-lg border border-white/10 bg-ink-900/80 p-4 text-sm leading-6 text-zinc-300">
            {opportunity.rawSourceText}
          </p>
        </DataCard>
        <DataCard title="Istoric și acțiuni">
          <div className="space-y-4">
            {opportunity.timeline.length > 0 ? (
              opportunity.timeline.map((event) => (
                <div key={event.id} className="rounded-lg border border-white/10 bg-ink-900/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-xs font-semibold text-mint-300">?</span>
                    <p className="font-semibold text-white">{event.label}</p>
                    <span className="rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-xs font-semibold text-zinc-300">{event.type ?? "event"}</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">{formatDateTimeWithSeconds(event.date)}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{event.description}</p>
                </div>
              ))
            ) : (
              <EmptyState title="Nu există evenimente încă" description="Generează un document sau programează un follow-up pentru a începe workflow-ul." />
            )}
            {status !== opportunity.status ? (
              <div className="rounded-lg border border-mint-400/20 bg-mint-400/10 p-4">
                <p className="font-semibold text-mint-400">Status actualizat</p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  Statusul oportunității a fost actualizat.
                </p>
              </div>
            ) : null}
          </div>
        </DataCard>
      </div>

      <div ref={documentsSectionRef}>
      <DataCard
        title="Documente generate"
        description={
          "Documentele sunt salvate în workspace. Revizuiește textul înainte de trimitere."
        }
      >
        {selectedDocument ? (
          <div className="mb-5 grid gap-4 rounded-lg border border-mint-400/20 bg-mint-400/5 p-4">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-zinc-300">{documentTypeLabel(selectedDocument.type)}</span>
              {selectedDocument.generationMode ? (
                <span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-zinc-300">{selectedDocument.generationMode === "ai" ? "Draft asistat AI" : "Draft standard"}</span>
              ) : null}
              <span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-zinc-300">{documentStatusLabels[selectedDocument.status]}</span>
              <span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-zinc-300">Netrimis automat</span>
            </div>
            <dl className="grid gap-2 text-xs text-zinc-400 sm:grid-cols-3">
              <div>
                <dt className="uppercase tracking-[0.14em] text-zinc-500">Creat la</dt>
                <dd className="mt-1 font-semibold text-zinc-200">{formatDateTimeWithSeconds(selectedDocument.createdAt)}</dd>
              </div>
              {selectedDocument.editedAt ? (
                <div>
                  <dt className="uppercase tracking-[0.14em] text-zinc-500">Ultima editare</dt>
                  <dd className="mt-1 font-semibold text-zinc-200">{formatDateTimeWithSeconds(selectedDocument.editedAt)}</dd>
                </div>
              ) : null}
              {selectedDocument.sentAt ? (
                <div>
                  <dt className="uppercase tracking-[0.14em] text-zinc-500">Trimis la</dt>
                  <dd className="mt-1 font-semibold text-zinc-200">{formatDateTimeWithSeconds(selectedDocument.sentAt)}</dd>
                </div>
              ) : null}
            </dl>
            {selectedDocument.type === "outreach_email" || selectedDocument.type === "follow_up_email" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} placeholder="Către" className="h-11 min-w-0 rounded-lg border border-white/10 bg-ink-950/80 px-4 text-white outline-none" />
                <input value={ccEmail} onChange={(event) => setCcEmail(event.target.value)} placeholder="CC optional" className="h-11 rounded-lg border border-white/10 bg-ink-950/80 px-4 text-white outline-none" />
                {!recipientEmail ? <p className="text-xs text-gold-300 sm:col-span-2">Completează destinatarul înainte de trimitere.</p> : null}
              </div>
            ) : null}
            <input value={editorTitle} onChange={(event) => setEditorTitle(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950/80 px-4 text-white outline-none" />
            <textarea value={editorContent} onChange={(event) => setEditorContent(event.target.value)} rows={12} className="w-full min-w-0 resize-y rounded-lg border border-white/10 bg-ink-950/80 px-4 py-3 font-sans text-sm leading-6 text-white outline-none" />
            <p className={`text-sm font-semibold ${hasUnsavedChanges ? "text-gold-300" : "text-zinc-500"}`}>
              {hasUnsavedChanges ? "Ai modificări nesalvate." : "Toate modificările sunt salvate."}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => saveDocumentEdits("edited")}
                disabled={!hasUnsavedChanges || Boolean(loading)}
                className={
                  hasUnsavedChanges
                    ? "rounded-lg bg-mint-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-mint-400"
                    : "cursor-not-allowed rounded-lg border border-white/10 bg-white/[0.035] px-4 py-2 text-sm font-semibold text-zinc-500 opacity-70"
                }
              >
                Salvează modificările
              </button>
              <button type="button" onClick={copyDocument} className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white">Copiază</button>
              {(selectedDocument.type === "outreach_email" || selectedDocument.type === "follow_up_email") && recipientEmail && ["approved", "ready_to_send"].includes(selectedDocument.status) ? (
                <a
                  href={`mailto:${encodeURIComponent(recipientEmail)}?cc=${encodeURIComponent(ccEmail)}&subject=${encodeURIComponent(editorTitle)}&body=${encodeURIComponent(editorContent)}`}
                  onClick={preserveScrollAfterUtilityClick}
                  className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white"
                >
                  Deschide în client email
                </a>
              ) : null}
              <Link href={`/outreach/${selectedDocument.id}`} className="rounded-lg border border-mint-400/30 bg-mint-400/10 px-4 py-2 text-sm font-semibold text-mint-300">Deschide Follow-up Studio</Link>
              {!['approved', 'ready_to_send'].includes(selectedDocument.status) ? <button type="button" onClick={() => saveDocumentEdits("approved")} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-200">Aprobă draftul</button> : null}
              {selectedDocument.status === "approved" ? <button type="button" onClick={() => saveDocumentEdits("ready_to_send")} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-200">Pregătit pentru utilizare</button> : null}
              <a
                href={`data:text/plain;charset=utf-8,${encodeURIComponent(`${editorTitle}\n\n${editorContent}`)}`}
                download={`${editorTitle || "document"}.txt`}
                onClick={preserveScrollAfterUtilityClick}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white"
              >
                Descarcă .txt
              </a>
              <span className="inline-flex items-center rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-500">Trimiterea din aplicație nu este activă</span>
              <button type="button" onClick={closeDocumentEditor} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white">Închide</button>
            </div>
          </div>
        ) : null}
        {allDocuments.length > 0 ? (
          <div className="grid gap-4">
            {allDocuments.map((document) => (
              <button key={document.id} type="button" onClick={() => openDocument(document)} className={`rounded-lg border bg-ink-900/70 p-4 text-left transition hover:border-mint-400/30 ${selectedDocumentId === document.id ? "border-mint-400/35" : highlightedDocumentId === document.id ? "border-gold-400/40 bg-gold-400/5" : "border-white/10"}`}>
                <p className="font-semibold text-white">{document.title}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-zinc-300">{documentTypeLabel(document.type)}</span>
                  <span className="inline-flex rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-zinc-300">{document.generationMode === "ai" ? "Draft asistat" : "Draft standard"}</span>
                  <span className="inline-flex rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-zinc-300">{documentStatusLabels[document.status]}</span>
                  {document.createdAt ? <span className="inline-flex rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-zinc-300">Creat la: {formatDateTimeWithSeconds(document.createdAt)}</span> : null}
                </div>
                {"content" in document && document.content ? (
                  <div className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/10 bg-ink-950/80 p-4 font-sans text-sm leading-6 text-zinc-300">
                    {document.content.slice(0, 500)}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-zinc-400">Draft pregătit pentru revizuire.</p>
                )}
              </button>
            ))}
          </div>
        ) : (
          <EmptyState title="Nu există documente generate încă" description="Generează un email, script de apel sau draft de ofertă pentru această oportunitate." />
        )}
      </DataCard>
      </div>
    </div>
  );
}
