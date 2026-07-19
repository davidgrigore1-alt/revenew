import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowTopRightOnSquareIcon, BuildingOffice2Icon, CalendarDaysIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { DataCard } from "@/components/dashboard/DataCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageShell } from "@/components/dashboard/PageShell";
import { getStatusLabel } from "@/components/dashboard/StatusBadge";
import { CreateOpportunityPanel } from "@/components/opportunities/CreateOpportunityPanel";
import { AssistedPreparation } from "@/components/recovery/AssistedPreparation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { safeCompanyWebsiteHref } from "@/lib/crm/website";
import { isOpenOpportunity } from "@/lib/opportunity-domain";
import { buildRevenueRecoveryQueue } from "@/lib/revenue-recovery-queue";
import { getCrmOrganizationDetail, recommendNextBestAction } from "@/lib/revenue-workspace";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const relationshipLabels: Record<string, string> = {
  prospect: "Prospect",
  customer: "Client",
  partner: "Partener",
  inactive: "Inactiv"
};

export default async function CrmOrganizationDetailPage({ params }: { params: { id: string } }) {
  const detail = await getCrmOrganizationDetail(params.id);
  if (!detail.ready) {
    return (
      <PageShell eyebrow="CRM" title="Datele companiei nu sunt disponibile" description={detail.error ?? "Compania nu poate fi încărcată."}>
        <DataCard title="Acces indisponibil" description={detail.error ?? "Verifică configurarea workspace-ului și încearcă din nou."} />
      </PageShell>
    );
  }
  if (!detail.organization) notFound();

  const { organization, contacts, opportunities, events } = detail;
  const activeOpportunities = opportunities.filter(isOpenOpportunity);
  const recoveryQueue = buildRevenueRecoveryQueue(activeOpportunities);
  const attentionItem = recoveryQueue[0] ?? null;
  const operationalOpportunity = attentionItem?.opportunity ?? activeOpportunities[0] ?? null;
  const operationalAssessment = attentionItem?.assessment ?? null;
  const nextAction = operationalAssessment?.primaryNextAction
    ?? operationalOpportunity?.actions.filter((action) => action.status === "pending").sort((left, right) => String(left.dueDate || "9999").localeCompare(String(right.dueDate || "9999")))[0]
    ?? null;
  const owner = nextAction?.assignedToName ?? operationalOpportunity?.ownerName ?? "Neatribuit";
  const primaryContact = contacts.find((contact) => contact.isPrimaryForOrganization) ?? null;
  const websiteHref = safeCompanyWebsiteHref(organization.website);
  const recommendation = operationalOpportunity ? recommendNextBestAction(operationalOpportunity) : null;

  const activities = [
    ...events.map((event) => ({ id: `event-${event.id}`, label: event.label, date: event.date, description: event.description, opportunityTitle: event.opportunityTitle, kind: "Eveniment" })),
    ...opportunities.flatMap((opportunity) => opportunity.actions.map((action) => ({
      id: `action-${opportunity.id}-${action.id}`,
      label: action.status === "done" ? "Acțiune finalizată" : "Acțiune de lucru",
      date: action.completedAt ?? action.updatedAt ?? action.createdAt ?? action.dueDate,
      description: action.title,
      opportunityTitle: opportunity.title,
      kind: "Acțiune"
    }))),
    ...opportunities.flatMap((opportunity) => opportunity.documents.map((document) => ({
      id: `document-${opportunity.id}-${document.id}`,
      label: "Document comercial",
      date: document.sentAt ?? document.readyAt ?? document.editedAt ?? document.createdAt,
      description: document.title,
      opportunityTitle: opportunity.title,
      kind: "Document"
    })))
  ].filter((activity): activity is typeof activity & { date: string } => Boolean(activity.date))
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 12);

  return (
    <PageShell
      eyebrow="Company 360"
      title={organization.name}
      description={[organization.industry, organization.city, organization.county].filter(Boolean).join(" · ") || "Context comercial centralizat pentru această companie."}
      actions={<CreateOpportunityPanel organizations={[organization]} />}
    >
      <div className="grid gap-6">
        <Card variant="elevated" padding="none" className="overflow-hidden">
          <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:p-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone="brand">{relationshipLabels[organization.relationshipStatus ?? "prospect"] ?? "Relație neconfirmată"}</StatusPill>
                {organization.industry ? <span className="text-sm text-[rgb(var(--text-muted))]">{organization.industry}</span> : null}
              </div>
              <h2 className="mt-4 text-section-title font-semibold tracking-[-0.015em]">Context comercial</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--text-secondary))]">{organization.notes || "Păstrează aici contextul necesar echipei pentru ownership, follow-up și deciziile comerciale legate de companie."}</p>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-[rgb(var(--text-muted))]">Contact principal</dt><dd className="mt-1 font-semibold">{primaryContact?.fullName ?? "Neconfirmat"}</dd></div>
                <div><dt className="text-[rgb(var(--text-muted))]">Localizare</dt><dd className="mt-1 font-semibold">{[organization.city, organization.county, organization.country].filter(Boolean).join(", ") || "Necompletată"}</dd></div>
                <div><dt className="text-[rgb(var(--text-muted))]">Telefon</dt><dd className="mt-1 font-semibold">{organization.phone ?? "Necompletat"}</dd></div>
                <div><dt className="text-[rgb(var(--text-muted))]">Website</dt><dd className="mt-1 font-semibold">{websiteHref ? <a href={websiteHref} target="_blank" rel="noopener noreferrer" className="focus-ring inline-flex max-w-full items-center gap-1.5 break-all text-[rgb(var(--primary))] hover:underline">{organization.website}<ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" aria-hidden="true" /></a> : "Necompletat"}</dd></div>
              </dl>
            </div>
            <div className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><BuildingOffice2Icon className="h-5 w-5 text-[rgb(var(--primary))]" aria-hidden="true" />Identitate juridică și date de firmă</div>
              <dl className="mt-4 grid gap-3 text-sm">
                <div><dt className="text-[rgb(var(--text-muted))]">Denumire de lucru</dt><dd className="mt-1 font-semibold">{organization.name}</dd></div>
                <div><dt className="text-[rgb(var(--text-muted))]">Județ / țară</dt><dd className="mt-1 font-semibold">{[organization.county, organization.country].filter(Boolean).join(" · ") || "Necompletat"}</dd></div>
              </dl>
              <p className="mt-4 border-t border-[rgb(var(--border))] pt-4 text-xs leading-5 text-[rgb(var(--text-muted))]">Datele juridice pot fi completate ulterior printr-un flux de verificare și confirmare umană. Nu există îmbogățire automată activă.</p>
            </div>
          </div>
        </Card>

        <Card as="section" variant="default" padding="default">
          <SectionHeader title="Situație operațională" description="Ce este activ, ce este blocat și cine trebuie să continue lucrul." />
          <dl className="mt-5 grid gap-4 border-t border-[rgb(var(--border))] pt-5 sm:grid-cols-2 xl:grid-cols-4">
            <div><dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Oportunități active</dt><dd className="mt-2 text-2xl font-semibold">{activeOpportunities.length}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Necesită atenție</dt><dd className="mt-2"><StatusPill tone={attentionItem ? "warning" : "success"}>{attentionItem?.primaryReason.label ?? "Fără blocaje active"}</StatusPill></dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Responsabil</dt><dd className="mt-2 flex items-center gap-2 font-semibold"><UserCircleIcon className="h-5 w-5 text-[rgb(var(--text-muted))]" aria-hidden="true" />{owner}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Următoarea acțiune</dt><dd className="mt-2 font-semibold">{nextAction?.title ?? "Lipsește"}</dd>{nextAction ? <p className="mt-1 flex items-center gap-1.5 text-xs text-[rgb(var(--text-muted))]"><CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />{formatDate(nextAction.dueDate)}</p> : <p className="mt-1 text-xs text-[rgb(var(--warning-text))]">Definește un pas și un termen.</p>}</div>
          </dl>
        </Card>

        <AssistedPreparation
          context={operationalOpportunity ? `Sugestie pentru „${operationalOpportunity.title}”, derivată exclusiv din datele operaționale vizibile.` : "Compania nu are încă o oportunitate activă din care ReveNew să poată pregăti următorul pas."}
          suggestion={recommendation?.action ?? "Creează prima oportunitate comercială"}
          reason={recommendation?.reason ?? "O oportunitate leagă valoarea, responsabilul, termenul și decizia de contextul companiei."}
          missingInformation={recommendation?.missingInformation ?? ["context comercial", "valoare estimată", "responsabil"]}
          href={operationalOpportunity ? `/opportunities/${operationalOpportunity.id}#workflow-actions` : undefined}
          actionLabel="Revizuiește și programează"
        />

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-5">
          <DataCard title="Contacte" description="Persoanele reale implicate în relație și în deciziile comerciale.">
            {contacts.length > 0 ? (
              <div className="divide-y divide-[rgb(var(--border))]">
                {contacts.map((contact) => (
                  <article key={contact.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{contact.fullName}</h3>{contact.isPrimaryForOrganization ? <StatusPill tone="success">Principal</StatusPill> : null}</div>
                    <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">{[contact.jobTitle, contact.decisionRole].filter(Boolean).join(" · ") || "Rol neconfirmat"}</p>
                    <p className="mt-2 break-all text-sm">{contact.email ?? contact.phone ?? "Date de contact necompletate"}</p>
                  </article>
                ))}
              </div>
            ) : <EmptyState title="Nicio persoană asociată" description="Adaugă persoana cu care discuți pentru a lega oportunitățile de un responsabil real." actions={<Button href="/contacts" variant="secondary">Adaugă contact</Button>} />}
          </DataCard>
          </div>

          <div className="xl:col-span-7">
          <DataCard title="Oportunități asociate" description="Valoare, ownership și următorul pas pentru fiecare context comercial.">
            {opportunities.length > 0 ? (
              <div className="divide-y divide-[rgb(var(--border))]">
                {opportunities.map((opportunity) => {
                  const queueItem = buildRevenueRecoveryQueue([opportunity])[0];
                  const opportunityNextAction = queueItem?.assessment.primaryNextAction ?? opportunity.actions.find((action) => action.status === "pending") ?? null;
                  return (
                    <Link key={opportunity.id} href={`/opportunities/${opportunity.id}`} className="focus-ring group grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold group-hover:text-[rgb(var(--primary))]">{opportunity.title}</h3><StatusPill tone={queueItem ? "warning" : "neutral"}>{queueItem?.primaryReason.label ?? getStatusLabel(opportunity.status)}</StatusPill></div><p className="mt-1 text-sm text-[rgb(var(--text-muted))]">{opportunity.ownerName ?? "Fără responsabil"} · {opportunityNextAction?.title ?? "Fără acțiune următoare"} · {formatDate(opportunityNextAction?.dueDate ?? opportunity.deadline)}</p></div>
                      <p className="font-semibold tabular-nums">{formatCurrency(opportunity.estimatedValueHigh, opportunity.currency ?? "RON")}</p>
                    </Link>
                  );
                })}
              </div>
            ) : <EmptyState title="Nicio oportunitate asociată" description="Creează prima oportunitate pentru a urmări valoarea, responsabilul și următorul pas." />}
          </DataCard>
          </div>
        </div>

        <DataCard title="Activitate și decizii" description="Ultimele evenimente, acțiuni și documente existente, ordonate pentru auditabilitate.">
          {activities.length > 0 ? (
            <ol className="relative ml-2 border-l border-[rgb(var(--border))] pl-6">
              {activities.map((activity) => (
                <li key={activity.id} className="relative pb-5 last:pb-0">
                  <span className="absolute -left-[1.78rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[rgb(var(--surface))] bg-[rgb(var(--gold-500))]" aria-hidden="true" />
                  <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{activity.label}</p><span className="text-xs text-[rgb(var(--text-faint))]">{activity.kind}</span></div>
                  <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">{activity.opportunityTitle} · {formatDate(activity.date)}</p>
                  {activity.description ? <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-secondary))]">{activity.description}</p> : null}
                </li>
              ))}
            </ol>
          ) : <EmptyState title="Fără activitate înregistrată" description="Evenimentele apar după asignări, acțiuni, documente și schimbări de status. ReveNew nu inventează istoric." />}
        </DataCard>
      </div>
    </PageShell>
  );
}
