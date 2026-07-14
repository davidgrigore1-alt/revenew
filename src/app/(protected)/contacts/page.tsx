import { PageShell } from "@/components/dashboard/PageShell";
import { CrmWorkspaceClient } from "@/components/crm/CrmWorkspaceClient";
import { getCrmOrganizationStats, getCrmWorkspaceForCurrentBusiness } from "@/lib/revenue-workspace";
import { ErrorState } from "@/components/dashboard/ErrorState";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const [crm, organizationStats] = await Promise.all([getCrmWorkspaceForCurrentBusiness(), getCrmOrganizationStats()]);
  return <PageShell eyebrow="Relații comerciale" title="Contacte" description="Persoanele, rolurile de decizie și datele de contact folosite în oportunități.">
    {crm.ready ? <CrmWorkspaceClient organizations={crm.organizations} contacts={crm.contacts} view="contacts" organizationStats={organizationStats} /> : <ErrorState title="Contactele nu pot fi încărcate" description={crm.error ?? "Reîncearcă după verificarea conexiunii."} />}
  </PageShell>;
}
