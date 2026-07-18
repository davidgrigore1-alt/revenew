import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageShell } from "@/components/dashboard/PageShell";
import { TodayActionCard } from "@/components/dashboard/TodayActionCard";
import { Button } from "@/components/ui/Button";
import { CompactEmptyState } from "@/components/ui/CompactEmptyState";
import { getRevenueWorkspaceSummary } from "@/lib/revenue-workspace";
import type { RecoveryAction } from "@/lib/recovery";

export const dynamic = "force-dynamic";

function groupActions(actions: RecoveryAction[]) {
  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekKey = nextWeek.toISOString().slice(0, 10);

  return {
    urgent: actions.filter((action) => action.priority === "high" || (action.dueAt && action.dueAt.slice(0, 10) < today)),
    today: actions.filter((action) => action.dueAt?.slice(0, 10) === today),
    next: actions.filter((action) => action.dueAt && action.dueAt.slice(0, 10) > today && action.dueAt.slice(0, 10) <= nextWeekKey),
    none: actions.filter((action) => !action.dueAt)
  };
}

export default async function TodayPage() {
  const summary = await getRevenueWorkspaceSummary();
  const pending = summary.workQueue.allPersonal.filter((action) => action.status === "pending");
  const groups = groupActions(pending);
  const hasAnyActions = summary.workQueue.allPersonal.length > 0 || summary.workQueue.completedToday.length > 0;

  if (!hasAnyActions) {
    return <PageShell eyebrow="Activitate" title="Activitatea mea" description="Acțiunile atribuite ție, ordonate după termen și prioritate."><div className="grid justify-items-start gap-4"><EmptyState title="Nu ai încă acțiuni atribuite" description="Acțiunile ajung aici după ce deschizi o oportunitate, alegi responsabilul și stabilești următorul pas cu termen sau fără termen." /><Button href="/opportunities">Deschide oportunitățile</Button></div></PageShell>;
  }

  return (
    <PageShell eyebrow="Activitate" title="Activitatea mea" description="Acțiunile atribuite ție, ordonate după termen și prioritate."><div className="grid gap-3">
      {[
        ["Urgente", groups.urgent, "urgente"],
        ["Astăzi", groups.today, "pentru astăzi"],
        ["Urmează", groups.next, "în următoarele zile"],
        ["Fără termen", groups.none, "fără termen"],
        ["Finalizate astăzi", summary.workQueue.completedToday, "finalizate astăzi"]
      ].map(([title, actions, emptyLabel]) => (
        <section key={String(title)} className={`rounded-card border p-4 ${((actions as RecoveryAction[]).length > 0) ? "border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-card" : "border-transparent bg-transparent py-2"}`}>
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-[rgb(var(--foreground))]">{String(title)}</h2>
            <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-[rgb(var(--surface-muted))] px-2 py-1 text-xs font-semibold tabular-nums text-[rgb(var(--text-muted))]">{(actions as RecoveryAction[]).length}</span>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {(actions as RecoveryAction[]).length > 0 ? (
              (actions as RecoveryAction[]).map((action) => <TodayActionCard key={`${title}-${action.id}`} action={action} compact />)
            ) : (
              <div className="lg:col-span-2"><CompactEmptyState>Nu există acțiuni {String(emptyLabel)}.</CompactEmptyState></div>
            )}
          </div>
        </section>
      ))}
    </div></PageShell>
  );
}
