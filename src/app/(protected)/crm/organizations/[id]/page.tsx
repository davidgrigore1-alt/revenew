import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { CompanyBusinessMemory } from "@/components/company/CompanyBusinessMemory";
import { CompanyContextualAsk } from "@/components/company/CompanyContextualAsk";
import { DataCard } from "@/components/dashboard/DataCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageShell } from "@/components/dashboard/PageShell";
import { getStatusLabel } from "@/components/dashboard/StatusBadge";
import { CreateOpportunityPanel } from "@/components/opportunities/CreateOpportunityPanel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { getCompanyIntelligenceSnapshot } from "@/lib/company-intelligence";
import { suggestedCompanyQuestions } from "@/lib/company-commercial-memory";
import { safeCompanyWebsiteHref } from "@/lib/crm/website";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const relationshipLabels: Record<string, string> = {
  prospect: "Prospect",
  customer: "Client",
  partner: "Partener",
  inactive: "Inactiv"
};

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
  const { organization, identity } = snapshot;
  const websiteHref = safeCompanyWebsiteHref(organization.website);
  const askSuggestions = suggestedCompanyQuestions(snapshot);

  return (
    <PageShell
      eyebrow="Company 360"
      title={organization.name}
      description={[organization.industry, organization.city, organization.county].filter(Boolean).join(" · ") || "Context comercial centralizat pentru această companie."}
      actions={<CreateOpportunityPanel organizations={[organization]} />}
      breadcrumbs={[{ label: "Companii", href: "/companies" }, { label: organization.name }]}
    >
      <div className="grid gap-5 sm:gap-6">
        <Card variant="default" padding="default" className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="brand">{relationshipLabels[organization.relationshipStatus ?? "prospect"] ?? "Relație neconfirmată"}</StatusPill>
            {organization.industry ? <span className="text-sm text-[rgb(var(--text-muted))]">{organization.industry}</span> : null}
          </div>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-[rgb(var(--text-secondary))]">{organization.notes || "Context comun pentru responsabilitate, follow-up și deciziile comerciale legate de companie."}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[rgb(var(--border))] pt-4 text-sm xl:grid-cols-4">
            <div><dt className="text-[rgb(var(--text-muted))]">Contact principal</dt><dd className="mt-1 font-semibold">{identity.primaryContact?.fullName ?? "Neconfirmat"}</dd></div>
            <div><dt className="text-[rgb(var(--text-muted))]">Responsabil comercial</dt><dd className="mt-1 font-semibold">{identity.owner ?? "Neatribuit"}</dd></div>
            <div><dt className="text-[rgb(var(--text-muted))]">Localizare</dt><dd className="mt-1 font-semibold">{identity.location ?? "Necompletată"}</dd></div>
            <div><dt className="text-[rgb(var(--text-muted))]">Website</dt><dd className="mt-1 font-semibold">{websiteHref ? <a href={websiteHref} target="_blank" rel="noopener noreferrer" className="focus-ring inline-flex max-w-full items-center gap-1.5 break-all text-[rgb(var(--primary))] hover:underline">{organization.website}<ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" aria-hidden="true" /></a> : "Necompletat"}</dd></div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-[rgb(var(--text-muted))]">Rezumat bazat numai pe relații explicite. Nicio acțiune externă automată.</p>
        </Card>

        <CompanyBusinessMemory memory={snapshot.memory} executiveDecision={snapshot.executiveDecision} recoverableValueByCurrency={snapshot.commercial.recoverableValueByCurrency} />

        <CompanyContextualAsk organizationId={organization.id} companyName={organization.name} suggestions={askSuggestions} />

        <div className="grid gap-6 xl:grid-cols-12">
          <div id="company-contacts" className="scroll-mt-24 xl:col-span-5">
            <DataCard title="Relații comerciale" description="Persoanele și rolurile conectate explicit la companie și oportunități.">
              {snapshot.contacts.length > 0 ? <div className="divide-y divide-[rgb(var(--border))]">{snapshot.contacts.map((contact) => <article key={contact.id} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{contact.fullName}</h3>{contact.isPrimary ? <StatusPill tone="success">Principal</StatusPill> : null}</div><p className="mt-1 text-sm text-[rgb(var(--text-muted))]">{[contact.jobTitle, contact.decisionRole, ...contact.opportunityRoles].filter(Boolean).join(" · ") || "Rol neconfirmat"}</p><p className="mt-2 text-xs text-[rgb(var(--text-faint))]">{contact.opportunityCount > 0 ? `${contact.opportunityCount} oportunități conectate` : "Fără oportunitate conectată"}</p></article>)}</div> : <EmptyState title="Nicio persoană asociată" description="Adaugă persoana cu care discuți pentru a păstra continuitatea relației." actions={<Button href="/contacts" variant="secondary">Adaugă contact</Button>} />}
            </DataCard>
          </div>
          <div id="company-opportunities" className="scroll-mt-24 xl:col-span-7">
            <DataCard title="Oportunități asociate" description="Valoare estimată, responsabil și pas următor pentru fiecare context comercial.">
              {snapshot.opportunities.length > 0 ? <div className="divide-y divide-[rgb(var(--border))]">{snapshot.opportunities.map((opportunity) => <Link key={opportunity.id} href={opportunity.href} className="focus-ring group grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold group-hover:text-[rgb(var(--primary))]">{opportunity.title}</h3><StatusPill tone={opportunity.nextActionTitle && opportunity.ownerName ? "neutral" : "warning"}>{getStatusLabel(opportunity.status)}</StatusPill></div><p className="mt-1 text-sm text-[rgb(var(--text-muted))]">{opportunity.ownerName ?? "Fără responsabil"} · {opportunity.nextActionTitle ?? "Fără acțiune următoare"}{opportunity.nextActionDueAt ? ` · ${formatDate(opportunity.nextActionDueAt)}` : ""}</p></div><p className="font-semibold tabular-nums">{formatCurrency(opportunity.estimatedValue, opportunity.currency)}</p></Link>)}</div> : <EmptyState title="Nicio oportunitate asociată" description="Creează prima oportunitate pentru a urmări valoarea, responsabilul și următorul pas." />}
            </DataCard>
          </div>
        </div>

      </div>
    </PageShell>
  );
}
