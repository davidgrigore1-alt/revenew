import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageShell } from "@/components/dashboard/PageShell";
import { getStatusLabel } from "@/components/dashboard/StatusBadge";
import { AssistedPreparation } from "@/components/recovery/AssistedPreparation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { approvalStateForSignal } from "@/lib/approval-center";
import { getCommercialSignalsForCurrentBusiness } from "@/lib/commercial-inbox";
import { buildRevenueRecoveryQueue } from "@/lib/revenue-recovery-queue";
import { getRevenueWorkspaceSummary, recommendNextBestAction } from "@/lib/revenue-workspace";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Opportunity } from "@/lib/types";

export const dynamic = "force-dynamic";

function companyName(opportunity: Opportunity) {
  return opportunity.contacts?.find((association) => association.isPrimary)?.contact.organization?.name
    ?? opportunity.contacts?.find((association) => association.contact.organization)?.contact.organization?.name
    ?? opportunity.contact?.company
    ?? "Companie neasociată";
}

export default async function RecoverablePage() {
  const [summary, signals] = await Promise.all([
    getRevenueWorkspaceSummary(),
    getCommercialSignalsForCurrentBusiness()
  ]);
  const queue = buildRevenueRecoveryQueue(summary.activeOpportunities, { linkedSignals: signals.signals });
  const pendingApprovalByOpportunity = new Map(
    signals.signals
      .filter((signal) => approvalStateForSignal(signal) === "pending" && signal.detectedFromOpportunityId)
      .map((signal) => [signal.detectedFromOpportunityId as string, signal])
  );
  const first = queue[0] ?? null;
  const recommendation = first ? recommendNextBestAction(first.opportunity) : null;
  const firstPendingApproval = first?.state.approval.signalId
    ? pendingApprovalByOpportunity.get(first.opportunity.id)
    : null;

  return (
    <PageShell
      eyebrow="Execuție comercială"
      title="Coada de recuperare venituri"
      description="Oportunitățile care au nevoie de responsabil, termen sau următoarea acțiune. Ordinea este deterministă și explicabilă."
      actions={<><Button href="/inbox" variant="secondary">Vezi Inbox comercial</Button><Button href="/opportunities/analyze">Adaugă oportunitate</Button></>}
      breadcrumbs={[{ label: "Control Center", href: "/dashboard" }, { label: "Recuperare venituri" }]}
    >
      <div className="grid gap-6">
        <Card as="section" variant="default" padding="none" aria-labelledby="recovery-queue-heading" className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-[rgb(var(--border))] p-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">Prioritate operațională</p>
              <h2 id="recovery-queue-heading" className="mt-1 text-section-title font-semibold tracking-[-0.015em]">Ce merită atenție acum</h2>
              <p className="mt-1.5 text-sm leading-6 text-[rgb(var(--text-muted))]">Restanțele și lipsa următorului pas au prioritate; valoarea estimată este folosită doar pentru departajare.</p>
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
                        <td className="px-4 py-3"><StatusPill tone={primaryReason.severity === "high" ? "danger" : "warning"}>{primaryReason.label}</StatusPill><p className="mt-1.5 max-w-xs text-xs leading-5 text-[rgb(var(--text-muted))]">{primaryReason.explanation}</p></td>
                        <td className="px-4 py-3">{state.nextAction?.ownerName ?? state.ownership.ownerName ?? "Neatribuit"}</td>
                        <td className="px-4 py-3"><p className="font-medium">{state.nextAction?.title ?? "Lipsește"}</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{state.nextAction?.dueAt ? formatDate(state.nextAction.dueAt) : "Fără termen"}</p></td>
                        <td className="whitespace-nowrap px-4 py-3 text-[rgb(var(--text-muted))]">{formatDate(state.activity.lastMeaningfulActivityAt ?? undefined)}</td>
                        <td className="px-4 py-3">{pendingApproval
                          ? <Button href={`/approvals?signal=${pendingApproval.id}`} variant="ghost" size="small" aria-label={`Revizuiește aprobarea pentru ${opportunity.title}`}>Aprobă <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>
                          : <Button href={`/opportunities/${opportunity.id}?tab=workflow#workflow-actions`} variant="ghost" size="small" aria-label={`Continuă lucrul la ${opportunity.title}`}>Continuă <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>}
                        </td>
                      </tr>
                    })}
                  </tbody>
                </table>
              </div>
          )}
        </Card>

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
