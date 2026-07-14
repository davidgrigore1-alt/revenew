import { CommercialInboxClient } from "@/components/inbox/CommercialInboxClient";
import { InboxIngestionActions } from "@/components/inbox/InboxIngestionActions";
import { PageShell } from "@/components/dashboard/PageShell";
import { getCommercialSignalsForCurrentBusiness } from "@/lib/commercial-inbox";
import type { CommercialSignalSource } from "@/lib/types";
import { getAssignableProfilesForCurrentBusiness, getCrmWorkspaceForCurrentBusiness } from "@/lib/revenue-workspace";

export default async function CommercialInboxPage({ searchParams }: { searchParams?: { source?: string; batch?: string } }) {
  const [inbox, crm, assignableProfiles] = await Promise.all([
    getCommercialSignalsForCurrentBusiness(),
    getCrmWorkspaceForCurrentBusiness(),
    getAssignableProfilesForCurrentBusiness()
  ]);

  return (
    <PageShell
      eyebrow="Inbox Comercial"
      title="Inbox Comercial"
      description="Revizuiește semnalele înainte de a le transforma în oportunități. ReveNew recomandă, iar echipa decide."
      actions={inbox.signals.length > 0 ? <InboxIngestionActions /> : undefined}
    >
      <CommercialInboxClient
        initialSignals={inbox.signals}
        tableReady={inbox.tableReady && crm.ready}
        organizations={crm.organizations.map((organization) => ({ id: organization.id, name: organization.name }))}
        contacts={crm.contacts.map((contact) => ({ id: contact.id, fullName: contact.fullName, organizationId: contact.organizationId, email: contact.email }))}
        assignableProfiles={assignableProfiles}
        initialSource={searchParams?.source === "csv_import" ? "csv_import" as CommercialSignalSource : "all"}
        initialBatchId={searchParams?.batch}
      />
    </PageShell>
  );
}
