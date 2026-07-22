import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowTopRightOnSquareIcon, BuildingOffice2Icon } from "@heroicons/react/24/outline";
import { CompanyBusinessMemory } from "@/components/company/CompanyBusinessMemory";
import { DataCard } from "@/components/dashboard/DataCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageShell } from "@/components/dashboard/PageShell";
import { getStatusLabel } from "@/components/dashboard/StatusBadge";
import { CreateOpportunityPanel } from "@/components/opportunities/CreateOpportunityPanel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { getCompanyIntelligenceSnapshot } from "@/lib/company-intelligence";
import { safeCompanyWebsiteHref } from "@/lib/crm/website";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const relationshipLabels: Record<string, string> = {
  prospect: "Prospect",
  customer: "Client",
  partner: "Partener",
  inactive: "Inactiv"
};

function recoverableValue(values: Record<string, number>) {
  const entries = Object.entries(values).filter(([, value]) => value > 0);
  return entries.length > 0 ? entries.map(([currency, value]) => formatCurrency(value, currency)).join(" · ") : "Neestimată";
}

export default async function CrmOrganizationDetailPage({ params }: { params: { id: string } }) {
  const result = await getCompanyIntelligenceSnapshot(params.id);
  if (!result.ready) {
    return (
      <PageShell eyebrow="CRM" title="Datele companiei nu sunt disponibile" description={result.error ?? "Compania nu poate fi încărcată."}>
        <DataCard title="Acces indisponibil" description={result.error ?? "Verifică configurarea workspace-ului și încearcă din nou."} />
      </PageShell>
    );
  }
  if (!result.snapshot) notFound();

  const snapshot = result.snapshot;
  const { organization, identity, commercial } = snapshot;
  const websiteHref = safeCompanyWebsiteHref(organization.website);

  return (
    <PageShell
      eyebrow="Company 360"
      title={organization.name}
      description={[organization.industry, organization.city, organization.county].filter(Boolean).join(" · ") || "Context comercial centralizat pentru această companie."}
      actions={<CreateOpportunityPanel organizations={[organization]} />}
      breadcrumbs={[{ label: "Companii", href: "/companies" }, { label: organization.name }]}
    >
      <div className="grid gap-5 sm:gap-6">
        <Card variant="default" padding="none" className="overflow-hidden">
          <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:p-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone="brand">{relationshipLabels[organization.relationshipStatus ?? "prospect"] ?? "Relație neconfirmată"}</StatusPill>
                {organization.industry ? <span className="text-sm text-[rgb(var(--text-muted))]">{organization.industry}</span> : null}
              </div>
              <h2 className="mt-4 text-section-title font-semibold tracking-[-0.015em]">Context comercial</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--text-secondary))]">{organization.notes || "Context comun pentru ownership, follow-up și deciziile comerciale legate de companie."}</p>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-[rgb(var(--text-muted))]">Contact principal</dt><dd className="mt-1 font-semibold">{identity.primaryContact?.fullName ?? "Neconfirmat"}</dd></div>
                <div><dt className="text-[rgb(var(--text-muted))]">Localizare</dt><dd className="mt-1 font-semibold">{identity.location ?? "Necompletată"}</dd></div>
                <div><dt className="text-[rgb(var(--text-muted))]">Responsabil comercial</dt><dd className="mt-1 font-semibold">{identity.owner ?? "Neatribuit"}</dd></div>
                <div><dt className="text-[rgb(var(--text-muted))]">Website</dt><dd className="mt-1 font-semibold">{websiteHref ? <a href={websiteHref} target="_blank" rel="noopener noreferrer" className="focus-ring inline-flex max-w-full items-center gap-1.5 break-all text-[rgb(var(--primary))] hover:underline">{organization.website}<ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" aria-hidden="true" /></a> : "Necompletat"}</dd></div>
              </dl>
            </div>
            <div className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><BuildingOffice2Icon className="h-5 w-5 text-[rgb(var(--primary))]" aria-hidden="true" />Relație conectată</div>
              <dl className="mt-4 grid gap-3 text-sm">
                <div><dt className="text-[rgb(var(--text-muted))]">Contacte relevante</dt><dd className="mt-1 font-semibold">{identity.contactCount}</dd></div>
                <div><dt className="text-[rgb(var(--text-muted))]">Oportunități active</dt><dd className="mt-1 font-semibold">{commercial.activeOpportunities}</dd></div>
                <div><dt className="text-[rgb(var(--text-muted))]">Semnale nerezolvate</dt><dd className="mt-1 font-semibold">{commercial.unresolvedSignals}</dd></div>
                <div><dt className="text-[rgb(var(--text-muted))]">Închise / arhivate</dt><dd className="mt-1 font-semibold">{commercial.closedOpportunities} / {commercial.archivedOpportunities}</dd></div>
              </dl>
              <p className="mt-4 border-t border-[rgb(var(--border))] pt-4 text-xs leading-5 text-[rgb(var(--text-muted))]">Rezumatul folosește numai relațiile explicite din workspace. Nu completează automat informații lipsă.</p>
            </div>
          </div>
        </Card>

        <CompanyBusinessMemory memory={snapshot.memory} />

        <Card as="section" variant="subtle" padding="default">
          <SectionHeader
            eyebrow="Control operațional"
            title="Indicatori comerciali"
            description="Repere sintetice; valoarea estimată rămâne separată de venitul confirmat."
          />
          <dl className="mt-5 grid gap-4 border-t border-[rgb(var(--border))] pt-5 sm:grid-cols-2 xl:grid-cols-4">
            <div><dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Valoare recuperabilă estimată</dt><dd className="mt-2 text-xl font-semibold tabular-nums">{recoverableValue(commercial.recoverableValueByCurrency)}</dd><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Separată de venitul confirmat</p></div>
            <div><dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Necesită atenție</dt><dd className="mt-2 text-2xl font-semibold">{snapshot.attention.length}</dd><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{commercial.blockedOrOverdue} oportunități blocate sau restante</p></div>
            <div><dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Aprobări umane</dt><dd className="mt-2 text-2xl font-semibold">{commercial.pendingApprovals}</dd><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Nicio acțiune externă automată</p></div>
            <div><dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Ultima activitate</dt><dd className="mt-2 font-semibold">{commercial.latestActivity ? formatDate(commercial.latestActivity.occurredAt) : "Fără activitate"}</dd><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{commercial.inactivityDays === null ? "Nu există un reper datat" : `Acum ${commercial.inactivityDays} zile`}</p></div>
          </dl>

        </Card>

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <DataCard title="Relații comerciale" description="Persoanele și rolurile conectate explicit la companie și oportunități.">
              {snapshot.contacts.length > 0 ? <div className="divide-y divide-[rgb(var(--border))]">{snapshot.contacts.map((contact) => <article key={contact.id} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{contact.fullName}</h3>{contact.isPrimary ? <StatusPill tone="success">Principal</StatusPill> : null}</div><p className="mt-1 text-sm text-[rgb(var(--text-muted))]">{[contact.jobTitle, contact.decisionRole, ...contact.opportunityRoles].filter(Boolean).join(" · ") || "Rol neconfirmat"}</p><p className="mt-2 text-xs text-[rgb(var(--text-faint))]">{contact.opportunityCount > 0 ? `${contact.opportunityCount} oportunități conectate` : "Fără oportunitate conectată"}</p></article>)}</div> : <EmptyState title="Nicio persoană asociată" description="Adaugă persoana cu care discuți pentru a păstra continuitatea relației." actions={<Button href="/contacts" variant="secondary">Adaugă contact</Button>} />}
            </DataCard>
          </div>
          <div className="xl:col-span-7">
            <DataCard title="Oportunități asociate" description="Valoare estimată, responsabil și pas următor pentru fiecare context comercial.">
              {snapshot.opportunities.length > 0 ? <div className="divide-y divide-[rgb(var(--border))]">{snapshot.opportunities.map((opportunity) => <Link key={opportunity.id} href={opportunity.href} className="focus-ring group grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold group-hover:text-[rgb(var(--primary))]">{opportunity.title}</h3><StatusPill tone={opportunity.nextActionTitle && opportunity.ownerName ? "neutral" : "warning"}>{getStatusLabel(opportunity.status)}</StatusPill></div><p className="mt-1 text-sm text-[rgb(var(--text-muted))]">{opportunity.ownerName ?? "Fără responsabil"} · {opportunity.nextActionTitle ?? "Fără acțiune următoare"}{opportunity.nextActionDueAt ? ` · ${formatDate(opportunity.nextActionDueAt)}` : ""}</p></div><p className="font-semibold tabular-nums">{formatCurrency(opportunity.estimatedValue, opportunity.currency)}</p></Link>)}</div> : <EmptyState title="Nicio oportunitate asociată" description="Creează prima oportunitate pentru a urmări valoarea, responsabilul și următorul pas." />}
            </DataCard>
          </div>
        </div>

      </div>
    </PageShell>
  );
}
