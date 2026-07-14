import { DataCard } from "@/components/dashboard/DataCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageShell } from "@/components/dashboard/PageShell";
import { TodayActionCard } from "@/components/dashboard/TodayActionCard";
import { Button } from "@/components/ui/Button";
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

function CompactEmpty({ label }: { label: string }) {
  return <p className="rounded-lg bg-[rgb(var(--surface-elevated))] px-4 py-3 text-sm text-[rgb(var(--muted-foreground))]">Nu există acțiuni {label}.</p>;
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
    <PageShell eyebrow="Activitate" title="Activitatea mea" description="Acțiunile atribuite ție, ordonate după termen și prioritate."><div className="grid gap-5">
      {[
        ["Urgente", groups.urgent, "urgente"],
        ["Astăzi", groups.today, "pentru astăzi"],
        ["Urmează", groups.next, "în următoarele zile"],
        ["Fără termen", groups.none, "fără termen"],
        ["Finalizate astăzi", summary.workQueue.completedToday, "finalizate astăzi"]
      ].map(([title, actions, emptyLabel]) => (
        <DataCard key={String(title)} title={String(title)}>
          <div className="grid gap-3 lg:grid-cols-2">
            {(actions as RecoveryAction[]).length > 0 ? (
              (actions as RecoveryAction[]).map((action) => <TodayActionCard key={`${title}-${action.id}`} action={action} compact />)
            ) : (
              <CompactEmpty label={String(emptyLabel)} />
            )}
          </div>
        </DataCard>
      ))}
    </div></PageShell>
  );
}
