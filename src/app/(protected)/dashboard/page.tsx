import Link from "next/link";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { HomeAskSurface } from "@/components/dashboard/HomeAskSurface";
import { getCurrentProfile } from "@/lib/auth/profile";
import { buildExecutiveMorningBrief } from "@/lib/executive-morning-brief";
import { getRevenueWorkspaceSummary } from "@/lib/revenue-workspace";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { formatDate } from "@/lib/utils";
import { buildWorkspaceDecisionQueue } from "@/lib/workspace-decision-queue";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    const [summary, currentProfile] = await Promise.all([
      getRevenueWorkspaceSummary(),
      getCurrentProfile()
    ]);

    const scopedOpportunities = summary.viewer.isManager
      ? summary.opportunities
      : summary.opportunities.filter((opportunity) => opportunity.ownerProfileId === summary.viewer.profileId);
    const scopedOpportunityIds = new Set(scopedOpportunities.map((opportunity) => opportunity.id));
    const scopedSignals = summary.viewer.isManager
      ? summary.signals
      : summary.signals.filter((signal) => Boolean(
        (signal.detectedFromOpportunityId && scopedOpportunityIds.has(signal.detectedFromOpportunityId))
        || (signal.convertedOpportunityId && scopedOpportunityIds.has(signal.convertedOpportunityId))
      ));
    const scopedActions = summary.viewer.isManager
      ? summary.actions
      : summary.actions.filter((action) => action.assignedToProfileId === summary.viewer.profileId || Boolean(action.opportunityId && scopedOpportunityIds.has(action.opportunityId)));
    const scopedEvents = summary.viewer.isManager
      ? summary.events
      : summary.events.filter((event) => Boolean(event.opportunityId && scopedOpportunityIds.has(event.opportunityId)));
    const decisionQueue = buildWorkspaceDecisionQueue(
      { opportunities: scopedOpportunities, signals: scopedSignals },
      { limit: 20 }
    );
    const morningBrief = buildExecutiveMorningBrief(decisionQueue, {
      viewerName: currentProfile.profile?.full_name,
      scope: summary.viewer.isManager ? "management" : "individual",
      actions: scopedActions,
      events: scopedEvents,
      signals: scopedSignals,
      assignedToday: {
        dueToday: summary.workQueue.dueToday.length,
        overdue: summary.workQueue.overdue.length
      }
    });
    const todayItems = [...summary.workQueue.overdue, ...summary.workQueue.dueToday].slice(0, 3);

    return (
      <div className="mx-auto w-full max-w-[1040px] px-4 pb-24 sm:px-6 lg:px-8 lg:pb-12">
        {!isSupabaseConfigured ? <div className="pt-4"><DemoNotice /></div> : null}
        <HomeAskSurface greeting={morningBrief.salutation} />

        <div className="mx-auto mt-10 grid w-full max-w-3xl gap-8 border-t border-[rgb(var(--border))] pt-6 md:grid-cols-2">
          <section aria-labelledby="home-today-title">
            <div className="flex items-center justify-between gap-4">
              <h2 id="home-today-title" className="text-sm font-semibold">Astăzi</h2>
              <Link href="/today" className="focus-ring rounded text-xs font-medium text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))]">Vezi toate</Link>
            </div>
            {todayItems.length > 0 ? (
              <ul className="mt-3 divide-y divide-[rgb(var(--border))] border-t border-[rgb(var(--border))]">
                {todayItems.map((action) => (
                  <li key={action.id}>
                    <Link href={action.opportunityId ? `/opportunities/${action.opportunityId}` : "/today"} className="focus-ring block rounded-control py-3 hover:bg-[rgb(var(--surface-subtle))]">
                      <p className="truncate text-sm font-medium">{action.title}</p>
                      <p className="mt-1 truncate text-xs text-[rgb(var(--text-muted))]">{action.company} · {formatDate(action.dueAt)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 border-t border-[rgb(var(--border))] py-4 text-sm text-[rgb(var(--text-muted))]">Nu ai acțiuni restante sau scadente astăzi.</p>}
          </section>

          <section aria-labelledby="home-recent-title">
            <div className="flex items-center justify-between gap-4">
              <h2 id="home-recent-title" className="text-sm font-semibold">Recent</h2>
              <Link href="/opportunities" className="focus-ring rounded text-xs font-medium text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))]">Oportunități</Link>
            </div>
            {morningBrief.recentChanges.length > 0 ? (
              <ul className="mt-3 divide-y divide-[rgb(var(--border))] border-t border-[rgb(var(--border))]">
                {morningBrief.recentChanges.slice(0, 3).map((change) => (
                  <li key={change.id} className="py-3 text-sm">
                    {change.href ? <Link href={change.href} className="focus-ring rounded font-medium hover:underline">{change.label}</Link> : <span className="font-medium">{change.label}</span>}
                    <p className="mt-1 line-clamp-1 text-xs text-[rgb(var(--text-muted))]">{change.context}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 border-t border-[rgb(var(--border))] py-4 text-sm text-[rgb(var(--text-muted))]">Nicio schimbare comercială semnificativă în ultimele 24 de ore.</p>}
          </section>
        </div>

      </div>
    );
  } catch (error) {
    console.error("Dashboard revenue workspace error", error);
    return <div className="mx-auto w-full max-w-[1040px] px-4 py-8 sm:px-6 lg:px-8"><ErrorState /></div>;
  }
}
