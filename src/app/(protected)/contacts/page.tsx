import { PageShell } from "@/components/dashboard/PageShell";
import { CrmWorkspaceClient } from "@/components/crm/CrmWorkspaceClient";
import { getContactRegistryForCurrentBusiness } from "@/lib/crm/contact-registry-data";
import { normalizeContactFilter, normalizeContactSort } from "@/lib/crm/contact-registry";
import { ContactsRegistryError } from "@/components/crm/ContactsRegistry";
import { getSavedViews } from "@/lib/saved-views/actions";

export const dynamic = "force-dynamic";

export default async function ContactsPage(props: { searchParams?: Promise<{ q?: string; relationship?: string; sort?: string; create?: string }> }) {
  const searchParams = await props.searchParams;
  const [crm, savedViews] = await Promise.all([getContactRegistryForCurrentBusiness(), getSavedViews("contacts")]);
  return <PageShell wide eyebrow="Relații comerciale" title="Contacte" description="Oamenii relațiilor comerciale: compania, rolul și legătura cu oportunitățile active.">
    {crm.ready ? <CrmWorkspaceClient organizations={crm.organizations} contacts={crm.contacts} view="contacts" contactRegistry={crm.registry} savedViews={savedViews} initialQuery={searchParams?.q} initialRelationship={normalizeContactFilter(searchParams?.relationship ?? "all")} initialSort={normalizeContactSort(searchParams?.sort ?? "updated")} initialCreate={searchParams?.create === "1"} /> : <ContactsRegistryError message={crm.error} />}
  </PageShell>;
}
