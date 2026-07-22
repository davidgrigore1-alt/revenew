import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { WorkspaceDecisionQueue as WorkspaceDecisionQueueModel, WorkspaceDecisionSeverity } from "@/lib/workspace-decision-queue";
import { formatCurrency, formatDate } from "@/lib/utils";

const severityCopy: Record<WorkspaceDecisionSeverity, { label: string; tone: BadgeTone }> = {
  critical: { label: "Critic", tone: "danger" },
  attention: { label: "Necesită atenție", tone: "warning" },
  informative: { label: "De urmărit", tone: "neutral" }
};

function emptyState(queue: WorkspaceDecisionQueueModel) {
  if (queue.sourceState === "empty_workspace") {
    return { title: "Control Center așteaptă primul context comercial", description: "Adaugă un semnal real. După analiza și aprobarea umană, deciziile comerciale vor deveni vizibile aici.", href: "/inbox?create=1", label: "Adaugă primul semnal" };
  }
  if (queue.sourceState === "signals_only") {
    return { title: "Nu există decizii critice acum", description: "Există semnale, dar încă nu există oportunități active care să necesite intervenție. Verifică Inbox-ul Comercial pentru următoarea decizie sigură.", href: "/inbox", label: "Revizuiește semnalele" };
  }
  return { title: "Nu există decizii critice acum", description: "Datele disponibile nu indică un blocaj urgent. Verifică periodic coada operațională; lipsa unei alerte nu înseamnă că toate datele sunt complete.", href: "/recoverable", label: "Verifică coada de recuperare" };
}

export function WorkspaceDecisionQueue({ queue }: { queue: WorkspaceDecisionQueueModel }) {
  const empty = emptyState(queue);
  return (
    <section aria-labelledby="workspace-decision-queue-title" className="min-w-0">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">Decizii comerciale prioritare</p>
          <h2 id="workspace-decision-queue-title" className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-[rgb(var(--foreground))]">De revizuit astăzi</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[rgb(var(--text-muted))]">Cele mai importante bucle care pot bloca progresul comercial, ordonate pe baza dovezilor existente.</p>
        </div>
        <Button href="/recoverable" variant="ghost" size="small">Deschide coada de recuperare <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>
      </div>

      <div className="overflow-hidden rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-card">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-3 text-xs text-[rgb(var(--text-muted))] sm:px-5">
          <span><strong className="text-[rgb(var(--foreground))]">{queue.items.length}</strong> priorități afișate</span>
          <span><strong className="text-[rgb(var(--danger-text))]">{queue.criticalCount}</strong> critice</span>
          <span><strong className="text-[rgb(var(--warning-text))]">{queue.attentionCount}</strong> necesită atenție</span>
          <span className="sm:ml-auto">Maximum 5 · fără agregarea monedelor</span>
        </div>

        {queue.items.length > 0 ? (
          <ol className="divide-y divide-[rgb(var(--border))]">
            {queue.items.map((item) => {
              const severity = severityCopy[item.severity];
              const context = [item.relatedCompanyName, item.relatedOpportunityTitle].filter(Boolean).join(" · ");
              return (
                <li key={item.id} className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={severity.tone} size="small">{severity.label}</Badge>
                      <span className="text-xs font-semibold text-[rgb(var(--text-muted))]">{item.statusLabel}</span>
                    </div>
                    <h3 className="mt-2 font-semibold text-[rgb(var(--foreground))]">{item.title}</h3>
                    {context ? <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{context}</p> : null}
                    <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{item.whyItMatters}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[rgb(var(--text-muted))]">
                      {item.estimatedValue !== undefined && item.currency ? <span><strong className="text-[rgb(var(--foreground))]">Valoare estimată:</strong> {formatCurrency(item.estimatedValue, item.currency)} · nu este venit confirmat</span> : null}
                      {item.dueAt ? <span><strong className="text-[rgb(var(--foreground))]">Termen:</strong> {formatDate(item.dueAt)}</span> : item.occurredAt ? <span><strong className="text-[rgb(var(--foreground))]">Dovadă datată:</strong> {formatDate(item.occurredAt)}</span> : null}
                      {item.ownerName ? <span><strong className="text-[rgb(var(--foreground))]">Responsabil:</strong> {item.ownerName}</span> : null}
                    </div>
                    <p className="mt-2 text-xs text-[rgb(var(--text-faint))]">Bazat pe: {item.evidence.map((source) => source.label).join(" · ")}</p>
                  </div>
                  <Button href={item.actionHref} variant={item.severity === "critical" ? "primary" : "secondary"} size="small" className="w-full lg:w-auto">{item.actionLabel}</Button>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="px-5 py-8 text-center sm:px-8">
            <h3 className="font-semibold text-[rgb(var(--foreground))]">{empty.title}</h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[rgb(var(--text-muted))]">{empty.description}</p>
            <Button href={empty.href} variant="secondary" size="small" className="mt-4">{empty.label}</Button>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs leading-5 text-[rgb(var(--text-muted))]">Aprobarea umană rămâne obligatorie. Un document pregătit nu este considerat trimis, iar valorile estimate rămân separate de venitul confirmat.</p>
    </section>
  );
}
