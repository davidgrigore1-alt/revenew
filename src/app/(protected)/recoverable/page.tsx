import { Select } from "@/components/ui/Select";
import Link from "next/link";
import { sumImpactMoney } from "@/lib/revenue-impact";
import { getRevenueImpact,getImpactReferences } from "@/lib/revenue-impact-server";
import { ImpactSurface } from "@/components/recovery/ImpactSurface";
import { TrackImpact } from "@/components/recovery/ImpactControls";
import { toolbarActionClass } from "@/components/ui/ActionToolbar";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageShell } from "@/components/dashboard/PageShell";
import { getStatusLabel } from "@/components/dashboard/StatusBadge";
import { AssistedPreparation } from "@/components/recovery/AssistedPreparation";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { approvalStateForSignal } from "@/lib/approval-center";
import { getCommercialSignalsForCurrentBusiness } from "@/lib/commercial-inbox";
import { buildRevenueRecoveryQueue } from "@/lib/revenue-recovery-queue";
import { getRevenueWorkspaceSummary } from "@/lib/revenue-workspace";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Opportunity } from "@/lib/types";

export const dynamic = "force-dynamic";

function companyName(opportunity: Opportunity) {
  return opportunity.contacts?.find((association) => association.isPrimary)?.contact.organization?.name
    ?? opportunity.contacts?.find((association) => association.contact.organization)?.contact.organization?.name
    ?? opportunity.contact?.company
    ?? "Companie neasociată";
}

export default async function RecoverablePage({searchParams={}}:{searchParams?:{range?:string;from?:string;to?:string;case?:string;proof?:string;opportunity?:string}}) {
  const impact=await getRevenueImpact({...searchParams,opportunityId:searchParams.opportunity});
  const selected=searchParams.case?impact.proofs.find(p=>p.id===searchParams.case):impact.proofs[0];
  const references=selected?await getImpactReferences(selected.opportunity_id):undefined;
  const baseQuery=new URLSearchParams({range:searchParams.range??"30",...(searchParams.opportunity?{opportunity:searchParams.opportunity}:{}),...(searchParams.from?{from:searchParams.from}:{}),...(searchParams.to?{to:searchParams.to}:{})}).toString();
  const [summary, signals] = await Promise.all([
    getRevenueWorkspaceSummary(),
    getCommercialSignalsForCurrentBusiness()
  ]);
  const visibleOpportunities=summary.viewer.isManager?summary.activeOpportunities:summary.activeOpportunities.filter(o=>o.ownerProfileId===summary.viewer.profileId);
  const queue = buildRevenueRecoveryQueue(visibleOpportunities, { linkedSignals: signals.signals });
  const pendingApprovalByOpportunity = new Map(
    signals.signals
      .filter((signal) => approvalStateForSignal(signal) === "pending" && signal.detectedFromOpportunityId)
      .map((signal) => [signal.detectedFromOpportunityId as string, signal])
  );
  const first = queue[0] ?? null;
  const recommendation = first ? {action:first.state.recommendedSafeIntervention.label,reason:first.primaryReason.explanation,missingInformation:first.state.missingInformation} : null;
  const firstPendingApproval = first?.state.approval.signalId
    ? pendingApprovalByOpportunity.get(first.opportunity.id)
    : null;

  return (
    <PageShell
      eyebrow="Execuție comercială"
      title="Impact comercial"
      description="Valoarea comercială detectată, intervențiile confirmate și rezultatele verificabile."
      actions={<><Button href="/inbox" variant="secondary">Vezi Inbox comercial</Button><Button href="/opportunities/analyze">Adaugă oportunitate</Button></>}
      breadcrumbs={[{ label: "Control Center", href: "/dashboard" }, { label: "Recuperare venituri" }]}
    >
      <form className="mb-3 flex flex-wrap items-center gap-2 print:hidden" action="/recoverable">
        {searchParams.opportunity?<input type="hidden" name="opportunity" value={searchParams.opportunity}/>:null}
        <label className="sr-only" htmlFor="impact-range">Interval</label>
        <Select id="impact-range" name="range" defaultValue={searchParams.range??"30"} className={toolbarActionClass}><option value="30">30 zile</option><option value="quarter">Trimestrul curent</option><option value="custom">Interval personalizat</option></Select>
        <details className="text-xs"><summary className="focus-ring cursor-pointer">Date personalizate</summary><div className="mt-2 flex gap-2"><input aria-label="De la" type="date" name="from" defaultValue={searchParams.from} className={toolbarActionClass}/><input aria-label="Până la" type="date" name="to" defaultValue={searchParams.to} className={toolbarActionClass}/></div></details>
        <button className={toolbarActionClass} type="submit">Aplică</button>
      </form>
      {searchParams.range==="custom"&&impact.period.label==="30 zile"?<p role="status" className="mb-3 text-xs">Intervalul personalizat nu este valid. Sunt afișate ultimele 30 de zile; alege date valide, maximum 366 de zile, până astăzi.</p>:null}
      <ImpactSurface model={impact} selectedId={searchParams.case} baseQuery={baseQuery} print={searchParams.proof==="1"} references={references} currentDetected={sumImpactMoney(queue.filter(item=>!searchParams.opportunity||item.opportunity.id===searchParams.opportunity).map(item=>({amount:item.opportunity.estimatedValueHigh,currency:item.opportunity.currency??null})))}/>
      <div className={"mt-6 grid gap-6 print:hidden "+(searchParams.proof==="1"?"hidden":"")}>
        <section aria-labelledby="recovery-queue-heading" className="overflow-hidden border-y border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))]">
          <div className="flex flex-col gap-3 border-b border-[rgb(var(--border))] p-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">Prioritate operațională</p>
              <h2 id="recovery-queue-heading" className="mt-1 text-section-title font-semibold tracking-[-0.015em]">Ce merită atenție acum</h2>
              <p className="mt-1.5 text-sm leading-6 text-[rgb(var(--text-muted))]">Restanțele, aprobările și lipsa următorului pas au prioritate; valoarea estimată este folosită doar pentru departajare.</p>
            </div>
            {queue.length > 0 ? <StatusPill tone="warning">{queue.length} {queue.length === 1 ? "intervenție" : "intervenții"}</StatusPill> : null}
          </div>

          {queue.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="Coada se construiește din semnale aprobate"
                description="Aici apar oportunitățile care au nevoie de responsabil, termen sau următoarea acțiune. Adaugă un semnal în Inbox Comercial, verifică analiza și aprobă conversia; ReveNew nu inventează riscuri sau valori pentru un spațiu de lucru gol."
                actions={<><Button href="/inbox?create=1">Adaugă primul semnal</Button><Button href="/inbox/import" variant="secondary">Importă semnale comerciale</Button></>}
              />
            </div>
          ) : (
              <div className="app-scrollbar max-w-full overflow-x-auto">
                <table className="w-full min-w-[980px] table-fixed border-collapse text-left text-sm">
                  <thead className="bg-[rgb(var(--surface-subtle))] text-[0.6875rem] text-[rgb(var(--text-secondary))]">
                    <tr className="border-b border-[rgb(var(--border-strong))]"><th className="w-[18%] px-4 py-2.5 font-semibold">Companie / oportunitate</th><th className="w-[11%] px-4 py-2.5 font-semibold">Valoare estimată</th><th className="w-[21%] px-4 py-2.5 font-semibold">Motiv</th><th className="w-[11%] px-4 py-2.5 font-semibold">Responsabil</th><th className="w-[17%] px-4 py-2.5 font-semibold">Următoarea acțiune</th><th className="w-[13%] px-4 py-2.5 font-semibold">Ultima activitate</th><th className="w-[9%] px-4 py-2.5"><span className="sr-only">Acțiune</span></th></tr>
                  </thead>
                  <tbody className="divide-y divide-[rgb(var(--border))]">
                    {queue.map(({ opportunity, state, primaryReason }) => {
                      const pendingApproval = pendingApprovalByOpportunity.get(opportunity.id);
                      return <tr key={opportunity.id} className="bg-[rgb(var(--surface))] transition-colors duration-fast hover:bg-[rgb(var(--surface-elevated))]">
                        <td className="px-4 py-3"><Link href={`/opportunities/${opportunity.id}`} className="focus-ring font-semibold hover:text-[rgb(var(--primary))]">{opportunity.title}</Link><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{companyName(opportunity)} · {getStatusLabel(opportunity.status)}</p></td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums">{formatCurrency(opportunity.estimatedValueHigh, opportunity.currency ?? "RON")}</td>
                        <td className="px-4 py-3"><StatusPill tone={primaryReason.severity === "critical" ? "danger" : "warning"}>{primaryReason.label}</StatusPill><p className="mt-1.5 max-w-xs text-xs leading-5 text-[rgb(var(--text-muted))]">{primaryReason.explanation}</p></td>
                        <td className="px-4 py-3">{state.ownership.ownerName ?? (state.ownership.ownerProfileId ? "Atribuit · nume indisponibil" : "Neatribuit")}</td>
                        <td className="px-4 py-3"><p className="font-medium">{state.nextAction?.title ?? "Lipsește"}</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{state.nextAction?.dueAt ? formatDate(state.nextAction.dueAt) : "Fără termen"}</p></td>
                        <td className="whitespace-nowrap px-4 py-3 text-[rgb(var(--text-muted))]">{formatDate(state.activity.lastMeaningfulActivityAt ?? undefined)}</td>
                        <td className="px-4 py-3">{impact.canTrack&&!impact.proofs.some(p=>p.opportunity_id===opportunity.id)?<TrackImpact opportunityId={opportunity.id}/>:null}{pendingApproval
                          ? <Button href={`/approvals?signal=${pendingApproval.id}`} variant="ghost" size="small" aria-label={`Revizuiește aprobarea pentru ${opportunity.title}`}>Verifică <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>
                          : <Button href={`/opportunities/${opportunity.id}?tab=workflow#workflow-actions`} variant="ghost" size="small" aria-label={`Continuă lucrul la ${opportunity.title}`}>Continuă <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>}
                        </td>
                      </tr>
                    })}
                  </tbody>
                </table>
              </div>
          )}
        </section>

        {first && recommendation ? (
          <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_17rem]" aria-label="Pregătirea intervenției selectate">
            <AssistedPreparation
              context={`Prima intervenție recomandată este pentru „${first.opportunity.title}”. Prioritatea pornește din starea ${first.primaryReason.label.toLocaleLowerCase("ro-RO")}.`}
              suggestion={recommendation.action}
              reason={recommendation.reason}
              missingInformation={recommendation.missingInformation}
              href={firstPendingApproval ? `/approvals?signal=${firstPendingApproval.id}` : `/opportunities/${first.opportunity.id}?tab=workflow#workflow-actions`}
              actionLabel={firstPendingApproval ? "Revizuiește aprobarea" : "Continuă intervenția"}
            />
            <aside className="border-l-2 border-[rgb(var(--primary))] px-5 py-1">
              <p className="text-label text-[rgb(var(--primary))]">Regula cozii</p>
              <p className="mt-3 text-lg font-semibold">Întâi ruptura, apoi valoarea.</p>
              <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-muted))]">Restanța, lipsa responsabilului și blocajul decid ordinea. Estimarea comercială departajează, dar nu devine venit confirmat.</p>
            </aside>
          </section>
        ) : null}

        <p className="text-xs leading-5 text-[rgb(var(--text-muted))]">Coada include numai oportunitățile accesibile în spațiul de lucru curent. Estimările rămân separate de venitul confirmat și nu există acțiuni externe automate.</p>
      </div>
    </PageShell>
  );
}
