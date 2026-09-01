import { CommercialInboxClient } from "@/components/inbox/CommercialInboxClient";
import { InboxIngestionActions } from "@/components/inbox/InboxIngestionActions";
import { ConnectedEmailInbox } from "@/components/inbox/ConnectedEmailInbox";
import { PageShell } from "@/components/dashboard/PageShell";
import { Button } from "@/components/ui/Button";
import { getCommercialSignalsForCurrentBusiness } from "@/lib/commercial-inbox";
import type { CommercialSignalSource } from "@/lib/types";
import { getAssignableProfilesForCurrentBusiness, getCrmWorkspaceForCurrentBusiness } from "@/lib/revenue-workspace";
import { getOwnedExternalContext, requireGoogleConnectorActor } from "@/lib/google-workspace/repository";
import { getOpportunitiesForCurrentBusiness } from "@/lib/supabase/data";
import { getResponseWindowBusinessDays, listOwnedCommunicationDrafts } from "@/lib/communication-os";

async function getPrivateConnectedEmails() {
  try {
    const actor = await requireGoogleConnectorActor();
    const [context, drafts, responseWindowBusinessDays] = await Promise.all([getOwnedExternalContext({ actor, limit: 20 }), listOwnedCommunicationDrafts(actor), getResponseWindowBusinessDays(actor)]);
    const draftBySource = new Map(drafts.filter((draft) => draft.source_message_id).map((draft) => [draft.source_message_id, draft.status]));
    return { responseWindowBusinessDays, emails: context.emails.map((email) => ({
      id: email.id, sentAt: email.sent_at, senderName: email.sender_name, senderEmail: email.sender_email,
      subject: email.subject, excerpt: email.excerpt, direction: email.direction,
      linkedContactId: email.linked_contact_id, linkedOrganizationId: email.linked_organization_id, linkedOpportunityId: email.linked_opportunity_id,
      draftStatus: draftBySource.get(email.id) ?? null
    })) };
  } catch {
    return { emails: [], responseWindowBusinessDays: 3 };
  }
}

export default async function CommercialInboxPage(
  props: { searchParams?: Promise<{ source?: string; batch?: string; signal?: string; create?: string; email?: string }> }
) {
  const searchParams = await props.searchParams;
  const [inbox, crm, assignableProfiles, opportunities, privateContext] = await Promise.all([
    getCommercialSignalsForCurrentBusiness(),
    getCrmWorkspaceForCurrentBusiness(),
    getAssignableProfilesForCurrentBusiness(),
    getOpportunitiesForCurrentBusiness(),
    getPrivateConnectedEmails()
  ]);

  return (
    <PageShell
      eyebrow="Semnale și conversații"
      title="Inbox Comercial"
      description="Prioritizează ce s-a schimbat, verifică sursa și aplică numai următorul pas comercial aprobat"
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
      <ConnectedEmailInbox emails={privateContext.emails} responseWindowBusinessDays={privateContext.responseWindowBusinessDays} initialEmailId={searchParams?.email} />
    </PageShell>
  );
}
