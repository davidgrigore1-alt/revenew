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

  return (
    <div className="grid gap-6">
      <DataCard title="Control comercial" description="Situația operațională și motivele care cer intervenție.">
        <div className="grid gap-4">
          {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}
          {error ? <StatusNotice tone="error">{error}</StatusNotice> : null}
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Etapă pipeline", stageLabels[stageForLegacyStatus(opportunity.status)]],
              ["Ciclu de viață", lifecycleLabels[lifecycle]],
              ["Responsabil", ownerName ?? "Neatribuit"],
              ["Tip comercial", commercialTypeLabels[commercialTypeForOpportunity(opportunity)]],
              ["Valoare recuperabilă estimată", formatCurrency(opportunity.estimatedValueHigh, opportunity.currency ?? "RON")],
              ["Atenție", attentionLabels[attention.state]],
              ["Contact principal", primaryContact?.contact.fullName ?? "Lipsește"],
              ["Decident", decisionMaker?.contact.fullName ?? "Neconfirmat"]
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--muted-foreground))]">{label}</dt>
                <dd className="mt-2 text-sm font-semibold text-[rgb(var(--foreground))]">{value}</dd>
              </div>
            ))}
          </dl>

          {attention.reasons.length > 0 ? (
            <div aria-label="Motive de atenție" className="flex flex-wrap gap-2">
              {attention.reasons.map((reason) => (
                <span key={reason.code} title={reason.explanation} className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
                  {reason.label}
                </span>
              ))}
            </div>
          ) : <StatusNotice tone="success">Nu există excepții operaționale determinate din datele disponibile.</StatusNotice>}

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-[rgb(var(--surface-elevated))] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--muted-foreground))]">Următoarea acțiune</p>
              <p className="mt-2 text-sm font-semibold">{attention.primaryNextAction?.title ?? "Nicio acțiune programată"}</p>
              <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">{attention.primaryNextAction?.dueDate ? formatDate(attention.primaryNextAction.dueDate) : "Fără termen"}</p>
            </div>
            <div className="rounded-lg bg-[rgb(var(--surface-elevated))] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--muted-foreground))]">Ultima activitate</p>
              <p className="mt-2 text-sm font-semibold">{attention.lastMeaningfulActivityAt ? formatDate(attention.lastMeaningfulActivityAt) : "Date insuficiente"}</p>
            </div>
            <div className="rounded-lg bg-[rgb(var(--surface-elevated))] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--muted-foreground))]">Valoare efectivă</p>
              <p className="mt-2 text-sm font-semibold">{opportunity.actualOutcomeAmount == null ? "Neînregistrată" : formatCurrency(opportunity.actualOutcomeAmount, opportunity.currency ?? "RON")}</p>
              <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">Separată de estimare</p>
            </div>
          </div>
        </div>
      </DataCard>

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
            <form action={(formData) => startTransition(async () => handleResult(await recordOpportunityOutcome(opportunity.id, formData), "Rezultatul comercial a fost înregistrat."))} className="grid gap-3">
              <input type="hidden" name="expectedUpdatedAt" value={opportunity.updatedAt ?? ""} />
              <label className="grid gap-2 text-sm font-semibold">Rezultat
                <select name="lifecycleStatus" value={outcomeStatus} onChange={(event) => setOutcomeStatus(event.target.value as OpportunityLifecycleStatus)} className={fieldClass}>
                  <option value="won">Câștigată / recuperată</option>
                  <option value="lost">Pierdută</option>
                  <option value="disqualified">Descalificată</option>
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
              <Button type="submit" disabled={isPending}>{isPending ? "Se înregistrează..." : "Înregistrează rezultatul"}</Button>
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
    </div>
  );
}
