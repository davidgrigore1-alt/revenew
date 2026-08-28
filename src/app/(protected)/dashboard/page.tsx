import Link from "next/link";
import { ControlCenterViews } from "@/components/dashboard/ControlCenterViews";
import { CommercialDecisionReview } from "@/components/dashboard/CommercialDecisionReview";
import { RevenueCommandBrief } from "@/components/dashboard/RevenueCommandBrief";
import { getRevenueCommand } from "@/lib/revenue-command-server";
import { getImpactLinks } from "@/lib/revenue-impact-server";
import { getDriveEvidence } from "@/lib/google-workspace/drive";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { HomeAskSurface } from "@/components/dashboard/HomeAskSurface";
import { WorkspaceDecisionQueue } from "@/components/dashboard/WorkspaceDecisionQueue";
import { getCurrentProfile } from "@/lib/auth/profile";
import { buildExecutiveMorningBrief } from "@/lib/executive-morning-brief";
import { getRevenueWorkspaceSummary } from "@/lib/revenue-workspace";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { formatDate } from "@/lib/utils";
import { buildWorkspaceDecisionQueue } from "@/lib/workspace-decision-queue";
import { getGoogleWorkspacePublicState } from "@/lib/google-workspace/repository";
import { getOwnedCommunicationIndex } from "@/lib/ai/google-context-tool";
import { CommercialInterventions } from "@/components/dashboard/CommercialInterventions";
import { getCommercialInterventionBrief } from "@/lib/commercial-interventions-server";
import { getReportingFxRate } from "@/lib/reporting-fx";
import { ExecutionControlCenter } from "@/components/dashboard/ExecutionControlCenter";
import { buildExecutionControlCenter } from "@/lib/execution-control-center";

export const dynamic = "force-dynamic";

export default async function DashboardPage({searchParams={}}:{searchParams?:{view?:string;range?:string}}) {
  try {
    if(searchParams.view==="executive"||searchParams.view==="review"){
      const model=await getRevenueCommand(searchParams.range);
      return <div className="mx-auto w-full max-w-[1600px] px-4 pb-12 sm:px-6 lg:px-8"><ControlCenterViews active={searchParams.view==="review"?"review":"executive"}/>{searchParams.view==="review"?<CommercialDecisionReview key={model.contextKey+":"+model.scope+":"+model.period.key} model={model}/>:<RevenueCommandBrief model={model}/>}</div>;
    }
    const [summary, currentProfile, googleState, communicationsByOpportunityId, fx] = await Promise.all([getRevenueWorkspaceSummary(), getCurrentProfile(), getGoogleWorkspacePublicState(), getOwnedCommunicationIndex(), getReportingFxRate()]);
    const scopedOpportunities = summary.viewer.isManager ? summary.opportunities : summary.opportunities.filter((opportunity) => opportunity.ownerProfileId === summary.viewer.profileId);
    const scopedOpportunityIds = new Set(scopedOpportunities.map((opportunity) => opportunity.id));
    const scopedSignals = summary.viewer.isManager ? summary.signals : summary.signals.filter((signal) => Boolean((signal.detectedFromOpportunityId && scopedOpportunityIds.has(signal.detectedFromOpportunityId)) || (signal.convertedOpportunityId && scopedOpportunityIds.has(signal.convertedOpportunityId))));
    const scopedActions = summary.viewer.isManager ? summary.actions : summary.actions.filter((action) => action.assignedToProfileId === summary.viewer.profileId || Boolean(action.opportunityId && scopedOpportunityIds.has(action.opportunityId)));
    const scopedEvents = summary.viewer.isManager ? summary.events : summary.events.filter((event) => Boolean(event.opportunityId && scopedOpportunityIds.has(event.opportunityId)));
    const decisionQueue = buildWorkspaceDecisionQueue(
      { opportunities: scopedOpportunities, signals: scopedSignals },
      { limit: 20, communicationsByOpportunityId }
    );
    const interventionBrief = await getCommercialInterventionBrief({ opportunities: scopedOpportunities, signals: scopedSignals });
    const documentEvidenceByOpportunityId = await getDriveEvidence(scopedOpportunities.map(item => item.id)).catch(() => ({}));
    const impactLinks=await getImpactLinks(scopedOpportunities.map(o=>o.id)).catch(()=>({}));
    const executionCenter = buildExecutionControlCenter({
      opportunities: scopedOpportunities, signals: scopedSignals, queue: decisionQueue,
      brief: interventionBrief, viewer: summary.viewer, communicationsByOpportunityId, documentEvidenceByOpportunityId
    });
    const visibleDecisionItems = decisionQueue.items.slice(0, 5);
    const morningBrief = buildExecutiveMorningBrief(decisionQueue, {
      viewerName: currentProfile.profile?.full_name,
      scope: summary.viewer.isManager ? "management" : "individual",
      actions: scopedActions,
      events: scopedEvents,
      signals: scopedSignals,
      assignedToday: { dueToday: summary.workQueue.dueToday.length, overdue: summary.workQueue.overdue.length }
    });
    const todayItems = [...summary.workQueue.overdue, ...summary.workQueue.dueToday].slice(0, 3);
    const gmailStatus = googleState.connection?.gmailStatus === "connected" ? "✓ Activ" : googleState.connection?.gmailStatus === "syncing" ? "↻ Sincronizare" : googleState.connection?.gmailStatus === "action_required" || googleState.connection?.gmailStatus === "error" ? "! Necesită atenție" : "○ Neconectat";
    const calendarStatus = googleState.connection?.calendarStatus === "connected" ? "✓ Activ" : googleState.connection?.calendarStatus === "syncing" ? "↻ Sincronizare" : googleState.connection?.calendarStatus === "action_required" || googleState.connection?.calendarStatus === "error" ? "! Necesită atenție" : "○ Neconectat";
    const driveStatus = googleState.connection?.driveStatus === "connected" ? "✓ Activ" : googleState.connection?.driveStatus === "action_required" ? "! Necesită atenție" : "○ Neconectat";
    const relevantDocuments = new Set(Object.values(documentEvidenceByOpportunityId).flat().map(item => item.sourceDocumentId ?? item.sourceId)).size;
    const implementationReady = [{ label: "Gmail", status: gmailStatus }, { label: "Calendar", status: calendarStatus }, { label: "Google Drive", status: driveStatus }];
    const lastGoogleSync = googleState.connection?.lastSuccessfulSyncAt
      ? new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" }).format(new Date(googleState.connection.lastSuccessfulSyncAt)) : null;
    const visibleDecisionQueue = {
      ...decisionQueue,
      items: visibleDecisionItems,
      criticalCount: visibleDecisionItems.filter((item) => item.severity === "critical").length,
      attentionCount: visibleDecisionItems.filter((item) => item.severity === "attention").length
    };

    return (
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-24 sm:px-6 lg:px-8 lg:pb-12">
        {!isSupabaseConfigured ? <div className="pt-4"><DemoNotice /></div> : null}
        <ControlCenterViews active="now"/>
        <ExecutionControlCenter model={executionCenter} impactLinks={impactLinks} fx={fx} asOf={new Date().toISOString()} />
        {interventionBrief ? <details className="mt-5 border-b border-[rgb(var(--border))] pb-4"><summary className="focus-ring cursor-pointer text-sm font-semibold">Pregătire și aprobare intervenții</summary><div className="pt-4"><CommercialInterventions brief={interventionBrief} /></div></details> : null}
        {interventionBrief ? <details className="group mt-6 border-y border-[rgb(var(--border))] py-4"><summary className="focus-ring flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 marker:hidden"><span><span className="block text-sm font-semibold">Continuă analiza cu ReveNew</span><span className="mt-1 block text-xs text-[rgb(var(--text-muted))]">Întreabă ce s-a schimbat, de ce contează sau pregătește următorul pas.</span></span><span className="rounded-control border border-[rgb(var(--primary-border))] px-3 py-2 text-xs font-semibold text-[rgb(var(--primary))] group-open:hidden">Întreabă ReveNew →</span><span className="hidden text-xs text-[rgb(var(--text-muted))] group-open:block">Închide analiza</span></summary><HomeAskSurface greeting={morningBrief.salutation} /></details> : <HomeAskSurface greeting={morningBrief.salutation} />}

        <div className="mt-8 grid gap-8">
          <details><summary className="focus-ring cursor-pointer text-sm font-semibold text-[rgb(var(--text-muted))]">Alte semnale și decizii comerciale</summary><div className="mt-4"><WorkspaceDecisionQueue queue={visibleDecisionQueue} /></div></details>
          <div className="border-y border-[rgb(var(--border))]">
            <section aria-labelledby="implementation-status-title" className="max-w-xl py-4">
              <h2 id="implementation-status-title" className="text-sm font-semibold">Context conectat</h2>
              <ul className="mt-4 divide-y divide-[rgb(var(--border))] border-y border-[rgb(var(--border))]">
                {implementationReady.map((integration) => <li key={integration.label} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="font-medium">{integration.label}</span><span className={integration.status.includes("Activ") ? "status-pill status-pill-success" : integration.status.includes("Necesită atenție") ? "status-pill status-pill-warning" : "status-pill status-pill-neutral"}>{integration.status}</span></li>)}
              </ul>
              {relevantDocuments > 0 ? <p className="mt-2 text-xs text-[rgb(var(--text-muted))]">{relevantDocuments} {relevantDocuments === 1 ? "document relevant" : "documente relevante"} în contextul evaluat</p> : null}
              {lastGoogleSync ? <p className="mt-3 text-xs text-[rgb(var(--text-muted))]">Ultima sincronizare · {lastGoogleSync}</p> : null}
              <Link href="/apps" className="focus-ring mt-4 inline-flex rounded text-sm font-semibold text-[rgb(var(--primary))] hover:underline">Gestionează aplicațiile →</Link>
            </section>
          </div>
        </div>

        <div className="mt-10 grid w-full gap-8 border-t border-[rgb(var(--border))] pt-6 md:grid-cols-2">
          <section aria-labelledby="home-today-title">
            <div className="flex items-center justify-between gap-4"><h2 id="home-today-title" className="text-sm font-semibold">Astăzi</h2><Link href="/today" className="focus-ring rounded text-xs font-medium text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))]">Vezi toate</Link></div>
            {todayItems.length > 0 ? <ul className="mt-3 divide-y divide-[rgb(var(--border))] border-t border-[rgb(var(--border))]">{todayItems.map((action) => <li key={action.id}><Link href={action.opportunityId ? `/opportunities/${action.opportunityId}` : "/today"} className="product-interactive-row focus-ring block px-2 py-3"><p className="truncate text-sm font-medium">{action.title}</p><p className="mt-1 truncate text-xs text-[rgb(var(--text-muted))]">{action.company} · {formatDate(action.dueAt)}</p></Link></li>)}</ul> : <p className="mt-3 border-t border-[rgb(var(--border))] py-4 text-sm text-[rgb(var(--text-muted))]">Nu ai acțiuni restante sau scadente astăzi.</p>}
          </section>
          <section aria-labelledby="home-recent-title">
            <div className="flex items-center justify-between gap-4"><h2 id="home-recent-title" className="text-sm font-semibold">Activitate recentă</h2><Link href="/opportunities" className="focus-ring rounded text-xs font-medium text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))]">Oportunități</Link></div>
            {morningBrief.recentChanges.length > 0 ? <ul className="mt-3 divide-y divide-[rgb(var(--border))] border-t border-[rgb(var(--border))]">{morningBrief.recentChanges.slice(0, 3).map((change) => <li key={change.id} className="py-3 text-sm">{change.href ? <Link href={change.href} className="focus-ring rounded font-medium hover:underline">{change.label}</Link> : <span className="font-medium">{change.label}</span>}<p className="mt-1 line-clamp-1 text-xs text-[rgb(var(--text-muted))]">{change.context}</p></li>)}</ul> : <p className="mt-3 border-t border-[rgb(var(--border))] py-4 text-sm text-[rgb(var(--text-muted))]">Nicio schimbare comercială semnificativă în ultimele 24 de ore.</p>}
          </section>
        </div>
      </div>
    );
  } catch (error) {
    if(searchParams.view==="review"||searchParams.view==="executive"){
      return <div className="mx-auto w-full max-w-[1600px] px-4 pb-12 sm:px-6 lg:px-8"><ControlCenterViews active={searchParams.view==="review"?"review":"executive"}/><div className="py-6"><ErrorState title={searchParams.view==="review"?"Revizuirea nu a putut fi încărcată.":"Brieful nu a putut fi încărcat."} description="Verifică accesul și reîncarcă datele înainte de decizie." actionHref={"/dashboard?view="+searchParams.view}/></div></div>;
    }
    console.error("Dashboard revenue workspace error", error);
    return <div className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-6 lg:px-8"><ErrorState /></div>;
  }
}
