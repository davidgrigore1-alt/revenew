import { CommercialInboxClient } from "@/components/inbox/CommercialInboxClient";
import { InboxIngestionActions } from "@/components/inbox/InboxIngestionActions";
import { PageShell } from "@/components/dashboard/PageShell";
import { Button } from "@/components/ui/Button";
import { getCommercialSignalsForCurrentBusiness } from "@/lib/commercial-inbox";
import type { CommercialSignalSource } from "@/lib/types";
import { getAssignableProfilesForCurrentBusiness, getCrmWorkspaceForCurrentBusiness } from "@/lib/revenue-workspace";
import { getOpportunitiesForCurrentBusiness } from "@/lib/supabase/data";

export default async function CommercialInboxPage({ searchParams }: { searchParams?: { source?: string; batch?: string; signal?: string; create?: string } }) {
  const [inbox, crm, assignableProfiles, opportunities] = await Promise.all([
    getCommercialSignalsForCurrentBusiness(),
    getCrmWorkspaceForCurrentBusiness(),
    getAssignableProfilesForCurrentBusiness(),
    getOpportunitiesForCurrentBusiness()
  ]);

  return (
    <PageShell
      eyebrow="Inbox Comercial"
      title="Inbox Comercial"
      description="Revizuiește semnalele înainte de a le transforma în oportunități. ReveNew recomandă, iar echipa decide."
      actions={<><Button href="/approvals" variant="secondary">Deschide Aprobări</Button><InboxIngestionActions showDetection={inbox.signals.length > 0} /></>}
    >
      <CommercialInboxClient
        initialSignals={inbox.signals}
        tableReady={inbox.tableReady && crm.ready}
        organizations={crm.organizations.map((organization) => ({ id: organization.id, name: organization.name }))}
        contacts={crm.contacts.map((contact) => ({ id: contact.id, fullName: contact.fullName, organizationId: contact.organizationId, email: contact.email }))}
        opportunities={opportunities.map((opportunity) => ({ id: opportunity.id, title: opportunity.title, organizationId: opportunity.organizationId, lifecycleStatus: opportunity.lifecycleStatus }))}
        assignableProfiles={assignableProfiles}
        initialSource={!searchParams?.batch && searchParams?.source === "csv_import" ? "csv_import" as CommercialSignalSource : "all"}
        initialBatchId={searchParams?.batch}
        initialSignalId={searchParams?.signal}
        initialCreateOpen={searchParams?.create === "1"}
      />
    </PageShell>
  );
}
