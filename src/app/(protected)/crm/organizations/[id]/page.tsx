import { notFound } from "next/navigation";
import { CompanyBusinessMemory } from "@/components/company/CompanyBusinessMemory";
import { CompanyActiveWork, CompanyIdentity, CompanyOpportunityList, CompanyPeople, CompanyRecentContext } from "@/components/company/CompanyBriefing";
import { CompanyContextualAsk } from "@/components/company/CompanyContextualAsk";
import { CompanyExecutionWorkspace } from "@/components/company/CompanyExecutionWorkspace";
import { DataCard } from "@/components/dashboard/DataCard";
import { PageShell } from "@/components/dashboard/PageShell";
import { RecordNotes } from "@/components/workspace/RecordNotes";
import { RecordTabs } from "@/components/records/RecordTabs";
import { getCompanyIntelligenceSnapshot } from "@/lib/company-intelligence";
import { companyBriefing } from "@/lib/company-briefing";
import { suggestedCompanyQuestions } from "@/lib/company-commercial-memory";
import { getExternalContextForCompany } from "@/lib/ai/google-context-tool";
import { getWorkspaceNotes } from "@/lib/workspace-notes";
import styles from "@/components/company/CompanyBriefing.module.css";

export const dynamic = "force-dynamic";
const companyTabs = [
  { id: "overview", label: "Context" }, { id: "execution", label: "Execuție" },
  { id: "contacts", label: "Contacte" }, { id: "opportunities", label: "Oportunități" },
  { id: "notes", label: "Note" }, { id: "ask", label: "Întreabă ReveNew" }
] as const;
type CompanyTab = typeof companyTabs[number]["id"];

export default async function CrmOrganizationDetailPage(props: { params: Promise<{ id: string }>; searchParams?: Promise<{ tab?: string }> }) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  const activeTab: CompanyTab = companyTabs.some(tab => tab.id === searchParams?.tab) ? searchParams!.tab as CompanyTab : "overview";
  const result = await getCompanyIntelligenceSnapshot(params.id);
  if (!result.ready) return <PageShell eyebrow="CRM" title="Datele companiei nu sunt disponibile" description={result.error ?? "Compania nu poate fi încărcată."}><DataCard title="Acces indisponibil" description={result.error ?? "Încearcă din nou."} /></PageShell>;
  if (!result.snapshot) notFound();
  const snapshot = result.snapshot;
  const { organization } = snapshot;
  const model = companyBriefing(snapshot);
  // Tab-local reads keep Notes and owner-private connector context out of Context responses.
  const [privateExternalContext, workspaceNotes] = await Promise.all([
    activeTab === "execution" ? getExternalContextForCompany(organization.id) : null,
    activeTab === "notes" ? getWorkspaceNotes("company", organization.id) : []
  ]);
  return <div className={styles.page}>
    <CompanyIdentity snapshot={snapshot} />
    <div className={styles.stack}>
      {activeTab === "overview" ? <>
        <CompanyBusinessMemory memory={snapshot.memory} executiveDecision={snapshot.executiveDecision} recoverableValueByCurrency={snapshot.commercial.recoverableValueByCurrency} attention={model.issues} />
        <CompanyActiveWork snapshot={snapshot} />
      </> : null}
      <RecordTabs tabs={companyTabs} activeTab={activeTab} label="Secțiunile companiei" />
      {activeTab === "overview" ? <CompanyRecentContext snapshot={snapshot} /> : null}
      {activeTab === "execution" ? <CompanyExecutionWorkspace snapshot={snapshot} emails={privateExternalContext?.emails ?? []} events={privateExternalContext?.events ?? []} hasConnection={Boolean(privateExternalContext?.connection)} /> : null}
      {activeTab === "contacts" ? <CompanyPeople snapshot={snapshot} /> : null}
      {activeTab === "opportunities" ? <section aria-labelledby="company-opportunities-title"><header className={styles.sectionHeader}><div><h2 id="company-opportunities-title">Oportunități asociate</h2><p className={styles.muted}>Valori estimate în moneda originală. Înregistrările închise rămân în istoric.</p></div></header>{snapshot.opportunities.length ? <CompanyOpportunityList opportunities={snapshot.opportunities} /> : <p className={styles.quiet}>Nicio oportunitate asociată în datele încărcate.</p>}</section> : null}
      {activeTab === "notes" ? <RecordNotes targetType="company" targetId={organization.id} notes={workspaceNotes} /> : null}
      {activeTab === "ask" ? <CompanyContextualAsk organizationId={organization.id} companyName={organization.name} suggestions={suggestedCompanyQuestions(snapshot)} /> : null}
    </div>
  </div>;
}
