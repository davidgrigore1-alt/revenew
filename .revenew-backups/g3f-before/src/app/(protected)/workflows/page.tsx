import { PageShell } from "@/components/dashboard/PageShell";
import { WorkflowPlaybooks } from "@/components/workflows/WorkflowPlaybooks";
import { Button } from "@/components/ui/Button";
import { changeWorkflowStatus } from "@/lib/workflow-actions";
import { getCommercialWorkflowWorkspace } from "@/lib/workflow-runtime";
import { formatProductDateTime, presentWorkflowRunState, presentWorkflowState } from "@/lib/ui/presentation";
import { presentWorkflowTrigger, presentWorkflowAction, workflowTriggerCapability } from "@/lib/workflow-presentation";
import type { WorkflowTrigger } from "@/lib/workflow-foundation";
import { workflowRunTrace } from "@/lib/workflow-trace";

export const dynamic = "force-dynamic";

function statusClass(tone: string) {
  if (tone === "success") return "status-pill status-pill-success";
  if (tone === "warning") return "status-pill status-pill-warning";
  if (tone === "danger") return "status-pill status-pill-danger";
  if (tone === "brand") return "status-pill status-pill-brand";
  return "status-pill status-pill-neutral";
}

export default async function WorkflowsPage() {
  const workspace = await getCommercialWorkflowWorkspace();
  const lastRunByWorkflow = new Map<string, (typeof workspace.runs)[number]>();
  for (const run of workspace.runs) if (!lastRunByWorkflow.has(run.workflow_id)) lastRunByWorkflow.set(run.workflow_id, run);

  return <PageShell
    eyebrow="Execuție comercială"
    title="Workflow-uri"
    description="Transformă semnalele comerciale în verificări controlate, lucru pregătit și decizii explicabile."
    actions={<Button href="/workflows/new">Workflow nou</Button>}
  >
    <section aria-labelledby="workflow-list-title" className="overflow-hidden border-y border-[rgb(var(--border))]">
      <div className="flex items-center justify-between gap-4 bg-[rgb(var(--surface-subtle))] px-4 py-3">
        <div><h2 id="workflow-list-title" className="text-sm font-semibold">Workflow-uri comerciale</h2><p className="mt-0.5 text-xs text-[rgb(var(--text-muted))]">Drafturile rămân inactive până la o activare explicită.</p></div>
        <span className="text-xs tabular-nums text-[rgb(var(--text-muted))]">{workspace.workflows.length}</span>
      </div>
      {workspace.workflows.length ? <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[minmax(16rem,1.5fr)_9rem_minmax(13rem,1fr)_12rem_9rem_auto] gap-4 border-t border-[rgb(var(--border))] px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-subtle))]">
            <span>Nume / acțiuni</span><span>Stare</span><span>Declanșator / țintă</span><span>Ultima evaluare</span><span>Rezultat</span><span className="text-right">Acțiuni</span>
          </div>
          {workspace.workflows.map((workflow) => {
            const state = presentWorkflowState(workflow.status);
            const run = lastRunByWorkflow.get(workflow.id);
            const runState = run ? presentWorkflowRunState(run.status) : null;
            return <article key={workflow.id} className="group grid grid-cols-[minmax(16rem,1.5fr)_9rem_minmax(13rem,1fr)_12rem_9rem_auto] items-center gap-4 border-t border-[rgb(var(--border))] px-4 py-3 transition-colors duration-fast hover:bg-[rgb(var(--surface-hover))]">
              <div className="min-w-0"><a href={`/workflows/${workflow.id}`} className="focus-ring block truncate text-sm font-semibold hover:text-[rgb(var(--primary))]">{workflow.name}</a><p className="mt-1 truncate text-xs text-[rgb(var(--text-muted))]">{workflow.actions.map((action) => presentWorkflowAction(action.type)).join(" · ")}</p></div>
              <span className={statusClass(state.tone)}>{state.label}</span>
              <div className="text-xs text-[rgb(var(--text-secondary))]"><p>{presentWorkflowTrigger(workflow.trigger)}</p><p className="mt-1 text-[rgb(var(--text-muted))]">Oportunitate · {workflowTriggerCapability(workflow.trigger).label}</p></div>
              <span className="text-xs tabular-nums text-[rgb(var(--text-muted))]">{run ? formatProductDateTime(run.created_at, { year: false }) : "Fără evaluare recentă"}</span>
              <div className="text-xs"><span className={runState?.tone === "danger" ? "text-[rgb(var(--danger-text))]" : "text-[rgb(var(--text-secondary))]"}>{runState?.label ?? "—"}</span>{run?.status === "failed" ? <p className="mt-1 text-[rgb(var(--danger-text))]">{workflowRunTrace(run).failure || "Necesită verificare"}</p> : null}</div>
              <div className="flex items-center justify-end gap-1">
                <a href={`/workflows/${workflow.id}`} className="focus-ring inline-flex h-8 items-center rounded-[7px] border border-[rgb(var(--border))] px-3 text-xs font-semibold hover:border-[rgb(var(--border-strong))]">Deschide</a>
                {workflow.status === "active" ? <form action={changeWorkflowStatus}><input type="hidden" name="workflowId" value={workflow.id}/><input type="hidden" name="status" value="paused"/><button className="focus-ring h-8 rounded-[7px] px-2 text-xs font-semibold text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--foreground))]">Pauză</button></form> : workflow.status !== "archived" ? <a href={`/workflows/${workflow.id}#activation-review`} className="focus-ring inline-flex h-8 items-center rounded-[7px] px-2 text-xs font-semibold text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--foreground))]">Activează explicit</a> : null}
              </div>
            </article>;
          })}
        </div>
      </div> : <div className="px-4 py-10 text-center"><h3 className="text-sm font-semibold">Niciun workflow comercial</h3><p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-[rgb(var(--text-muted))]">Creează un draft pentru a defini când verifică ReveNew situația și ce lucru sigur poate pregăti.</p><Button href="/workflows/new" className="mt-4">Creează primul workflow</Button></div>}
    </section>

    <WorkflowPlaybooks />
    <section aria-labelledby="workflow-history-title" className="mt-8">
      <div className="flex items-end justify-between gap-4 border-b border-[rgb(var(--border))] pb-3"><div><h2 id="workflow-history-title" className="text-sm font-semibold">Istoric de evaluare</h2><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Fără mutații în test · ultimele evaluări reale și controlate.</p></div><span className="text-xs tabular-nums text-[rgb(var(--text-muted))]">{workspace.runs.length}</span></div>
      {workspace.runs.length ? <div className="divide-y divide-[rgb(var(--border))]">{workspace.runs.slice(0, 12).map((run) => { const state = presentWorkflowRunState(run.status); const workflow = workspace.workflows.find((item) => item.id === run.workflow_id); return <a key={run.id} href={`/workflows/${run.workflow_id}?view=runs&run=${run.id}`} className="focus-ring grid gap-2 py-3 transition-colors duration-fast hover:bg-[rgb(var(--surface-hover))] md:grid-cols-[minmax(0,1fr)_auto] md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-semibold">{workflow?.name || "Workflow"}</span><span className={statusClass(state.tone)}>{run.is_test_run ? "Test · " : ""}{state.label}</span></div><p className="mt-1 truncate text-xs text-[rgb(var(--text-muted))]">{run.guard_reason || presentWorkflowTrigger(run.trigger_type as WorkflowTrigger)}</p></div><time dateTime={run.created_at} className="text-xs tabular-nums text-[rgb(var(--text-muted))]">{formatProductDateTime(run.created_at)}</time></a>; })}</div> : <p className="py-5 text-sm text-[rgb(var(--text-muted))]">Nicio evaluare încă.</p>}
    </section>
  </PageShell>;
}
