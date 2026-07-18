"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DataCard } from "@/components/dashboard/DataCard";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { Button } from "@/components/ui/Button";
import { assessOpportunityAttention } from "@/lib/opportunity-attention";
import {
  applicationDateKey,
  commercialTypeForOpportunity,
  commercialTypeLabels,
  lifecycleForOpportunity,
  lifecycleLabels,
  stageForLegacyStatus
} from "@/lib/opportunity-domain";
import {
  recordOpportunityOutcome,
  reopenOpportunity,
  updateOpportunityCommercialDetails
} from "@/lib/revenue-workspace/actions";
import { openOutcomeConfirmation } from "@/lib/commercial-response-actions";
import type { Opportunity, OpportunityLifecycleStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type AssignableProfile = { id: string; fullName: string };

const fieldClass = "h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 text-sm text-[rgb(var(--foreground))]";
const stageLabels = { lead: "Lead", qualified: "Calificare", proposal: "Propunere", won: "Câștigat", lost: "Pierdut" };
const attentionLabels = { on_track: "În grafic", needs_attention: "Necesită atenție", at_risk: "În risc", blocked: "Blocat", closed: "Închis" };

export function OpportunityControlCenter({ opportunity, assignableProfiles }: { opportunity: Opportunity; assignableProfiles: AssignableProfile[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [outcomeStatus, setOutcomeStatus] = useState<OpportunityLifecycleStatus>("won");
  const [pendingOutcome, setPendingOutcome] = useState<FormData | null>(null);
  const lifecycle = lifecycleForOpportunity(opportunity);
  const attention = assessOpportunityAttention(opportunity);
  const primaryContact = opportunity.contacts?.find((contact) => contact.isPrimary) ?? null;
  const ownerName = assignableProfiles.find((profile) => profile.id === opportunity.ownerProfileId)?.fullName ?? null;
  const decisionMaker = opportunity.contacts?.find((association) => {
    const value = `${association.role ?? ""} ${association.contact.decisionRole ?? ""}`.toLowerCase();
    return /decision|decident|buyer|approver/.test(value);
  }) ?? null;

  function handleResult(result: { ok: boolean; error?: string }, success: string) {
    if (result.ok) {
      setError("");
      setNotice(success);
      router.refresh();
    } else {
      setNotice("");
      setError(result.error ?? "Schimbarea nu a putut fi salvată.");
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
      <section className="overflow-hidden rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-card" aria-labelledby="execution-brief-title">
        <div className="grid xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.65fr)]">
          <div className="border-b border-[rgb(var(--border))] p-5 sm:p-6 xl:border-b-0 xl:border-r xl:p-8">
            {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}
            {error ? <StatusNotice tone="error">{error}</StatusNotice> : null}
            <div className={notice || error ? "mt-6" : ""}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-pill border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-3 py-1 text-xs font-semibold">{stageLabels[stageForLegacyStatus(opportunity.status)]}</span>
                <span className="rounded-pill border border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] px-3 py-1 text-xs font-semibold text-[rgb(var(--warning-text))]">{attentionLabels[attention.state]}</span>
                <span className="text-xs text-[rgb(var(--text-muted))]">{commercialTypeLabels[commercialTypeForOpportunity(opportunity)]}</span>
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.15em] text-[rgb(var(--primary))]">Acțiunea care deblochează progresul</p>
              <h2 id="execution-brief-title" className="mt-2 max-w-2xl font-display text-2xl font-semibold tracking-tight sm:text-3xl">{attention.primaryNextAction?.title ?? "Stabilește următoarea acțiune"}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[rgb(var(--text-muted))]">{attention.primaryNextAction?.dueDate ? `Termen: ${formatDate(attention.primaryNextAction.dueDate)}. Verifică responsabilul și contextul înainte de execuție.` : "O oportunitate fără acțiune și termen nu poate fi urmărită operațional. Completează pasul următor înainte de follow-up."}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button href="#workflow-actions">{attention.primaryNextAction ? "Continuă acțiunea" : "Programează acțiunea"}</Button>
                <Button href="#opportunity-timeline" variant="secondary">Vezi istoricul</Button>
              </div>
              <p className="mt-4 text-xs text-[rgb(var(--text-muted))]">Aprobarea umană rămâne obligatorie pentru orice comunicare externă sau rezultat comercial.</p>
            </div>

            <div className="mt-8 border-t border-[rgb(var(--border))] pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[rgb(var(--text-muted))]">Blocaje și excepții</p>
              {attention.reasons.length > 0 ? <div aria-label="Motive de atenție" className="mt-3 grid gap-2 sm:grid-cols-2">{attention.reasons.map((reason) => <div key={reason.code} className="rounded-control border border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] p-3"><p className="text-sm font-semibold text-[rgb(var(--warning-text))]">{reason.label}</p><p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{reason.explanation}</p></div>)}</div> : <StatusNotice tone="success">Nu există excepții operaționale determinate din datele disponibile.</StatusNotice>}
            </div>
          </div>

          <aside className="bg-[rgb(var(--surface-subtle))] p-5 sm:p-6 xl:p-8" aria-label="Fapte comerciale">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">Fapte comerciale</p>
            <dl className="mt-5 grid gap-5">
              <div><dt className="text-xs text-[rgb(var(--text-muted))]">Valoare estimată, nu confirmată</dt><dd className="mt-1 text-2xl font-semibold tracking-tight">{formatCurrency(opportunity.estimatedValueHigh, opportunity.currency ?? "RON")}</dd></div>
              <div className="grid grid-cols-2 gap-4 border-y border-[rgb(var(--border))] py-5"><div><dt className="text-xs text-[rgb(var(--text-muted))]">Responsabil</dt><dd className="mt-1 text-sm font-semibold">{ownerName ?? "Neatribuit"}</dd></div><div><dt className="text-xs text-[rgb(var(--text-muted))]">Ciclu de viață</dt><dd className="mt-1 text-sm font-semibold">{lifecycleLabels[lifecycle]}</dd></div></div>
              <div><dt className="text-xs text-[rgb(var(--text-muted))]">Contact principal</dt><dd className="mt-1 text-sm font-semibold">{primaryContact?.contact.fullName ?? "Lipsește"}</dd>{primaryContact?.contact.email ? <p className="mt-1 break-all text-xs text-[rgb(var(--text-muted))]">{primaryContact.contact.email}</p> : null}</div>
              <div><dt className="text-xs text-[rgb(var(--text-muted))]">Decident</dt><dd className="mt-1 text-sm font-semibold">{decisionMaker?.contact.fullName ?? "Neconfirmat"}</dd></div>
              <div className="grid grid-cols-2 gap-4 border-t border-[rgb(var(--border))] pt-5"><div><dt className="text-xs text-[rgb(var(--text-muted))]">Ultima activitate</dt><dd className="mt-1 text-sm font-semibold">{attention.lastMeaningfulActivityAt ? formatDate(attention.lastMeaningfulActivityAt) : "Date insuficiente"}</dd></div><div><dt className="text-xs text-[rgb(var(--text-muted))]">Valoare efectivă</dt><dd className="mt-1 text-sm font-semibold">{opportunity.actualOutcomeAmount == null ? "Neînregistrată" : formatCurrency(opportunity.actualOutcomeAmount, opportunity.currency ?? "RON")}</dd></div></div>
            </dl>
          </aside>
        </div>
      </section>

      {lifecycle === "open" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <DataCard title="Responsabilitate" description="Atribuie oportunitatea și confirmă clasificarea comercială.">
            <form action={(formData) => startTransition(async () => handleResult(await updateOpportunityCommercialDetails(opportunity.id, formData), "Responsabilitatea a fost actualizată."))} className="grid gap-3">
              <label className="grid gap-2 text-sm font-semibold">Responsabil
                <select name="ownerProfileId" defaultValue={opportunity.ownerProfileId ?? ""} className={fieldClass}>
                  <option value="">Neatribuit</option>
                  {assignableProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.fullName}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold">Tip comercial
                <select name="commercialType" defaultValue={commercialTypeForOpportunity(opportunity)} className={fieldClass}>
                  {Object.entries(commercialTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <Button type="submit" disabled={isPending}>{isPending ? "Se salvează..." : "Salvează responsabilitatea"}</Button>
            </form>
          </DataCard>

          <DataCard title="Înregistrează rezultatul" description="ReveNew păstrează rezultatul declarat de echipă; estimările nu devin automat venit.">
            <form action={reviewOutcome} className="grid gap-3">
              <input type="hidden" name="expectedUpdatedAt" value={opportunity.updatedAt ?? ""} />
              <label className="grid gap-2 text-sm font-semibold">Rezultat
                <select name="lifecycleStatus" value={outcomeStatus} onChange={(event) => setOutcomeStatus(event.target.value as OpportunityLifecycleStatus)} className={fieldClass}>
                  <option value="won">Câștigată / recuperată</option>
                  <option value="lost">Pierdută</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold">Motiv
                <select name="outcomeReason" className={fieldClass} defaultValue={outcomeStatus === "won" ? "won" : "other"} key={outcomeStatus}>
                  {outcomeStatus === "won" ? <>
                    <option value="won">Contract câștigat</option><option value="recovered">Venit recuperat</option><option value="expanded">Extindere</option><option value="renewed">Reînnoire</option><option value="other">Alt motiv</option>
                  </> : <>
                    <option value="customer_selected_other">Clientul a ales alt furnizor</option><option value="no_budget">Buget indisponibil</option><option value="no_response">Fără răspuns</option><option value="timing">Moment nepotrivit</option><option value="not_qualified">Neeligibilă</option><option value="duplicate">Duplicat</option><option value="cancelled">Anulată</option><option value="other">Alt motiv</option>
                  </>}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">Data rezultatului<input name="outcomeDate" type="date" required defaultValue={applicationDateKey()} className={fieldClass} /></label>
                {outcomeStatus === "won" ? <label className="grid gap-2 text-sm font-semibold">Valoare efectivă<input name="actualOutcomeAmount" inputMode="decimal" required pattern="[0-9]+([.,][0-9]{1,2})?" className={fieldClass} /></label> : null}
              </div>
              <label className="grid gap-2 text-sm font-semibold">Monedă<input name="currency" required maxLength={3} defaultValue={opportunity.currency ?? "RON"} className={fieldClass} /></label>
              <label className="grid gap-2 text-sm font-semibold">Notă opțională<textarea name="outcomeNote" rows={3} maxLength={1000} className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-2" /></label>
              <Button type="submit" disabled={isPending}>{isPending ? "Se verifică..." : "Verifică și confirmă rezultatul"}</Button>
            </form>
          </DataCard>
        </div>
      ) : (
        <DataCard title="Rezultat comercial" description="Poți corecta rezultatul prin redeschidere; istoricul rămâne auditat.">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="font-semibold">{lifecycleLabels[lifecycle]}</p><p className="text-sm text-[rgb(var(--muted-foreground))]">{opportunity.outcomeDate ? formatDate(opportunity.outcomeDate) : "Rezultat legacy fără detalii structurate"}</p></div>
            <Button variant="secondary" disabled={isPending} onClick={() => startTransition(async () => handleResult(await reopenOpportunity(opportunity.id), "Oportunitatea a fost redeschisă."))}>{isPending ? "Se redeschide..." : "Redeschide pentru corecție"}</Button>
          </div>
        </DataCard>
      )}
      {pendingOutcome ? <div role="dialog" aria-modal="true" aria-labelledby="outcome-confirmation-title" className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"><div className="w-full max-w-lg rounded-xl border border-white/15 bg-[rgb(var(--background))] p-6 shadow-2xl"><h2 id="outcome-confirmation-title" className="text-xl font-semibold">Confirmare finală rezultat</h2><p className="mt-3 text-sm text-[rgb(var(--muted-foreground))]">Confirmă explicit rezultatul <strong>{String(pendingOutcome.get("lifecycleStatus")) === "won" ? "câștigat" : "pierdut"}</strong>. Emailul trimis, răspunsul, întâlnirea sau propunerea nu marchează automat această oportunitate ca fiind câștigată.</p>{String(pendingOutcome.get("lifecycleStatus")) === "won" ? <div className="mt-4 rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em]">Venit recuperat confirmat</p><p className="mt-2 text-lg font-semibold">{String(pendingOutcome.get("actualOutcomeAmount"))} {String(pendingOutcome.get("currency"))}</p><p className="mt-1 text-xs">Separat de valoarea estimată a oportunității.</p></div> : <p className="mt-4 rounded-lg border border-amber-400/25 bg-amber-400/10 p-4 text-sm">Un rezultat pierdut nu înregistrează venit confirmat.</p>}<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" disabled={isPending} onClick={() => setPendingOutcome(null)}>Renunță</Button><Button disabled={isPending} onClick={confirmOutcome}>{isPending ? "Se confirmă..." : "Confirm explicit rezultatul"}</Button></div></div></div> : null}
    </div>
  );
}
