"use client";

import { useMemo, useState, useTransition } from "react";
import { DataCard } from "@/components/dashboard/DataCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { InboxIngestionActions } from "@/components/inbox/InboxIngestionActions";
import { Button } from "@/components/ui/Button";
import { DataSummaryStrip } from "@/components/ui/DataSummaryStrip";
import { StatusNotice } from "@/components/ui/StatusNotice";
import {
  analyzeCommercialSignal,
  approveCommercialSignal,
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

type CommercialInboxClientProps = {
  initialSignals: CommercialSignal[];
  tableReady: boolean;
  organizations: OrganizationOption[];
  contacts: ContactOption[];
  assignableProfiles: ProfileOption[];
  initialSource?: CommercialSignalSource | "all";
  initialBatchId?: string;
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
  context: ""
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

function InsightList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2 grid gap-1 text-sm leading-6 text-[rgb(var(--muted-foreground))]">
        {items.map((item) => <li key={`${title}:${item}`}>• {item}</li>)}
      </ul>
    </div>
  );
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
  assignableProfiles,
  initialSource = "all",
  initialBatchId
}: CommercialInboxClientProps) {
  const initiallySelectedSignal = initialSignals.find((signal) => !initialBatchId || signal.importBatchId === initialBatchId) ?? initialSignals[0];
  const [signals, setSignals] = useState(initialSignals);
  const [selectedId, setSelectedId] = useState(initiallySelectedSignal?.id ?? "");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate);
  const [reviewForm, setReviewForm] = useState<ReviewForm>(initiallySelectedSignal ? reviewFormFor(initiallySelectedSignal) : reviewFormFor({ title: "" } as CommercialSignal));
  const [reviewStatus, setReviewStatus] = useState<CommercialSignalReviewStatus | "all">("all");
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
    return (reviewStatus === "all" || signal.reviewStatus === reviewStatus)
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
    || new Date(a.lastInteractionAt ?? a.createdAt ?? 0).getTime() - new Date(b.lastInteractionAt ?? b.createdAt ?? 0).getTime()), [confidence, duplicateFilter, initialBatchId, matchFilter, minimumValue, ownerFilter, query, reviewStatus, signals, source, urgency]);

  const awaitingReview = signals.filter((signal) => ["ready_for_review", "postponed"].includes(signal.reviewStatus));
  const estimatedUnderReview = awaitingReview.reduce((sum, signal) => sum + Number(signal.estimatedRecoverableValue ?? 0), 0);
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
        rawMessage: createForm.context
      });
      if (result.ok && result.signal) {
        setSignals((items) => [result.signal!, ...items]);
        setSelectedId(result.signal.id);
        setReviewForm(reviewFormFor(result.signal));
        setCreateForm(emptyCreate);
        setCreateOpen(false);
      }
      return result;
    }, "Semnalul a fost creat și așteaptă analiza.");
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
      reviewedDraft: formatRecoveryDraft(reviewForm.draftSubject, reviewForm.draftBody)
    }), "Semnalul a fost aprobat și convertit într-un caz de recuperare urmărit.");
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

      <DataSummaryStrip label="Rezumat Inbox Comercial" items={[
        { label: "În revizuire", value: awaitingReview.length, note: "Necesită decizia echipei.", tone: "warning" },
        { label: "Potențial estimat · RON", value: formatCurrency(estimatedUnderReview, "RON"), note: "Separat de venitul confirmat.", tone: "brand" },
        { label: "Convertite", value: converted, note: "Aprobate de echipă.", tone: "success" },
        { label: "Control extern", value: "Manual", note: "Nicio trimitere automată.", tone: "neutral" }
      ]} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-[rgb(var(--muted-foreground))]">ReveNew recomandă. Echipa ta verifică, editează și aprobă înainte de orice acțiune externă.</p>
        <Button onClick={() => setCreateOpen((open) => !open)}>{createOpen ? "Închide" : "Adaugă semnal"}</Button>
      </div>

      {createOpen ? (
        <DataCard title="Semnal comercial nou" description="Introdu numai informațiile disponibile; câmpurile lipsă vor fi semnalate în analiză.">
          <form onSubmit={handleCreate} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Titlu"><input required maxLength={240} value={createForm.title} onChange={(event) => setCreateForm({ ...createForm, title: event.target.value })} className={fieldClasses()} /></Field>
              <Field label="Sursă"><select value={createForm.source} onChange={(event) => setCreateForm({ ...createForm, source: event.target.value as CommercialSignalSource })} className={fieldClasses()}>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
              <Field label="Referință sursă"><input maxLength={500} value={createForm.sourceReference} onChange={(event) => setCreateForm({ ...createForm, sourceReference: event.target.value })} className={fieldClasses()} /></Field>
              <Field label="Companie"><input value={createForm.company} onChange={(event) => setCreateForm({ ...createForm, company: event.target.value })} className={fieldClasses()} /></Field>
              <Field label="Contact"><input value={createForm.contact} onChange={(event) => setCreateForm({ ...createForm, contact: event.target.value })} className={fieldClasses()} /></Field>
              <Field label="Email"><input type="email" value={createForm.email} onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })} className={fieldClasses()} /></Field>
              <Field label="Telefon"><input value={createForm.phone} onChange={(event) => setCreateForm({ ...createForm, phone: event.target.value })} className={fieldClasses()} /></Field>
              <Field label="Valoare estimată"><input type="number" min="0" value={createForm.value} onChange={(event) => setCreateForm({ ...createForm, value: event.target.value })} className={fieldClasses()} /></Field>
              <Field label="Monedă"><select value={createForm.currency} onChange={(event) => setCreateForm({ ...createForm, currency: event.target.value })} className={fieldClasses()}><option>RON</option><option>EUR</option><option>USD</option></select></Field>
              <Field label="Ultima interacțiune"><input type="datetime-local" value={createForm.lastInteractionAt} onChange={(event) => setCreateForm({ ...createForm, lastInteractionAt: event.target.value })} className={fieldClasses()} /></Field>
            </div>
            <Field label="Context neconfirmat"><textarea required rows={4} maxLength={12000} value={createForm.context} onChange={(event) => setCreateForm({ ...createForm, context: event.target.value })} className={`${fieldClasses()} py-3`} /></Field>
            <div><Button type="submit" disabled={isPending}>Salvează semnalul</Button></div>
          </form>
        </DataCard>
      ) : null}

      <DataCard title="Coadă de recuperare" description="Ordine: urgență, scor, valoare și vechime.">
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
                  <div><span className="block text-xs text-[rgb(var(--muted-foreground))]">Potențial</span><strong>{formatCurrency(Number(signal.estimatedRecoverableValue ?? 0), signal.currency)}</strong></div>
                  <div><span className="block text-xs text-[rgb(var(--muted-foreground))]">Stare</span><strong>{reviewLabels[signal.reviewStatus]}</strong></div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-[rgb(var(--muted-foreground))]">{signal.recommendedAction || signal.extractedSummary || signal.rawMessage || "Necesită completarea contextului."}</p>
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

        <DataCard title={selectedSignal ? `Revizuire: ${selectedSignal.title}` : "Revizuire semnal"} description="Analizează contextul, verifică datele și decide. Aprobarea creează cazul urmărit, dar nu trimite mesaje externe.">
          {selectedSignal ? (
            <div className="grid gap-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border border-[rgb(var(--border))] px-2 py-1 text-xs font-semibold">{reviewLabels[selectedSignal.reviewStatus]}</span>
                <span className={`rounded border px-2 py-1 text-xs font-semibold ${urgencyClass(selectedSignal.urgencyLevel)}`}>{selectedSignal.urgencyLevel ? urgencyLabels[selectedSignal.urgencyLevel] : "Neanalizat"}</span>
                {selectedSignal.duplicateRisk ? <span className="rounded border border-red-400/30 bg-red-400/10 px-2 py-1 text-xs font-semibold text-red-700 dark:text-red-200">Posibil duplicat</span> : null}
                {selectedSignal.analysisMode ? <span className="rounded border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-2 py-1 text-xs font-semibold text-[rgb(var(--muted-foreground))]">{selectedSignal.analysisMode === "ai" ? "Analiză AI" : "Analiză pe reguli"}</span> : null}
                {(selectedSignal.events ?? []).some((event) => event.eventType === "analysis_review_edited") ? <span className="rounded border border-[rgb(var(--border))] px-2 py-1 text-xs font-semibold">Editat de utilizator</span> : null}
                <span className="rounded border border-[rgb(var(--border))] px-2 py-1 text-xs font-semibold">Netrimis automat</span>
                <span className="text-xs text-[rgb(var(--muted-foreground))]">Primit {formatDateTimeWithSeconds(selectedSignal.createdAt ?? undefined)}</span>
              </div>

              {selectedSignal.analysisStatus === "completed" ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <MetricCard label="Scor recuperabilitate" value={`${selectedSignal.recoverabilityScore ?? 0}/100`} detail="Prioritate estimată; necesită revizuire." tone="gold" />
                  <MetricCard label="Potențial estimat" value={formatCurrency(Number(selectedSignal.estimatedRecoverableValue ?? 0), selectedSignal.currency)} detail="Nu reprezintă venit garantat sau câștigat." />
                  <MetricCard label="Încredere" value={selectedSignal.confidenceLevel ? confidenceLabels[selectedSignal.confidenceLevel] : "Necunoscută"} detail={selectedSignal.primaryRecoveryReason ?? "Motiv în curs de confirmare."} />
                </div>
              ) : (
                <StatusNotice tone="neutral">Rulează analiza pentru a obține o prioritate estimată, apoi verifică rezultatul înainte de aprobare.</StatusNotice>
              )}

              {selectedSignal.analysisExplanation ? (
                <div className="grid gap-2 border-l-2 border-[rgb(var(--primary))] pl-4">
                  <h3 className="text-sm font-semibold">{selectedSignal.analysisMode === "ai" ? "Rezumat AI" : "Rezumat pe reguli"}</h3>
                  <p className="text-sm leading-6 text-[rgb(var(--muted-foreground))]">{selectedSignal.analysisExplanation}</p>
                </div>
              ) : null}
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold">De ce contează</h3>
                  <div className="mt-2 grid gap-2 text-sm leading-6 text-[rgb(var(--muted-foreground))]">
                    {selectedSignal.primaryRecoveryReason ? <p>{selectedSignal.primaryRecoveryReason}</p> : null}
                    {selectedSignal.detectedCommercialIntent ? <p><strong className="text-[rgb(var(--foreground))]">Intenție:</strong> {selectedSignal.detectedCommercialIntent}</p> : null}
                    {selectedSignal.relationshipContext ? <p><strong className="text-[rgb(var(--foreground))]">Relație:</strong> {selectedSignal.relationshipContext}</p> : null}
                  </div>
                </div>
                <InsightList title="Cum a fost calculat scorul" items={selectedSignal.scoreFactors} />
                <InsightList title="Informații lipsă" items={selectedSignal.missingInformation} />
                <InsightList title="Riscuri" items={selectedSignal.riskNotes} />
              </div>
              {selectedSignal.uncertaintyNotes.length > 0 ? <StatusNotice tone="warning">{selectedSignal.uncertaintyNotes.join(" ")}</StatusNotice> : null}
              <InsightList title="Checklist înainte de aprobare" items={selectedSignal.humanReviewChecklist} />
              {selectedSignal.alternativeDraftAngle ? <div><h3 className="text-sm font-semibold">Unghi alternativ</h3><p className="mt-2 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{selectedSignal.alternativeDraftAngle}</p></div> : null}

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
              <Field label="Acțiune recomandată"><textarea rows={3} value={reviewForm.recommendedAction} onChange={(event) => setReviewForm({ ...reviewForm, recommendedAction: event.target.value })} className={`${fieldClasses()} py-3`} /></Field>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Responsabil"><select value={reviewForm.ownerProfileId} onChange={(event) => setReviewForm({ ...reviewForm, ownerProfileId: event.target.value })} className={fieldClasses()}><option value="">Neatribuit</option>{assignableProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.fullName}</option>)}</select></Field>
                <Field label="Companie CRM"><select value={reviewForm.organizationId} onChange={(event) => setReviewForm({ ...reviewForm, organizationId: event.target.value, contactId: "" })} className={fieldClasses()}><option value="">Fără potrivire</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></Field>
                <Field label="Contact CRM"><select value={reviewForm.contactId} onChange={(event) => setReviewForm({ ...reviewForm, contactId: event.target.value })} className={fieldClasses()}><option value="">Fără potrivire</option>{contacts.filter((contact) => !reviewForm.organizationId || !contact.organizationId || contact.organizationId === reviewForm.organizationId).map((contact) => <option key={contact.id} value={contact.id}>{contact.fullName}{contact.email ? ` · ${contact.email}` : ""}</option>)}</select></Field>
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
                <Button onClick={() => runAction(() => analyzeCommercialSignal(selectedSignal.id), "Analiza este pregătită pentru revizuire.")} disabled={isPending || selectedSignal.status === "converted"}>{selectedSignal.analysisStatus === "completed" ? "Reanalizează" : "Analizează"}</Button>
                <Button variant="secondary" onClick={saveReviewFields} disabled={isPending}>Salvează modificările</Button>
                <Button onClick={approve} disabled={isPending || selectedSignal.analysisStatus !== "completed" || selectedSignal.status === "converted"}>Aprobă și creează oportunitatea</Button>
                {selectedSignal.convertedOpportunityId ? <Button href={`/opportunities/${selectedSignal.convertedOpportunityId}`} variant="secondary">Deschide oportunitatea</Button> : null}
              </div>

              {selectedSignal.status !== "converted" ? (
                <div className="grid gap-4 border-t border-[rgb(var(--border))] pt-5 md:grid-cols-[1fr_auto]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Motiv decizie"><input value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} placeholder="Obligatoriu pentru respingere sau duplicat" className={fieldClasses()} /></Field>
                    <Field label="Reia revizuirea la"><input type="datetime-local" value={postponeUntil} onChange={(event) => setPostponeUntil(event.target.value)} className={fieldClasses()} /></Field>
                  </div>
                  <div className="flex flex-wrap items-end gap-2"><Button variant="ghost" onClick={() => decide("dismissed")} disabled={isPending}>Respinge</Button><Button variant="ghost" onClick={() => decide("duplicate")} disabled={isPending}>Marchează duplicat</Button><Button variant="secondary" onClick={() => decide("postponed")} disabled={isPending || !postponeUntil}>Amână</Button></div>
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
