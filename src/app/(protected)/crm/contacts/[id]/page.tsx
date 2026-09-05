import { ContactDetail } from "@/components/crm/ContactDetail";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/dashboard/PageShell";
import { getCrmWorkspaceForCurrentBusiness } from "@/lib/revenue-workspace";
import { getOpportunitiesForCurrentBusiness } from "@/lib/supabase/data";
import { getWorkspaceNotes } from "@/lib/workspace-notes";
import { buildContactRegistry } from "@/lib/crm/contact-registry";

export const dynamic = "force-dynamic";


export default async function ContactDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const [crm, opportunities, notes] = await Promise.all([
    getCrmWorkspaceForCurrentBusiness(),
    getOpportunitiesForCurrentBusiness(),
    getWorkspaceNotes("contact", params.id)
  ]);
  if (!crm.ready) return <PageShell eyebrow="Contact" title="Contact indisponibil" description={crm.error ?? "Registrul nu poate fi încărcat momentan."} />;
  const contact = crm.contacts.find((item) => item.id === params.id);
  if (!contact) {
    if (!crm.contactsComplete) return <PageShell eyebrow="Contact" title="Contact indisponibil" description="Registrul încărcat este incomplet. Contactul nu poate fi confirmat din această selecție." />;
    notFound();
  }
  const relationship = buildContactRegistry({ businessId: contact.businessId, contacts: crm.contacts, organizations: crm.organizations, associations: [], coverage: { contacts: crm.contactsComplete === true, organizations: true, associations: false } }).rows.find((row) => row.contact.id === contact.id);
  const linkedOpportunities = opportunities.filter((opportunity) =>
    opportunity.contacts?.some((relationship) => relationship.contact.id === contact.id)
  );

  return <ContactDetail contact={contact} primary={relationship?.primary} opportunities={linkedOpportunities} notes={notes} />;
}
