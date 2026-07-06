"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { DataCard } from "@/components/dashboard/DataCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/Button";
import { StatusNotice } from "@/components/ui/StatusNotice";
import {
  archiveCommercialSignal,
  convertSignalToOpportunity,
  createCommercialSignal,
  ignoreCommercialSignal,
  updateCommercialSignal
} from "@/lib/commercial-inbox-actions";
import type { CommercialSignal, CommercialSignalPriority, CommercialSignalSource, CommercialSignalStatus } from "@/lib/types";
import { formatCurrency, formatDateTimeWithSeconds } from "@/lib/utils";

const sourceLabels: Record<CommercialSignalSource, string> = {
  manual: "Manual",
  email: "Email",
  phone: "Apel telefonic",
  missed_call: "Apel ratat",
  website_form: "Formular website",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  csv_import: "Import CSV",
  ai_receptionist: "AI Receptionist",
  referral: "Recomandare",
  other: "Alta sursa"
};

const statusLabels: Record<CommercialSignalStatus, string> = {
  new: "Nou",
  reviewed: "Revizuit",
  converted: "Convertit",
  ignored: "Ignorat",
  archived: "Arhivat"
};

const priorityLabels: Record<CommercialSignalPriority, string> = {
  low: "Scazuta",
  medium: "Medie",
  high: "Ridicata",
  urgent: "Urgenta"
};

const sources = Object.keys(sourceLabels) as CommercialSignalSource[];
const statuses = Object.keys(statusLabels) as CommercialSignalStatus[];
const priorities = Object.keys(priorityLabels) as CommercialSignalPriority[];

type SignalFormState = {
  source: CommercialSignalSource;
  priority: CommercialSignalPriority;
  contactName: string;
  contactCompany: string;
  contactEmail: string;
  contactPhone: string;
  contactRole: string;
  rawMessage: string;
  extractedSummary: string;
  detectedNeed: string;
  serviceInterest: string;
  location: string;
  requestedDate: string;
  estimatedValueMin: string;
  estimatedValueMax: string;
  urgencyScore: string;
  fitScore: string;
  confidenceScore: string;
  recommendedAction: string;
  nextStep: string;
  notes: string;
};

type CommercialInboxClientProps = {
  initialSignals: CommercialSignal[];
  tableReady: boolean;
  setupMessage?: string;
};

const emptyForm: SignalFormState = {
  source: "manual",
  priority: "medium",
  contactName: "",
  contactCompany: "",
  contactEmail: "",
  contactPhone: "",
  contactRole: "",
  rawMessage: "",
  extractedSummary: "",
  detectedNeed: "",
  serviceInterest: "",
  location: "",
  requestedDate: "",
  estimatedValueMin: "",
  estimatedValueMax: "",
  urgencyScore: "50",
  fitScore: "50",
  confidenceScore: "50",
  recommendedAction: "",
  nextStep: "",
  notes: ""
};

function toInput(signal: CommercialSignal): SignalFormState {
  return {
    source: signal.source,
    priority: signal.priority,
    contactName: signal.contactName ?? "",
    contactCompany: signal.contactCompany ?? "",
    contactEmail: signal.contactEmail ?? "",
    contactPhone: signal.contactPhone ?? "",
    contactRole: signal.contactRole ?? "",
    rawMessage: signal.rawMessage ?? "",
    extractedSummary: signal.extractedSummary ?? "",
    detectedNeed: signal.detectedNeed ?? "",
    serviceInterest: signal.serviceInterest ?? "",
    location: signal.location ?? "",
    requestedDate: signal.requestedDate ? signal.requestedDate.slice(0, 16) : "",
    estimatedValueMin: signal.estimatedValueMin ? String(signal.estimatedValueMin) : "",
    estimatedValueMax: signal.estimatedValueMax ? String(signal.estimatedValueMax) : "",
    urgencyScore: String(signal.urgencyScore),
    fitScore: String(signal.fitScore),
    confidenceScore: String(signal.confidenceScore),
    recommendedAction: signal.recommendedAction ?? "",
    nextStep: signal.nextStep ?? "",
    notes: signal.notes ?? ""
  };
}

function toPayload(form: SignalFormState, status?: CommercialSignalStatus) {
  return {
    source: form.source,
    priority: form.priority,
    status,
    contactName: form.contactName,
    contactCompany: form.contactCompany,
    contactEmail: form.contactEmail,
    contactPhone: form.contactPhone,
    contactRole: form.contactRole,
    rawMessage: form.rawMessage,
    extractedSummary: form.extractedSummary,
    detectedNeed: form.detectedNeed,
    serviceInterest: form.serviceInterest,
    location: form.location,
    requestedDate: form.requestedDate,
    estimatedValueMin: form.estimatedValueMin ? Number(form.estimatedValueMin) : undefined,
    estimatedValueMax: form.estimatedValueMax ? Number(form.estimatedValueMax) : undefined,
    urgencyScore: Number(form.urgencyScore || 50),
    fitScore: Number(form.fitScore || 50),
    confidenceScore: Number(form.confidenceScore || 50),
    recommendedAction: form.recommendedAction,
    nextStep: form.nextStep,
    notes: form.notes
  };
}

function badgeClass(kind: "source" | "status" | "priority", value: string) {
  if (kind === "priority" && value === "urgent") return "border-gold-400/30 bg-gold-400/10 text-gold-300";
  if (kind === "status" && value === "converted") return "border-mint-400/30 bg-mint-400/10 text-mint-300";
  if (kind === "status" && ["ignored", "archived"].includes(value)) return "border-white/10 bg-white/[0.04] text-zinc-500";
  return "border-white/10 bg-white/[0.06] text-zinc-300";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-zinc-300">
      <span>{label}</span>
      {children}
    </label>
  );
}

function textInputClasses() {
  return "min-h-11 rounded-lg border border-white/10 bg-ink-950/80 px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-mint-400/50";
}

export function CommercialInboxClient({ initialSignals, tableReady, setupMessage }: CommercialInboxClientProps) {
  const [signals, setSignals] = useState(initialSignals);
  const [statusFilter, setStatusFilter] = useState<CommercialSignalStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<CommercialSignalSource | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<CommercialSignalPriority | "all">("all");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SignalFormState>(emptyForm);
  const [selectedId, setSelectedId] = useState(initialSignals[0]?.id ?? "");
  const [reviewForm, setReviewForm] = useState<SignalFormState>(initialSignals[0] ? toInput(initialSignals[0]) : emptyForm);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(setupMessage ?? "");
  const [isPending, startTransition] = useTransition();

  const selectedSignal = signals.find((signal) => signal.id === selectedId) ?? null;
  const filteredSignals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return signals.filter((signal) => {
      const haystack = [
        signal.contactName,
        signal.contactCompany,
        signal.contactEmail,
        signal.rawMessage,
        signal.extractedSummary,
        signal.detectedNeed,
        signal.serviceInterest,
        signal.recommendedAction
      ].filter(Boolean).join(" ").toLowerCase();
      return (
        (statusFilter === "all" || signal.status === statusFilter) &&
        (sourceFilter === "all" || signal.source === sourceFilter) &&
        (priorityFilter === "all" || signal.priority === priorityFilter) &&
        (!normalizedQuery || haystack.includes(normalizedQuery))
      );
    });
  }, [priorityFilter, query, signals, sourceFilter, statusFilter]);

  const activeSignals = signals.filter((signal) => !["converted", "ignored", "archived"].includes(signal.status));
  const newCount = signals.filter((signal) => signal.status === "new").length;
  const urgentCount = signals.filter((signal) => signal.priority === "urgent" || signal.urgencyScore >= 80).length;
  const convertedCount = signals.filter((signal) => signal.status === "converted").length;
  const estimatedPotential = activeSignals.reduce((sum, signal) => sum + Number(signal.estimatedValueMax ?? signal.estimatedValueMin ?? 0), 0);

  function updateSignalState(signal: CommercialSignal) {
    setSignals((items) => items.map((item) => (item.id === signal.id ? { ...item, ...signal } : item)));
    setSelectedId(signal.id);
    setReviewForm(toInput(signal));
  }

  function handleSelect(signal: CommercialSignal) {
    setSelectedId(signal.id);
    setReviewForm(toInput(signal));
    setNotice("");
    setError("");
  }

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setError("");
    startTransition(async () => {
      const result = await createCommercialSignal(toPayload(form));
      if (!result.ok || !result.signal) {
        setError(result.message ?? "Semnalul nu a putut fi adaugat.");
        return;
      }
      setSignals((items) => [result.signal, ...items]);
      setSelectedId(result.signal.id);
      setReviewForm(toInput(result.signal));
      setForm(emptyForm);
      setShowForm(false);
      setNotice("Semnalul comercial a fost adaugat.");
    });
  }

  function handleSave(status?: CommercialSignalStatus) {
    if (!selectedSignal) return;
    setNotice("");
    setError("");
    startTransition(async () => {
      const result = await updateCommercialSignal(selectedSignal.id, toPayload(reviewForm, status));
      if (!result.ok || !result.signal) {
        setError(result.message ?? "Semnalul nu a putut fi salvat.");
        return;
      }
      updateSignalState(result.signal);
      setNotice(status === "reviewed" ? "Semnalul a fost marcat ca revizuit." : "Semnalul a fost salvat.");
    });
  }

  function handleIgnore(signal: CommercialSignal) {
    setNotice("");
    setError("");
    startTransition(async () => {
      const result = await ignoreCommercialSignal(signal.id);
      if (!result.ok || !result.signal) {
        setError(result.message ?? "Semnalul nu a putut fi ignorat.");
        return;
      }
      updateSignalState(result.signal);
      setNotice("Semnalul a fost ignorat.");
    });
  }

  function handleArchive(signal: CommercialSignal) {
    setNotice("");
    setError("");
    startTransition(async () => {
      const result = await archiveCommercialSignal(signal.id);
      if (!result.ok || !result.signal) {
        setError(result.message ?? "Semnalul nu a putut fi arhivat.");
        return;
      }
      updateSignalState(result.signal);
      setNotice("Semnalul a fost arhivat.");
    });
  }

  function handleConvert(signal: CommercialSignal) {
    setNotice("");
    setError("");
    startTransition(async () => {
      const result = await convertSignalToOpportunity(signal.id);
      if (!result.ok || !result.opportunityId) {
        setError(result.message ?? "Semnalul nu a putut fi transformat in oportunitate.");
        return;
      }
      if (result.signal) {
        updateSignalState(result.signal);
      }
      setNotice(result.alreadyConverted ? "Semnalul era deja transformat intr-o oportunitate." : "Semnalul a fost transformat intr-o oportunitate.");
    });
  }

  if (!tableReady) {
    return (
      <div className="grid gap-6">
        <StatusNotice tone="warning">{setupMessage}</StatusNotice>
        <DataCard title="Inbox Comercial">
          <EmptyState
            title="Modulul Inbox Comercial nu este activ încă."
            description="După rularea migrației, aici vor apărea semnalele comerciale primite de firma."
          />
        </DataCard>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}
      {error ? <StatusNotice tone="warning">{error}</StatusNotice> : null}

      <DataCard title="Punct de intrare comercial">
        <p className="text-sm leading-6 text-zinc-300">
          Acesta este punctul de intrare pentru cererile comerciale. Un semnal poate fi ignorat, arhivat sau transformat intr-o oportunitate urmarita in ReveNew.
        </p>
      </DataCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Semnale noi" value={`${newCount}`} detail="Cereri comerciale neprocesate." />
        <MetricCard label="Semnale urgente" value={`${urgentCount}`} detail="Prioritate urgenta sau scor de urgenta ridicat." tone="gold" />
        <MetricCard label="Convertite în oportunități" value={`${convertedCount}`} detail="Semnale transformate în pipeline." tone="mint" />
        <MetricCard label="Valoare estimata potentiala" value={formatCurrency(estimatedPotential)} detail="Potential estimat din semnale neconvertite." />
      </div>

      <DataCard
        title="Adauga semnal"
        description="Nu trebuie completate toate campurile. ReveNew poate lucra si cu o nota scurta."
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => setShowForm((value) => !value)} className="px-4">
              {showForm ? "Inchide" : "Adauga semnal"}
            </Button>
            <Button type="button" variant="secondary" className="cursor-not-allowed px-4 opacity-60">
              Import CSV
            </Button>
          </div>
        }
      >
        {showForm ? (
          <form onSubmit={handleCreate} className="grid gap-6">
            <FormFields form={form} setForm={setForm} />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" className="px-4" disabled={isPending}>
                Salvează semnal
              </Button>
              <Button type="button" variant="ghost" className="px-4" onClick={() => setForm(emptyForm)}>
                Reseteaza
              </Button>
            </div>
          </form>
        ) : null}
      </DataCard>

      <DataCard title="Filtre">
        <div className="grid gap-3 md:grid-cols-4">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as CommercialSignalStatus | "all")} className={textInputClasses()}>
            <option value="all">Toate statusurile</option>
            {statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
          </select>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as CommercialSignalSource | "all")} className={textInputClasses()}>
            <option value="all">Toate sursele</option>
            {sources.map((source) => <option key={source} value={source}>{sourceLabels[source]}</option>)}
          </select>
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as CommercialSignalPriority | "all")} className={textInputClasses()}>
            <option value="all">Toate prioritatile</option>
            {priorities.map((priority) => <option key={priority} value={priority}>{priorityLabels[priority]}</option>)}
          </select>
          <input value={query} onChange={(event) => setQuery(event.target.value)} className={textInputClasses()} placeholder="Caută contact, firmă, nevoie..." />
        </div>
      </DataCard>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <DataCard title="Semnale comerciale" description="Cele mai noi apar primele.">
          <div className="grid gap-4">
            {filteredSignals.length > 0 ? (
              filteredSignals.map((signal) => (
                <article key={signal.id} className="rounded-lg border border-white/10 bg-ink-900/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded border px-2 py-1 text-xs font-semibold ${badgeClass("source", signal.source)}`}>{signal.sourceLabel ?? sourceLabels[signal.source]}</span>
                    <span className={`rounded border px-2 py-1 text-xs font-semibold ${badgeClass("status", signal.status)}`}>{statusLabels[signal.status]}</span>
                    <span className={`rounded border px-2 py-1 text-xs font-semibold ${badgeClass("priority", signal.priority)}`}>{priorityLabels[signal.priority]}</span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-white">{signal.contactCompany || signal.contactName || "Semnal fara contact"}</h3>
                  <p className="mt-1 text-sm text-zinc-400">{[signal.contactName, signal.contactRole, signal.contactEmail, signal.contactPhone].filter(Boolean).join(" | ")}</p>
                  <p className="mt-3 text-sm leading-6 text-zinc-300">{signal.extractedSummary || signal.rawMessage || signal.detectedNeed || "Fara sumar încă."}</p>
                  {signal.detectedNeed ? <p className="mt-2 text-sm text-zinc-400">Nevoie: <span className="text-zinc-200">{signal.detectedNeed}</span></p> : null}
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <p><span className="block text-xs uppercase tracking-[0.14em] text-zinc-500">Valoare</span><span className="font-semibold text-white">{formatCurrency(Number(signal.estimatedValueMin ?? 0))} - {formatCurrency(Number(signal.estimatedValueMax ?? signal.estimatedValueMin ?? 0))}</span></p>
                    <p><span className="block text-xs uppercase tracking-[0.14em] text-zinc-500">Scoruri</span><span className="font-semibold text-white">U {signal.urgencyScore} / F {signal.fitScore} / C {signal.confidenceScore}</span></p>
                    <p><span className="block text-xs uppercase tracking-[0.14em] text-zinc-500">Primit</span><span className="font-semibold text-white">{formatDateTimeWithSeconds(signal.occurredAt ?? signal.createdAt ?? undefined)}</span></p>
                  </div>
                  {signal.recommendedAction ? <p className="mt-3 text-sm font-semibold text-mint-300">{signal.recommendedAction}</p> : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" className="min-h-10 px-3" onClick={() => handleSelect(signal)}>Revizuiește</Button>
                    {signal.convertedOpportunityId ? (
                      <Button href={`/opportunities/${signal.convertedOpportunityId}`} variant="secondary" className="min-h-10 px-3">Deschide oportunitatea</Button>
                    ) : (
                      <Button type="button" className="min-h-10 px-3" onClick={() => handleConvert(signal)}>Transforma in oportunitate</Button>
                    )}
                    <Button type="button" variant="ghost" className="min-h-10 px-3" onClick={() => handleIgnore(signal)}>Ignora</Button>
                    <Button type="button" variant="ghost" className="min-h-10 px-3" onClick={() => handleArchive(signal)}>Arhiveaza</Button>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState title="Nu exista semnale comerciale încă." description="Adauga o cerere primita din email, telefon, formular sau WhatsApp. Semnalele importante pot fi transformate în oportunități." />
            )}
          </div>
        </DataCard>

        <DataCard title="Revizuire semnal" description="Actualizeaza detaliile inainte de conversie.">
          {selectedSignal ? (
            <div className="grid gap-5">
              <div className="rounded-lg border border-white/10 bg-ink-900/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded border px-2 py-1 text-xs font-semibold ${badgeClass("status", selectedSignal.status)}`}>{statusLabels[selectedSignal.status]}</span>
                  <span className={`rounded border px-2 py-1 text-xs font-semibold ${badgeClass("priority", selectedSignal.priority)}`}>{priorityLabels[selectedSignal.priority]}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{selectedSignal.rawMessage || selectedSignal.extractedSummary || "Fara mesaj brut."}</p>
              </div>
              <FormFields form={reviewForm} setForm={setReviewForm} compact />
              <div className="flex flex-wrap gap-2">
                <Button type="button" className="px-4" onClick={() => handleSave()}>Salvează</Button>
                <Button type="button" variant="secondary" className="px-4" onClick={() => handleSave("reviewed")}>Marchează revizuit</Button>
                {selectedSignal.convertedOpportunityId ? (
                  <Button href={`/opportunities/${selectedSignal.convertedOpportunityId}`} variant="secondary" className="px-4">Deschide oportunitatea</Button>
                ) : (
                  <Button type="button" className="px-4" onClick={() => handleConvert(selectedSignal)}>Transforma</Button>
                )}
                <Button type="button" variant="ghost" className="px-4" onClick={() => handleIgnore(selectedSignal)}>Ignora</Button>
                <Button type="button" variant="ghost" className="px-4" onClick={() => handleArchive(selectedSignal)}>Arhiveaza</Button>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500">Evenimente</h3>
                <div className="mt-3 grid gap-2">
                  {(selectedSignal.events ?? []).length > 0 ? selectedSignal.events?.map((event) => (
                    <div key={event.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                      <p className="text-sm font-semibold text-white">{event.eventType}</p>
                      <p className="mt-1 text-sm text-zinc-400">{event.description}</p>
                      <p className="mt-2 text-xs text-zinc-500">{formatDateTimeWithSeconds(event.createdAt)}</p>
                    </div>
                  )) : <p className="text-sm text-zinc-500">Evenimentele vor aparea dupa salvare sau conversie.</p>}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState title="Alege un semnal" description="Selecteaza un semnal din lista pentru revizuire." />
          )}
        </DataCard>
      </div>
    </div>
  );
}

function FormFields({ form, setForm, compact = false }: { form: SignalFormState; setForm: React.Dispatch<React.SetStateAction<SignalFormState>>; compact?: boolean }) {
  function setField<K extends keyof SignalFormState>(key: K, value: SignalFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="grid gap-5">
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500">Contact</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Sursa">
            <select value={form.source} onChange={(event) => setField("source", event.target.value as CommercialSignalSource)} className={textInputClasses()}>
              {sources.map((source) => <option key={source} value={source}>{sourceLabels[source]}</option>)}
            </select>
          </Field>
          <Field label="Prioritate">
            <select value={form.priority} onChange={(event) => setField("priority", event.target.value as CommercialSignalPriority)} className={textInputClasses()}>
              {priorities.map((priority) => <option key={priority} value={priority}>{priorityLabels[priority]}</option>)}
            </select>
          </Field>
          <Field label="Nume contact"><input value={form.contactName} onChange={(event) => setField("contactName", event.target.value)} className={textInputClasses()} /></Field>
          <Field label="Firma"><input value={form.contactCompany} onChange={(event) => setField("contactCompany", event.target.value)} className={textInputClasses()} /></Field>
          {!compact ? <Field label="Email"><input value={form.contactEmail} onChange={(event) => setField("contactEmail", event.target.value)} className={textInputClasses()} /></Field> : null}
          {!compact ? <Field label="Telefon"><input value={form.contactPhone} onChange={(event) => setField("contactPhone", event.target.value)} className={textInputClasses()} /></Field> : null}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500">Cerere</h3>
        <div className="grid gap-3">
          <Field label="Mesaj brut">
            <textarea value={form.rawMessage} onChange={(event) => setField("rawMessage", event.target.value)} rows={compact ? 4 : 5} className={`${textInputClasses()} py-3`} />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nevoie detectata"><input value={form.detectedNeed} onChange={(event) => setField("detectedNeed", event.target.value)} className={textInputClasses()} /></Field>
            <Field label="Serviciu de interes"><input value={form.serviceInterest} onChange={(event) => setField("serviceInterest", event.target.value)} className={textInputClasses()} /></Field>
            <Field label="Locatie"><input value={form.location} onChange={(event) => setField("location", event.target.value)} className={textInputClasses()} /></Field>
            <Field label="Data solicitata"><input type="datetime-local" value={form.requestedDate} onChange={(event) => setField("requestedDate", event.target.value)} className={textInputClasses()} /></Field>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500">Prioritate</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Valoare minima"><input type="number" value={form.estimatedValueMin} onChange={(event) => setField("estimatedValueMin", event.target.value)} className={textInputClasses()} /></Field>
          <Field label="Valoare maxima"><input type="number" value={form.estimatedValueMax} onChange={(event) => setField("estimatedValueMax", event.target.value)} className={textInputClasses()} /></Field>
          <Field label="Urgenta"><input type="number" min="0" max="100" value={form.urgencyScore} onChange={(event) => setField("urgencyScore", event.target.value)} className={textInputClasses()} /></Field>
          <Field label="Fit"><input type="number" min="0" max="100" value={form.fitScore} onChange={(event) => setField("fitScore", event.target.value)} className={textInputClasses()} /></Field>
          <Field label="Incredere"><input type="number" min="0" max="100" value={form.confidenceScore} onChange={(event) => setField("confidenceScore", event.target.value)} className={textInputClasses()} /></Field>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500">Recomandare</h3>
        <div className="grid gap-3">
          <Field label="Actiune recomandata"><input value={form.recommendedAction} onChange={(event) => setField("recommendedAction", event.target.value)} className={textInputClasses()} /></Field>
          <Field label="Urmatorul pas"><input value={form.nextStep} onChange={(event) => setField("nextStep", event.target.value)} className={textInputClasses()} /></Field>
          <Field label="Note"><textarea value={form.notes} onChange={(event) => setField("notes", event.target.value)} rows={3} className={`${textInputClasses()} py-3`} /></Field>
        </div>
      </section>
    </div>
  );
}
