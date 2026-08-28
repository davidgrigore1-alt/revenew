import Link from "next/link";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageShell } from "@/components/dashboard/PageShell";
import { TodayActionCard } from "@/components/dashboard/TodayActionCard";
import { TodayExecutionSections } from "@/components/dashboard/TodayExecutionSections";
import { Button } from "@/components/ui/Button";
import { CompactEmptyState } from "@/components/ui/CompactEmptyState";
import { getRevenueWorkspaceSummary } from "@/lib/revenue-workspace";
import type { RecoveryAction } from "@/lib/recovery";
import { formatProductDateTime, formatUserFacingText } from "@/lib/ui/presentation";
import { buildWorkspaceDecisionQueue } from "@/lib/workspace-decision-queue";
import { getOwnedCommunicationIndex, getOwnedCommunicationNotifications } from "@/lib/ai/google-context-tool";

export const dynamic = "force-dynamic";

function groupActions(actions: RecoveryAction[]) {
  const today = new Date().toISOString().slice(0, 10);

  return {
    overdue: actions.filter((action) => action.dueAt && action.dueAt.slice(0, 10) < today),
    today: actions.filter((action) => action.dueAt?.slice(0, 10) === today),
    next: actions.filter((action) => action.dueAt && action.dueAt.slice(0, 10) > today),
    none: actions.filter((action) => !action.dueAt)
  };
}

export default async function TodayPage() {
  const [summary, communicationsByOpportunityId, communicationNotifications] = await Promise.all([getRevenueWorkspaceSummary(), getOwnedCommunicationIndex(), getOwnedCommunicationNotifications()]);
  const scopedOpportunities = summary.opportunities.filter((opportunity) => opportunity.ownerProfileId === summary.viewer.profileId);
  const scopedIds = new Set(scopedOpportunities.map((opportunity) => opportunity.id));
  const scopedSignals = summary.signals.filter((signal) => Boolean((signal.detectedFromOpportunityId && scopedIds.has(signal.detectedFromOpportunityId)) || (signal.convertedOpportunityId && scopedIds.has(signal.convertedOpportunityId))));
  const executionQueue = buildWorkspaceDecisionQueue({ opportunities: scopedOpportunities, signals: scopedSignals }, { limit: 20, communicationsByOpportunityId });
  const pending = summary.workQueue.allPersonal.filter((action) => action.status === "pending");
  const groups = groupActions(pending);
  const hasAnyActions = summary.workQueue.allPersonal.length > 0 || summary.workQueue.completedToday.length > 0 || executionQueue.items.length > 0 || communicationNotifications.length > 0;

  if (!hasAnyActions) {
    return <PageShell eyebrow="Activitate" title="Activitatea mea" description="Acțiunile atribuite ție, ordonate după termen și prioritate."><div className="grid justify-items-start gap-4"><EmptyState title="Nu ai încă acțiuni atribuite" description="Acțiunile ajung aici după ce deschizi o oportunitate, alegi responsabilul și stabilești următorul pas cu termen sau fără termen." /><Button href="/opportunities">Deschide oportunitățile</Button></div></PageShell>;
  }

  return (
    <PageShell eyebrow="Sistem de execuție" title="Activitatea mea" description="Ce necesită intervenție, ce este pregătit și unde așteptarea este acțiunea corectă."><div className="grid gap-6">
      <TodayExecutionSections queue={executionQueue} />
{communicationNotifications.length ? <section aria-labelledby="communication-notifications-title"><div className="flex items-end justify-between gap-3 border-b border-[rgb(var(--border))] pb-3"><div><p className="micro-label">Schimbări în comunicare</p><h2 id="communication-notifications-title" className="mt-1 text-sm font-semibold">Evenimente care cer o verificare</h2></div><span className="text-xs tabular-nums text-[rgb(var(--text-muted))]">{communicationNotifications.filter((item) => !item.read_at).length} noi</span></div><div className="divide-y divide-[rgb(var(--border))]">{communicationNotifications.slice(0, 5).map((item) => <Link key={item.id} href={item.href || "/inbox"} className="product-interactive-row focus-ring grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto]"><span><strong className="block text-sm">{formatUserFacingText(item.title)}</strong>{item.body ? <span className="mt-1 block text-xs text-[rgb(var(--text-muted))]">{formatUserFacingText(item.body)}</span> : null}</span><time dateTime={item.created_at} className="text-[0.6875rem] text-[rgb(var(--text-faint))]">{formatProductDateTime(item.created_at)}</time></Link>)}</div></section> : null}
      {[
        ["Restante", groups.overdue, "restante"],
        ["Astăzi", groups.today, "pentru astăzi"],
        ["Următoarele", groups.next, "în următoarele zile"],
        ["Fără termen", groups.none, "fără termen"],
        ["Finalizate astăzi", summary.workQueue.completedToday, "finalizate astăzi"]
      ].map(([title, actions, emptyLabel]) => (
        <section key={String(title)} aria-labelledby={`today-${String(title).toLocaleLowerCase("ro-RO").replace(/\s+/g, "-")}`}>
          <div className="flex items-center justify-between gap-4 border-b border-[rgb(var(--border))] pb-2">
            <h2 id={`today-${String(title).toLocaleLowerCase("ro-RO").replace(/\s+/g, "-")}`} className="text-sm font-semibold text-[rgb(var(--foreground))]">{String(title)}</h2>
            <span className="text-xs font-medium tabular-nums text-[rgb(var(--text-muted))]">{(actions as RecoveryAction[]).length}</span>
          </div>
          <div>
            {(actions as RecoveryAction[]).length > 0 ? (
              (actions as RecoveryAction[]).map((action) => <TodayActionCard key={`${title}-${action.id}`} action={action} compact />)
            ) : (
              <div className="py-3"><CompactEmptyState>Nu există acțiuni {String(emptyLabel)}.</CompactEmptyState></div>
            )}
          </div>
        </section>
      ))}
    </div></PageShell>
  );
}
