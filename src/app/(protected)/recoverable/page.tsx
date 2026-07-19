import Link from "next/link";
import { ArrowRightIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageShell } from "@/components/dashboard/PageShell";
import { getStatusLabel } from "@/components/dashboard/StatusBadge";
import { AssistedPreparation } from "@/components/recovery/AssistedPreparation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
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
  const summary = await getRevenueWorkspaceSummary();
  const queue = buildRevenueRecoveryQueue(summary.activeOpportunities);
  const first = queue[0] ?? null;
  const recommendation = first ? recommendNextBestAction(first.opportunity) : null;

  return (
    <PageShell
      eyebrow="Execuție comercială"
      title="Coada de recuperare venituri"
      description="Oportunitățile care au nevoie de responsabil, termen sau următoarea acțiune. Ordinea este deterministă și explicabilă."
      actions={<Button href="/opportunities/analyze">Adaugă oportunitate</Button>}
      breadcrumbs={[{ label: "Control Center", href: "/dashboard" }, { label: "Recuperare venituri" }]}
    >
      <div className="grid gap-6">
        {first && recommendation ? (
          <AssistedPreparation
            context={`Prima intervenție recomandată este pentru „${first.opportunity.title}”. Prioritatea pornește din starea ${first.primaryReason.label.toLocaleLowerCase("ro-RO")}.`}
            suggestion={recommendation.action}
            reason={recommendation.reason}
            missingInformation={recommendation.missingInformation}
            href={`/opportunities/${first.opportunity.id}#workflow-actions`}
            actionLabel="Continuă intervenția"
          />
        ) : null}

        <Card as="section" variant="default" padding="none" aria-labelledby="recovery-queue-heading" className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-[rgb(var(--border))] p-5 sm:flex-row sm:items-start sm:justify-between">
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
                title="Nu există oportunități de urmărit"
                description="Adaugă o companie și prima oportunitate pentru ca ReveNew să îți arate ce riscă să se piardă. Nu sunt afișate valori sau riscuri inventate."
                actions={<><Button href="/opportunities/analyze">Adaugă oportunitate</Button><Button href="/companies" variant="secondary">Adaugă companie</Button></>}
              />
            </div>
          ) : (
            <>
              <div className="app-scrollbar hidden max-w-full overflow-x-auto lg:block">
                <table className="w-full min-w-[980px] table-fixed border-collapse text-left text-sm">
                  <thead className="bg-[rgb(var(--surface-muted))] text-xs uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">
                    <tr><th className="w-[19%] px-4 py-3 font-semibold">Companie / oportunitate</th><th className="w-[12%] px-4 py-3 font-semibold">Valoare estimată</th><th className="w-[22%] px-4 py-3 font-semibold">Motiv</th><th className="w-[12%] px-4 py-3 font-semibold">Responsabil</th><th className="w-[17%] px-4 py-3 font-semibold">Următoarea acțiune</th><th className="w-[13%] px-4 py-3 font-semibold">Ultima activitate</th><th className="w-[5%] px-4 py-3"><span className="sr-only">Acțiune</span></th></tr>
                  </thead>
                  <tbody className="divide-y divide-[rgb(var(--border))]">
                    {queue.map(({ opportunity, assessment, primaryReason }) => (
                      <tr key={opportunity.id} className="transition-colors duration-fast hover:bg-[rgb(var(--surface-muted)/0.62)]">
                        <td className="px-4 py-3"><Link href={`/opportunities/${opportunity.id}`} className="focus-ring font-semibold hover:text-[rgb(var(--primary))]">{opportunity.title}</Link><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{companyName(opportunity)} · {getStatusLabel(opportunity.status)}</p></td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums">{formatCurrency(opportunity.estimatedValueHigh, opportunity.currency ?? "RON")}</td>
                        <td className="px-4 py-3"><StatusPill tone={primaryReason.severity === "high" ? "danger" : "warning"}>{primaryReason.label}</StatusPill><p className="mt-1.5 max-w-xs text-xs leading-5 text-[rgb(var(--text-muted))]">{primaryReason.explanation}</p></td>
                        <td className="px-4 py-3">{assessment.primaryNextAction?.assignedToName ?? opportunity.ownerName ?? "Neatribuit"}</td>
                        <td className="px-4 py-3"><p className="font-medium">{assessment.primaryNextAction?.title ?? "Lipsește"}</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{assessment.primaryNextAction ? formatDate(assessment.primaryNextAction.dueDate) : "Fără termen"}</p></td>
                        <td className="whitespace-nowrap px-4 py-3 text-[rgb(var(--text-muted))]">{formatDate(assessment.lastMeaningfulActivityAt ?? undefined)}</td>
                        <td className="px-4 py-3"><Button href={`/opportunities/${opportunity.id}`} variant="ghost" size="small" aria-label={`Continuă lucrul la ${opportunity.title}`}><ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-[rgb(var(--border))] lg:hidden">
                {queue.map(({ opportunity, assessment, primaryReason }) => (
                  <article key={opportunity.id} className="p-4">
                    <div className="flex items-start gap-3"><ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[rgb(var(--warning-text))]" aria-hidden="true" /><div className="min-w-0 flex-1"><p className="text-xs text-[rgb(var(--text-muted))]">{companyName(opportunity)}</p><h3 className="mt-1 font-semibold">{opportunity.title}</h3><div className="mt-2 flex flex-wrap items-center gap-2"><StatusPill tone={primaryReason.severity === "high" ? "danger" : "warning"}>{primaryReason.label}</StatusPill><span className="text-sm font-semibold">{formatCurrency(opportunity.estimatedValueHigh, opportunity.currency ?? "RON")}</span></div></div></div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-[rgb(var(--text-muted))]">Responsabil</dt><dd className="mt-1 font-medium">{assessment.primaryNextAction?.assignedToName ?? opportunity.ownerName ?? "Neatribuit"}</dd></div><div><dt className="text-xs text-[rgb(var(--text-muted))]">Următoarea acțiune</dt><dd className="mt-1 font-medium">{assessment.primaryNextAction?.title ?? "Lipsește"}</dd><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{assessment.primaryNextAction ? formatDate(assessment.primaryNextAction.dueDate) : "Fără termen"}</p></div></dl>
                    <Button href={`/opportunities/${opportunity.id}`} variant="secondary" size="small" className="mt-4 w-full">Continuă workflow-ul</Button>
                  </article>
                ))}
              </div>
            </>
          )}
        </Card>

        <p className="text-xs leading-5 text-[rgb(var(--text-muted))]">Coada include numai oportunitățile accesibile în workspace-ul curent. Estimările rămân separate de venitul confirmat și nu există acțiuni externe automate.</p>
      </div>
    </PageShell>
  );
}
