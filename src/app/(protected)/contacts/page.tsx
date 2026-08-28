import { PageShell } from "@/components/dashboard/PageShell";
import { CrmWorkspaceClient } from "@/components/crm/CrmWorkspaceClient";
import { getCrmOrganizationStats, getCrmWorkspaceForCurrentBusiness } from "@/lib/revenue-workspace";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { getSavedViews } from "@/lib/saved-views/actions";

export const dynamic = "force-dynamic";

export default async function ContactsPage({ searchParams }: { searchParams?: { q?: string; sort?: string; create?: string } }) {
  const [crm, organizationStats, savedViews] = await Promise.all([getCrmWorkspaceForCurrentBusiness(), getCrmOrganizationStats(), getSavedViews("contacts")]);
  return <PageShell eyebrow="Relații comerciale" title="Contacte" description="Persoanele, rolurile de decizie și datele de contact folosite în oportunități.">
    {crm.ready ? <CrmWorkspaceClient organizations={crm.organizations} contacts={crm.contacts} view="contacts" organizationStats={organizationStats} savedViews={savedViews} initialQuery={searchParams?.q} initialSort={searchParams?.sort} initialCreate={searchParams?.create === "1"} /> : <ErrorState title="Contactele nu pot fi încărcate" description={crm.error ?? "Reîncearcă după verificarea conexiunii."} />}
  </PageShell>;
}
