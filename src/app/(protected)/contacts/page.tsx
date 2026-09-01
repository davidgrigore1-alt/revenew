import { PageShell } from "@/components/dashboard/PageShell";
import { CrmWorkspaceClient } from "@/components/crm/CrmWorkspaceClient";
import { getCrmOrganizationStats, getCrmWorkspaceForCurrentBusiness } from "@/lib/revenue-workspace";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { getSavedViews } from "@/lib/saved-views/actions";
import { getOpportunitiesForCurrentBusiness } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

export default async function ContactsPage(
  props: { searchParams?: Promise<{ q?: string; sort?: string; create?: string }> }
) {
  const searchParams = await props.searchParams;
  const [crm, organizationStats, savedViews, opportunities] = await Promise.all([getCrmWorkspaceForCurrentBusiness(), getCrmOrganizationStats(), getSavedViews("contacts"), getOpportunitiesForCurrentBusiness()]);
  const contactOpportunityStats = crm.ready ? Object.fromEntries(crm.contacts.map((contact) => {
    const linked = opportunities.filter((opportunity) => opportunity.contacts?.some((association) => association.contact.id === contact.id));
    const current = linked.find((opportunity) => !["won", "lost", "disqualified", "archived"].includes(opportunity.lifecycleStatus ?? "open")) ?? linked[0];
    const nextAction = current?.actions.filter((action) => action.status === "pending").sort((left, right) => String(left.dueDate ?? "9999").localeCompare(String(right.dueDate ?? "9999")))[0];
    return [contact.id, { linkedOpportunities: linked.length, opportunityId: current?.id, opportunityTitle: current?.title, nextActionTitle: nextAction?.title ?? current?.recommendedAction }];
  })) : {};
  return <PageShell wide eyebrow="Relații comerciale" title="Contacte" description="Relațiile comerciale explicite: cine contează, în ce companie și în ce oportunități este implicat.">
    {crm.ready ? <CrmWorkspaceClient organizations={crm.organizations} contacts={crm.contacts} view="contacts" organizationStats={organizationStats} contactOpportunityStats={contactOpportunityStats} savedViews={savedViews} initialQuery={searchParams?.q} initialSort={searchParams?.sort} initialCreate={searchParams?.create === "1"} /> : <ErrorState title="Contactele nu pot fi încărcate" description={crm.error ?? "Reîncearcă după verificarea conexiunii."} />}
  </PageShell>;
}
