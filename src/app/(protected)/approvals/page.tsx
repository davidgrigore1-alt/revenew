import { ApprovalCenterClient } from "@/components/approvals/ApprovalCenterClient";
import { PageShell } from "@/components/dashboard/PageShell";
import { Button } from "@/components/ui/Button";
import { getCommercialSignalsForCurrentBusiness } from "@/lib/commercial-inbox";
import { getAssignableProfilesForCurrentBusiness, getCrmWorkspaceForCurrentBusiness } from "@/lib/revenue-workspace";
import { getOpportunitiesForCurrentBusiness } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage({ searchParams }: { searchParams?: { signal?: string } }) {
  const [inbox, crm, assignableProfiles, opportunities] = await Promise.all([
    getCommercialSignalsForCurrentBusiness(),
    getCrmWorkspaceForCurrentBusiness(),
    getAssignableProfilesForCurrentBusiness(),
    getOpportunitiesForCurrentBusiness()
  ]);

  return (
    <PageShell
      eyebrow="Control uman"
      title="Aprobări"
      description="Revizuiește schimbările propuse înainte ca ReveNew să le aplice în workspace. Sistemul propune, omul aprobă, fiecare decizie rămâne auditabilă."
      actions={<Button href="/inbox" variant="secondary">Deschide Inbox Comercial</Button>}
      breadcrumbs={[{ label: "Control Center", href: "/dashboard" }, { label: "Aprobări" }]}
    >
      <ApprovalCenterClient
        initialSignals={inbox.signals}
        initialSignalId={searchParams?.signal}
        organizations={crm.organizations.map((organization) => ({ id: organization.id, name: organization.name }))}
        contacts={crm.contacts.map((contact) => ({ id: contact.id, fullName: contact.fullName, organizationId: contact.organizationId, email: contact.email }))}
        opportunities={opportunities.map((opportunity) => ({ id: opportunity.id, title: opportunity.title, organizationId: opportunity.organizationId }))}
        assignableProfiles={assignableProfiles}
      />
    </PageShell>
  );
}
