import { notFound } from "next/navigation";
import { PageShell } from "@/components/dashboard/PageShell";
import { WorkflowBuilder } from "@/components/workflows/WorkflowBuilder";
import { PreparedActionCard } from "@/components/intelligence/CopilotConversation";
import { workflowRunTrace, workflowPlanPreview } from "@/lib/workflow-trace";
import { workflowStageLabels } from "@/lib/workflow-trigger-registry";
import { getCommercialWorkflowEditor } from "@/lib/workflow-runtime";
import {
  formatProductDateTime,
  formatUserFacingText,
  presentExecutionState,
  presentWorkflowRunState,
  presentWorkflowState,
} from "@/lib/ui/presentation";
import {
  presentGuardDecision,
  presentWorkflowConditionField,
  presentWorkflowOperator,
  presentWorkflowTrigger,
  workflowTriggerCapability,
} from "@/lib/workflow-presentation";
import type { CommercialExecutionState } from "@/lib/commercial-execution";
import type { WorkflowCondition, WorkflowTrigger } from "@/lib/workflow-foundation";

export const dynamic = "force-dynamic";

type View = "editor" | "runs" | "settings";
type ConditionResult = WorkflowCondition & { matched?: boolean; observedValue?: string | number | null };

function statusClass(tone: string) {
  if (tone === "success") return "status-pill status-pill-success";
  if (tone === "warning") return "status-pill status-pill-warning";
  if (tone === "danger") return "status-pill status-pill-danger";
  if (tone === "brand") return "status-pill status-pill-brand";
  return "status-pill status-pill-neutral";
}

function conditionResults(value: unknown): ConditionResult[] {
  return Array.isArray(value)
    ? value.filter((item): item is ConditionResult => Boolean(item) && typeof item === "object" && "field" in item && "operator" in item)
    : [];
}

function conditionValue(condition: ConditionResult, value: unknown) {
  if (value == null || value === "") return "Necunoscut";
  if (condition.field === "stage") return workflowStageLabels[String(value)] ?? "Etapă neconfirmată";
  if (condition.field === "execution_state") return presentExecutionState(String(value) as CommercialExecutionState).label;
  return String(value);
}

function idCount(value: unknown) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string").length : 0;
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <a href={href} aria-current={active ? "page" : undefined} className="focus-ring relative inline-flex h-10 items-center px-1 text-xs font-semibold text-[rgb(var(--text-muted))] transition-colors duration-fast hover:text-[rgb(var(--foreground))] aria-[current=page]:text-[rgb(var(--foreground))]">
    {children}
    {active ? <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-[rgb(var(--primary))]" /> : null}
  </a>;
}

export default async function WorkflowEditorPage({ params, searchParams }: {
  params: Promise<{ workflowId: string }>;
  searchParams?: Promise<{ view?: View; run?: string; saved?: string; tested?: string; created?: string; activation?: string }>;
}) {
  const { workflowId } = await params;
  const query = await searchParams;
  let workspace;
  try {
    workspace = await getCommercialWorkflowEditor(workflowId, query?.run);
  } catch (error) {
    if (error instanceof Error && ["workflow_invalid", "workflow_not_found"].includes(error.message)) notFound();
    throw error;
  }

  const { workflow, runs, opportunities, preflight, plans } = workspace;
  const view: View = query?.view === "runs" || query?.view === "settings" ? query.view : "editor";
  const selectedRun = query?.run ? runs.find((item) => item.id === query.run) : null;
  const trace = selectedRun ? workflowRunTrace(selectedRun) : null;
  const workflowState = presentWorkflowState(workflow.status);
  const triggerCapability = workflowTriggerCapability(workflow.trigger);
  const baseHref = "/workflows/" + workflow.id;

  return <PageShell
    wide
    eyebrow="Workflow Studio"
    title={workflow.name}
    description="Definește, testează și urmărește o automatizare comercială controlată."
    breadcrumbs={[{ label: "Workflow-uri", href: "/workflows" }, { label: workflow.name }]}
    actions={<span className={statusClass(workflowState.tone)}>{workflowState.label}</span>}
  >
    <nav aria-label="Secțiuni workflow" className="-mt-3 flex items-center gap-5 border-b border-[rgb(var(--border))]">
      <Tab href={baseHref} active={view === "editor"}>Editor</Tab>
      <Tab href={baseHref + "?view=runs"} active={view === "runs"}>Rulări <span className="ml-1 tabular-nums text-[rgb(var(--text-subtle))]">{runs.length}</span></Tab>
      <Tab href={baseHref + "?view=settings"} active={view === "settings"}>Setări</Tab>
    </nav>

    {query?.saved ? <p role="status" className="mt-3 border-l-2 border-[rgb(var(--success-solid))] bg-[rgb(var(--success-soft))] px-3 py-2 text-xs text-[rgb(var(--success-text))]">Workflow-ul a fost salvat.</p> : null}
    {query?.tested ? <p role="status" className="mt-3 border-l-2 border-[rgb(var(--primary))] bg-[rgb(var(--primary-soft))] px-3 py-2 text-xs text-[rgb(var(--text-secondary))]">Test finalizat fără mutații. Rezultatul este disponibil în Rulări.</p> : null}
    {query?.created === "ai" ? <p role="status" className="mt-3 border-l-2 border-[rgb(var(--primary))] bg-[rgb(var(--primary-soft))] px-3 py-2 text-xs text-[rgb(var(--text-secondary))]">Draft asistat creat. Revizuiește fiecare bloc înainte de activare.</p> : null}

    {query?.created === "playbook" ? <p role="status" className="mt-3 text-sm text-[rgb(var(--text-secondary))]">Draft creat din playbook. Revizuiește, testează și activează separat.</p> : null}
    {query?.activation === "blocked" ? <p role="alert" className="mt-3 text-sm text-[rgb(var(--danger-text))]">Activarea nu a fost efectuată. Verifică preflight-ul, permisiunile și eventualele modificări concurente.</p> : null}
    {view === "editor" ? <div className="mt-4 overflow-hidden border-y border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
      <WorkflowBuilder workflow={workflow} opportunities={opportunities} preflight={preflight} />
    </div> : null}

    {view === "runs" ? <section aria-labelledby="workflow-runs-title" className="mt-5">
      <div className="flex items-end justify-between gap-4 border-b border-[rgb(var(--border))] pb-3">
        <div><p className="micro-label">Trasabilitate</p><h2 id="workflow-runs-title" className="mt-1 text-base font-semibold">Istoric de rulare</h2><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Evaluări reale și teste înregistrate, fără payload-uri tehnice în interfață.</p></div>
        <span className="text-xs tabular-nums text-[rgb(var(--text-muted))]">{runs.length}</span>
      </div>
      <div className={selectedRun ? "grid xl:grid-cols-[minmax(0,0.9fr)_minmax(28rem,1.1fr)]" : ""}>
        {runs.length ? <div className="divide-y divide-[rgb(var(--border))] xl:border-r xl:border-[rgb(var(--border))]">{runs.map((run) => {
          const runState = presentWorkflowRunState(run.status);
          const guard = presentGuardDecision(run.guard_decision);
          const target = opportunities.find((item) => item.id === run.target_id);
          const href = baseHref + "?view=runs&run=" + run.id;
          return <a key={run.id} href={href} aria-current={selectedRun?.id === run.id ? "true" : undefined} className="focus-ring grid gap-2 px-4 py-3 transition-colors duration-fast hover:bg-[rgb(var(--surface-hover))] aria-[current=true]:bg-[rgb(var(--surface-elevated))] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={statusClass(runState.tone)}>{run.is_test_run ? "Test · " : ""}{runState.label}</span><span className="truncate text-xs font-semibold">{target?.title || "Oportunitate indisponibilă"}</span></div><p className="mt-1 truncate text-xs text-[rgb(var(--text-muted))]">{guard.label} · {formatUserFacingText(String(run.guard_reason || "Evaluare înregistrată.").replace("TEST RUN · ", ""))}</p></div>
            <time dateTime={run.created_at} className="text-xs tabular-nums text-[rgb(var(--text-muted))]">{formatProductDateTime(run.created_at)}</time>
          </a>;
        })}</div> : <div className="grid place-items-center px-5 py-12 text-center"><div><p className="text-sm font-semibold">Nicio rulare încă</p><p className="mt-2 max-w-sm text-xs leading-5 text-[rgb(var(--text-muted))]">Rulează un test din Editor pentru a verifica logica fără mutații. Rulările automate vor apărea numai pentru trigger-ele conectate real.</p><a href={baseHref} className="focus-ring mt-4 inline-flex h-9 items-center rounded-[8px] border border-[rgb(var(--border))] px-3 text-xs font-semibold hover:bg-[rgb(var(--surface-elevated))]">Deschide Editor</a></div></div>}

        {selectedRun && trace ? <aside aria-labelledby="run-detail-title" className="bg-[rgb(var(--surface-subtle))] px-5 py-5 xl:max-h-[min(46rem,calc(100dvh-13rem))] xl:overflow-y-auto">
          <div className="flex items-start justify-between gap-3 border-b border-[rgb(var(--border))] pb-4"><div><p className="micro-label">{selectedRun.is_test_run ? "Test fără mutații" : "Rulare workflow"}</p><h3 id="run-detail-title" className="mt-1 text-base font-semibold">Detaliul deciziei</h3></div><a href={baseHref + "?view=runs"} aria-label="Închide detaliul rulării" className="focus-ring text-xs font-semibold text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))]">Închide</a></div>
          <ol className="mt-1 divide-y divide-[rgb(var(--border))]">
            <li className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 py-4"><span className="micro-label">01 · Trigger</span><div><p className="text-sm font-semibold">{presentWorkflowTrigger(selectedRun.trigger_type as WorkflowTrigger)}</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{opportunities.find((item) => item.id === selectedRun.target_id)?.title || "Țintă indisponibilă"}</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{trace.origin}</p>{trace.source ? <><p className="mt-1 text-xs">{formatProductDateTime(trace.source.occurredAt)}</p><p className="mt-1 break-all font-mono text-xs text-[rgb(var(--text-muted))]">Eveniment {trace.source.id}</p>{trace.source.previousStage ? <p className="mt-1 text-xs">{workflowStageLabels[trace.source.previousStage]} → {workflowStageLabels[trace.source.nextStage ?? ""]}</p> : null}</> : <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Sursa istorică nu a fost înregistrată.</p>}</div></li>
            <li className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 py-4"><span className="micro-label">02 · Condiții</span><div>{conditionResults(selectedRun.condition_results).length ? <ul className="grid gap-2">{conditionResults(selectedRun.condition_results).map((condition, index) => <li key={index} className="flex items-start justify-between gap-3 text-xs"><span className="text-[rgb(var(--text-muted))]">{presentWorkflowConditionField(condition.field)} {presentWorkflowOperator(condition.operator)}{condition.value != null ? " " + conditionValue(condition, condition.value) : ""}<span className="mt-1 block">Observat: {conditionValue(condition, condition.observedValue)}</span></span><span className={condition.matched ? "font-semibold text-[rgb(var(--success-text))]" : "font-semibold text-[rgb(var(--warning-text))]"}>{condition.matched ? "Confirmată" : "Neîndeplinită"}</span></li>)}</ul> : <p className="text-xs text-[rgb(var(--text-muted))]">Fără condiții suplimentare.</p>}</div></li>
            <li className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 py-4"><span className="micro-label">03 · Verificări</span><div><p className="text-sm font-semibold">{presentGuardDecision(selectedRun.guard_decision).label}</p><p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{formatUserFacingText(String(selectedRun.guard_reason || "Decizie înregistrată.").replace("TEST RUN · ", ""))}</p></div></li>
            <li className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 py-4"><span className="micro-label">04 · Efecte</span><div>{trace.effects.length ? <ul className="space-y-2">{trace.effects.map((effect) => <li key={effect.key} className="text-xs"><span className="font-semibold">{effect.label} · {effect.result}</span><p className="mt-1 break-all font-mono text-[rgb(var(--text-muted))]">{effect.id}</p></li>)}</ul> : <p className="text-xs text-[rgb(var(--text-muted))]">Niciun efect confirmat.</p>}<p className="mt-3 text-xs text-[rgb(var(--text-muted))]">Definiția evaluată: {trace.actions.join(" · ") || "Indisponibilă"}</p></div></li>
            <li className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 py-4"><span className="micro-label">05 · Rezultat</span><div><p className="text-sm font-semibold">{presentWorkflowRunState(selectedRun.status).label}</p>{selectedRun.is_test_run ? <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Nicio acțiune nu a fost executată în acest test.</p> : null}{selectedRun.commercial_state ? <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Stare comercială: {presentExecutionState(selectedRun.commercial_state as CommercialExecutionState).label}</p> : null}<p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{idCount(selectedRun.prepared_action_plan_ids)} elemente de lucru pregătite</p>{trace.failure ? <p className="mt-2 text-xs text-[rgb(var(--danger-text))]">{trace.failure}</p> : null}</div></li>
            <li className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 py-4"><span className="micro-label">06 · Audit</span><div><p className="text-xs font-semibold">{selectedRun.is_test_run ? "Nicio mutație executată" : selectedRun.status === "failed" ? "Evaluare întreruptă — efectele confirmate sunt păstrate" : selectedRun.human_approval_required ? "Control uman necesar" : selectedRun.status === "completed" ? "Evaluare internă finalizată" : "Evaluare înregistrată"}</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{formatProductDateTime(selectedRun.created_at)}{selectedRun.completed_at ? " · finalizat " + formatProductDateTime(selectedRun.completed_at) : ""}</p><p className="mt-1 text-xs">{trace.retryLabel}{selectedRun.recovery_started_at ? " · ultima preluare " + formatProductDateTime(selectedRun.recovery_started_at) : ""}</p><p className="mt-2 text-xs">{trace.snapshotName}</p><p className="mt-1 break-all font-mono text-xs text-[rgb(var(--text-muted))]">{trace.hash ? "Snapshot înregistrat · SHA-256 " + trace.hash : "Snapshot istoric neînregistrat"}</p></div></li>
          </ol>
          {plans.length ? <section aria-label="Planuri controlate provenite din workflow" className="mt-4 border-t border-[rgb(var(--border))] pt-4"><h4 className="text-sm font-semibold">Revizuiește lucrul pregătit</h4>{plans.map((plan) => <div key={plan.id} id={"plan-" + plan.id}>{plan.status === "prepared" ? <PreparedActionCard action={workflowPlanPreview(plan)} provenance={{ label: trace.snapshotName, href: baseHref + "?view=runs&run=" + selectedRun.id }} completionHref={"/opportunities/" + selectedRun.target_id} /> : <div className="py-3 text-xs"><a className="focus-ring font-semibold" href={baseHref + "?view=runs&run=" + selectedRun.id}>Generat de workflow · {trace.snapshotName}</a><p className="mt-1">{plan.status === "executed" ? "Aplicat după confirmare" : "Plan indisponibil pentru aplicare"}{plan.result_entity_id ? " · referință " + plan.result_entity_id : ""}</p><a href={"/opportunities/" + selectedRun.target_id} className="focus-ring mt-1 inline-block text-[rgb(var(--primary))]">Deschide oportunitatea →</a></div>}</div>)}</section> : selectedRun.prepared_action_plan_ids?.length ? <p className="mt-4 text-xs text-[rgb(var(--text-muted))]">Conținutul planurilor și aprobarea lor sunt disponibile numai creatorului autorizat.</p> : null}
        </aside> : null}
      </div>
    </section> : null}

    {view === "settings" ? <section aria-labelledby="workflow-settings-title" className="mx-auto mt-6 max-w-4xl">
      <div className="border-b border-[rgb(var(--border))] pb-4"><p className="micro-label">Setări reale</p><h2 id="workflow-settings-title" className="mt-1 text-base font-semibold">Control operațional</h2><p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Sunt afișate doar capabilitățile susținute de runtime-ul curent. Nu există setări decorative sau runner-e simulate.</p></div>
      <dl className="divide-y divide-[rgb(var(--border))]">
        <div className="grid gap-2 py-5 md:grid-cols-[15rem_minmax(0,1fr)]"><dt className="text-xs font-semibold">Stare</dt><dd><span className={statusClass(workflowState.tone)}>{workflowState.label}</span></dd></div>
        <div className="grid gap-2 py-5 md:grid-cols-[15rem_minmax(0,1fr)]"><dt className="text-xs font-semibold">Declanșator</dt><dd><p className="text-sm font-semibold">{presentWorkflowTrigger(workflow.trigger)}</p><p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{triggerCapability.label}. {triggerCapability.explanation}</p></dd></div>
        <div className="grid gap-2 py-5 md:grid-cols-[15rem_minmax(0,1fr)]"><dt className="text-xs font-semibold">Acțiuni</dt><dd><p className="text-sm font-semibold">{workflow.actions.length} {workflow.actions.length === 1 ? "acțiune configurată" : "acțiuni configurate"}</p><p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Acțiunile protejate rămân lucru pregătit pentru revizuire; emailurile nu sunt trimise automat.</p></dd></div>
        <div className="grid gap-2 py-5 md:grid-cols-[15rem_minmax(0,1fr)]"><dt className="text-xs font-semibold">Audit</dt><dd><p className="text-sm font-semibold">{runs.length} {runs.length === 1 ? "evaluare înregistrată" : "evaluări înregistrate"}</p><a href={baseHref + "?view=runs"} className="focus-ring mt-2 inline-flex text-xs font-semibold text-[rgb(var(--primary))]">Deschide istoricul →</a></dd></div>
      </dl>
    </section> : null}
  </PageShell>;
}
