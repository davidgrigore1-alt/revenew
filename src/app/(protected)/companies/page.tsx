import { PageShell } from "@/components/dashboard/PageShell";
import { CrmWorkspaceClient } from "@/components/crm/CrmWorkspaceClient";
import { getCrmOrganizationStats, getCrmWorkspaceForCurrentBusiness } from "@/lib/revenue-workspace";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { getSavedViews } from "@/lib/saved-views/actions";

export const dynamic = "force-dynamic";

export default async function CompaniesPage({ searchParams }: { searchParams?: { q?: string; relationship?: string; sort?: string; create?: string } }) {
  const [crm, organizationStats, savedViews] = await Promise.all([getCrmWorkspaceForCurrentBusiness(), getCrmOrganizationStats(), getSavedViews("companies")]);
  return <PageShell eyebrow="Relații comerciale" title="Companii" description="Registrul unic pentru clienți, prospecți și organizațiile implicate în recuperarea comercială.">
    <div className="grid gap-4">
    <div id="companies-register" className="scroll-mt-24" data-guide-anchor="companies-register">
      {crm.ready ? <CrmWorkspaceClient organizations={crm.organizations} contacts={crm.contacts} view="companies" organizationStats={organizationStats} savedViews={savedViews} initialQuery={searchParams?.q} initialRelationship={searchParams?.relationship} initialSort={searchParams?.sort} initialCreate={searchParams?.create === "1"} /> : <ErrorState title="Companiile nu pot fi încărcate" description={crm.error ?? "Reîncearcă după verificarea conexiunii."} />}
    </div>
    </div>
  </PageShell>;
}
