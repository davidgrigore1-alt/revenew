"use client";

import { useMemo, useState, useTransition } from "react";
import { DataCard } from "@/components/dashboard/DataCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { InboxIngestionActions } from "@/components/inbox/InboxIngestionActions";
import { SignalPreparationPanel } from "@/components/signals/SignalPreparationPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/ToastProvider";
import {
  analyzeCommercialSignal,
  approveCommercialSignal,
  archiveCommercialSignal,
  createCommercialSignal,
  setCommercialSignalReviewDecision,
  updateCommercialSignal
} from "@/lib/commercial-inbox-actions";
import type {
  CommercialSignal,
  CommercialSignalReviewStatus,
  CommercialSignalSource,
  RecoverabilityConfidence,
  RecoverabilityUrgency
} from "@/lib/types";
import { formatRecoveryDraft } from "@/lib/recoverability-review";
import { formatCurrency, formatDateTimeWithSeconds } from "@/lib/utils";
import { toUserFacingActionError } from "@/lib/user-facing-errors";

type OrganizationOption = { id: string; name: string };
type ContactOption = { id: string; fullName: string; organizationId?: string | null; email?: string | null };
type ProfileOption = { id: string; fullName: string };
type OpportunityOption = { id: string; title: string; organizationId?: string | null; lifecycleStatus?: string | null };
type QueueFilter = "all" | "review" | "linked" | "converted" | "archived";

type CommercialInboxClientProps = {
  initialSignals: CommercialSignal[];
  tableReady: boolean;
  organizations: OrganizationOption[];
  contacts: ContactOption[];
  opportunities: OpportunityOption[];
  assignableProfiles: ProfileOption[];
  initialSource?: CommercialSignalSource | "all";
  initialBatchId?: string;
  initialSignalId?: string;
  initialCreateOpen?: boolean;
};

type CreateForm = {
  title: string;
  source: CommercialSignalSource;
  sourceReference: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  value: string;
  currency: string;
  lastInteractionAt: string;
  context: string;
  organizationId: string;
  contactId: string;
  opportunityId: string;
  ownerProfileId: string;
  dueAt: string;
};

type ReviewForm = {
  title: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  value: string;
  lastInteractionAt: string;
  context: string;
  recommendedAction: string;
  dueAt: string;
  ownerProfileId: string;
  organizationId: string;
  contactId: string;
  opportunityId: string;
  newOrganizationName: string;
  newContactName: string;
  newContactEmail: string;
  newContactPhone: string;
  draftSubject: string;
  draftBody: string;
};

const sourceLabels: Record<CommercialSignalSource, string> = {
  manual: "Manual",
  email: "Email",
  phone: "Apel telefonic",
  missed_call: "Apel ratat",
  website_form: "Formular website",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  csv_import: "Import CSV",
  ai_receptionist: "Recepționer AI",
  referral: "Recomandare",
  other: "Altă sursă"
};

const captureSources: CommercialSignalSource[] = ["manual", "email", "whatsapp", "phone", "csv_import", "other"];
const queueFilters: Array<{ id: QueueFilter; label: string }> = [
  { id: "all", label: "Toate" },
  { id: "review", label: "De verificat" },
  { id: "linked", label: "Legate" },
  { id: "converted", label: "Convertite" },
  { id: "archived", label: "Arhivate" }
];

const reviewLabels: Record<CommercialSignalReviewStatus, string> = {
  new: "Nou",
  ready_for_review: "De revizuit",
  approved: "Aprobat",
  dismissed: "Respins",
  duplicate: "Duplicat",
  postponed: "Amânat",
  converted: "Convertit"
};

const urgencyLabels: Record<RecoverabilityUrgency, string> = {
  low: "Scăzută",
  medium: "Medie",
  high: "Ridicată",
  critical: "Critică"
};

const confidenceLabels: Record<RecoverabilityConfidence, string> = {
  low: "Scăzută",
  medium: "Medie",
  high: "Ridicată"
};

const emptyCreate: CreateForm = {
  title: "",
  source: "manual",
  sourceReference: "",
  company: "",
  contact: "",
  email: "",
  phone: "",
  value: "",
  currency: "RON",
  lastInteractionAt: "",
  context: "",
  organizationId: "",
  contactId: "",
  opportunityId: "",
  ownerProfileId: "",
  dueAt: ""
};

function reviewFormFor(signal: CommercialSignal): ReviewForm {
  return {
    title: signal.title,
    company: signal.contactCompany ?? "",
    contact: signal.contactName ?? "",
    email: signal.contactEmail ?? "",
    phone: signal.contactPhone ?? "",
    value: signal.estimatedRecoverableValue !== null && signal.estimatedRecoverableValue !== undefined
      ? String(signal.estimatedRecoverableValue)
      : signal.estimatedValueMax !== null && signal.estimatedValueMax !== undefined
        ? String(signal.estimatedValueMax)
        : "",
    lastInteractionAt: signal.lastInteractionAt ? signal.lastInteractionAt.slice(0, 16) : "",
    context: signal.rawMessage ?? "",
    recommendedAction: signal.recommendedAction ?? "",
    dueAt: signal.suggestedDueDate ?? "",
    ownerProfileId: signal.assignedToProfileId ?? signal.suggestedOwnerProfileId ?? "",
    organizationId: signal.matchedOrganizationId ?? "",
    contactId: signal.matchedContactId ?? "",
    opportunityId: signal.detectedFromOpportunityId ?? "",
    newOrganizationName: "",
    newContactName: "",
    newContactEmail: "",
    newContactPhone: "",
    draftSubject: signal.draftSubject ?? "",
    draftBody: signal.draftBody ?? signal.reviewedDraft ?? ""
  };
}

function fieldClasses() {
  return "focus-ring min-h-[var(--control-height)] w-full rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] px-3 text-sm text-[rgb(var(--foreground))] transition-colors hover:border-[rgb(var(--border-strong))]";
}

function Field({ label, required = false, hint, className = "", children }: { label: string; required?: boolean; hint?: string; className?: string; children: React.ReactNode }) {
  return <label className={`grid gap-1.5 text-xs font-semibold text-[rgb(var(--text-secondary))] ${className}`}>
    <span className="flex flex-wrap items-center justify-between gap-2">
      <span>{label}</span>
      {<span className="text-[10px] font-normal text-[rgb(var(--text-muted))]">{required ? "Obligatoriu" : "Opțional"}</span>}
    </span>
    {hint ? <span className="text-xs font-normal leading-5 text-[rgb(var(--text-muted))]">{hint}</span> : null}
    {children}
  </label>;
}

function urgencyRank(value?: RecoverabilityUrgency | null) {
  return value === "critical" ? 4 : value === "high" ? 3 : value === "medium" ? 2 : 1;
}

function urgencyClass(value?: RecoverabilityUrgency | null) {
  if (value === "critical" || value === "high") return "border-red-400/30 bg-red-400/10 text-red-700 dark:text-red-200";
  if (value === "medium") return "border-amber-400/30 bg-amber-400/10 text-amber-700 dark:text-amber-200";
  return "border-[rgb(var(--border))] bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]";
}

export function CommercialInboxClient({
  initialSignals,
  tableReady,
  organizations,
  contacts,
  opportunities,
  assignableProfiles,
  initialSource = "all",
  initialBatchId,
  initialSignalId,
  initialCreateOpen = false
}: CommercialInboxClientProps) {
  const { showToast } = useToast();
  const initiallySelectedSignal = initialSignals.find((signal) => signal.id === initialSignalId)
    ?? (initialBatchId ? initialSignals.find((signal) => signal.importBatchId === initialBatchId) : undefined)
    ?? initialSignals.find((signal) => signal.analysisStatus === "completed" && ["ready_for_review", "postponed"].includes(signal.reviewStatus))
    ?? initialSignals[0];
  const [signals, setSignals] = useState(initialSignals);
  const [selectedId, setSelectedId] = useState(initiallySelectedSignal?.id ?? "");
  const [createOpen, setCreateOpen] = useState(initialCreateOpen);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate);
  const [reviewForm, setReviewForm] = useState<ReviewForm>(initiallySelectedSignal ? reviewFormFor(initiallySelectedSignal) : reviewFormFor({ title: "" } as CommercialSignal));
  const [reviewStatus, setReviewStatus] = useState<CommercialSignalReviewStatus | "all">("all");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [urgency, setUrgency] = useState<RecoverabilityUrgency | "all">("all");
  const [confidence, setConfidence] = useState<RecoverabilityConfidence | "all">("all");
  const [source, setSource] = useState<CommercialSignalSource | "all">(initialSource);
  const [minimumValue, setMinimumValue] = useState("");
  const [matchFilter, setMatchFilter] = useState<"all" | "matched" | "unmatched">("all");
  const [duplicateFilter, setDuplicateFilter] = useState<"all" | "risk">("all");
  const [ownerFilter, setOwnerFilter] = useState<"all" | "assigned" | "unassigned">("all");
  const [query, setQuery] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [postponeUntil, setPostponeUntil] = useState("");
  const [createErrors, setCreateErrors] = useState<Partial<Record<keyof CreateForm, string>>>({});
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedSignal = signals.find((signal) => signal.id === selectedId) ?? null;
  const filteredSignals = useMemo(() => signals.filter((signal) => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ro-RO");
    const haystack = [signal.title, signal.contactCompany, signal.contactName, signal.contactEmail, signal.extractedSummary, signal.rawMessage]
      .filter(Boolean).join(" ").toLocaleLowerCase("ro-RO");
    const value = Number(signal.estimatedRecoverableValue ?? signal.estimatedValueMax ?? signal.estimatedValueMin ?? 0);
    const matched = Boolean(signal.matchedOrganizationId || signal.matchedContactId);
    const assigned = Boolean(signal.assignedToProfileId || signal.suggestedOwnerProfileId);
    const queueMatch = queueFilter === "all"
      || (queueFilter === "review" && ["new", "ready_for_review", "postponed"].includes(signal.reviewStatus) && signal.status !== "archived")
      || (queueFilter === "linked" && Boolean(signal.matchedOrganizationId || signal.matchedContactId || signal.detectedFromOpportunityId) && signal.status !== "converted" && signal.status !== "archived")
      || (queueFilter === "converted" && signal.status === "converted")
      || (queueFilter === "archived" && signal.status === "archived");
    return queueMatch && (reviewStatus === "all" || signal.reviewStatus === reviewStatus)
      && (urgency === "all" || signal.urgencyLevel === urgency)
      && (confidence === "all" || signal.confidenceLevel === confidence)
      && (source === "all" || signal.source === source)
      && (!initialBatchId || signal.importBatchId === initialBatchId)
      && (!minimumValue || value >= Number(minimumValue))
      && (matchFilter === "all" || (matchFilter === "matched" ? matched : !matched))
      && (duplicateFilter === "all" || signal.duplicateRisk)
      && (ownerFilter === "all" || (ownerFilter === "assigned" ? assigned : !assigned))
      && (!normalizedQuery || haystack.includes(normalizedQuery));
  }).sort((a, b) => urgencyRank(b.urgencyLevel) - urgencyRank(a.urgencyLevel)
    || Number(b.recoverabilityScore ?? 0) - Number(a.recoverabilityScore ?? 0)
    || Number(b.estimatedRecoverableValue ?? 0) - Number(a.estimatedRecoverableValue ?? 0)
    || new Date(a.lastInteractionAt ?? a.createdAt ?? 0).getTime() - new Date(b.lastInteractionAt ?? b.createdAt ?? 0).getTime()), [confidence, duplicateFilter, initialBatchId, matchFilter, minimumValue, ownerFilter, query, queueFilter, reviewStatus, signals, source, urgency]);

  const advancedFilterCount = [confidence !== "all", source !== "all", Boolean(minimumValue), matchFilter !== "all", duplicateFilter !== "all" || ownerFilter !== "all"].filter(Boolean).length;
  const hasActiveFilters = Boolean(query) || reviewStatus !== "all" || urgency !== "all" || queueFilter !== "all" || advancedFilterCount > 0;

  function resetFilters() {
    setQuery(""); setReviewStatus("all"); setUrgency("all"); setQueueFilter("all"); setConfidence("all"); setSource(initialSource);
    setMinimumValue(""); setMatchFilter("all"); setDuplicateFilter("all"); setOwnerFilter("all");
  }
  function replaceSignal(signal: CommercialSignal) {
    setSignals((items) => items.map((item) => {
      if (item.id !== signal.id) return item;
      const events = [...(signal.events ?? []), ...(item.events ?? [])]
        .filter((event, index, all) => all.findIndex((candidate) => candidate.id === event.id) === index);
      return { ...signal, events };
    }));
    setSelectedId(signal.id);
    setReviewForm(reviewFormFor(signal));
  }

  function selectSignal(signal: CommercialSignal) {
    setSelectedId(signal.id);
    setReviewForm(reviewFormFor(signal));
    setDecisionReason("");
    setPostponeUntil("");
    setNotice("");
    setError("");
    if (window.matchMedia("(max-width: 1279px)").matches) {
      window.setTimeout(() => document.getElementById("signal-review-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    }
  }

  function updateCreateForm(patch: Partial<CreateForm>) {
    setCreateForm((current) => ({ ...current, ...patch }));
    const changedFields = Object.keys(patch) as Array<keyof CreateForm>;
    setCreateErrors((current) => {
      if (!changedFields.some((field) => current[field])) return current;
      const next = { ...current };
      changedFields.forEach((field) => delete next[field]);
      return next;
    });
  }

  function runAction(
    action: () => Promise<{ ok: boolean; message?: string; signal?: CommercialSignal; fallbackUsed?: boolean; opportunityId?: string; alreadyConverted?: boolean }>,
    successMessage: string,
    nextRoute?: { label: string; href: string }
  ) {
    setNotice("");
    setError("");
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        const message = toUserFacingActionError(result.message, "Acțiunea nu a putut fi finalizată. Verifică datele și încearcă din nou.");
        setError(message);
        showToast({ title: "Acțiunea nu a fost aplicată", description: message, tone: "danger" });
        return;
      }
      if (result.signal) replaceSignal(result.signal);
      const message = result.fallbackUsed
        ? "Analiza a fost generată pe baza regulilor disponibile și necesită verificarea echipei."
        : result.alreadyConverted
          ? "Semnalul fusese deja convertit; nu au fost create duplicate."
          : successMessage;
      setNotice(message);
      showToast({
        title: result.opportunityId ? "Decizie internă înregistrată" : "Actualizare salvată",
        description: message,
        tone: "success",
        action: result.opportunityId ? { label: "Revizuiește oportunitatea", href: `/opportunities/${result.opportunityId}` } : nextRoute
      });
    });
  }

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof CreateForm, string>> = {};
    if (!createForm.title.trim()) nextErrors.title = "Titlul semnalului este obligatoriu.";
    if (!createForm.context.trim()) nextErrors.context = "Contextul sau textul semnalului este obligatoriu.";
    if (!createForm.source) nextErrors.source = "Selectează sursa semnalului.";
    if (createForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email.trim())) nextErrors.email = "Emailul contactului nu este valid.";
    if (createForm.value && (!Number.isFinite(Number(createForm.value)) || Number(createForm.value) < 0)) nextErrors.value = "Valoarea estimată trebuie să fie pozitivă.";
    setCreateErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    runAction(async () => {
      const result = await createCommercialSignal({
        title: createForm.title,
        source: createForm.source,
        sourceReference: createForm.sourceReference,
        contactCompany: createForm.company,
        contactName: createForm.contact,
        contactEmail: createForm.email,
        contactPhone: createForm.phone,
        estimatedValueMin: createForm.value ? Number(createForm.value) : undefined,
        estimatedValueMax: createForm.value ? Number(createForm.value) : undefined,
        currency: createForm.currency,
        lastInteractionAt: createForm.lastInteractionAt,
        rawMessage: createForm.context,
        matchedOrganizationId: createForm.organizationId,
        matchedContactId: createForm.contactId,
        linkedOpportunityId: createForm.opportunityId,
        assignedToProfileId: createForm.ownerProfileId,
        suggestedDueDate: createForm.dueAt
      });
      if (result.ok && result.signal) {
        setSignals((items) => [result.signal!, ...items]);
        setSelectedId(result.signal.id);
        setReviewForm(reviewFormFor(result.signal));
        setCreateForm(emptyCreate);
        setCreateOpen(false);
      }
      return result;
    }, "Semnalul a fost salvat. Revizuiește elementul selectat și generează analiza înainte de orice decizie.", { label: "Revizuiește semnalul", href: "#signal-review-panel" });
  }

  function saveReviewFields() {
    if (!selectedSignal) return;
    runAction(() => updateCommercialSignal(selectedSignal.id, {
      title: reviewForm.title,
      contactCompany: reviewForm.company,
      contactName: reviewForm.contact,
      contactEmail: reviewForm.email,
      contactPhone: reviewForm.phone,
      estimatedValueMin: reviewForm.value ? Number(reviewForm.value) : undefined,
      estimatedValueMax: reviewForm.value ? Number(reviewForm.value) : undefined,
      lastInteractionAt: reviewForm.lastInteractionAt,
      rawMessage: reviewForm.context,
      recommendedAction: reviewForm.recommendedAction,
      suggestedDueDate: reviewForm.dueAt,
      assignedToProfileId: reviewForm.ownerProfileId,
      matchedOrganizationId: reviewForm.organizationId,
      matchedContactId: reviewForm.contactId,
      linkedOpportunityId: reviewForm.opportunityId,
      reviewedDraft: formatRecoveryDraft(reviewForm.draftSubject, reviewForm.draftBody)
    }), "Câmpurile revizuite au fost salvate. Următoarea verificare rămâne în Activitatea mea.", { label: "Deschide Activitatea mea", href: "/today" });
  }

  function decide(decision: "dismissed" | "duplicate" | "postponed") {
    if (!selectedSignal) return;
    runAction(() => setCommercialSignalReviewDecision(selectedSignal.id, decision, decisionReason, postponeUntil),
      decision === "dismissed" ? "Semnalul a fost respins." : decision === "duplicate" ? "Semnalul a fost marcat duplicat." : "Revizuirea a fost amânată.");
  }

  function choosePostponeWindow(days: number) {
    const target = new Date();
    target.setDate(target.getDate() + days);
    target.setHours(9, 0, 0, 0);
    const localValue = new Date(target.getTime() - target.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setPostponeUntil(localValue);
  }

  function approve() {
    if (!selectedSignal) return;
    runAction(() => approveCommercialSignal(selectedSignal.id, {
      organizationId: reviewForm.organizationId,
      contactId: reviewForm.contactId,
      newOrganizationName: reviewForm.newOrganizationName,
      newContactName: reviewForm.newContactName,
      newContactEmail: reviewForm.newContactEmail,
      newContactPhone: reviewForm.newContactPhone,
      ownerProfileId: reviewForm.ownerProfileId,
      dueAt: reviewForm.dueAt,
      recommendedAction: reviewForm.recommendedAction,
      reviewedDraft: formatRecoveryDraft(reviewForm.draftSubject, reviewForm.draftBody),
      opportunityId: reviewForm.opportunityId
    }), reviewForm.opportunityId
      ? "Semnalul a fost aprobat, iar acțiunea internă a fost creată în oportunitatea selectată."
      : "Semnalul a fost aprobat, iar oportunitatea și prima acțiune internă au fost create.");
  }

  function archive() {
    if (!selectedSignal) return;
    runAction(() => archiveCommercialSignal(selectedSignal.id, decisionReason), "Semnalul a fost arhivat cu motivul înregistrat.");
  }

  if (!tableReady) return (
    <StatusNotice tone="warning">
      Inbox Comercial necesită finalizarea configurării spațiului de lucru. Datele existente sunt în siguranță; contactează administratorul pentru activarea importului și revizuirii.
    </StatusNotice>
  );

  return (
    <div className="app-section-stack">
      {error ? <StatusNotice tone="error">{error}</StatusNotice> : null}
      {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}

      <section aria-label="Comenzi Inbox Comercial" className="border-y border-[rgb(var(--border))]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap" role="group" aria-label="Starea semnalelor">
            {queueFilters.map((filter) => <button key={filter.id} type="button" onClick={() => setQueueFilter(filter.id)} aria-pressed={queueFilter === filter.id} className={`focus-ring min-h-10 border-b-2 px-3 text-xs font-semibold transition-colors ${queueFilter === filter.id ? "border-[rgb(var(--primary))] text-[rgb(var(--foreground))]" : "border-transparent text-[rgb(var(--text-muted))] hover:border-[rgb(var(--border-strong))] hover:text-[rgb(var(--foreground))]"}`}>{filter.label}</button>)}
          </div>
          <div className="flex items-center gap-2">{hasActiveFilters ? <Button size="small" variant="ghost" onClick={resetFilters}>Resetează filtrele</Button> : null}<Button size="small" onClick={() => setCreateOpen((open) => !open)}>{createOpen ? "Închide formularul" : "Adaugă semnal"}</Button></div>
        </div>
        <div aria-label="Filtre semnale" className="flex snap-x gap-2 overflow-x-auto border-t border-[rgb(var(--border))] py-2 md:grid md:overflow-visible md:grid-cols-[minmax(14rem,1fr)_11rem_11rem]">
          <Field label="Caută" className="min-w-[15rem] snap-start md:min-w-0"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Titlu, companie, contact" className="bg-[rgb(var(--surface-elevated))]" /></Field>
          <Field label="Revizuire" className="min-w-[10.5rem] snap-start md:min-w-0"><Select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as CommercialSignalReviewStatus | "all")} className={fieldClasses()}><option value="all">Toate</option>{Object.entries(reviewLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
          <Field label="Urgență" className="min-w-[10.5rem] snap-start md:min-w-0"><Select value={urgency} onChange={(event) => setUrgency(event.target.value as RecoverabilityUrgency | "all")} className={fieldClasses()}><option value="all">Toate</option>{Object.entries(urgencyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
        </div>
        <details className="group border-t border-[rgb(var(--border))] py-1" open={advancedFilterCount > 0}>
          <summary className="focus-ring inline-flex min-h-9 cursor-pointer list-none items-center rounded-button px-2 text-xs font-semibold text-[rgb(var(--text-secondary))] marker:hidden hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]">Filtre avansate {advancedFilterCount ? <span className="ml-2 rounded-full bg-[rgb(var(--primary-muted))] px-2 py-0.5 text-[0.6875rem] text-[rgb(var(--primary))]">{advancedFilterCount} active</span> : null}<span aria-hidden="true" className="ml-2 text-[rgb(var(--primary))] group-open:hidden">+</span><span aria-hidden="true" className="ml-2 hidden text-[rgb(var(--primary))] group-open:inline">−</span></summary>
          <div className="grid gap-2 border-l-2 border-[rgb(var(--primary)/0.28)] py-2 pl-3 md:grid-cols-3 xl:grid-cols-5">
            <Field label="Încredere"><Select value={confidence} onChange={(event) => setConfidence(event.target.value as RecoverabilityConfidence | "all")} className={fieldClasses()}><option value="all">Toate</option>{Object.entries(confidenceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
            <Field label="Sursă"><Select value={source} onChange={(event) => setSource(event.target.value as CommercialSignalSource | "all")} className={fieldClasses()}><option value="all">Toate</option>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
            <Field label="Valoare minimă"><input type="number" min="0" value={minimumValue} onChange={(event) => setMinimumValue(event.target.value)} className={fieldClasses()} /></Field>
            <Field label="Potrivire"><Select value={matchFilter} onChange={(event) => setMatchFilter(event.target.value as typeof matchFilter)} className={fieldClasses()}><option value="all">Toate</option><option value="matched">Potrivite</option><option value="unmatched">Nepotrivite</option></Select></Field>
            <Field label="Excepții"><Select value={`${duplicateFilter}:${ownerFilter}`} onChange={(event) => { const [duplicate, owner] = event.target.value.split(":"); setDuplicateFilter(duplicate as typeof duplicateFilter); setOwnerFilter(owner as typeof ownerFilter); }} className={fieldClasses()}><option value="all:all">Toate</option><option value="risk:all">Risc duplicat</option><option value="all:unassigned">Fără responsabil</option><option value="all:assigned">Cu responsabil</option></Select></Field>
          </div>
        </details>
      </section>

      {createOpen ? (
        <DataCard title="Adaugă un semnal comercial" description="Copiază mesajul sau nota exact așa cum a fost primită. ReveNew pregătește contextul, iar tu alegi ce se aplică.">
          <form onSubmit={handleCreate} noValidate className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Titlu" required hint="Identifică pe scurt problema comercială."><Input maxLength={240} value={createForm.title} onChange={(event) => updateCreateForm({ title: event.target.value })} invalid={Boolean(createErrors.title)} aria-describedby={createErrors.title ? "signal-title-error" : undefined} />{createErrors.title ? <span id="signal-title-error" className="text-xs text-[rgb(var(--danger-text))]">{createErrors.title}</span> : null}</Field>
              <Field label="Sursă" required hint="Păstrează proveniența dovezii."><Select value={createForm.source} onChange={(event) => updateCreateForm({ source: event.target.value as CommercialSignalSource })} invalid={Boolean(createErrors.source)}>{captureSources.map((value) => <option key={value} value={value}>{sourceLabels[value]}</option>)}</Select></Field>
            </div>
            <Field label="Text sau notă" required hint="Dovada de bază pentru revizuire; poate fi anonimizată pentru audit."><Textarea rows={5} maxLength={12000} value={createForm.context} onChange={(event) => updateCreateForm({ context: event.target.value })} invalid={Boolean(createErrors.context)} aria-describedby={createErrors.context ? "signal-context-error" : "signal-context-help"} placeholder="Lipește emailul, mesajul WhatsApp sau nota după apel." /><span id={createErrors.context ? "signal-context-error" : "signal-context-help"} className={`text-xs ${createErrors.context ? "text-[rgb(var(--danger-text))]" : "text-[rgb(var(--text-muted))]"}`}>{createErrors.context ?? "Textul rămâne context neconfirmat și nu declanșează nicio acțiune externă."}</span></Field>
            <details className="group rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
              <summary className="focus-ring flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-card px-4 py-3 text-sm font-semibold marker:hidden">
                <span>Completează datele opționale <span className="font-normal text-[rgb(var(--text-muted))]">· companie, contact, valoare și legături</span></span>
                <span aria-hidden="true" className="text-[rgb(var(--primary))] transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="grid gap-4 border-t border-[rgb(var(--border))] p-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Referință sursă"><Input maxLength={500} value={createForm.sourceReference} onChange={(event) => setCreateForm({ ...createForm, sourceReference: event.target.value })} placeholder="Subiect, ID intern sau fișier" /></Field>
                <Field label="Companie menționată" hint="Ajută la potrivire și evitarea duplicatelor."><Input value={createForm.company} onChange={(event) => setCreateForm({ ...createForm, company: event.target.value })} /></Field>
                <Field label="Contact menționat"><Input value={createForm.contact} onChange={(event) => setCreateForm({ ...createForm, contact: event.target.value })} /></Field>
                <Field label="Email"><Input type="text" inputMode="email" value={createForm.email} onChange={(event) => updateCreateForm({ email: event.target.value })} invalid={Boolean(createErrors.email)} />{createErrors.email ? <span className="text-xs text-[rgb(var(--danger-text))]">{createErrors.email}</span> : null}</Field>
                <Field label="Telefon"><Input value={createForm.phone} onChange={(event) => setCreateForm({ ...createForm, phone: event.target.value })} /></Field>
                <Field label="Valoare estimată" hint="Este o estimare, nu venit confirmat."><Input type="number" min="0" value={createForm.value} onChange={(event) => updateCreateForm({ value: event.target.value })} invalid={Boolean(createErrors.value)} />{createErrors.value ? <span className="text-xs text-[rgb(var(--danger-text))]">{createErrors.value}</span> : null}</Field>
                <Field label="Monedă"><Select value={createForm.currency} onChange={(event) => setCreateForm({ ...createForm, currency: event.target.value })}><option>RON</option><option>EUR</option><option>USD</option></Select></Field>
                <Field label="Data semnalului"><Input type="datetime-local" value={createForm.lastInteractionAt} onChange={(event) => setCreateForm({ ...createForm, lastInteractionAt: event.target.value })} /></Field>
                <Field label="Companie CRM"><Select value={createForm.organizationId} onChange={(event) => setCreateForm({ ...createForm, organizationId: event.target.value, contactId: "", opportunityId: "" })}><option value="">Leagă ulterior</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</Select></Field>
                <Field label="Contact CRM"><Select value={createForm.contactId} onChange={(event) => setCreateForm({ ...createForm, contactId: event.target.value })}><option value="">Leagă ulterior</option>{contacts.filter((contact) => !createForm.organizationId || !contact.organizationId || contact.organizationId === createForm.organizationId).map((contact) => <option key={contact.id} value={contact.id}>{contact.fullName}</option>)}</Select></Field>
                <Field label="Oportunitate"><Select value={createForm.opportunityId} onChange={(event) => setCreateForm({ ...createForm, opportunityId: event.target.value })}><option value="">Creează sau leagă ulterior</option>{opportunities.filter((opportunity) => !createForm.organizationId || !opportunity.organizationId || opportunity.organizationId === createForm.organizationId).map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{opportunity.title}</option>)}</Select></Field>
                <Field label="Responsabil"><Select value={createForm.ownerProfileId} onChange={(event) => setCreateForm({ ...createForm, ownerProfileId: event.target.value })}><option value="">Neatribuit</option>{assignableProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.fullName}</option>)}</Select></Field>
                <Field label="Termen orientativ"><Input type="date" value={createForm.dueAt} onChange={(event) => setCreateForm({ ...createForm, dueAt: event.target.value })} /></Field>
              </div>
            </details>
            <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={isPending}>Salvează semnalul</Button><span className="text-xs text-[rgb(var(--text-muted))]">Salvarea creează doar un element intern de revizuit.</span></div>
          </form>
        </DataCard>
      ) : null}

      <div className="grid min-w-0 border-y border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] xl:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.55fr)]">
        <section className="min-w-0 border-t border-[rgb(var(--border))] xl:border-r" aria-labelledby="signal-list-title">
          <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] px-3 py-2.5">
            <h2 id="signal-list-title" className="text-sm font-semibold">Semnale <span className="font-normal text-[rgb(var(--text-muted))]">({filteredSignals.length})</span></h2>
            <span className="text-xs text-[rgb(var(--text-faint))]">Selectează pentru revizuire</span>
          </div>
          <div className="divide-y divide-[rgb(var(--border))]">
            {filteredSignals.map((signal) => (
              <button key={signal.id} type="button" onClick={() => selectSignal(signal)} aria-current={selectedId === signal.id ? "true" : undefined} className={`focus-ring group relative grid w-full gap-2 border-l-2 px-3 py-3 text-left transition-colors ${selectedId === signal.id ? "border-l-[rgb(var(--primary))] bg-[rgb(var(--surface-subtle))] shadow-[inset_0_0_0_1px_rgb(var(--border-strong))]" : "border-l-transparent hover:bg-[rgb(var(--surface-elevated))]"}`}>
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <span className="min-w-0"><span className="block truncate font-semibold text-[rgb(var(--foreground))]">{signal.title}</span><span className="mt-0.5 block truncate text-xs text-[rgb(var(--text-muted))]">{signal.contactCompany || signal.contactName || "Companie neconfirmată"}</span></span>
                  <span className={`shrink-0 rounded border px-2 py-0.5 text-[0.6875rem] font-semibold ${urgencyClass(signal.urgencyLevel)}`}>{signal.urgencyLevel ? urgencyLabels[signal.urgencyLevel] : "Neanalizat"}</span>
                </div>
                <p className="line-clamp-2 text-xs leading-5 text-[rgb(var(--text-secondary))]">{signal.recommendedAction || signal.extractedSummary || signal.rawMessage || "Necesită completarea contextului."}</p>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[0.6875rem] text-[rgb(var(--text-faint))]">
                  <span>{sourceLabels[signal.source]} · {reviewLabels[signal.reviewStatus]}</span>
                  <span className="font-semibold tabular-nums text-[rgb(var(--foreground))]">{signal.estimatedRecoverableValue === null || signal.estimatedRecoverableValue === undefined ? "Valoare neconfirmată" : formatCurrency(Number(signal.estimatedRecoverableValue), signal.currency)}</span>
                </div>
              </button>
            ))}
            {filteredSignals.length === 0 ? signals.length === 0 ? (
              <div className="grid gap-4 p-5">
                <div>
                  <h3 className="font-semibold text-[rgb(var(--foreground))]">Inbox-ul Comercial este pregătit</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[rgb(var(--muted-foreground))]">Importă cereri vechi din CSV sau detectează oportunități fără follow-up. Datele devin semnale pentru analiză, nu oportunități aprobate automat.</p>
                </div>
                <InboxIngestionActions />
                <p className="text-xs text-[rgb(var(--muted-foreground))]">Nicio acțiune externă nu este trimisă din acest pas.</p>
              </div>
            ) : <EmptyState title="Niciun rezultat pentru filtrele curente" description="Modifică filtrele sau căutarea pentru a vedea alte semnale." /> : null}
          </div>
        </section>

        <section id="signal-review-panel" className="min-w-0 scroll-mt-24 border-t border-[rgb(var(--border))]" aria-labelledby="signal-review-title">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgb(var(--border))] px-4 py-3">
            <div className="min-w-0"><p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--primary))]">Revizuire controlată</p><h2 id="signal-review-title" className="mt-1 truncate text-base font-semibold">{selectedSignal?.title ?? "Revizuire semnal"}</h2><p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{reviewForm.opportunityId ? "Confirmă acțiunea internă pentru oportunitatea existentă." : "Confirmă datele înainte de a crea oportunitatea."} Nu se trimite niciun mesaj.</p></div>
            {selectedSignal ? <Button
              onClick={() => runAction(() => analyzeCommercialSignal(selectedSignal.id), "Analiza și acțiunea recomandată sunt pregătite. Verifică faptele, riscurile și termenul, apoi salvează revizuirea.")}
              disabled={isPending || selectedSignal.status === "converted"}
              loading={isPending}
              size="small"
            >{selectedSignal.analysisStatus === "completed" ? "Pregătește din nou" : "Pregătește analiza"}</Button> : null}
          </div>
          {selectedSignal ? (
            <div className="grid gap-5 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border border-[rgb(var(--border))] px-2 py-1 text-xs font-semibold">{reviewLabels[selectedSignal.reviewStatus]}</span>
                <span className={`rounded border px-2 py-1 text-xs font-semibold ${urgencyClass(selectedSignal.urgencyLevel)}`}>{selectedSignal.urgencyLevel ? urgencyLabels[selectedSignal.urgencyLevel] : "Neanalizat"}</span>
                {selectedSignal.duplicateRisk ? <span className="rounded border border-red-400/30 bg-red-400/10 px-2 py-1 text-xs font-semibold text-red-700 dark:text-red-200">Posibil duplicat</span> : null}
                {selectedSignal.analysisMode ? <span className="rounded border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-2 py-1 text-xs font-semibold text-[rgb(var(--muted-foreground))]">Triere asistată · date și reguli vizibile</span> : null}
                {(selectedSignal.events ?? []).some((event) => event.eventType === "analysis_review_edited") ? <span className="rounded border border-[rgb(var(--border))] px-2 py-1 text-xs font-semibold">Editat de utilizator</span> : null}
                <span className="rounded border border-[rgb(var(--border))] px-2 py-1 text-xs font-semibold">Netrimis automat</span>
                <span className="text-xs text-[rgb(var(--muted-foreground))]">Primit {formatDateTimeWithSeconds(selectedSignal.createdAt ?? undefined)}</span>
              </div>

              <SignalPreparationPanel signal={selectedSignal} compact />

              {selectedSignal.analysisStatus === "completed" ? (
                <dl aria-label="Interpretarea semnalului selectat" className="grid border-y border-[rgb(var(--border))] sm:grid-cols-2 xl:grid-cols-4">
                  <div className="border-b border-[rgb(var(--border))] px-3 py-2.5 sm:border-r xl:border-b-0"><dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">Scor recuperabilitate</dt><dd className="mt-1 text-base font-semibold tabular-nums">{selectedSignal.recoverabilityScore ?? 0}/100</dd><p className="mt-0.5 text-xs text-[rgb(var(--text-muted))]">Prioritate estimată.</p></div>
                  <div className="border-b border-[rgb(var(--border))] px-3 py-2.5 xl:border-b-0 xl:border-r"><dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">Valoare estimată, neconfirmată</dt><dd className="mt-1 text-base font-semibold tabular-nums">{formatCurrency(Number(selectedSignal.estimatedRecoverableValue ?? 0), selectedSignal.currency)}</dd><p className="mt-0.5 text-xs text-[rgb(var(--text-muted))]">Nu reprezintă venit confirmat.</p></div>
                  <div className="border-b border-[rgb(var(--border))] px-3 py-2.5 sm:border-b-0 sm:border-r"><dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">Încredere</dt><dd className="mt-1 text-base font-semibold">{selectedSignal.confidenceLevel ? confidenceLabels[selectedSignal.confidenceLevel] : "Necunoscută"}</dd><p className="mt-0.5 line-clamp-1 text-xs text-[rgb(var(--text-muted))]">{selectedSignal.primaryRecoveryReason ?? "Motiv de confirmat."}</p></div>
                  <div className="px-3 py-2.5"><dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">Decizie</dt><dd className="mt-1 text-base font-semibold">Umană</dd><p className="mt-0.5 text-xs text-[rgb(var(--text-muted))]">Aprobarea aplică schimbarea internă.</p></div>
                </dl>
              ) : (
                <StatusNotice tone="neutral">Rulează analiza pentru a obține o prioritate estimată, apoi verifică rezultatul înainte de aprobare.</StatusNotice>
              )}

              {selectedSignal.uncertaintyNotes.length > 0 ? <StatusNotice tone="warning">{selectedSignal.uncertaintyNotes.join(" ")}</StatusNotice> : null}

              <section aria-labelledby="signal-essential-title" className="border-t border-[rgb(var(--border))] pt-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">01 · Date esențiale</p>
                  <h3 id="signal-essential-title" className="mt-1 text-base font-semibold">Confirmă ce s-a întâmplat și unde există valoare</h3>
                  <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Compania și contactul reduc riscul de duplicare. Valoarea rămâne estimată și nu reprezintă venit confirmat.</p>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Titlu" required><input value={reviewForm.title} onChange={(event) => setReviewForm({ ...reviewForm, title: event.target.value })} className={fieldClasses()} /></Field>
                  <Field label="Companie extrasă" hint="Ajută la potrivirea cu relația comercială corectă."><input value={reviewForm.company} onChange={(event) => setReviewForm({ ...reviewForm, company: event.target.value })} className={fieldClasses()} /></Field>
                  <Field label="Contact extras"><input value={reviewForm.contact} onChange={(event) => setReviewForm({ ...reviewForm, contact: event.target.value })} className={fieldClasses()} /></Field>
                  <Field label="Valoare estimată, neconfirmată"><input type="number" min="0" value={reviewForm.value} onChange={(event) => setReviewForm({ ...reviewForm, value: event.target.value })} className={fieldClasses()} /></Field>
                </div>
              </section>

              <section aria-labelledby="signal-action-title" className="border-t border-[rgb(var(--border))] pt-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">02 · Acțiune și responsabil</p>
                  <h3 id="signal-action-title" className="mt-1 text-base font-semibold">Stabilește primul pas sigur</h3>
                  <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Responsabilul, acțiunea și termenul previn un follow-up uitat după aprobare.</p>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Responsabil" required><Select value={reviewForm.ownerProfileId} onChange={(event) => setReviewForm({ ...reviewForm, ownerProfileId: event.target.value })} className={fieldClasses()}><option value="">Neatribuit</option>{assignableProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.fullName}</option>)}</Select></Field>
                  <Field label="Termen recomandat" required><input type="date" value={reviewForm.dueAt} onChange={(event) => setReviewForm({ ...reviewForm, dueAt: event.target.value })} className={fieldClasses()} /></Field>
                  <div className="md:col-span-2"><Field label="Următoarea acțiune" required hint="Descrie un pas intern clar, verificabil."><input value={reviewForm.recommendedAction} onChange={(event) => setReviewForm({ ...reviewForm, recommendedAction: event.target.value })} className={fieldClasses()} /></Field></div>
                </div>
              </section>

              <details className="group border-t border-[rgb(var(--border))] pt-1">
                <summary className="focus-ring flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-button px-2 py-2 text-sm font-semibold marker:hidden hover:bg-[rgb(var(--surface-muted))]">
                  <span>Detalii de contact și context <span className="font-normal text-[rgb(var(--text-muted))]">· consultă numai dacă influențează decizia</span></span>
                  <span aria-hidden="true" className="text-[rgb(var(--primary))] transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="mt-1 grid gap-3 border-l-2 border-[rgb(var(--primary)/0.28)] py-3 pl-3 md:grid-cols-2">
                  <Field label="Email"><input type="email" value={reviewForm.email} onChange={(event) => setReviewForm({ ...reviewForm, email: event.target.value })} className={fieldClasses()} /></Field>
                  <Field label="Telefon"><input value={reviewForm.phone} onChange={(event) => setReviewForm({ ...reviewForm, phone: event.target.value })} className={fieldClasses()} /></Field>
                  <Field label="Ultima interacțiune"><input type="datetime-local" value={reviewForm.lastInteractionAt} onChange={(event) => setReviewForm({ ...reviewForm, lastInteractionAt: event.target.value })} className={fieldClasses()} /></Field>
                  <div className="md:col-span-2"><Field label="Context original" hint="Poate fi anonimizat pentru audit; păstrează numai informația necesară deciziei."><textarea rows={4} value={reviewForm.context} onChange={(event) => setReviewForm({ ...reviewForm, context: event.target.value })} className={`${fieldClasses()} py-3`} /></Field></div>
                </div>
              </details>

              <details className="group border-t border-[rgb(var(--border))] pt-1">
                <summary className="focus-ring flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-button px-2 py-2 text-sm font-semibold marker:hidden hover:bg-[rgb(var(--surface-muted))]">
                  <span>03 · Legături CRM <span className="font-normal text-[rgb(var(--text-muted))]">· previn duplicatele și păstrează continuitatea</span></span>
                  <span aria-hidden="true" className="text-[rgb(var(--primary))] transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="mt-1 grid gap-3 border-l-2 border-[rgb(var(--primary)/0.28)] py-3 pl-3 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Companie CRM"><Select value={reviewForm.organizationId} onChange={(event) => setReviewForm({ ...reviewForm, organizationId: event.target.value, contactId: "", opportunityId: "" })} className={fieldClasses()}><option value="">Fără potrivire</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</Select></Field>
                  <Field label="Contact CRM"><Select value={reviewForm.contactId} onChange={(event) => setReviewForm({ ...reviewForm, contactId: event.target.value })} className={fieldClasses()}><option value="">Fără potrivire</option>{contacts.filter((contact) => !reviewForm.organizationId || !contact.organizationId || contact.organizationId === reviewForm.organizationId).map((contact) => <option key={contact.id} value={contact.id}>{contact.fullName}{contact.email ? ` · ${contact.email}` : ""}</option>)}</Select></Field>
                  <Field label="Oportunitate existentă"><Select value={reviewForm.opportunityId} onChange={(event) => setReviewForm({ ...reviewForm, opportunityId: event.target.value })} className={fieldClasses()}><option value="">Creează oportunitate nouă</option>{opportunities.filter((opportunity) => !reviewForm.organizationId || !opportunity.organizationId || opportunity.organizationId === reviewForm.organizationId).map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{opportunity.title}</option>)}</Select></Field>
                  {!reviewForm.organizationId ? <Field label="Companie CRM nouă"><input value={reviewForm.newOrganizationName} onChange={(event) => setReviewForm({ ...reviewForm, newOrganizationName: event.target.value })} placeholder={reviewForm.company || "Denumire companie"} className={fieldClasses()} /></Field> : null}
                  {!reviewForm.contactId ? <><Field label="Contact CRM nou"><input value={reviewForm.newContactName} onChange={(event) => setReviewForm({ ...reviewForm, newContactName: event.target.value })} placeholder={reviewForm.contact || "Nume contact"} className={fieldClasses()} /></Field><Field label="Email contact nou"><input type="email" value={reviewForm.newContactEmail} onChange={(event) => setReviewForm({ ...reviewForm, newContactEmail: event.target.value })} className={fieldClasses()} /></Field><Field label="Telefon contact nou"><input value={reviewForm.newContactPhone} onChange={(event) => setReviewForm({ ...reviewForm, newContactPhone: event.target.value })} className={fieldClasses()} /></Field></> : null}
                </div>
              </details>

              <details className="group border-t border-[rgb(var(--border))] pt-1">
                <summary className="focus-ring flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-button px-2 py-2 text-sm font-semibold marker:hidden hover:bg-[rgb(var(--surface-muted))]">
                  <span>04 · Draft recomandat <span className="font-normal text-[rgb(var(--text-muted))]">· opțional, netrimis automat</span></span>
                  <span aria-hidden="true" className="text-[rgb(var(--primary))] transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="mt-1 grid gap-3 border-l-2 border-[rgb(var(--primary)/0.28)] py-3 pl-3">
                  <p className="text-sm leading-6 text-[rgb(var(--muted-foreground))]">Poți edita conținutul. ReveNew îl păstrează ca draft intern, iar utilizarea externă necesită revizuire și aprobare umană.</p>
                  <Field label="Subiect"><input maxLength={160} value={reviewForm.draftSubject} onChange={(event) => setReviewForm({ ...reviewForm, draftSubject: event.target.value })} className={fieldClasses()} /></Field>
                  <Field label="Mesaj"><textarea rows={7} maxLength={4000} value={reviewForm.draftBody} onChange={(event) => setReviewForm({ ...reviewForm, draftBody: event.target.value })} placeholder="Draft opțional; necesită revizuire umană." className={`${fieldClasses()} py-3`} /></Field>
                </div>
              </details>

              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={saveReviewFields} disabled={isPending}>Salvează legăturile și contextul</Button>
                {["ready_for_review", "postponed"].includes(selectedSignal.reviewStatus) && selectedSignal.status !== "converted"
                  ? <Button href={`/approvals?signal=${selectedSignal.id}`} variant="secondary">Trimite spre aprobare</Button>
                  : null}
                <Button onClick={approve} disabled={isPending || selectedSignal.analysisStatus !== "completed" || selectedSignal.status === "converted"}>{reviewForm.opportunityId ? "Aprobă și creează acțiunea" : "Aprobă și creează oportunitatea"}</Button>
                {selectedSignal.convertedOpportunityId ? <Button href={`/opportunities/${selectedSignal.convertedOpportunityId}`} variant="secondary">Deschide oportunitatea</Button> : null}
              </div>

              <StatusNotice tone="neutral">{reviewForm.opportunityId
                ? "La aprobare, oportunitatea selectată primește o acțiune internă, termenul și responsabilul revizuite. Nu se trimite niciun mesaj."
                : "La aprobare, ReveNew creează o oportunitate și o acțiune internă din datele revizuite. Nu se trimite niciun mesaj."}</StatusNotice>

              {selectedSignal.status !== "converted" ? (
                <details className="group border-t border-[rgb(var(--border))] pt-1">
                  <summary className="focus-ring flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-button px-2 py-2 text-sm font-semibold marker:hidden hover:bg-[rgb(var(--surface-muted))]">
                    <span>Amânare, respingere și arhivare <span className="font-normal text-[rgb(var(--text-muted))]">· decizii secundare</span></span>
                    <span aria-hidden="true" className="text-[rgb(var(--primary))] transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <div className="mt-1 grid gap-4 border-l-2 border-[rgb(var(--primary)/0.28)] py-3 pl-3">
                    <div className="grid gap-4 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.72fr)]">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--primary))]">Reia revizuirea</p>
                        <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-muted))]">Alege o fereastră rapidă sau stabilește termenul exact. Semnalul rămâne intern și auditabil.</p>
                        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Opțiuni rapide de amânare">
                          {[1, 3, 7].map((days) => <Button key={days} variant="ghost" size="small" onClick={() => choosePostponeWindow(days)}>Amână {days} {days === 1 ? "zi" : "zile"}</Button>)}
                        </div>
                      </div>
                      <div className="grid content-start gap-3">
                        <Field label="Alege termen"><input type="datetime-local" value={postponeUntil} onChange={(event) => setPostponeUntil(event.target.value)} className={fieldClasses()} /></Field>
                        <Button variant="secondary" onClick={() => decide("postponed")} disabled={isPending || !postponeUntil} className="w-full">Amână revizuirea</Button>
                      </div>
                    </div>
                    <div className="grid gap-3 border-t border-[rgb(var(--border))] pt-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                      <Field label="Motiv decizie" required><input value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} placeholder="Necesar pentru arhivare, respingere sau duplicat" className={fieldClasses()} /></Field>
                      <div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={archive} disabled={isPending || !decisionReason.trim()}>Arhivează</Button><Button variant="ghost" onClick={() => decide("dismissed")} disabled={isPending}>Respinge</Button><Button variant="ghost" onClick={() => decide("duplicate")} disabled={isPending}>Marchează duplicat</Button></div>
                    </div>
                  </div>
                </details>
              ) : null}

              <details className="group border-t border-[rgb(var(--border))] pt-1">
                <summary className="focus-ring flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-button px-2 py-2 text-sm font-semibold marker:hidden hover:bg-[rgb(var(--surface-muted))]">
                  <span>Istoric verificabil <span className="font-normal text-[rgb(var(--text-muted))]">· {(selectedSignal.events ?? []).length} evenimente</span></span>
                  <span aria-hidden="true" className="text-[rgb(var(--primary))] transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="mt-1 divide-y divide-[rgb(var(--border))] border-l-2 border-[rgb(var(--primary)/0.28)] pl-3">{(selectedSignal.events ?? []).map((event) => <div key={event.id} className="py-3"><p className="text-sm font-medium">{event.description || event.eventType}</p><p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">{formatDateTimeWithSeconds(event.createdAt)}</p></div>)}{(selectedSignal.events ?? []).length === 0 ? <p className="py-3 text-sm text-[rgb(var(--muted-foreground))]">Nu există evenimente înregistrate încă.</p> : null}</div>
              </details>
            </div>
          ) : <div className="p-5"><EmptyState title="Selectează un semnal" description="Alege un element din coadă pentru analiză și revizuire." /></div>}
        </section>
      </div>
    </div>
  );
}
