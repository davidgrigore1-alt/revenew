import { PageShell } from "@/components/dashboard/PageShell";
import { CrmWorkspaceClient } from "@/components/crm/CrmWorkspaceClient";
import { getCrmOrganizationStats, getCrmWorkspaceForCurrentBusiness } from "@/lib/revenue-workspace";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { getSavedViews } from "@/lib/saved-views/actions";

export const dynamic = "force-dynamic";

export default async function CompaniesPage(
  props: { searchParams?: Promise<{ q?: string; relationship?: string; sort?: string; create?: string }> }
) {
  const searchParams = await props.searchParams;
  const [crm, organizationStats, savedViews] = await Promise.all([getCrmWorkspaceForCurrentBusiness(), getCrmOrganizationStats(), getSavedViews("companies")]);
  return <PageShell wide eyebrow="Relații comerciale" title="Companii" description="Portofoliul comercial: relația curentă, oamenii implicați și oportunitățile care cer atenție.">
    <div className="grid gap-4">
    <div id="companies-register" className="scroll-mt-24" data-guide-anchor="companies-register">
      {crm.ready ? <CrmWorkspaceClient organizations={crm.organizations} contacts={crm.contacts} view="companies" organizationStats={organizationStats} savedViews={savedViews} initialQuery={searchParams?.q} initialRelationship={searchParams?.relationship} initialSort={searchParams?.sort} initialCreate={searchParams?.create === "1"} /> : <ErrorState title="Companiile nu pot fi încărcate" description={crm.error ?? "Reîncearcă după verificarea conexiunii."} />}
    </div>
    </div>
  </PageShell>;
}
