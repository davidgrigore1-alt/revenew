"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DataCard } from "@/components/dashboard/DataCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { getOpportunityTypeLabel } from "@/components/dashboard/OpportunityCard";
import { ScoreBadge } from "@/components/dashboard/ScoreBadge";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { OpportunityContactsPanel } from "@/components/opportunities/OpportunityContactsPanel";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { useToast } from "@/components/ui/ToastProvider";
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
import { toUserFacingActionError } from "@/lib/user-facing-errors";

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

const actionPriorityLabels: Record<string, string> = {
  low: "Prioritate redusă",
  medium: "Prioritate normală",
  high: "Prioritate ridicată"
};

const actionStatusLabels: Record<string, string> = {
  pending: "În așteptare",
  done: "Finalizată",
  completed: "Finalizată",
  cancelled: "Anulată"
};


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
  const router = useRouter();
  const { showToast } = useToast();
  const [status, setStatus] = useState<OpportunityStatus>(opportunity.status);
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [documentOverrides, setDocumentOverrides] = useState<Record<string, Partial<OpportunityDocument>>>({});
  const [actions, setActions] = useState<OpportunityAction[]>(opportunity.actions);
  useEffect(() => { setActions(opportunity.actions); setStatus(opportunity.status); }, [opportunity.actions, opportunity.status]);
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
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
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
  const documentsSectionRef = useRef<HTMLDetailsElement>(null);

  const source = opportunity.source ?? getOpportunityTypeLabel(opportunity.type);
  const savedDocuments = opportunity.documents.map((document) => ({ ...document, ...(documentOverrides[document.id] ?? {}) }));
  const allDocuments = [
    ...documents,
    ...savedDocuments.filter((savedDocument) => !documents.some((document) => document.id === savedDocument.id))
  ];
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
    : "Explorează fluxul comercial cu date demonstrative.";
  const safeError = error ? toUserFacingActionError(error, error) : "";

  useEffect(() => {
    if (!success) return;
    const actionRelated = /follow-up|acțiun|actiune/i.test(success);
    showToast({
      title: "Actualizare înregistrată",
      description: success,
      tone: "success",
      action: actionRelated ? { label: "Deschide Activitatea mea", href: "/today" } : undefined
    });
  }, [showToast, success]);

  useEffect(() => {
    if (!safeError || pendingLocalDocument) return;
    showToast({ title: "Acțiunea nu a fost aplicată", description: safeError, tone: "danger" });
  }, [pendingLocalDocument, safeError, showToast]);

  useEffect(() => {
    function openTargetedSection() {
      if (window.location.hash === "#opportunity-source-context") setEvidenceOpen(true);
      if (window.location.hash === "#opportunity-documents" || window.location.hash === "#documents") setDocumentsOpen(true);
    }
    openTargetedSection();
    window.addEventListener("hashchange", openTargetedSection);
    return () => window.removeEventListener("hashchange", openTargetedSection);
  }, []);

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
      setDocumentsOpen(true);
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
    router.refresh();
    setSuccess("Follow-up programat. Îl poți revizui în Activitatea mea.");
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
    router.refresh();
    setSuccess("Status actualizat.");
    setLoading("");
    restoreScrollPosition(scroll.top, scroll.left);
  }

  function openDocument(document: GeneratedDocument | OpportunityDocument) {
    setDocumentsOpen(true);
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
              dueDate: action === "postpone" && "dueAt" in result && result.dueAt ? result.dueAt : item.dueDate
            }
          : item
      )
    );
    router.refresh();
    setSuccess(action === "postpone" ? "Acțiunea a fost amânată." : action === "cancel" ? "Acțiunea a fost anulată." : "Acțiunea a fost finalizată.");
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
      <details className="group rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
        <summary className="focus-ring flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-card px-4 py-3 text-sm font-semibold marker:hidden">
          <span>Evaluare și date operaționale <span className="font-normal text-[rgb(var(--text-muted))]">· consultă la nevoie</span></span>
          <span aria-hidden="true" className="text-[rgb(var(--primary))] transition-transform group-open:rotate-45">+</span>
        </summary>
        <div className="flex flex-wrap items-center gap-2 border-t border-[rgb(var(--border))] px-4 py-4">
          <span className="rounded-pill border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2.5 py-1 text-xs font-semibold">{getOpportunityTypeLabel(opportunity.type)}</span>
          <StatusBadge status={status} />
          <ScoreBadge label="Fit" score={opportunity.fitScore} />
          <ScoreBadge label="Urgență" score={opportunity.urgencyScore} />
          <ScoreBadge label="Valoare" score={opportunity.moneyScore} />
          <ScoreBadge label="Încredere" score={opportunity.confidenceScore} />
          <span className="w-full text-xs text-[rgb(var(--text-muted))] sm:ml-auto sm:w-auto">Scorurile susțin prioritizarea; nu confirmă venit.</span>
        </div>
      </details>

      <details id="workflow-actions" className="scroll-mt-24 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]" open>
        <summary className="focus-ring flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold marker:hidden"><span>Pregătește un document</span><span aria-hidden="true">+</span></summary>
        <div className="border-t border-[rgb(var(--border))] p-4">
        <DataCard title="Pregătește un document" description={workflowDescription}>
          <p className="mb-5 text-sm leading-6 text-[rgb(var(--text-muted))]">Alege un rezultat concret, pregătește documentul și revizuiește-l înainte de orice utilizare externă.</p>
          <div className="grid gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">Comunicare</p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={Boolean(loading)} className="focus-ring min-h-11 flex-1 rounded-button bg-[rgb(var(--primary))] px-4 py-3 text-sm font-semibold text-[rgb(var(--primary-foreground))] hover:bg-[rgb(var(--primary-hover))] disabled:cursor-not-allowed disabled:opacity-60" onClick={() => generateDocument("outreach_email", "Email outreach", generateOutreachEmail(opportunity, business))}>
                {loading === "outreach_email" ? "Se pregătește documentul..." : "Generează email outreach"}
              </button>
            </div>
              <div className="mt-2 flex items-center gap-2">
              <button type="button" disabled={Boolean(loading)} className="focus-ring min-h-11 flex-1 rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-3 text-sm font-semibold text-[rgb(var(--foreground))] hover:bg-[rgb(var(--surface-muted))] disabled:cursor-not-allowed disabled:opacity-60" onClick={() => generateDocument("call_script", "Script apel", generateCallScript(opportunity, business))}>
                {loading === "call_script" ? "Se pregătește documentul..." : "Generează script apel"}
              </button>
            </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">Materiale comerciale</p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={Boolean(loading)} className="focus-ring min-h-11 flex-1 rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-3 text-sm font-semibold text-[rgb(var(--foreground))] hover:bg-[rgb(var(--surface-muted))] disabled:cursor-not-allowed disabled:opacity-60" onClick={() => generateDocument("offer_draft", "Draft oferta", generateOfferDraft(opportunity, business))}>
                {loading === "offer_draft" ? "Se pregătește documentul..." : "Generează draft ofertă"}
              </button>
            </div>
              <div className="mt-2 flex items-center gap-2">
              <button type="button" disabled={Boolean(loading)} className="focus-ring min-h-11 flex-1 rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-3 text-sm font-semibold text-[rgb(var(--foreground))] hover:bg-[rgb(var(--surface-muted))] disabled:cursor-not-allowed disabled:opacity-60" onClick={() => generateDocument("procurement_checklist", "Checklist actiune", generateChecklist(opportunity, business))}>
                {loading === "procurement_checklist" ? "Se pregătește documentul..." : "Generează checklist"}
              </button>
            </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">Follow-up</p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={Boolean(loading)} className="focus-ring min-h-11 flex-1 rounded-button border border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--primary-muted))] px-4 py-3 text-sm font-semibold text-[rgb(var(--primary))] hover:border-[rgb(var(--primary)/0.42)] disabled:cursor-not-allowed disabled:opacity-60" onClick={scheduleFollowUp}>
                {loading === "follow_up" ? "Se salvează..." : "Programează follow-up"}
              </button>
            </div>
            </div>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">Rezultat</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ["contacted", "Marchează contactat"]
            ].map(([nextStatus, label]) => (
              <span key={nextStatus} className="inline-flex items-center gap-2">
                <button
                  type="button"
                  disabled={Boolean(loading)}
                  onClick={() => updateStatus(nextStatus as OpportunityStatus)}
                  className="focus-ring rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-xs font-semibold text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]"
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
                  <button type="button" onClick={generateLocalDocument} disabled={Boolean(loading)} className="focus-ring rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-2 text-sm font-semibold text-[rgb(var(--foreground))] transition-colors hover:bg-[rgb(var(--surface-elevated))] disabled:opacity-60">
                    Pregătește draft standard
                  </button>
                ) : null
              }
            >
              {safeError}
            </StatusNotice>
          ) : null}
        </DataCard>
        </div>
      </details>

      <details id="action-contacts" className="scroll-mt-24 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]"><summary className="focus-ring flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold marker:hidden"><span>Contacte asociate</span><span aria-hidden="true">+</span></summary><div id="opportunity-contacts" className="border-t border-[rgb(var(--border))] p-4"><OpportunityContactsPanel opportunityId={opportunity.id} contacts={opportunity.contacts ?? []} existingContacts={existingContacts} /></div></details>

      <details className="group rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
        <summary className="focus-ring flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-card px-4 py-3 text-sm font-semibold marker:hidden">
          <span>Context la analiză <span className="font-normal text-[rgb(var(--text-muted))]">· observații istorice, nu starea curentă</span></span>
          <span aria-hidden="true" className="text-[rgb(var(--primary))] transition-transform group-open:rotate-45">+</span>
        </summary>
        <div className="grid gap-4 border-t border-[rgb(var(--border))] p-4 lg:grid-cols-3">
          <DataCard title="Rezumat înregistrat">
            <p className="text-sm leading-6 text-[rgb(var(--text-secondary))]">{opportunity.summary}</p>
          </DataCard>
          <DataCard title="De ce contează">
            <ul className="space-y-3 text-sm leading-6 text-[rgb(var(--text-secondary))]">
              {opportunity.relevance.map((item, index) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ul>
          </DataCard>
          <DataCard title="Riscuri la analiză">
            <ul className="space-y-3 text-sm leading-6 text-[rgb(var(--text-secondary))]">
              {opportunity.risks.map((item, index) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ul>
          </DataCard>
        </div>
      </details>

        <div id="workflow-actions-list" className="scroll-mt-24"><DataCard title="Acțiuni programate">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowFollowUpForm((current) => !current)}
            className="focus-ring rounded-button border border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--primary-muted))] px-4 py-2 text-sm font-semibold text-[rgb(var(--primary))] hover:border-[rgb(var(--primary)/0.42)]"
          >
            {showFollowUpForm ? "Închide formular follow-up" : "Configurează follow-up"}
          </button>
        </div>
        {showFollowUpForm ? (
          <div className="mb-5 grid gap-3 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4">
            <input aria-label="Titlu follow-up" value={followUpTitle} onChange={(event) => setFollowUpTitle(event.target.value)} className="focus-ring h-11 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 text-[rgb(var(--foreground))]" />
            <div className="grid gap-3 sm:grid-cols-3">
              <input aria-label="Data follow-up" type="date" value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} className="focus-ring h-11 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 text-[rgb(var(--foreground))]" />
              <input aria-label="Ora follow-up" type="time" value={followUpTime} onChange={(event) => setFollowUpTime(event.target.value)} className="focus-ring h-11 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 text-[rgb(var(--foreground))]" />
              <select aria-label="Prioritate follow-up" value={followUpPriority} onChange={(event) => setFollowUpPriority(event.target.value as "low" | "medium" | "high")} className="focus-ring h-11 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 text-[rgb(var(--foreground))]">
                <option value="low">Prioritate redusă</option>
                <option value="medium">Prioritate normală</option>
                <option value="high">Prioritate ridicată</option>
              </select>
            </div>
            <textarea aria-label="Notă follow-up" value={followUpNote} onChange={(event) => setFollowUpNote(event.target.value)} rows={5} className="focus-ring rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-3 text-[rgb(var(--foreground))]" />
            <button type="button" onClick={scheduleFollowUp} disabled={Boolean(loading)} className="focus-ring w-fit rounded-button bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-[rgb(var(--primary-foreground))] disabled:opacity-60">
              {loading === "follow_up" ? "Se salvează..." : "Salvează follow-up"}
            </button>
          </div>
        ) : null}
        {actions.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {actions.map((existing) => {
              const typeLabel = actionLabels.find(([type]) => type === existing.type)?.[1];
              return (
                <article key={existing.id} className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4">
                  <p className="text-sm font-semibold text-[rgb(var(--foreground))]">{existing.title}</p>
                  {typeLabel && typeLabel !== existing.title ? <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{typeLabel}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-pill border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2.5 py-1 text-[rgb(var(--text-secondary))]">{actionStatusLabels[existing.status] ?? "Stare neconfirmată"}</span>
                    <span className="rounded-pill border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2.5 py-1 text-[rgb(var(--text-secondary))]">{actionPriorityLabels[existing.priority ?? "medium"]}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">
                    {existing?.description ?? "Acțiune pregătită pentru acest tip de oportunitate."}
                  </p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--primary))]">
                    {existing ? formatDateTimeWithSeconds(existing.dueDate) : "Fără termen"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => updateAction(existing.id, "done")} className="focus-ring rounded-button border border-[rgb(var(--border))] px-3 py-2 text-xs font-semibold text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]">
                      Marchează finalizat
                    </button>
                    <button type="button" onClick={() => updateAction(existing.id, "postpone")} className="focus-ring rounded-button border border-[rgb(var(--border))] px-3 py-2 text-xs font-semibold text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]">
                      Amână 3 zile
                    </button>
                    <button type="button" onClick={() => updateAction(existing.id, "cancel")} className="focus-ring rounded-button border border-[rgb(var(--border))] px-3 py-2 text-xs font-semibold text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]">
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
      </DataCard></div>

      <details id="opportunity-source-context" open={evidenceOpen} onToggle={(event) => setEvidenceOpen(event.currentTarget.open)} className="group scroll-mt-24 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
        <summary className="focus-ring flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-card px-4 py-3 marker:hidden sm:px-5">
          <span>
            <span className="block text-sm font-semibold">Contextul sursă al oportunității</span>
            <span className="mt-0.5 block text-xs font-normal text-[rgb(var(--text-muted))]">Textul de origine rămâne disponibil pentru verificare, separat de cronologia comercială.</span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-[rgb(var(--primary))] transition-transform group-open:rotate-45">+</span>
        </summary>
      <div className="border-t border-[rgb(var(--border))] p-4">
        <DataCard title="Context inițial" description="Textul sursă este păstrat pentru verificare și nu înlocuiește analiza umană.">
          <details className="group rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-3">
            <summary className="focus-ring flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-button px-1 text-sm font-semibold text-[rgb(var(--foreground))] marker:hidden">
              Consultă textul sursă
              <span className="text-xs font-normal text-[rgb(var(--text-muted))] group-open:hidden">Secțiune pliată</span>
            </summary>
            <p className="mt-3 border-t border-[rgb(var(--border))] pt-3 text-sm leading-6 text-[rgb(var(--text-secondary))]">
              {opportunity.rawSourceText || "Nu există text sursă disponibil pentru această oportunitate."}
            </p>
          </details>
        </DataCard>
      </div>
      </details>

      <details id="opportunity-documents" ref={documentsSectionRef} open={documentsOpen} onToggle={(event) => setDocumentsOpen(event.currentTarget.open)} className="group scroll-mt-24 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
      <summary className="focus-ring flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-card px-4 py-3 marker:hidden sm:px-5">
        <span>
          <span className="block text-sm font-semibold">Documente și drafturi</span>
          <span className="mt-0.5 block text-xs font-normal text-[rgb(var(--text-muted))]">{allDocuments.length} documente · revizuire umană înainte de orice utilizare</span>
        </span>
        <span aria-hidden="true" className="shrink-0 text-[rgb(var(--primary))] transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="border-t border-[rgb(var(--border))] p-4">
      <span id="documents" className="scroll-mt-24" />
      <DataCard
        title="Documente generate"
        description={
          "Documentele sunt salvate în spațiul de lucru. Revizuiește textul înainte de trimitere."
        }
      >
        {selectedDocument ? (
          <div className="mb-5 grid gap-4 rounded-card border border-[rgb(var(--border-strong))] border-l-2 border-l-[rgb(var(--primary))] bg-[rgb(var(--surface))] p-4">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-pill border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--text-secondary))]">{documentTypeLabel(selectedDocument.type)}</span>
              {selectedDocument.generationMode ? (
                <span className="rounded-pill border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--text-secondary))]">{selectedDocument.generationMode === "ai" ? "Draft asistat AI" : "Draft standard"}</span>
              ) : null}
              <span className="rounded-pill border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--text-secondary))]">{documentStatusLabels[selectedDocument.status]}</span>
              <span className="rounded-pill border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--text-secondary))]">Netrimis automat</span>
            </div>
            <dl className="grid gap-2 text-xs text-[rgb(var(--text-muted))] sm:grid-cols-3">
              <div>
                <dt className="uppercase tracking-[0.14em] text-[rgb(var(--text-faint))]">Creat la</dt>
                <dd className="mt-1 font-semibold text-[rgb(var(--foreground))]">{formatDateTimeWithSeconds(selectedDocument.createdAt)}</dd>
              </div>
              {selectedDocument.editedAt ? (
                <div>
                  <dt className="uppercase tracking-[0.14em] text-[rgb(var(--text-faint))]">Ultima editare</dt>
                  <dd className="mt-1 font-semibold text-[rgb(var(--foreground))]">{formatDateTimeWithSeconds(selectedDocument.editedAt)}</dd>
                </div>
              ) : null}
              {selectedDocument.sentAt ? (
                <div>
                  <dt className="uppercase tracking-[0.14em] text-[rgb(var(--text-faint))]">Trimis la</dt>
                  <dd className="mt-1 font-semibold text-[rgb(var(--foreground))]">{formatDateTimeWithSeconds(selectedDocument.sentAt)}</dd>
                </div>
              ) : null}
            </dl>
            {selectedDocument.type === "outreach_email" || selectedDocument.type === "follow_up_email" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} placeholder="Către" className="focus-ring h-11 min-w-0 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 text-[rgb(var(--foreground))] outline-none focus:border-[rgb(var(--primary))]" />
                <input value={ccEmail} onChange={(event) => setCcEmail(event.target.value)} placeholder="CC optional" className="focus-ring h-11 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 text-[rgb(var(--foreground))] outline-none focus:border-[rgb(var(--primary))]" />
                {!recipientEmail ? <p className="text-xs text-[rgb(var(--warning-text))] sm:col-span-2">Completează destinatarul înainte de trimitere.</p> : null}
              </div>
            ) : null}
            <input value={editorTitle} onChange={(event) => setEditorTitle(event.target.value)} className="focus-ring h-11 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 text-[rgb(var(--foreground))] outline-none focus:border-[rgb(var(--primary))]" />
            <textarea value={editorContent} onChange={(event) => setEditorContent(event.target.value)} rows={12} className="focus-ring w-full min-w-0 resize-y rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-3 font-sans text-sm leading-6 text-[rgb(var(--foreground))] outline-none focus:border-[rgb(var(--primary))]" />
            <p className={`text-sm font-semibold ${hasUnsavedChanges ? "text-[rgb(var(--warning-text))]" : "text-[rgb(var(--text-faint))]"}`}>
              {hasUnsavedChanges ? "Ai modificări nesalvate." : "Toate modificările sunt salvate."}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => saveDocumentEdits("edited")}
                disabled={!hasUnsavedChanges || Boolean(loading)}
                className={
                  hasUnsavedChanges
                    ? "focus-ring rounded-control bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-[rgb(var(--primary-foreground))] hover:bg-[rgb(var(--primary-hover))]"
                    : "cursor-not-allowed rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-2 text-sm font-semibold text-[rgb(var(--text-faint))] opacity-70"
                }
              >
                Salvează modificările
              </button>
              <button type="button" onClick={copyDocument} className="focus-ring rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-2 text-sm font-semibold text-[rgb(var(--foreground))] hover:bg-[rgb(var(--surface-elevated))]">Copiază</button>
              {(selectedDocument.type === "outreach_email" || selectedDocument.type === "follow_up_email") && recipientEmail && ["approved", "ready_to_send"].includes(selectedDocument.status) ? (
                <a
                  href={`mailto:${encodeURIComponent(recipientEmail)}?cc=${encodeURIComponent(ccEmail)}&subject=${encodeURIComponent(editorTitle)}&body=${encodeURIComponent(editorContent)}`}
                  onClick={preserveScrollAfterUtilityClick}
                  className="focus-ring rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-2 text-sm font-semibold text-[rgb(var(--foreground))] hover:bg-[rgb(var(--surface-elevated))]"
                >
                  Deschide în client email
                </a>
              ) : null}
              <Link href={`/outreach/${selectedDocument.id}`} className="focus-ring rounded-control border border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--surface-subtle))] px-4 py-2 text-sm font-semibold text-[rgb(var(--primary))]">Deschide Studio de follow-up</Link>
              {!['approved', 'ready_to_send'].includes(selectedDocument.status) ? <button type="button" onClick={() => saveDocumentEdits("approved")} className="focus-ring rounded-control border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--foreground))]">Aprobă draftul</button> : null}
              {selectedDocument.status === "approved" ? <button type="button" onClick={() => saveDocumentEdits("ready_to_send")} className="focus-ring rounded-control border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--foreground))]">Pregătit pentru utilizare</button> : null}
              <a
                href={`data:text/plain;charset=utf-8,${encodeURIComponent(`${editorTitle}\n\n${editorContent}`)}`}
                download={`${editorTitle || "document"}.txt`}
                onClick={preserveScrollAfterUtilityClick}
                className="focus-ring rounded-control border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--foreground))] hover:bg-[rgb(var(--surface-elevated))]"
              >
                Descarcă .txt
              </a>
              <span className="inline-flex items-center rounded-control border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--text-faint))]">Trimiterea din aplicație nu este activă</span>
              <button type="button" onClick={closeDocumentEditor} className="focus-ring rounded-control border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--foreground))] hover:bg-[rgb(var(--surface-elevated))]">Închide</button>
            </div>
          </div>
        ) : null}
        {allDocuments.length > 0 ? (
          <div className="grid gap-4">
            {allDocuments.map((document) => (
              <button key={document.id} type="button" onClick={() => openDocument(document)} className={`focus-ring rounded-card border bg-[rgb(var(--surface))] p-4 text-left transition hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-elevated))] ${selectedDocumentId === document.id ? "border-[rgb(var(--primary)/0.5)]" : highlightedDocumentId === document.id ? "border-[rgb(var(--warning-border))]" : "border-[rgb(var(--border))]"}`}>
                <p className="font-semibold text-[rgb(var(--foreground))]">{document.title}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex rounded-pill border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--text-secondary))]">{documentTypeLabel(document.type)}</span>
                  <span className="inline-flex rounded-pill border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--text-secondary))]">{document.generationMode === "ai" ? "Draft asistat" : "Draft standard"}</span>
                  <span className="inline-flex rounded-pill border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--text-secondary))]">{documentStatusLabels[document.status]}</span>
                  {document.createdAt ? <span className="inline-flex rounded-pill border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--text-secondary))]">Creat la: {formatDateTimeWithSeconds(document.createdAt)}</span> : null}
                </div>
                {"content" in document && document.content ? (
                  <div className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4 font-sans text-sm leading-6 text-[rgb(var(--text-secondary))]">
                    {document.content.slice(0, 500)}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">Draft pregătit pentru revizuire.</p>
                )}
              </button>
            ))}
          </div>
        ) : (
          <EmptyState title="Nu există documente generate încă" description="Generează un email, script de apel sau draft de ofertă pentru această oportunitate." />
        )}
      </DataCard>
      </div>
      </details>
    </div>
  );
}
