import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { CompanyBusinessMemory } from "@/components/company/CompanyBusinessMemory";
import { CompanyContextualAsk } from "@/components/company/CompanyContextualAsk";
import { CompanyExecutionWorkspace } from "@/components/company/CompanyExecutionWorkspace";
import { DataCard } from "@/components/dashboard/DataCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageShell } from "@/components/dashboard/PageShell";
import { getStatusLabel } from "@/components/dashboard/StatusBadge";
import { CreateOpportunityPanel } from "@/components/opportunities/CreateOpportunityPanel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { RecordNotes } from "@/components/workspace/RecordNotes";
import { RecordSummaryBar } from "@/components/records/RecordSummaryBar";
import { RecordTabs } from "@/components/records/RecordTabs";
import { getCompanyIntelligenceSnapshot } from "@/lib/company-intelligence";
import { suggestedCompanyQuestions } from "@/lib/company-commercial-memory";
import { getExternalContextForCompany } from "@/lib/ai/google-context-tool";
import { safeCompanyWebsiteHref } from "@/lib/crm/website";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getWorkspaceNotes } from "@/lib/workspace-notes";

export const dynamic = "force-dynamic";

const relationshipLabels: Record<string, string> = { prospect: "Prospect", customer: "Client", partner: "Partener", inactive: "Inactiv" };
const companyTabs = [
  { id: "overview", label: "Context" },
  { id: "execution", label: "Execuție" },
  { id: "contacts", label: "Contacte" },
  { id: "opportunities", label: "Oportunități" },
  { id: "notes", label: "Note" },
  { id: "ask", label: "Întreabă ReveNew" }
] as const;
type CompanyTab = typeof companyTabs[number]["id"];

export default async function CrmOrganizationDetailPage(
  props: { params: Promise<{ id: string }>; searchParams?: Promise<{ tab?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const result = await getCompanyIntelligenceSnapshot(params.id);
  if (!result.ready) return <PageShell eyebrow="CRM" title="Datele companiei nu sunt disponibile" description={result.error ?? "Compania nu poate fi încărcată."}><DataCard title="Acces indisponibil" description={result.error ?? "Verifică configurarea workspace-ului și încearcă din nou."} /></PageShell>;
  if (!result.snapshot) notFound();

  const snapshot = result.snapshot;
  const { organization, identity } = snapshot;
  const websiteHref = safeCompanyWebsiteHref(organization.website);
  const askSuggestions = suggestedCompanyQuestions(snapshot);
  const [privateExternalContext, workspaceNotes] = await Promise.all([
    getExternalContextForCompany(organization.id),
    getWorkspaceNotes("company", organization.id)
  ]);
  const activeTab: CompanyTab = companyTabs.some((tab) => tab.id === searchParams?.tab) ? searchParams!.tab as CompanyTab : "overview";

  return (
    <PageShell wide eyebrow="Company 360" title={organization.name} description={[organization.industry, organization.city, organization.county].filter(Boolean).join(" · ") || "Context comercial centralizat pentru această companie."} actions={<CreateOpportunityPanel organizations={[organization]} />} breadcrumbs={[{ label: "Companii", href: "/companies" }, { label: organization.name }]}>
      <RecordSummaryBar label="Identitatea comercială a companiei" items={[
        { label: "Relație", value: relationshipLabels[organization.relationshipStatus ?? ""] ?? "Neclasificată" },
        { label: "Responsabil din oportunitate activă", value: identity.owner ?? "Neatribuit", tone: identity.owner ? "default" : "attention" },
        { label: "Contact principal", value: identity.primaryContact?.fullName ?? "Neconfirmat", tone: identity.primaryContact ? "default" : "attention" },
        { label: "Oportunități active", value: snapshot.commercial.activeOpportunities },
        { label: "Localizare", value: identity.location ?? "Necompletată" },
        { label: "Website", value: websiteHref ? <a href={websiteHref} target="_blank" rel="noopener noreferrer" className="focus-ring inline-flex max-w-full items-center gap-1 text-[rgb(var(--primary))] hover:underline">{organization.website}<ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /></a> : "Necompletat" }
      ]} />
      <RecordTabs tabs={companyTabs} activeTab={activeTab} label="Secțiunile companiei" />

      {activeTab === "overview" ? (
        <section aria-label="Contextul companiei" className="grid items-start gap-4 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-8"><CompanyBusinessMemory memory={snapshot.memory} executiveDecision={snapshot.executiveDecision} recoverableValueByCurrency={snapshot.commercial.recoverableValueByCurrency} /></div>
          <Card variant="subtle" padding="default" className="overflow-hidden xl:sticky xl:top-4 xl:col-span-4">
            <p className="text-micro font-semibold text-[rgb(var(--text-faint))]">CONTEXT ÎNREGISTRAT</p>
            <h2 className="mt-2 text-sm font-semibold">Relația comercială</h2>
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{organization.notes || "Nu există încă note persistente despre relația comercială."}</p>
            <p className="mt-4 border-t border-[rgb(var(--border))] pt-4 text-xs leading-5 text-[rgb(var(--text-muted))]">Bazat numai pe relații explicite și date autorizate. Nicio acțiune externă automată.</p>
          </Card>
        </section>
      ) : null}

      {activeTab === "execution" ? <CompanyExecutionWorkspace memory={snapshot.memory} opportunities={snapshot.opportunities} emails={privateExternalContext.emails} events={privateExternalContext.events} /> : null}

      {activeTab === "contacts" ? <section id="company-contacts" className="max-w-[1100px]"><DataCard title="Relații comerciale" description="Persoanele și rolurile conectate explicit la companie și oportunități.">{snapshot.contacts.length > 0 ? <div className="divide-y divide-[rgb(var(--border))]">{snapshot.contacts.map((contact) => <article key={contact.id} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-wrap items-center gap-2"><Link href={`/crm/contacts/${contact.id}`} className="focus-ring rounded-control font-semibold hover:text-[rgb(var(--primary))] hover:underline">{contact.fullName}</Link>{contact.isPrimary ? <StatusPill tone="success">Principal</StatusPill> : null}</div><p className="mt-1 text-sm text-[rgb(var(--text-muted))]">{[contact.jobTitle, contact.decisionRole, ...contact.opportunityRoles].filter(Boolean).join(" · ") || "Rol neconfirmat"}</p><p className="mt-2 text-xs text-[rgb(var(--text-faint))]">{contact.opportunityCount > 0 ? `${contact.opportunityCount} oportunități conectate explicit` : "Fără oportunitate conectată"}</p></article>)}</div> : <EmptyState title="Nicio persoană asociată" description="Adaugă persoana cu care discuți pentru a păstra continuitatea relației." actions={<Button href="/contacts" variant="secondary">Adaugă contact</Button>} />}</DataCard></section> : null}

      {activeTab === "opportunities" ? <section id="company-opportunities" className="max-w-[1100px]"><DataCard title="Oportunități asociate" description="Valoare estimată, responsabil și pas următor pentru fiecare context comercial.">{snapshot.opportunities.length > 0 ? <div className="divide-y divide-[rgb(var(--border))]">{snapshot.opportunities.map((opportunity) => <Link key={opportunity.id} href={opportunity.href} className="focus-ring group grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold group-hover:text-[rgb(var(--primary))]">{opportunity.title}</h3><StatusPill tone={opportunity.nextActionTitle && opportunity.ownerName ? "neutral" : "warning"}>{getStatusLabel(opportunity.status)}</StatusPill></div><p className="mt-1 text-sm text-[rgb(var(--text-muted))]">{opportunity.ownerName ?? "Fără responsabil"} · {opportunity.nextActionTitle ?? "Fără acțiune următoare"}{opportunity.nextActionDueAt ? ` · ${formatDate(opportunity.nextActionDueAt)}` : ""}</p></div><p className="font-semibold tabular-nums">{formatCurrency(opportunity.estimatedValue, opportunity.currency)}</p></Link>)}</div> : <EmptyState title="Nicio oportunitate asociată" description="Creează prima oportunitate pentru a urmări valoarea, responsabilul și următorul pas." />}</DataCard></section> : null}

      {activeTab === "notes" ? <RecordNotes targetType="company" targetId={organization.id} notes={workspaceNotes} /> : null}

      {activeTab === "ask" ? <CompanyContextualAsk organizationId={organization.id} companyName={organization.name} suggestions={askSuggestions} /> : null}
    </PageShell>
  );
}
