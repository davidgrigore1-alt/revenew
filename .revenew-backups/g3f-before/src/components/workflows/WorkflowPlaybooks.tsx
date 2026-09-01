import { createWorkflowFromPlaybook } from "@/lib/workflow-actions";
import { workflowPlaybooks } from "@/lib/workflow-playbooks";
import { presentWorkflowAction, presentWorkflowTrigger, workflowTriggerCapability } from "@/lib/workflow-presentation";

export function WorkflowPlaybooks() {
  return <section aria-labelledby="playbook-library-title" className="mt-6">
    <div className="border-b border-[rgb(var(--border))] pb-3">
      <h2 id="playbook-library-title" className="text-sm font-semibold">Playbook-uri recomandate</h2>
      <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Creează draft → revizuiește → testează → activează explicit.</p>
    </div>
    <div className="divide-y divide-[rgb(var(--border))]">{workflowPlaybooks.map((playbook) => {
      const capability = workflowTriggerCapability(playbook.trigger);
      return <article key={playbook.id} className="grid items-start gap-3 py-4 md:grid-cols-[minmax(0,1fr)_minmax(14rem,.8fr)_auto]">
        <div><h3 className="text-sm font-semibold">{playbook.name}</h3><p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{playbook.description}</p><p className="mt-1 text-xs text-[rgb(var(--text-secondary))]">{playbook.when}</p></div>
        <div className="text-xs leading-5"><p className="font-medium">{presentWorkflowTrigger(playbook.trigger)}</p><p className="text-[rgb(var(--text-muted))]">{playbook.actions.map((action) => presentWorkflowAction(action.type)).join(" · ")}</p><p className="mt-1 text-[rgb(var(--text-muted))]">{playbook.control}</p>{!capability.automatic ? <p>{capability.label}</p> : null}</div>
        <form action={createWorkflowFromPlaybook}><input type="hidden" name="playbookId" value={playbook.id}/><button className="focus-ring h-9 rounded-[8px] border border-[rgb(var(--border-strong))] px-3 text-xs font-semibold hover:bg-[rgb(var(--surface-hover))]">Creează draft</button></form>
      </article>;
    })}</div>
  </section>;
}
