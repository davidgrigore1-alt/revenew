"use client";

import { useMemo, useState, useTransition } from "react";
import { DataCard } from "@/components/dashboard/DataCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { InboxIngestionActions } from "@/components/inbox/InboxIngestionActions";
import { SignalPreparationPanel } from "@/components/signals/SignalPreparationPanel";
import { Button } from "@/components/ui/Button";
import { DataSummaryStrip } from "@/components/ui/DataSummaryStrip";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { Textarea } from "@/components/ui/Textarea";
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
  return "min-h-11 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm text-[rgb(var(--foreground))] outline-none focus:border-[rgb(var(--primary))]";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-medium text-[rgb(var(--foreground))]"><span>{label}</span>{children}</label>;
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
  const initiallySelectedSignal = initialSignals.find((signal) => signal.id === initialSignalId)
    ?? initialSignals.find((signal) => !initialBatchId || signal.importBatchId === initialBatchId)
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

  const awaitingReview = signals.filter((signal) => ["ready_for_review", "postponed"].includes(signal.reviewStatus));
  const estimatedUnderReviewByCurrency = awaitingReview.reduce<Record<string, number>>((totals, signal) => {
    const value = Number(signal.estimatedRecoverableValue ?? 0);
    if (value <= 0) return totals;
    const currency = signal.currency || "RON";
    totals[currency] = (totals[currency] ?? 0) + value;
    return totals;
  }, {});
  const estimatedUnderReview = Object.entries(estimatedUnderReviewByCurrency)
    .sort(([currencyA], [currencyB]) => currencyA.localeCompare(currencyB))
    .map(([currency, value]) => formatCurrency(value, currency))
    .join(" · ") || "—";
  const converted = signals.filter((signal) => signal.reviewStatus === "converted").length;
  const advancedFilterCount = [confidence !== "all", source !== "all", Boolean(minimumValue), matchFilter !== "all", duplicateFilter !== "all" || ownerFilter !== "all"].filter(Boolean).length;

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

  function runAction(action: () => Promise<{ ok: boolean; message?: string; signal?: CommercialSignal; fallbackUsed?: boolean; opportunityId?: string; alreadyConverted?: boolean }>, successMessage: string) {
    setNotice("");
    setError("");
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.message ?? "Acțiunea nu a putut fi finalizată.");
        return;
      }
      if (result.signal) replaceSignal(result.signal);
      setNotice(result.fallbackUsed
        ? "Analiza a fost generată pe baza regulilor disponibile și necesită verificarea echipei."
        : result.alreadyConverted
          ? "Semnalul fusese deja convertit; nu au fost create duplicate."
          : successMessage);
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
    }, "Semnalul a fost salvat. Revizuiește elementul selectat și generează analiza înainte de orice decizie.");
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
    }), "Câmpurile revizuite au fost salvate.");
  }

  function decide(decision: "dismissed" | "duplicate" | "postponed") {
    if (!selectedSignal) return;
    runAction(() => setCommercialSignalReviewDecision(selectedSignal.id, decision, decisionReason, postponeUntil),
      decision === "dismissed" ? "Semnalul a fost respins." : decision === "duplicate" ? "Semnalul a fost marcat duplicat." : "Revizuirea a fost amânată.");
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
      Inbox Comercial necesită finalizarea configurării workspace-ului. Datele existente sunt în siguranță; contactează administratorul pentru activarea importului și revizuirii.
    </StatusNotice>
  );

  return (
    <div className="grid gap-6">
      {error ? <StatusNotice tone="error">{error}</StatusNotice> : null}
      {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}

      <div className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 sm:hidden" role="group" aria-label="Fluxul de la semnal la oportunitate">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">Flux controlat</p>
        <p className="mt-2 text-sm font-semibold">Semnal <span aria-hidden="true">→</span> Revizuire <span aria-hidden="true">→</span> Decizie <span aria-hidden="true">→</span> Oportunitate</p>
        <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Nimic nu este convertit sau trimis fără confirmarea echipei.</p>
      </div>
      <ol className="hidden overflow-hidden rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] sm:grid sm:grid-cols-4" aria-label="Fluxul de la semnal la oportunitate">
        {[['01', 'Semnal primit', 'Date încă neaprobate'], ['02', 'Revizuire', 'Context și estimări verificate'], ['03', 'Decizie umană', 'Aprobă, amână sau ignoră'], ['04', 'Oportunitate', 'Ownership și acțiune următoare']].map(([number, title, copy], index) => <li key={number} className="relative border-b border-[rgb(var(--border))] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><span className="text-xs font-semibold text-[rgb(var(--primary))]">{number}</span><strong className="mt-1 block text-sm">{title}</strong><span className="mt-1 block text-xs leading-5 text-[rgb(var(--text-muted))]">{copy}</span>{index < 3 ? <span className="absolute right-[-5px] top-1/2 z-10 hidden size-2.5 -translate-y-1/2 rotate-45 border-r border-t border-[rgb(var(--border))] bg-[rgb(var(--surface))] sm:block" aria-hidden="true" /> : null}</li>)}
      </ol>

      <DataSummaryStrip label="Rezumat Inbox Comercial" items={[
        { label: "În revizuire", value: awaitingReview.length, note: "Necesită decizia echipei.", tone: "warning" },
        { label: "Potențial estimat", value: estimatedUnderReview, note: "Grupat pe monedă; separat de venitul confirmat.", tone: "brand" },
        { label: "Convertite", value: converted, note: "Aprobate de echipă.", tone: "success" },
        { label: "Control extern", value: "Manual", note: "Nicio trimitere automată.", tone: "neutral" }
      ]} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-[rgb(var(--muted-foreground))]">ReveNew recomandă. Echipa ta verifică, editează și aprobă înainte de orice acțiune externă.</p>
        <Button onClick={() => setCreateOpen((open) => !open)}>{createOpen ? "Închide" : "Adaugă semnal"}</Button>
      </div>

      {createOpen ? (
        <DataCard title="Adaugă un semnal comercial" description="Copiază mesajul sau nota exact așa cum a fost primită. ReveNew pregătește contextul, iar tu alegi ce se aplică.">
          <form onSubmit={handleCreate} noValidate className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Titlu"><Input maxLength={240} value={createForm.title} onChange={(event) => updateCreateForm({ title: event.target.value })} invalid={Boolean(createErrors.title)} aria-describedby={createErrors.title ? "signal-title-error" : undefined} />{createErrors.title ? <span id="signal-title-error" className="text-xs text-[rgb(var(--danger-text))]">{createErrors.title}</span> : null}</Field>
              <Field label="Sursă"><Select value={createForm.source} onChange={(event) => updateCreateForm({ source: event.target.value as CommercialSignalSource })} invalid={Boolean(createErrors.source)}>{captureSources.map((value) => <option key={value} value={value}>{sourceLabels[value]}</option>)}</Select></Field>
              <Field label="Referință sursă"><Input maxLength={500} value={createForm.sourceReference} onChange={(event) => setCreateForm({ ...createForm, sourceReference: event.target.value })} placeholder="Opțional: subiect, ID intern sau fișier" /></Field>
              <Field label="Companie menționată"><Input value={createForm.company} onChange={(event) => setCreateForm({ ...createForm, company: event.target.value })} /></Field>
              <Field label="Contact menționat"><Input value={createForm.contact} onChange={(event) => setCreateForm({ ...createForm, contact: event.target.value })} /></Field>
              <Field label="Email"><Input type="text" inputMode="email" value={createForm.email} onChange={(event) => updateCreateForm({ email: event.target.value })} invalid={Boolean(createErrors.email)} />{createErrors.email ? <span className="text-xs text-[rgb(var(--danger-text))]">{createErrors.email}</span> : null}</Field>
              <Field label="Telefon"><Input value={createForm.phone} onChange={(event) => setCreateForm({ ...createForm, phone: event.target.value })} /></Field>
              <Field label="Valoare estimată"><Input type="number" min="0" value={createForm.value} onChange={(event) => updateCreateForm({ value: event.target.value })} invalid={Boolean(createErrors.value)} />{createErrors.value ? <span className="text-xs text-[rgb(var(--danger-text))]">{createErrors.value}</span> : null}</Field>
              <Field label="Monedă"><Select value={createForm.currency} onChange={(event) => setCreateForm({ ...createForm, currency: event.target.value })}><option>RON</option><option>EUR</option><option>USD</option></Select></Field>
              <Field label="Data semnalului"><Input type="datetime-local" value={createForm.lastInteractionAt} onChange={(event) => setCreateForm({ ...createForm, lastInteractionAt: event.target.value })} /></Field>
            </div>
            <Field label="Text sau notă"><Textarea rows={5} maxLength={12000} value={createForm.context} onChange={(event) => updateCreateForm({ context: event.target.value })} invalid={Boolean(createErrors.context)} aria-describedby={createErrors.context ? "signal-context-error" : "signal-context-help"} placeholder="Lipește emailul, mesajul WhatsApp sau nota după apel." /><span id={createErrors.context ? "signal-context-error" : "signal-context-help"} className={`text-xs ${createErrors.context ? "text-[rgb(var(--danger-text))]" : "text-[rgb(var(--text-muted))]"}`}>{createErrors.context ?? "Textul rămâne context neconfirmat și nu declanșează nicio acțiune externă."}</span></Field>
            <div className="grid gap-4 border-t border-[rgb(var(--border))] pt-5 md:grid-cols-2 xl:grid-cols-5">
              <Field label="Companie CRM"><Select value={createForm.organizationId} onChange={(event) => setCreateForm({ ...createForm, organizationId: event.target.value, contactId: "", opportunityId: "" })}><option value="">Leagă ulterior</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</Select></Field>
              <Field label="Contact CRM"><Select value={createForm.contactId} onChange={(event) => setCreateForm({ ...createForm, contactId: event.target.value })}><option value="">Leagă ulterior</option>{contacts.filter((contact) => !createForm.organizationId || !contact.organizationId || contact.organizationId === createForm.organizationId).map((contact) => <option key={contact.id} value={contact.id}>{contact.fullName}</option>)}</Select></Field>
              <Field label="Oportunitate"><Select value={createForm.opportunityId} onChange={(event) => setCreateForm({ ...createForm, opportunityId: event.target.value })}><option value="">Creează sau leagă ulterior</option>{opportunities.filter((opportunity) => !createForm.organizationId || !opportunity.organizationId || opportunity.organizationId === createForm.organizationId).map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{opportunity.title}</option>)}</Select></Field>
              <Field label="Responsabil"><Select value={createForm.ownerProfileId} onChange={(event) => setCreateForm({ ...createForm, ownerProfileId: event.target.value })}><option value="">Neatribuit</option>{assignableProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.fullName}</option>)}</Select></Field>
              <Field label="Termen orientativ"><Input type="date" value={createForm.dueAt} onChange={(event) => setCreateForm({ ...createForm, dueAt: event.target.value })} /></Field>
            </div>
            <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={isPending}>Salvează semnalul</Button><span className="text-xs text-[rgb(var(--text-muted))]">Salvarea creează doar un element intern de revizuit.</span></div>
          </form>
        </DataCard>
      ) : null}

      <DataCard title="Semnale de revizuit" description="Filtre simple pentru captură, legare și conversie. Ordinea pune în față urgența și vechimea.">
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtre stare semnal">
          {queueFilters.map((filter) => <Button key={filter.id} variant={queueFilter === filter.id ? "secondary" : "ghost"} size="small" onClick={() => setQueueFilter(filter.id)} aria-pressed={queueFilter === filter.id}>{filter.label}</Button>)}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Caută"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Titlu, companie, contact" className={fieldClasses()} /></Field>
          <Field label="Revizuire"><select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as CommercialSignalReviewStatus | "all")} className={fieldClasses()}><option value="all">Toate</option>{Object.entries(reviewLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Urgență"><select value={urgency} onChange={(event) => setUrgency(event.target.value as RecoverabilityUrgency | "all")} className={fieldClasses()}><option value="all">Toate</option>{Object.entries(urgencyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        </div>
        <details className="group mt-4 border-t border-[rgb(var(--border))] pt-3" open={advancedFilterCount > 0}>
          <summary className="focus-ring inline-flex min-h-10 cursor-pointer list-none items-center rounded-button px-2 text-sm font-semibold text-[rgb(var(--text-secondary))] marker:hidden">Filtre avansate {advancedFilterCount ? <span className="ml-2 rounded-full bg-[rgb(var(--surface-muted))] px-2 py-0.5 text-xs">{advancedFilterCount} active</span> : null}</summary>
          <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            <Field label="Încredere"><select value={confidence} onChange={(event) => setConfidence(event.target.value as RecoverabilityConfidence | "all")} className={fieldClasses()}><option value="all">Toate</option>{Object.entries(confidenceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="Sursă"><select value={source} onChange={(event) => setSource(event.target.value as CommercialSignalSource | "all")} className={fieldClasses()}><option value="all">Toate</option>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="Valoare minimă"><input type="number" min="0" value={minimumValue} onChange={(event) => setMinimumValue(event.target.value)} className={fieldClasses()} /></Field>
            <Field label="Potrivire"><select value={matchFilter} onChange={(event) => setMatchFilter(event.target.value as typeof matchFilter)} className={fieldClasses()}><option value="all">Toate</option><option value="matched">Potrivite</option><option value="unmatched">Nepotrivite</option></select></Field>
            <Field label="Excepții"><select value={`${duplicateFilter}:${ownerFilter}`} onChange={(event) => { const [duplicate, owner] = event.target.value.split(":"); setDuplicateFilter(duplicate as typeof duplicateFilter); setOwnerFilter(owner as typeof ownerFilter); }} className={fieldClasses()}><option value="all:all">Toate</option><option value="risk:all">Risc duplicat</option><option value="all:unassigned">Fără responsabil</option><option value="all:assigned">Cu responsabil</option></select></Field>
          </div>
        </details>
      </DataCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)]">
        <DataCard title={`Semnale (${filteredSignals.length})`}>
          <div className="grid gap-3">
            {filteredSignals.map((signal) => (
              <button key={signal.id} type="button" onClick={() => selectSignal(signal)} className={`focus-ring rounded-lg border p-4 text-left transition ${selectedId === signal.id ? "border-[rgb(var(--primary))] bg-[rgb(var(--muted))]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] hover:border-[rgb(var(--primary))]"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--muted-foreground))]">{sourceLabels[signal.source]}</span>
                  <span className={`rounded border px-2 py-1 text-xs font-semibold ${urgencyClass(signal.urgencyLevel)}`}>{signal.urgencyLevel ? urgencyLabels[signal.urgencyLevel] : "Neanalizat"}</span>
                </div>
                <h3 className="mt-3 font-semibold text-[rgb(var(--foreground))]">{signal.title}</h3>
                <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">{signal.contactCompany || signal.contactName || "Companie neconfirmată"}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div><span className="block text-xs text-[rgb(var(--muted-foreground))]">Scor</span><strong>{signal.recoverabilityScore ?? "—"}</strong></div>
                  <div><span className="block text-xs text-[rgb(var(--muted-foreground))]">Potențial</span><strong>{signal.estimatedRecoverableValue === null || signal.estimatedRecoverableValue === undefined ? "—" : formatCurrency(Number(signal.estimatedRecoverableValue), signal.currency)}</strong></div>
                  <div><span className="block text-xs text-[rgb(var(--muted-foreground))]">Stare</span><strong>{reviewLabels[signal.reviewStatus]}</strong></div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-[rgb(var(--muted-foreground))]">{signal.recommendedAction || signal.extractedSummary || signal.rawMessage || "Necesită completarea contextului."}</p>
                <span className="mt-3 inline-flex text-xs font-semibold text-[rgb(var(--primary))]">{signal.status === "converted" ? "Vezi conversia" : signal.status === "archived" ? "Vezi decizia" : "Revizuiește semnalul"} <span className="ml-1" aria-hidden="true">→</span></span>
              </button>
            ))}
            {filteredSignals.length === 0 ? signals.length === 0 ? (
              <div className="grid gap-4 rounded-lg border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-5">
                <div>
                  <h3 className="font-semibold text-[rgb(var(--foreground))]">Inbox-ul Comercial este pregătit</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[rgb(var(--muted-foreground))]">Importă cereri vechi din CSV sau detectează oportunități fără follow-up. Datele devin semnale pentru analiză, nu oportunități aprobate automat.</p>
                </div>
                <InboxIngestionActions />
                <p className="text-xs text-[rgb(var(--muted-foreground))]">Nicio acțiune externă nu este trimisă din acest pas.</p>
              </div>
            ) : <EmptyState title="Niciun rezultat pentru filtrele curente" description="Modifică filtrele sau căutarea pentru a vedea alte semnale." /> : null}
          </div>
        </DataCard>

        <DataCard title={selectedSignal ? `Revizuire: ${selectedSignal.title}` : "Revizuire semnal"} description={reviewForm.opportunityId ? "Verifică datele și confirmă acțiunea internă pentru oportunitatea existentă. Nu se trimite niciun mesaj." : "Verifică datele și confirmă oportunitatea nouă. Nu se trimite niciun mesaj."}>
          {selectedSignal ? (
            <div className="grid gap-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border border-[rgb(var(--border))] px-2 py-1 text-xs font-semibold">{reviewLabels[selectedSignal.reviewStatus]}</span>
                <span className={`rounded border px-2 py-1 text-xs font-semibold ${urgencyClass(selectedSignal.urgencyLevel)}`}>{selectedSignal.urgencyLevel ? urgencyLabels[selectedSignal.urgencyLevel] : "Neanalizat"}</span>
                {selectedSignal.duplicateRisk ? <span className="rounded border border-red-400/30 bg-red-400/10 px-2 py-1 text-xs font-semibold text-red-700 dark:text-red-200">Posibil duplicat</span> : null}
                {selectedSignal.analysisMode ? <span className="rounded border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-2 py-1 text-xs font-semibold text-[rgb(var(--muted-foreground))]">Triere asistată · date și reguli vizibile</span> : null}
                {(selectedSignal.events ?? []).some((event) => event.eventType === "analysis_review_edited") ? <span className="rounded border border-[rgb(var(--border))] px-2 py-1 text-xs font-semibold">Editat de utilizator</span> : null}
                <span className="rounded border border-[rgb(var(--border))] px-2 py-1 text-xs font-semibold">Netrimis automat</span>
                <span className="text-xs text-[rgb(var(--muted-foreground))]">Primit {formatDateTimeWithSeconds(selectedSignal.createdAt ?? undefined)}</span>
              </div>

              {selectedSignal.analysisStatus === "completed" ? (
                <DataSummaryStrip label="Interpretarea semnalului selectat" items={[
                  { label: "Scor recuperabilitate", value: `${selectedSignal.recoverabilityScore ?? 0}/100`, note: "Prioritate estimată; necesită revizuire.", tone: "brand" },
                  { label: "Potențial estimat", value: formatCurrency(Number(selectedSignal.estimatedRecoverableValue ?? 0), selectedSignal.currency), note: "Nu reprezintă venit confirmat.", tone: "neutral" },
                  { label: "Încredere", value: selectedSignal.confidenceLevel ? confidenceLabels[selectedSignal.confidenceLevel] : "Necunoscută", note: selectedSignal.primaryRecoveryReason ?? "Motiv în curs de confirmare.", tone: "warning" },
                  { label: "Decizie", value: "Umană", note: reviewForm.opportunityId ? "Aprobarea creează o acțiune internă." : "Aprobarea creează oportunitatea.", tone: "success" }
                ]} />
              ) : (
                <StatusNotice tone="neutral">Rulează analiza pentru a obține o prioritate estimată, apoi verifică rezultatul înainte de aprobare.</StatusNotice>
              )}

              <SignalPreparationPanel
                signal={selectedSignal}
                action={<Button
                  onClick={() => runAction(() => analyzeCommercialSignal(selectedSignal.id), "Analiza și acțiunea recomandată sunt pregătite. Verifică faptele, riscurile și termenul, apoi salvează revizuirea.")}
                  disabled={isPending || selectedSignal.status === "converted"}
                  loading={isPending}
                  size="small"
                >{selectedSignal.analysisStatus === "completed" ? "Pregătește din nou cu AI" : "Pregătește cu AI"}</Button>}
              />

              {selectedSignal.uncertaintyNotes.length > 0 ? <StatusNotice tone="warning">{selectedSignal.uncertaintyNotes.join(" ")}</StatusNotice> : null}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Titlu"><input value={reviewForm.title} onChange={(event) => setReviewForm({ ...reviewForm, title: event.target.value })} className={fieldClasses()} /></Field>
                <Field label="Companie extrasă"><input value={reviewForm.company} onChange={(event) => setReviewForm({ ...reviewForm, company: event.target.value })} className={fieldClasses()} /></Field>
                <Field label="Contact extras"><input value={reviewForm.contact} onChange={(event) => setReviewForm({ ...reviewForm, contact: event.target.value })} className={fieldClasses()} /></Field>
                <Field label="Email"><input type="email" value={reviewForm.email} onChange={(event) => setReviewForm({ ...reviewForm, email: event.target.value })} className={fieldClasses()} /></Field>
                <Field label="Telefon"><input value={reviewForm.phone} onChange={(event) => setReviewForm({ ...reviewForm, phone: event.target.value })} className={fieldClasses()} /></Field>
                <Field label="Valoare comercială"><input type="number" min="0" value={reviewForm.value} onChange={(event) => setReviewForm({ ...reviewForm, value: event.target.value })} className={fieldClasses()} /></Field>
                <Field label="Ultima interacțiune"><input type="datetime-local" value={reviewForm.lastInteractionAt} onChange={(event) => setReviewForm({ ...reviewForm, lastInteractionAt: event.target.value })} className={fieldClasses()} /></Field>
                <Field label="Termen recomandat"><input type="date" value={reviewForm.dueAt} onChange={(event) => setReviewForm({ ...reviewForm, dueAt: event.target.value })} className={fieldClasses()} /></Field>
              </div>
              <Field label="Context original"><textarea rows={4} value={reviewForm.context} onChange={(event) => setReviewForm({ ...reviewForm, context: event.target.value })} className={`${fieldClasses()} py-3`} /></Field>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Responsabil"><select value={reviewForm.ownerProfileId} onChange={(event) => setReviewForm({ ...reviewForm, ownerProfileId: event.target.value })} className={fieldClasses()}><option value="">Neatribuit</option>{assignableProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.fullName}</option>)}</select></Field>
                <Field label="Companie CRM"><select value={reviewForm.organizationId} onChange={(event) => setReviewForm({ ...reviewForm, organizationId: event.target.value, contactId: "", opportunityId: "" })} className={fieldClasses()}><option value="">Fără potrivire</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></Field>
                <Field label="Contact CRM"><select value={reviewForm.contactId} onChange={(event) => setReviewForm({ ...reviewForm, contactId: event.target.value })} className={fieldClasses()}><option value="">Fără potrivire</option>{contacts.filter((contact) => !reviewForm.organizationId || !contact.organizationId || contact.organizationId === reviewForm.organizationId).map((contact) => <option key={contact.id} value={contact.id}>{contact.fullName}{contact.email ? ` · ${contact.email}` : ""}</option>)}</select></Field>
                <Field label="Oportunitate existentă"><select value={reviewForm.opportunityId} onChange={(event) => setReviewForm({ ...reviewForm, opportunityId: event.target.value })} className={fieldClasses()}><option value="">Creează oportunitate nouă</option>{opportunities.filter((opportunity) => !reviewForm.organizationId || !opportunity.organizationId || opportunity.organizationId === reviewForm.organizationId).map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{opportunity.title}</option>)}</select></Field>
              </div>

              {!reviewForm.organizationId ? <div className="grid gap-4 md:grid-cols-2"><Field label="Companie CRM nouă"><input value={reviewForm.newOrganizationName} onChange={(event) => setReviewForm({ ...reviewForm, newOrganizationName: event.target.value })} placeholder={reviewForm.company || "Denumire companie"} className={fieldClasses()} /></Field></div> : null}
              {!reviewForm.contactId ? <div className="grid gap-4 md:grid-cols-3"><Field label="Contact CRM nou"><input value={reviewForm.newContactName} onChange={(event) => setReviewForm({ ...reviewForm, newContactName: event.target.value })} placeholder={reviewForm.contact || "Nume contact"} className={fieldClasses()} /></Field><Field label="Email contact nou"><input type="email" value={reviewForm.newContactEmail} onChange={(event) => setReviewForm({ ...reviewForm, newContactEmail: event.target.value })} className={fieldClasses()} /></Field><Field label="Telefon contact nou"><input value={reviewForm.newContactPhone} onChange={(event) => setReviewForm({ ...reviewForm, newContactPhone: event.target.value })} className={fieldClasses()} /></Field></div> : null}

              <div className="grid gap-4 border-t border-[rgb(var(--border))] pt-5">
                <div>
                  <h3 className="text-sm font-semibold">Draft recomandat</h3>
                  <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">Poți edita conținutul. ReveNew îl păstrează ca draft intern și nu îl trimite automat.</p>
                </div>
                <Field label="Subiect"><input maxLength={160} value={reviewForm.draftSubject} onChange={(event) => setReviewForm({ ...reviewForm, draftSubject: event.target.value })} className={fieldClasses()} /></Field>
                <Field label="Mesaj"><textarea rows={7} maxLength={4000} value={reviewForm.draftBody} onChange={(event) => setReviewForm({ ...reviewForm, draftBody: event.target.value })} placeholder="Draft opțional; necesită revizuire umană." className={`${fieldClasses()} py-3`} /></Field>
              </div>

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
                <div className="grid gap-4 border-t border-[rgb(var(--border))] pt-5 md:grid-cols-[1fr_auto]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Motiv decizie"><input value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} placeholder="Obligatoriu pentru arhivare, respingere sau duplicat" className={fieldClasses()} /></Field>
                    <Field label="Reia revizuirea la"><input type="datetime-local" value={postponeUntil} onChange={(event) => setPostponeUntil(event.target.value)} className={fieldClasses()} /></Field>
                  </div>
                  <div className="flex flex-wrap items-end gap-2"><Button variant="ghost" onClick={archive} disabled={isPending || !decisionReason.trim()}>Arhivează</Button><Button variant="ghost" onClick={() => decide("dismissed")} disabled={isPending}>Respinge</Button><Button variant="ghost" onClick={() => decide("duplicate")} disabled={isPending}>Marchează duplicat</Button><Button variant="secondary" onClick={() => decide("postponed")} disabled={isPending || !postponeUntil}>Amână</Button></div>
                </div>
              ) : null}

              <div className="border-t border-[rgb(var(--border))] pt-5">
                <h3 className="text-sm font-semibold">Istoric verificabil</h3>
                <div className="mt-3 grid gap-3">{(selectedSignal.events ?? []).map((event) => <div key={event.id} className="rounded-lg bg-[rgb(var(--surface-elevated))] p-3"><p className="text-sm font-medium">{event.description || event.eventType}</p><p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">{formatDateTimeWithSeconds(event.createdAt)}</p></div>)}{(selectedSignal.events ?? []).length === 0 ? <p className="text-sm text-[rgb(var(--muted-foreground))]">Nu există evenimente înregistrate încă.</p> : null}</div>
              </div>
            </div>
          ) : <EmptyState title="Selectează un semnal" description="Alege un element din coadă pentru analiză și revizuire." />}
        </DataCard>
      </div>
    </div>
  );
}
