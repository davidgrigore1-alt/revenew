"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SignalPreparationPanel } from "@/components/signals/SignalPreparationPanel";
import { RecommendationFeedbackPanel } from "@/components/signals/RecommendationFeedbackPanel";
import { approveCommercialSignal, rejectCommercialSignal } from "@/lib/commercial-inbox-actions";
import {
  approvalCenterSignals,
  approvalCenterStateLabels,
  approvalReasonForSignal,
  approvalStateForSignal,
  proposedChangeForSignal,
  rejectionConsequenceForSignal,
  type ApprovalCenterState
} from "@/lib/approval-center";
import type { CommercialSignal } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTimeWithSeconds } from "@/lib/utils";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusPill } from "@/components/ui/StatusPill";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/ToastProvider";
import { toUserFacingActionError } from "@/lib/user-facing-errors";

type ApprovalCenterClientProps = {
  initialSignals: CommercialSignal[];
  initialSignalId?: string;
  organizations: Array<{ id: string; name: string }>;
  contacts: Array<{ id: string; fullName: string; organizationId?: string | null; email?: string | null }>;
  opportunities: Array<{ id: string; title: string; organizationId?: string | null }>;
  assignableProfiles: Array<{ id: string; fullName: string }>;
  canApprove: boolean;
  canReject: boolean;
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

const priorityLabels: Record<CommercialSignal["priority"], string> = {
  low: "Prioritate redusă",
  medium: "Prioritate medie",
  high: "Prioritate ridicată",
  urgent: "Urgent"
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
  assignableProfiles,
  canApprove,
  canReject
}: ApprovalCenterClientProps) {
  const { showToast } = useToast();
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
  const [noticeTone, setNoticeTone] = useState<"success" | "info">("success");
  const [error, setError] = useState("");
  const [rejectionOpen, setRejectionOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setSignals(initialSignals), [initialSignals]);

  const items = useMemo(() => approvalCenterSignals(signals, filter), [signals, filter]);
  const stateCounts = useMemo(() => {
    const all = approvalCenterSignals(signals);
    return {
      all: all.length,
      pending: all.filter((item) => item.state === "pending").length,
      applied: all.filter((item) => item.state === "applied").length,
      rejected: all.filter((item) => item.state === "rejected").length
    };
  }, [signals]);

  useEffect(() => {
    if (items.some((item) => item.signal.id === selectedId)) return;
    const nextSignal = items[0]?.signal;
    setSelectedId(nextSignal?.id ?? "");
    if (nextSignal) setForm(formFor(nextSignal));
  }, [items, selectedId]);

  function selectSignal(signal: CommercialSignal) {
    setSelectedId(signal.id);
    setForm(formFor(signal));
    setNotice("");
    setNoticeHref("");
    setNoticeTone("success");
    setError("");
    setRejectionOpen(false);
    const params = new URLSearchParams(window.location.search);
    params.set("signal", signal.id);
    router.replace(`/approvals?${params.toString()}`, { scroll: false });
  }

  function updateSignal(signal?: CommercialSignal) {
    if (!signal) return;
    setSignals((current) => current.map((item) => item.id === signal.id ? signal : item));
  }

  function approve() {
    if (!canApprove || !selectedSignal || approvalStateForSignal(selectedSignal) !== "pending") return;
    setNotice("");
    setError("");
    startTransition(async () => {
      const result = await approveCommercialSignal(selectedSignal.id, {
        expectedUpdatedAt: selectedSignal.updatedAt ?? "",
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
        if (result.outcome === "conflict") {
          updateSignal(result.signal);
          if (result.signal) setForm(formFor(result.signal));
          router.refresh();
        }
        const message = toUserFacingActionError(result.message, "Aprobarea nu a putut fi aplicată. Verifică datele și încearcă din nou.");
        setError(message);
        showToast({ title: "Aprobarea nu a fost aplicată", description: message, tone: "danger" });
        return;
      }
      updateSignal(result.signal);
      const opportunityHref = result.opportunityId ? `/opportunities/${result.opportunityId}` : selectedSignal.detectedFromOpportunityId ? `/opportunities/${selectedSignal.detectedFromOpportunityId}` : "/opportunities";
      if (result.outcome === "already_applied") {
        const message = "Decizia era deja aplicată; acțiunea curentă nu a repetat conversia.";
        setNoticeHref(opportunityHref);
        setNotice(message);
        setNoticeTone("info");
        showToast({ title: "Decizie deja aplicată", description: message, tone: "info", action: { label: "Revizuiește oportunitatea", href: opportunityHref } });
        router.refresh();
        return;
      }
      const message = selectedSignal.detectedFromOpportunityId
        ? "Aprobarea a fost aplicată, iar acțiunea internă a fost creată în oportunitatea existentă."
        : "Aprobarea a fost aplicată, iar oportunitatea și prima acțiune internă au fost create.";
      setNoticeHref(opportunityHref);
      setNotice(message);
      setNoticeTone("success");
      showToast({ title: "Decizie internă înregistrată", description: message, tone: "success", action: { label: "Revizuiește oportunitatea", href: opportunityHref } });
      router.refresh();
    });
  }

  function reject() {
    if (!canReject || !selectedSignal || approvalStateForSignal(selectedSignal) !== "pending") return;
    const reason = form.rejectionReason.trim();
    if (!reason) {
      setError("Motivul respingerii este obligatoriu.");
      return;
    }
    setNotice("");
    setNoticeHref("");
    setError("");
    startTransition(async () => {
      const result = await rejectCommercialSignal(selectedSignal.id, selectedSignal.updatedAt ?? "", reason);
      if (!result.ok) {
        if (result.outcome === "conflict") {
          updateSignal(result.signal);
          if (result.signal) setForm(formFor(result.signal));
          router.refresh();
        }
        const message = toUserFacingActionError(result.message, "Respingerea nu a putut fi salvată. Încearcă din nou.");
        setError(message);
        showToast({ title: "Decizia nu a fost salvată", description: message, tone: "danger" });
        return;
      }
      updateSignal(result.signal);
      setNotice("Recomandarea a fost respinsă, iar motivul a fost înregistrat în audit.");
      setNoticeTone("success");
      showToast({ title: "Decizie înregistrată", description: "Recomandarea a fost respinsă, iar motivul rămâne în istoricul de audit.", tone: "success" });
      router.refresh();
    });
  }

  const selectedState = selectedSignal ? approvalStateForSignal(selectedSignal) : null;
  const linkedOpportunity = selectedSignal?.detectedFromOpportunityId
    ? opportunities.find((opportunity) => opportunity.id === selectedSignal.detectedFromOpportunityId)
    : null;
  const filteredContacts = contacts.filter((contact) => !form.organizationId || !contact.organizationId || contact.organizationId === form.organizationId);
  const canDecide = canApprove || canReject;

  return (
    <div data-guide-anchor="approvals-human-control" className="grid gap-3">
      <div aria-live="polite" className="grid gap-2">
        {error ? <AlertBanner tone="danger" title="Decizia trebuie revizuită">{error}</AlertBanner> : null}
        {notice ? <AlertBanner tone={noticeTone} title={noticeTone === "info" ? "Stare actualizată" : "Decizie înregistrată"}><span>{notice}</span>{noticeHref ? <Link href={noticeHref} className="focus-ring ml-2 inline-flex rounded font-semibold underline underline-offset-4">Revizuiește oportunitatea</Link> : null}</AlertBanner> : null}
      </div>

      <section aria-label="Starea și filtrele aprobărilor" className="overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <div className="grid sm:grid-cols-3">
          {([
            ["Necesită decizie", stateCounts.pending, "text-[rgb(var(--primary))]"],
            ["Aplicate", stateCounts.applied, "text-[rgb(var(--success-text))]"],
            ["Respinse", stateCounts.rejected, "text-[rgb(var(--danger-text))]"]
          ] as const).map(([label, count, tone], index) => (
            <div key={label} className={`flex items-center justify-between gap-3 px-4 py-2.5 ${index > 0 ? "border-t border-[rgb(var(--border))] sm:border-l sm:border-t-0" : ""}`}>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-[rgb(var(--text-faint))]">{label}</p>
              <p className={`text-lg font-semibold tabular-nums ${tone}`}>{count}</p>
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-wrap border-t border-[rgb(var(--border))] px-1" role="group" aria-label="Filtre aprobări">
          {(Object.keys(filterLabels) as Array<ApprovalCenterState | "all">).map((value) => (
            <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`focus-ring min-h-10 border-b-2 px-3 text-xs font-semibold transition-colors ${filter === value ? "border-[rgb(var(--primary))] text-[rgb(var(--foreground))]" : "border-transparent text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))]"}`}>
              {filterLabels[value]} <span className="ml-1 tabular-nums text-[rgb(var(--text-faint))]">{stateCounts[value]}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid min-w-0 overflow-hidden rounded-xl border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] xl:max-h-[calc(100vh-15rem)] xl:grid-cols-[minmax(18rem,0.58fr)_minmax(0,1.15fr)]">
        <section id="approval-decision-list" className="min-w-0 scroll-mt-24 border-b border-[rgb(var(--border))] xl:min-h-0 xl:overflow-y-auto xl:border-b-0 xl:border-r" aria-labelledby="approval-list-title">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3.5 py-3">
            <div><h2 id="approval-list-title" className="text-sm font-semibold">Decizii comerciale</h2><p className="mt-0.5 text-xs text-[rgb(var(--text-muted))]">Alege decizia pentru efectul și dovezile ei.</p></div>
            <span className="rounded-md bg-[rgb(var(--surface-subtle))] px-2 py-1 text-xs font-semibold tabular-nums text-[rgb(var(--text-muted))]">{items.length}</span>
          </div>
          {items.length > 0 ? (
            <div className="divide-y divide-[rgb(var(--border))]" role="listbox" aria-label="Coada deciziilor comerciale">
              {items.map(({ signal, state }, index) => (
                <button
                  key={signal.id}
                  type="button"
                  role="option"
                  data-approval-signal={signal.id}
                  onClick={() => selectSignal(signal)}
                  onKeyDown={(event) => {
                    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
                    event.preventDefault();
                    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : event.key === "ArrowDown" ? Math.min(items.length - 1, index + 1) : Math.max(0, index - 1);
                    const nextSignal = items[nextIndex]?.signal;
                    if (!nextSignal) return;
                    selectSignal(nextSignal);
                    window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-approval-signal="${nextSignal.id}"]`)?.focus({ preventScroll: true }));
                  }}
                  aria-selected={signal.id === selectedId}
                  aria-current={signal.id === selectedId ? "true" : undefined}
                  className="focus-ring group grid w-full gap-1.5 border-l-2 border-l-transparent px-3.5 py-3 text-left transition-colors hover:bg-[rgb(var(--surface-elevated))] aria-[selected=true]:border-l-[rgb(var(--primary))] aria-[selected=true]:bg-[rgb(var(--surface-subtle))]"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold leading-5">{signal.title}</p><p className="mt-0.5 truncate text-xs text-[rgb(var(--text-muted))]">{signal.contactCompany || signal.contactName || "Context neconfirmat"}</p></div>
                    <StatusPill tone={toneForState(state)}>{approvalCenterStateLabels[state]}</StatusPill>
                  </div>
                  <p className="truncate text-xs leading-5 text-[rgb(var(--text-secondary))]">{proposedChangeForSignal(signal)}</p>
                  <div className="flex items-center justify-between gap-3 text-[0.6875rem] text-[rgb(var(--text-faint))]"><span className="truncate">{priorityLabels[signal.priority]} · {signal.sourceLabel ?? signal.source}</span><span className="shrink-0">{formatDate(signal.createdAt ?? signal.occurredAt ?? undefined)}</span></div>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 p-5"><div><h3 className="font-semibold">Nicio decizie în această vedere</h3><p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Recomandările pregătite și verificate apar aici pentru o decizie umană auditabilă.</p></div><div><Button href="/inbox" variant="secondary" size="small">Revizuiește semnalele</Button></div></div>
          )}
        </section>

        <section className="min-w-0 xl:min-h-0 xl:overflow-y-auto" aria-labelledby="approval-detail-title">
          {selectedSignal && selectedState ? (
            <>
              <header className="sticky top-0 z-10 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-3.5">
                <a href="#approval-decision-list" className="focus-ring mb-2 inline-flex rounded text-xs font-semibold text-[rgb(var(--primary))] xl:hidden">Înapoi la coadă</a>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0"><p className="text-[0.6875rem] font-semibold uppercase tracking-[0.11em] text-[rgb(var(--primary))]">Revizuire controlată</p><h2 id="approval-detail-title" className="mt-1 text-section-title font-semibold leading-tight">{selectedSignal.title}</h2><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Creat {formatDateTimeWithSeconds(selectedSignal.createdAt ?? selectedSignal.occurredAt ?? undefined)}</p></div>
                  <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-1 text-[0.6875rem] font-semibold ${selectedState === "pending" && canDecide ? "border-[rgb(var(--primary-border))] bg-[rgb(var(--primary-soft))] text-[rgb(var(--primary))]" : "border-[rgb(var(--border))] text-[rgb(var(--text-muted))]"}`}>{selectedState === "pending" ? canDecide ? "Poți decide" : "Doar vizualizare" : "Decizie încheiată"}</span><StatusPill tone={toneForState(selectedState)}>{approvalCenterStateLabels[selectedState]}</StatusPill></div>
                </div>
              </header>

              <div className="grid items-start xl:grid-cols-[minmax(0,1fr)_18rem]">
                <main className="grid min-w-0 gap-4 p-4 xl:border-r xl:border-[rgb(var(--border))]">
                  <dl className="grid overflow-hidden rounded-lg border border-[rgb(var(--border))] sm:grid-cols-3">
                    <div className="px-3 py-2.5 sm:border-r sm:border-[rgb(var(--border))]"><dt className="text-[0.625rem] font-semibold uppercase tracking-[0.09em] text-[rgb(var(--text-faint))]">Semnal</dt><dd className="mt-1 text-xs font-semibold leading-5">{selectedSignal.sourceLabel ?? selectedSignal.source}</dd></div>
                    {selectedSignal.signalTypeLabel || selectedSignal.detectedCommercialIntent ? <div className="border-t border-[rgb(var(--border))] px-3 py-2.5 sm:border-r sm:border-t-0"><dt className="text-[0.625rem] font-semibold uppercase tracking-[0.09em] text-[rgb(var(--text-faint))]">Intenție detectată</dt><dd className="mt-1 text-xs font-semibold leading-5">{selectedSignal.signalTypeLabel ?? selectedSignal.detectedCommercialIntent}</dd></div> : null}
                    <div className="border-t border-[rgb(var(--border))] px-3 py-2.5 sm:border-t-0"><dt className="text-[0.625rem] font-semibold uppercase tracking-[0.09em] text-[rgb(var(--text-faint))]">Prioritate / motiv</dt><dd className="mt-1 text-xs leading-5"><span className="font-semibold">{priorityLabels[selectedSignal.priority]}.</span> {approvalReasonForSignal(selectedSignal)}</dd></div>
                  </dl>

                  <section aria-labelledby="approval-change-title" className="border-l-2 border-[rgb(var(--primary))] bg-[rgb(var(--surface-subtle))] px-3 py-2.5">
                    <h3 id="approval-change-title" className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">Ce se va schimba</h3>
                    <p className="mt-1 text-sm font-medium leading-6">{proposedChangeForSignal(selectedSignal)}</p>
                    <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Nimic nu este trimis extern.</p>
                  </section>

                  <details className="group border-t border-[rgb(var(--border))] pt-3">
                    <summary className="focus-ring flex min-h-10 cursor-pointer list-none items-center justify-between rounded text-sm font-semibold"><span>Ce a înțeles ReveNew</span><span aria-hidden="true" className="text-[rgb(var(--text-faint))] transition-transform group-open:rotate-180">⌄</span></summary>
                    <div className="mt-2 grid gap-3"><SignalPreparationPanel signal={selectedSignal} compact /><RecommendationFeedbackPanel signal={selectedSignal} auditHref="#approval-audit-trail" /></div>
                  </details>

                  <details className="group border-t border-[rgb(var(--border))] pt-3">
                    <summary className="focus-ring flex min-h-10 cursor-pointer list-none items-center justify-between rounded text-sm font-semibold"><span>Context pentru decizie</span><span aria-hidden="true" className="text-[rgb(var(--text-faint))] transition-transform group-open:rotate-180">⌄</span></summary>
                    <div className="mt-2 grid gap-4 md:grid-cols-2">
                      <div><h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">Înregistrări afectate</h3><div className="mt-2 grid gap-1.5 text-sm text-[rgb(var(--text-secondary))]"><p><span className="text-[rgb(var(--text-muted))]">Companie:</span> {selectedSignal.contactCompany || "Neconfirmată"}</p><p><span className="text-[rgb(var(--text-muted))]">Contact:</span> {selectedSignal.contactName || selectedSignal.contactEmail || "Neconfirmat"}</p><p><span className="text-[rgb(var(--text-muted))]">Oportunitate:</span> {linkedOpportunity?.title ?? (selectedSignal.detectedFromOpportunityId ? "Oportunitate existentă" : "Va fi creată după aprobare")}</p>{selectedSignal.estimatedRecoverableValue !== null && selectedSignal.estimatedRecoverableValue !== undefined ? <p><span className="text-[rgb(var(--text-muted))]">Valoare estimată, neconfirmată:</span> <strong className="font-semibold text-[rgb(var(--foreground))]">{formatCurrency(selectedSignal.estimatedRecoverableValue, selectedSignal.currency)}</strong></p> : null}</div><div className="mt-3 flex flex-wrap gap-3"><Link href={`/inbox?signal=${selectedSignal.id}`} className="focus-ring rounded text-xs font-semibold text-[rgb(var(--primary))] hover:underline">Deschide semnalul</Link>{selectedSignal.matchedOrganizationId ? <Link href={`/crm/organizations/${selectedSignal.matchedOrganizationId}`} className="focus-ring rounded text-xs font-semibold text-[rgb(var(--primary))] hover:underline">Vezi compania</Link> : null}{selectedSignal.detectedFromOpportunityId ? <Link href={`/opportunities/${selectedSignal.detectedFromOpportunityId}`} className="focus-ring rounded text-xs font-semibold text-[rgb(var(--primary))] hover:underline">Vezi oportunitatea</Link> : null}</div></div>
                      <div><h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">Informații lipsă</h3>{selectedSignal.missingInformation.length > 0 ? <ul className="mt-2 grid gap-1 text-sm leading-5 text-[rgb(var(--text-secondary))]">{selectedSignal.missingInformation.map((item) => <li key={item}>• {item}</li>)}</ul> : <p className="mt-2 text-sm leading-5 text-[rgb(var(--text-muted))]">Nu au fost identificate lipsuri critice. Datele rămân de confirmat.</p>}</div>
                    </div>
                  </details>

                  <section id="approval-audit-trail" className="scroll-mt-24 border-t border-[rgb(var(--border))] pt-4" aria-labelledby="approval-audit-title">
                    <div className="flex items-center justify-between gap-3"><h3 id="approval-audit-title" className="text-sm font-semibold">Istoric de audit</h3><span className="text-xs tabular-nums text-[rgb(var(--text-faint))]">{(selectedSignal.events ?? []).length}</span></div>
                    {(selectedSignal.events ?? []).length > 0 ? <ol className="mt-3 grid gap-3">{(selectedSignal.events ?? []).slice(0, 4).map((event) => <li key={event.id} className="border-l-2 border-[rgb(var(--border-strong))] pl-3"><p className="text-sm font-medium leading-5">{event.description}</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{formatDateTimeWithSeconds(event.createdAt)}</p></li>)}</ol> : <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">Nu există evenimente disponibile pentru această decizie.</p>}
                  </section>
                </main>

                <aside className="grid gap-4 bg-[rgb(var(--surface-elevated))] p-4 xl:sticky xl:top-0" aria-label="Decizia umană">
                  {selectedState === "pending" ? (
                    <>
                      <div><p className="text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-[rgb(var(--text-faint))]">Decizia ta</p><h3 className="mt-1 text-sm font-semibold">Confirmă valorile aplicate intern</h3></div>
                      {canApprove ? (
                        <div className="grid gap-3">
                          {!selectedSignal.detectedFromOpportunityId ? <label className="grid gap-1.5 text-xs font-semibold">Companie CRM<Select value={form.organizationId} onChange={(event) => setForm((current) => ({ ...current, organizationId: event.target.value, contactId: "" }))}><option value="">Creează din compania extrasă</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</Select></label> : null}
                          {!selectedSignal.detectedFromOpportunityId ? <label className="grid gap-1.5 text-xs font-semibold">Contact CRM<Select value={form.contactId} onChange={(event) => setForm((current) => ({ ...current, contactId: event.target.value }))}><option value="">Continuă fără contact confirmat</option>{filteredContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.fullName}{contact.email ? ` · ${contact.email}` : ""}</option>)}</Select></label> : null}
                          <label className="grid gap-1.5 text-xs font-semibold">Responsabil<Select value={form.ownerProfileId} onChange={(event) => setForm((current) => ({ ...current, ownerProfileId: event.target.value }))}><option value="">Neatribuit</option>{assignableProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.fullName}</option>)}</Select></label>
                          <label className="grid gap-1.5 text-xs font-semibold">Termen<Input type="date" value={form.dueAt} onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))} /></label>
                          <label className="grid gap-1.5 text-xs font-semibold">Următorul pas recomandat<Textarea rows={3} value={form.recommendedAction} onChange={(event) => setForm((current) => ({ ...current, recommendedAction: event.target.value }))} /></label>
                        </div>
                      ) : <div className="grid gap-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 text-sm"><p><span className="text-[rgb(var(--text-muted))]">Responsabil:</span> {assignableProfiles.find((profile) => profile.id === form.ownerProfileId)?.fullName ?? "Neatribuit"}</p><p><span className="text-[rgb(var(--text-muted))]">Termen:</span> {form.dueAt ? formatDate(form.dueAt) : "Neconfirmat"}</p><p className="leading-5"><span className="text-[rgb(var(--text-muted))]">Următorul pas:</span> {form.recommendedAction || "Neconfirmat"}</p></div>}

                      <div className="grid gap-2 border-t border-[rgb(var(--border))] pt-3">
                        <p className="text-xs leading-5 text-[rgb(var(--text-muted))]">Aprobarea aplică numai schimbările interne descrise. Nimic nu este trimis extern.</p>
                        {canApprove ? <Button onClick={approve} disabled={isPending} loading={isPending} className="w-full">Aprobă și aplică intern</Button> : null}
                        {canReject ? <button type="button" aria-expanded={rejectionOpen} aria-controls="approval-rejection-panel" onClick={() => setRejectionOpen((current) => !current)} className="focus-ring min-h-10 rounded-md border border-transparent px-3 text-sm font-semibold text-[rgb(var(--danger-text))] transition-colors hover:border-[rgb(var(--danger-border))] hover:bg-[rgb(var(--danger-background))]">Respinge</button> : null}
                        {rejectionOpen && canReject ? <div id="approval-rejection-panel" className="grid gap-2 border-t border-[rgb(var(--border))] pt-3"><p className="text-xs leading-5 text-[rgb(var(--text-muted))]">{rejectionConsequenceForSignal()}</p><label className="grid gap-1.5 text-xs font-semibold">Motiv pentru respingere<Textarea autoFocus rows={3} value={form.rejectionReason} onChange={(event) => setForm((current) => ({ ...current, rejectionReason: event.target.value }))} placeholder="Motiv obligatoriu pentru audit" /></label><Button variant="danger" onClick={reject} disabled={isPending}>Respinge cu motiv</Button></div> : null}
                        {!canDecide ? <p className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 text-xs leading-5 text-[rgb(var(--text-muted))]">Ai acces de vizualizare. Un utilizator autorizat trebuie să înregistreze decizia.</p> : null}
                      </div>
                    </>
                  ) : (
                    <div className="grid gap-3"><p className="text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-[rgb(var(--text-faint))]">Rezultatul deciziei</p><StatusPill tone={toneForState(selectedState)}>{approvalCenterStateLabels[selectedState]}</StatusPill><p className="text-sm leading-6 text-[rgb(var(--text-secondary))]">{selectedState === "applied" ? "Decizia a fost aplicată intern. Acest statut nu confirmă trimiterea unei acțiuni externe." : selectedSignal.dismissalReason || "Recomandarea a fost respinsă, iar starea rămâne în istoricul de audit."}</p>{noticeHref ? <Button href={noticeHref} variant="secondary" size="small">Revizuiește oportunitatea</Button> : null}</div>
                  )}
                </aside>
              </div>
            </>
          ) : <div className="p-6"><h2 id="approval-detail-title" className="font-semibold">Revizuirea începe din Inbox Comercial</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[rgb(var(--text-muted))]">După pregătirea și verificarea unui semnal, aici vei vedea efectul exact, valorile de confirmat, dovezile și auditul deciziei.</p><Button href="/inbox" variant="secondary" size="small" className="mt-4">Pregătește o acțiune</Button></div>}
        </section>
      </div>
    </div>
  );
}
