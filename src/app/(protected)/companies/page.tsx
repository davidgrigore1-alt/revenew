import { PageShell } from "@/components/dashboard/PageShell";
import { CrmWorkspaceClient } from "@/components/crm/CrmWorkspaceClient";
import { getCrmOrganizationStats, getCrmWorkspaceForCurrentBusiness } from "@/lib/revenue-workspace";
import { ErrorState } from "@/components/dashboard/ErrorState";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const [crm, organizationStats] = await Promise.all([getCrmWorkspaceForCurrentBusiness(), getCrmOrganizationStats()]);
  return <PageShell eyebrow="Relații comerciale" title="Companii" description="Registrul unic pentru clienți, prospecți și organizațiile implicate în recuperarea comercială.">
    {crm.ready ? <CrmWorkspaceClient organizations={crm.organizations} contacts={crm.contacts} view="companies" organizationStats={organizationStats} /> : <ErrorState title="Companiile nu pot fi încărcate" description={crm.error ?? "Reîncearcă după verificarea conexiunii."} />}
  </PageShell>;
}
