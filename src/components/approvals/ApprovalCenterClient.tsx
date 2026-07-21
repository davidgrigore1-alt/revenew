"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SignalPreparationPanel } from "@/components/signals/SignalPreparationPanel";
import { RecommendationFeedbackPanel } from "@/components/signals/RecommendationFeedbackPanel";
import { approveCommercialSignal, setCommercialSignalReviewDecision } from "@/lib/commercial-inbox-actions";
import {
  approvalCenterSignals,
  approvalCenterStateLabels,
  approvalReasonForSignal,
  approvalStateForSignal,
  proposedChangeForSignal,
  type ApprovalCenterState
} from "@/lib/approval-center";
import type { CommercialSignal } from "@/lib/types";
import { recommendationFeedbackCounts } from "@/lib/recommendation-feedback";
import { formatCurrency, formatDate, formatDateTimeWithSeconds } from "@/lib/utils";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusPill } from "@/components/ui/StatusPill";
import { Textarea } from "@/components/ui/Textarea";

type ApprovalCenterClientProps = {
  initialSignals: CommercialSignal[];
  initialSignalId?: string;
  organizations: Array<{ id: string; name: string }>;
  contacts: Array<{ id: string; fullName: string; organizationId?: string | null; email?: string | null }>;
  opportunities: Array<{ id: string; title: string; organizationId?: string | null }>;
  assignableProfiles: Array<{ id: string; fullName: string }>;
};

type ReviewForm = {
  organizationId: string;
  contactId: string;
  ownerProfileId: string;
  dueAt: string;
  recommendedAction: string;
  rejectionReason: string;
};

const filterLabels: Record<ApprovalCenterState | "all", string> = {
  all: "Toate",
  pending: "De aprobat",
  applied: "Aplicat",
  rejected: "Respins"
};

function formFor(signal: CommercialSignal): ReviewForm {
  return {
    organizationId: signal.matchedOrganizationId ?? "",
    contactId: signal.matchedContactId ?? "",
    ownerProfileId: signal.assignedToProfileId ?? signal.suggestedOwnerProfileId ?? "",
    dueAt: signal.suggestedDueDate ?? "",
    recommendedAction: signal.recommendedAction ?? "",
    rejectionReason: ""
  };
}

function toneForState(state: ApprovalCenterState) {
  return state === "pending" ? "warning" as const : state === "applied" ? "success" as const : "neutral" as const;
}

export function ApprovalCenterClient({
  initialSignals,
  initialSignalId,
  organizations,
  contacts,
  opportunities,
  assignableProfiles
}: ApprovalCenterClientProps) {
  const router = useRouter();
  const [signals, setSignals] = useState(initialSignals);
  const initialItems = approvalCenterSignals(initialSignals);
  const [selectedId, setSelectedId] = useState(initialSignalId && initialItems.some((item) => item.signal.id === initialSignalId)
    ? initialSignalId
    : initialItems[0]?.signal.id ?? "");
  const [filter, setFilter] = useState<ApprovalCenterState | "all">("all");
  const selectedSignal = signals.find((signal) => signal.id === selectedId) ?? null;
  const [form, setForm] = useState<ReviewForm>(() => selectedSignal ? formFor(selectedSignal) : {
    organizationId: "", contactId: "", ownerProfileId: "", dueAt: "", recommendedAction: "", rejectionReason: ""
  });
  const [notice, setNotice] = useState("");
  const [noticeHref, setNoticeHref] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => setSignals(initialSignals), [initialSignals]);

  const items = useMemo(() => approvalCenterSignals(signals, filter), [signals, filter]);
  const qualityCounts = useMemo(() => recommendationFeedbackCounts(signals), [signals]);

  function selectSignal(signal: CommercialSignal) {
    setSelectedId(signal.id);
    setForm(formFor(signal));
    setNotice("");
    setNoticeHref("");
    setError("");
  }

  function updateSignal(signal?: CommercialSignal) {
    if (!signal) return;
    setSignals((current) => current.map((item) => item.id === signal.id ? signal : item));
  }

  function approve() {
    if (!selectedSignal || approvalStateForSignal(selectedSignal) !== "pending") return;
    setNotice("");
    setError("");
    startTransition(async () => {
      const result = await approveCommercialSignal(selectedSignal.id, {
        organizationId: form.organizationId,
        contactId: form.contactId,
        newOrganizationName: form.organizationId ? undefined : selectedSignal.contactCompany ?? undefined,
        newContactName: form.contactId ? undefined : selectedSignal.contactName ?? undefined,
        newContactEmail: form.contactId ? undefined : selectedSignal.contactEmail ?? undefined,
        newContactPhone: form.contactId ? undefined : selectedSignal.contactPhone ?? undefined,
        ownerProfileId: form.ownerProfileId,
        dueAt: form.dueAt,
        recommendedAction: form.recommendedAction,
        reviewedDraft: selectedSignal.reviewedDraft ?? undefined
      });
      if (!result.ok) {
        setError(result.message ?? "Aprobarea nu a putut fi aplicată.");
        return;
      }
      updateSignal(result.signal);
      setNoticeHref(result.opportunityId ? `/opportunities/${result.opportunityId}` : selectedSignal.detectedFromOpportunityId ? `/opportunities/${selectedSignal.detectedFromOpportunityId}` : "/opportunities");
      setNotice(selectedSignal.detectedFromOpportunityId
        ? "Aprobarea a fost aplicată, iar acțiunea internă a fost creată în oportunitatea existentă."
        : "Aprobarea a fost aplicată, iar oportunitatea și prima acțiune internă au fost create.");
      router.refresh();
    });
  }

  function reject() {
    if (!selectedSignal || approvalStateForSignal(selectedSignal) !== "pending") return;
    const reason = form.rejectionReason.trim();
    if (!reason) {
      setError("Motivul respingerii este obligatoriu.");
      return;
    }
    setNotice("");
    setNoticeHref("");
    setError("");
    startTransition(async () => {
      const result = await setCommercialSignalReviewDecision(selectedSignal.id, "dismissed", reason);
      if (!result.ok) {
        setError(result.message ?? "Respingerea nu a putut fi salvată.");
        return;
      }
      updateSignal(result.signal);
      setNotice("Recomandarea a fost respinsă, iar motivul a fost înregistrat în audit.");
      router.refresh();
    });
  }

  const selectedState = selectedSignal ? approvalStateForSignal(selectedSignal) : null;
  const linkedOpportunity = selectedSignal?.detectedFromOpportunityId
    ? opportunities.find((opportunity) => opportunity.id === selectedSignal.detectedFromOpportunityId)
    : null;
  const filteredContacts = contacts.filter((contact) => !form.organizationId || !contact.organizationId || contact.organizationId === form.organizationId);

  return (
    <div className="grid gap-6">
      <Card padding="none" aria-label="Calitatea recomandărilor pregătite">
        <dl className="grid grid-cols-2 divide-x divide-y divide-[rgb(var(--border))] sm:grid-cols-4 sm:divide-y-0">
          {([
            ["De revizuit", qualityCounts.pending],
            ["Aplicate", qualityCounts.applied],
            ["Editate", qualityCounts.edited],
            ["Respinse", qualityCounts.rejected]
          ] as const).map(([label, value]) => <div key={label} className="px-4 py-3 sm:px-5"><dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">{label}</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd></div>)}
        </dl>
      </Card>

      {error ? <AlertBanner tone="danger" title="Acțiunea nu a fost aplicată">{error}</AlertBanner> : null}
      {notice ? <AlertBanner tone="success" title="Decizie înregistrată"><span>{notice}</span>{noticeHref ? <Link href={noticeHref} className="focus-ring ml-2 inline-flex rounded font-semibold underline underline-offset-4">Revizuiește oportunitatea</Link> : null}</AlertBanner> : null}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(19rem,0.78fr)_minmax(0,1.45fr)]">
        <Card as="section" padding="none" className="min-w-0 overflow-hidden" aria-labelledby="approval-list-title">
          <div className="border-b border-[rgb(var(--border))] p-4 sm:p-5">
            <h2 id="approval-list-title" className="font-semibold">Decizii comerciale</h2>
            <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">Selectează o recomandare pentru a vedea efectul exact.</p>
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtre aprobări">
              {(Object.keys(filterLabels) as Array<ApprovalCenterState | "all">).map((value) => (
                <Button key={value} variant={filter === value ? "primary" : "secondary"} size="small" onClick={() => setFilter(value)} aria-label={`Filtru ${filterLabels[value]}`}>
                  {filterLabels[value]}
                </Button>
              ))}
            </div>
          </div>
          {items.length > 0 ? (
            <div className="divide-y divide-[rgb(var(--border))]">
              {items.map(({ signal, state }) => (
                <button
                  key={signal.id}
                  type="button"
                  onClick={() => selectSignal(signal)}
                  aria-current={signal.id === selectedId ? "true" : undefined}
                  className="focus-ring grid w-full gap-3 p-4 text-left transition-colors hover:bg-[rgb(var(--surface-muted))] aria-[current=true]:bg-[rgb(var(--brand-50))] dark:aria-[current=true]:bg-[rgb(var(--brand-900)/0.2)] sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{signal.title}</p><p className="mt-1 truncate text-xs text-[rgb(var(--text-muted))]">{signal.contactCompany || signal.contactName || "Context neconfirmat"}</p></div><StatusPill tone={toneForState(state)}>{approvalCenterStateLabels[state]}</StatusPill></div>
                  <p className="line-clamp-2 text-sm leading-5 text-[rgb(var(--text-secondary))]">{proposedChangeForSignal(signal)}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[rgb(var(--text-muted))]"><span>{signal.sourceLabel ?? signal.source} · {formatDate(signal.createdAt ?? signal.occurredAt ?? undefined)}</span><span className="font-semibold text-[rgb(var(--primary))]">Revizuiește →</span></div>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 p-5">
              <div>
                <h3 className="font-semibold">Nicio decizie în această vedere</h3>
                <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Aici ajung recomandările pregătite din Inbox Comercial pentru o decizie umană auditabilă. Analizează și revizuiește un semnal înainte de aprobare.</p>
              </div>
              <div><Button href="/inbox" variant="secondary" size="small">Revizuiește semnalele</Button></div>
            </div>
          )}
        </Card>

        <Card as="section" padding="none" className="min-w-0 overflow-hidden" aria-labelledby="approval-detail-title">
          {selectedSignal && selectedState ? (
            <>
              <div className="border-b border-[rgb(var(--border))] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--primary))]">Revizuire controlată</p><h2 id="approval-detail-title" className="mt-1 text-section-title font-semibold">{selectedSignal.title}</h2><p className="mt-1 text-sm text-[rgb(var(--text-muted))]">Creat {formatDateTimeWithSeconds(selectedSignal.createdAt ?? selectedSignal.occurredAt ?? undefined)}</p></div><StatusPill tone={toneForState(selectedState)}>{approvalCenterStateLabels[selectedState]}</StatusPill></div>
              </div>

              <div className="grid gap-5 p-4 sm:p-5">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4"><h3 className="text-sm font-semibold">Sursa recomandării</h3><dl className="mt-3 grid gap-2 text-sm"><div><dt className="text-xs text-[rgb(var(--text-muted))]">Semnal</dt><dd className="mt-0.5 font-medium">{selectedSignal.sourceLabel ?? selectedSignal.source}</dd></div><div><dt className="text-xs text-[rgb(var(--text-muted))]">Intenție detectată</dt><dd className="mt-0.5 font-medium">{selectedSignal.signalTypeLabel ?? selectedSignal.detectedCommercialIntent ?? "De clarificat"}</dd></div><div><dt className="text-xs text-[rgb(var(--text-muted))]">Motiv</dt><dd className="mt-0.5 leading-5">{approvalReasonForSignal(selectedSignal)}</dd></div></dl></div>
                  <div className="rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4"><h3 className="text-sm font-semibold">Ce se va schimba</h3><p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{proposedChangeForSignal(selectedSignal)}</p><p className="mt-2 text-xs font-medium text-[rgb(var(--text-muted))]">Nimic nu este trimis extern.</p></div>
                </div>

                <SignalPreparationPanel signal={selectedSignal} compact />
                <RecommendationFeedbackPanel signal={selectedSignal} auditHref="#approval-audit-trail" />

                <div className="grid gap-4 lg:grid-cols-2">
                  <div><h3 className="text-sm font-semibold">Înregistrări afectate</h3><div className="mt-2 grid gap-2 text-sm text-[rgb(var(--text-secondary))]"><p><span className="text-[rgb(var(--text-muted))]">Companie:</span> {selectedSignal.contactCompany || "Neconfirmată"}</p><p><span className="text-[rgb(var(--text-muted))]">Contact:</span> {selectedSignal.contactName || selectedSignal.contactEmail || "Neconfirmat"}</p><p><span className="text-[rgb(var(--text-muted))]">Oportunitate:</span> {linkedOpportunity?.title ?? (selectedSignal.detectedFromOpportunityId ? "Oportunitate existentă" : "Va fi creată după aprobare")}</p>{selectedSignal.estimatedRecoverableValue !== null && selectedSignal.estimatedRecoverableValue !== undefined ? <p><span className="text-[rgb(var(--text-muted))]">Valoare estimată:</span> {formatCurrency(selectedSignal.estimatedRecoverableValue, selectedSignal.currency)}</p> : null}</div><div className="mt-3 flex flex-wrap gap-2"><Link href={`/inbox?signal=${selectedSignal.id}`} className="focus-ring text-sm font-semibold text-[rgb(var(--primary))] hover:underline">Deschide semnalul</Link>{selectedSignal.matchedOrganizationId ? <Link href={`/crm/organizations/${selectedSignal.matchedOrganizationId}`} className="focus-ring text-sm font-semibold text-[rgb(var(--primary))] hover:underline">Vezi compania</Link> : null}{selectedSignal.detectedFromOpportunityId ? <Link href={`/opportunities/${selectedSignal.detectedFromOpportunityId}`} className="focus-ring text-sm font-semibold text-[rgb(var(--primary))] hover:underline">Vezi oportunitatea</Link> : null}</div></div>
                  <div><h3 className="text-sm font-semibold">Informații lipsă</h3>{selectedSignal.missingInformation.length > 0 ? <ul className="mt-2 grid gap-1 text-sm leading-5 text-[rgb(var(--text-secondary))]">{selectedSignal.missingInformation.map((item) => <li key={item}>• {item}</li>)}</ul> : <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">Nu au fost identificate lipsuri critice. Datele rămân de confirmat.</p>}</div>
                </div>

                {selectedState === "pending" ? (
                  <div className="grid gap-4 border-t border-[rgb(var(--border))] pt-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      {!selectedSignal.detectedFromOpportunityId ? <label className="grid gap-2 text-sm font-medium">Companie CRM<Select value={form.organizationId} onChange={(event) => setForm((current) => ({ ...current, organizationId: event.target.value, contactId: "" }))}><option value="">Creează din compania extrasă</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</Select></label> : null}
                      {!selectedSignal.detectedFromOpportunityId ? <label className="grid gap-2 text-sm font-medium">Contact CRM<Select value={form.contactId} onChange={(event) => setForm((current) => ({ ...current, contactId: event.target.value }))}><option value="">Creează sau continuă fără contact confirmat</option>{filteredContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.fullName}{contact.email ? ` · ${contact.email}` : ""}</option>)}</Select></label> : null}
                      <label className="grid gap-2 text-sm font-medium">Responsabil<Select value={form.ownerProfileId} onChange={(event) => setForm((current) => ({ ...current, ownerProfileId: event.target.value }))}><option value="">Neatribuit</option>{assignableProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.fullName}</option>)}</Select></label>
                      <label className="grid gap-2 text-sm font-medium">Termen<Input type="date" value={form.dueAt} onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))} /></label>
                    </div>
                    <label className="grid gap-2 text-sm font-medium">Următorul pas recomandat<Textarea rows={3} value={form.recommendedAction} onChange={(event) => setForm((current) => ({ ...current, recommendedAction: event.target.value }))} /></label>
                    <div className="grid gap-3 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4"><label className="grid gap-2 text-sm font-medium">Motiv pentru respingere<Textarea rows={2} value={form.rejectionReason} onChange={(event) => setForm((current) => ({ ...current, rejectionReason: event.target.value }))} placeholder="Obligatoriu pentru Respinge cu motiv" /></label><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="danger" onClick={reject} disabled={isPending}>Respinge cu motiv</Button><Button onClick={approve} disabled={isPending} loading={isPending}>Aprobă și aplică</Button></div></div>
                    <AlertBanner tone="info" title="Control uman">Aprobarea aplică numai schimbările interne descrise. Nimic nu este trimis extern.</AlertBanner>
                  </div>
                ) : null}

                <div id="approval-audit-trail" className="scroll-mt-24 border-t border-[rgb(var(--border))] pt-5"><h3 className="text-sm font-semibold">Istoric de audit</h3>{(selectedSignal.events ?? []).length > 0 ? <ol className="mt-3 grid gap-3">{(selectedSignal.events ?? []).slice(0, 8).map((event) => <li key={event.id} className="border-l-2 border-[rgb(var(--border-strong))] pl-3"><p className="text-sm font-medium">{event.description}</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{formatDateTimeWithSeconds(event.createdAt)}</p></li>)}</ol> : <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">Nu există evenimente disponibile pentru această decizie.</p>}</div>
              </div>
            </>
          ) : <div className="p-5"><h2 id="approval-detail-title" className="font-semibold">Revizuirea începe din Inbox Comercial</h2><p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">După pregătirea și verificarea unui semnal, aici vei vedea faptele, recomandarea, înregistrările afectate și efectul exact al aprobării.</p><Button href="/inbox" variant="secondary" size="small" className="mt-4">Pregătește o acțiune</Button></div>}
        </Card>
      </div>
    </div>
  );
}
