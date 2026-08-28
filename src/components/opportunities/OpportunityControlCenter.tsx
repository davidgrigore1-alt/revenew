"use client";

import { Select } from "@/components/ui/Select";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { DataCard } from "@/components/dashboard/DataCard";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { useToast } from "@/components/ui/ToastProvider";
import { Button } from "@/components/ui/Button";
import {
  applicationDateKey,
  commercialTypeForOpportunity,
  commercialTypeLabels,
  lifecycleForOpportunity,
  lifecycleLabels,
  stageForLegacyStatus
} from "@/lib/opportunity-domain";
import type { OpportunityCommercialState } from "@/lib/opportunity-commercial-state";
import {
  recordOpportunityOutcome,
  reopenOpportunity,
  updateOpportunityCommercialDetails
} from "@/lib/revenue-workspace/actions";
import { openOutcomeConfirmation } from "@/lib/commercial-response-actions";
import type { Opportunity, OpportunityLifecycleStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toUserFacingActionError } from "@/lib/user-facing-errors";

type AssignableProfile = { id: string; fullName: string };

const fieldClass = "focus-ring h-10 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm text-[rgb(var(--foreground))] hover:border-[rgb(var(--border-strong))]";
const stageLabels = { lead: "Lead", qualified: "Calificare", proposal: "Propunere", won: "Câștigat", lost: "Pierdut" };
const attentionLabels = { on_track: "În grafic", needs_attention: "Necesită atenție", at_risk: "În risc", blocked: "Blocat", closed: "Închis" };

type ControlCenterMode = "summary" | "responsibility" | "outcome";

function FormLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return <span className="flex items-center justify-between gap-2"><span>{children}</span><span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">{required ? "Obligatoriu" : "Opțional"}</span></span>;
}

export function OpportunityControlCenter({
  opportunity,
  commercialState,
  assignableProfiles,
  mode = "summary"
}: {
  opportunity: Opportunity;
  commercialState: OpportunityCommercialState;
  assignableProfiles: AssignableProfile[];
  mode?: ControlCenterMode;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [outcomeStatus, setOutcomeStatus] = useState<OpportunityLifecycleStatus>("won");
  const [pendingOutcome, setPendingOutcome] = useState<FormData | null>(null);
  const confirmationDialogRef = useRef<HTMLDivElement>(null);
  const lifecycle = lifecycleForOpportunity(opportunity);
  const attention = commercialState.attention;
  const primaryContact = opportunity.contacts?.find((contact) => contact.isPrimary) ?? null;
  const companyName = commercialState.organization.name ?? "Companie neconfirmată";
  const evidenceCount = commercialState.evidence.length;
  const ownerName = commercialState.ownership.ownerName ?? assignableProfiles.find((profile) => profile.id === opportunity.ownerProfileId)?.fullName ?? null;
  const decisionMaker = opportunity.contacts?.find((association) => {
    const value = `${association.role ?? ""} ${association.contact.decisionRole ?? ""}`.toLowerCase();
    return /decision|decident|buyer|approver/.test(value);
  }) ?? null;
  const visibleEvidence = commercialState.evidence.find((item) => item.sourceType !== "opportunity") ?? null;

  useEffect(() => {
    if (!pendingOutcome) return;
    const dialog = confirmationDialogRef.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector = "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
    focusable[0]?.focus();

    function containFocus(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setPendingOutcome(null);
        return;
      }
      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    dialog.addEventListener("keydown", containFocus);
    return () => {
      dialog.removeEventListener("keydown", containFocus);
      previouslyFocused?.focus();
    };
  }, [pendingOutcome]);

  function handleResult(result: { ok: boolean; error?: string }, success: string) {
    if (result.ok) {
      setError("");
      showToast({ title: success, tone: "success" });
      router.refresh();
    } else {
      setError(toUserFacingActionError(result.error, "Schimbarea nu a putut fi salvată. Verifică datele și încearcă din nou."));
      showToast({ title: "Schimbarea nu a fost salvată", description: toUserFacingActionError(result.error, "Verifică datele și încearcă din nou."), tone: "danger" });
    }
  }

  function reviewOutcome(formData: FormData) {
    startTransition(async () => {
      const status = String(formData.get("lifecycleStatus")) as "won" | "lost";
      const result = await openOutcomeConfirmation(opportunity.id, status);
      if (!result.ok) handleResult(result, ""); else setPendingOutcome(formData);
    });
  }

  function confirmOutcome() {
    if (!pendingOutcome) return;
    pendingOutcome.set("finalConfirmation", "true");
    startTransition(async () => {
      const result = await recordOpportunityOutcome(opportunity.id, pendingOutcome);
      if (result.ok) setPendingOutcome(null);
      handleResult(result, "Rezultatul comercial a fost confirmat.");
    });
  }

  return (
    <div className="grid gap-6">
      {mode === "summary" ? <section className="overflow-hidden rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-card" aria-labelledby="execution-brief-title">
        {error ? <div className="px-4 pt-4 sm:px-5"><StatusNotice tone="error">{error}</StatusNotice></div> : null}
        <div className="flex flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-pill border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-2.5 py-1 text-xs font-semibold">{stageLabels[commercialState.stage]}</span>
              <span className={commercialState.execution.severity === "critical" ? "status-pill status-pill-danger" : commercialState.execution.severity === "attention" ? "status-pill status-pill-warning" : commercialState.execution.severity === "positive" ? "status-pill status-pill-success" : "status-pill status-pill-neutral"}>{commercialState.execution.label}</span>
              <span className="text-xs text-[rgb(var(--text-muted))]">{commercialTypeLabels[commercialTypeForOpportunity(opportunity)]}</span>
            </div>
            <p className="mt-4 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">Următoarea acțiune</p>
            <h2 id="execution-brief-title" className="mt-1 text-section-title font-semibold">{commercialState.nextAction?.title ?? "Stabilește următoarea acțiune"}</h2>
            <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-muted))]">{commercialState.nextAction?.dueAt ? `Termen ${formatDate(commercialState.nextAction.dueAt)} · verifică responsabilul și dovada înainte de execuție.` : "Completează acțiunea, responsabilul și termenul înainte de follow-up."}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button href={commercialState.recommendedSafeIntervention.href}>{commercialState.recommendedSafeIntervention.label}</Button>
            <Button href={visibleEvidence?.href ?? "#opportunity-timeline"} variant="secondary">Verifică dovada</Button>
          </div>
        </div>

        <dl className="grid border-y border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="border-b border-[rgb(var(--border))] px-4 py-3 sm:border-r lg:border-b-0"><dt className="text-[0.6875rem] text-[rgb(var(--text-muted))]">Companie</dt><dd className="mt-1 truncate text-sm font-semibold" title={companyName}>{companyName}</dd></div>
          <div className="border-b border-[rgb(var(--border))] px-4 py-3 lg:border-b-0 lg:border-r"><dt className="text-[0.6875rem] text-[rgb(var(--text-muted))]">Valoare estimată, nu confirmată</dt><dd className="mt-1 text-sm font-semibold tabular-nums">{formatCurrency(opportunity.estimatedValueHigh, opportunity.currency ?? "RON")}</dd></div>
          <div className="border-b border-[rgb(var(--border))] px-4 py-3 sm:border-r lg:border-b-0"><dt className="text-[0.6875rem] text-[rgb(var(--text-muted))]">Responsabil</dt><dd className="mt-1 truncate text-sm font-semibold">{ownerName ?? "Neatribuit"}</dd></div>
          <div className="border-b border-[rgb(var(--border))] px-4 py-3 lg:border-b-0 lg:border-r"><dt className="text-[0.6875rem] text-[rgb(var(--text-muted))]">Contact principal</dt><dd className="mt-1 truncate text-sm font-semibold">{primaryContact?.contact.fullName ?? "Lipsește"}</dd></div>
          <div className="border-b border-[rgb(var(--border))] px-4 py-3 sm:border-b-0 sm:border-r"><dt className="text-[0.6875rem] text-[rgb(var(--text-muted))]">Decident</dt><dd className="mt-1 truncate text-sm font-semibold">{decisionMaker?.contact.fullName ?? "Neconfirmat"}</dd></div>
          <div className="px-4 py-3"><dt className="text-[0.6875rem] text-[rgb(var(--text-muted))]">Dovezi disponibile</dt><dd className="mt-1 text-sm font-semibold">{visibleEvidence ? <a className="focus-ring rounded-sm text-[rgb(var(--primary))] hover:underline" href={visibleEvidence.href}>{evidenceCount} · {visibleEvidence.label}</a> : "Lipsește o dovadă verificabilă"}</dd></div>
        </dl>

        <div className="grid gap-3 px-4 py-3 text-xs leading-5 text-[rgb(var(--text-muted))] sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p><strong className="text-[rgb(var(--foreground))]">De ce această stare:</strong> {commercialState.execution.reason}</p>
            <p className="mt-1">{attention.reasons.length > 0 ? <><strong className="text-[rgb(var(--warning-text))]">Necesită verificare:</strong> {attention.reasons.slice(0, 2).map((reason) => reason.label).join(" · ")}</> : <><strong className="text-[rgb(var(--success-text))]">Fără excepții active.</strong> Datele disponibile nu indică un blocaj operațional.</>} {commercialState.financial.confirmedRevenue != null ? <>Venit confirmat: <strong className="text-[rgb(var(--foreground))]">{formatCurrency(commercialState.financial.confirmedRevenue, commercialState.financial.confirmedRevenueCurrency ?? "RON")}</strong>.</> : null}</p>
            {commercialState.execution.nextReviewAt ? <p className="mt-1"><strong className="text-[rgb(var(--foreground))]">Următoarea verificare:</strong> {formatDate(commercialState.execution.nextReviewAt)}</p> : null}
          </div>
          <p className="shrink-0">Aprobarea umană rămâne obligatorie pentru comunicare externă și rezultate.</p>
        </div>
      </section> : null}

      {mode === "responsibility" && lifecycle === "open" ? (
          <DataCard title="Responsabilitate" description="Atribuie oportunitatea și confirmă clasificarea comercială.">
            <form action={(formData) => startTransition(async () => handleResult(await updateOpportunityCommercialDetails(opportunity.id, formData), "Responsabilitatea a fost actualizată."))} className="grid gap-3">
              <label className="grid gap-2 text-sm font-semibold"><FormLabel required>Responsabil</FormLabel>
                <Select name="ownerProfileId" defaultValue={opportunity.ownerProfileId ?? ""} className={fieldClass}>
                  <option value="">Neatribuit</option>
                  {assignableProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.fullName}</option>)}
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-semibold"><FormLabel>Tip comercial</FormLabel>
                <Select name="commercialType" defaultValue={commercialTypeForOpportunity(opportunity)} className={fieldClass}>
                  {Object.entries(commercialTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Select>
              </label>
              <Button type="submit" disabled={isPending}>{isPending ? "Se salvează..." : "Salvează responsabilitatea"}</Button>
            </form>
          </DataCard>
      ) : null}
      {mode === "outcome" && lifecycle === "open" ? (
          <DataCard title="Înregistrează rezultatul" description="ReveNew păstrează rezultatul declarat de echipă; estimările nu devin automat venit.">
            <form action={reviewOutcome} className="grid gap-3">
              <input type="hidden" name="expectedUpdatedAt" value={opportunity.updatedAt ?? ""} />
              <label className="grid gap-2 text-sm font-semibold"><FormLabel required>Rezultat</FormLabel>
                <Select name="lifecycleStatus" value={outcomeStatus} onChange={(event) => setOutcomeStatus(event.target.value as OpportunityLifecycleStatus)} className={fieldClass}>
                  <option value="won">Câștigată / recuperată</option>
                  <option value="lost">Pierdută</option>
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-semibold"><FormLabel required>Motiv</FormLabel>
                <Select name="outcomeReason" className={fieldClass} defaultValue={outcomeStatus === "won" ? "won" : "other"} key={outcomeStatus}>
                  {outcomeStatus === "won" ? <>
                    <option value="won">Contract câștigat</option><option value="recovered">Venit recuperat</option><option value="expanded">Extindere</option><option value="renewed">Reînnoire</option><option value="other">Alt motiv</option>
                  </> : <>
                    <option value="customer_selected_other">Clientul a ales alt furnizor</option><option value="no_budget">Buget indisponibil</option><option value="no_response">Fără răspuns</option><option value="timing">Moment nepotrivit</option><option value="not_qualified">Neeligibilă</option><option value="duplicate">Duplicat</option><option value="cancelled">Anulată</option><option value="other">Alt motiv</option>
                  </>}
                </Select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold"><FormLabel required>Data rezultatului</FormLabel><input name="outcomeDate" type="date" required defaultValue={applicationDateKey()} className={fieldClass} /></label>
                {outcomeStatus === "won" ? <label className="grid gap-2 text-sm font-semibold"><FormLabel required>Venit confirmat de echipă</FormLabel><input name="actualOutcomeAmount" inputMode="decimal" required pattern="[0-9]+([.,][0-9]{1,2})?" className={fieldClass} /></label> : null}
              </div>
              <label className="grid gap-2 text-sm font-semibold"><FormLabel required>Monedă</FormLabel><input name="currency" required maxLength={3} defaultValue={opportunity.currency ?? "RON"} className={fieldClass} /></label>
              <label className="grid gap-2 text-sm font-semibold"><FormLabel>Notă</FormLabel><textarea name="outcomeNote" rows={3} maxLength={1000} className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-2" /></label>
              <Button type="submit" disabled={isPending}>{isPending ? "Se verifică..." : "Verifică și confirmă rezultatul"}</Button>
            </form>
          </DataCard>
      ) : null}
      {mode === "outcome" && lifecycle !== "open" ? (
        <DataCard title="Rezultat comercial" description="Poți corecta rezultatul prin redeschidere; istoricul rămâne auditat.">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="font-semibold">{lifecycleLabels[lifecycle]}</p><p className="text-sm text-[rgb(var(--muted-foreground))]">{opportunity.outcomeDate ? formatDate(opportunity.outcomeDate) : "Rezultat legacy fără detalii structurate"}</p></div>
            <Button variant="secondary" disabled={isPending} onClick={() => startTransition(async () => handleResult(await reopenOpportunity(opportunity.id), "Oportunitatea a fost redeschisă."))}>{isPending ? "Se redeschide..." : "Redeschide pentru corecție"}</Button>
          </div>
        </DataCard>
      ) : null}
      {mode === "outcome" && pendingOutcome ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" aria-hidden="false"><div ref={confirmationDialogRef} role="dialog" aria-modal="true" aria-labelledby="outcome-confirmation-title" aria-describedby="outcome-confirmation-description" className="w-full max-w-lg rounded-overlay border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-6 shadow-modal"><h2 id="outcome-confirmation-title" className="text-xl font-semibold">Confirmare finală rezultat</h2><p id="outcome-confirmation-description" className="mt-3 text-sm text-[rgb(var(--text-muted))]">Confirmă explicit rezultatul <strong className="text-[rgb(var(--foreground))]">{String(pendingOutcome.get("lifecycleStatus")) === "won" ? "câștigat" : "pierdut"}</strong>. Emailul trimis, răspunsul, întâlnirea sau propunerea nu marchează automat această oportunitate ca fiind câștigată.</p>{String(pendingOutcome.get("lifecycleStatus")) === "won" ? <div className="mt-4 rounded-card border border-[rgb(var(--success-border))] bg-[rgb(var(--success-background))] p-4 text-[rgb(var(--success-text))]"><p className="text-xs font-semibold uppercase tracking-[0.12em]">Venit confirmat de echipă</p><p className="mt-2 text-lg font-semibold">{String(pendingOutcome.get("actualOutcomeAmount"))} {String(pendingOutcome.get("currency"))}</p><p className="mt-1 text-xs">Separat de valoarea estimată a oportunității.</p></div> : <p className="mt-4 rounded-card border border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] p-4 text-sm text-[rgb(var(--warning-text))]">Un rezultat pierdut nu înregistrează venit confirmat.</p>}<div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" disabled={isPending} onClick={() => setPendingOutcome(null)}>Renunță</Button><Button disabled={isPending} onClick={confirmOutcome}>{isPending ? "Se confirmă..." : "Confirm explicit rezultatul"}</Button></div></div></div> : null}
    </div>
  );
}
