import { CommercialInboxClient } from "@/components/inbox/CommercialInboxClient";
import { PageShell } from "@/components/dashboard/PageShell";
import { Button } from "@/components/ui/Button";
import { getCommercialSignalsForCurrentBusiness } from "@/lib/commercial-inbox";
import { getAssignableProfilesForCurrentBusiness, getCrmWorkspaceForCurrentBusiness } from "@/lib/revenue-workspace";

export default async function CommercialInboxPage() {
  const [inbox, crm, assignableProfiles] = await Promise.all([
    getCommercialSignalsForCurrentBusiness(),
    getCrmWorkspaceForCurrentBusiness(),
    getAssignableProfilesForCurrentBusiness()
  ]);

  return (
    <PageShell
      eyebrow="Inbox Comercial"
      title="Inbox Comercial"
      description="Transformă semnalele comerciale incomplete în cazuri de recuperare revizuite, aprobate și măsurabile."
      actions={<Button href="/opportunities">Vezi oportunități</Button>}
    >
      <CommercialInboxClient
        initialSignals={inbox.signals}
        tableReady={inbox.tableReady && crm.ready}
        setupMessage={inbox.setupMessage ?? crm.error}
        organizations={crm.organizations.map((organization) => ({ id: organization.id, name: organization.name }))}
        contacts={crm.contacts.map((contact) => ({ id: contact.id, fullName: contact.fullName, organizationId: contact.organizationId, email: contact.email }))}
        assignableProfiles={assignableProfiles}
      />
    </PageShell>
  );
}
