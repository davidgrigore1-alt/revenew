import { PageShell } from "@/components/dashboard/PageShell";
import { CrmWorkspaceClient } from "@/components/crm/CrmWorkspaceClient";
import { getCompanyRegistryForCurrentBusiness } from "@/lib/crm/company-registry-data";
import { CompaniesRegistryError } from "@/components/crm/CompaniesRegistry";
import { getSavedViews } from "@/lib/saved-views/actions";

export const dynamic = "force-dynamic";

export default async function CompaniesPage(
  props: { searchParams?: Promise<{ q?: string; relationship?: string; sort?: string; create?: string }> }
) {
  const searchParams = await props.searchParams;
  const [crm, savedViews] = await Promise.all([getCompanyRegistryForCurrentBusiness(), getSavedViews("companies")]);
  return <PageShell wide eyebrow="Relații comerciale" title="Companii" description="Portofoliul comercial: relația curentă, oamenii implicați și oportunitățile care cer atenție.">
    <div className="grid gap-4">
    <div id="companies-register" className="scroll-mt-24" data-guide-anchor="companies-register">
      {crm.ready ? <CrmWorkspaceClient organizations={crm.organizations} contacts={crm.contacts} view="companies" companyRegistry={crm.registry} savedViews={savedViews} initialQuery={searchParams?.q} initialRelationship={searchParams?.relationship} initialSort={searchParams?.sort} initialCreate={searchParams?.create === "1"} /> : <CompaniesRegistryError message={crm.error} />}
    </div>
    </div>
  </PageShell>;
}
