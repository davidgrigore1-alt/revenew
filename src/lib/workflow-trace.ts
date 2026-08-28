import type { CopilotPreparedAction } from "@/lib/ai/copilot-types";
import type { AskActionProposal, AskActionType } from "@/lib/ai/action-planner";
import { presentWorkflowAction, presentWorkflowTrigger } from "@/lib/workflow-presentation";
import { safeWorkflowSourceEvent, workflowEventOrigins, type WorkflowSourceEvent } from "@/lib/workflow-trigger-registry";
import type { WorkflowAction, WorkflowTrigger } from "@/lib/workflow-foundation";

export function workflowRunIdFromEvidence(evidence: Array<{ sourceId: string; sourceType: string }>) {
  const source = evidence.find((item) => item.sourceType === "Workflow" && /^workflow-run:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.sourceId));
  return source?.sourceId.slice("workflow-run:".length) ?? null;
}
export function workflowRunTrace(run: {
  trigger_type: WorkflowTrigger; source_event?: unknown; definition_snapshot?: unknown; definition_hash?: string;
  effect_records?: unknown; retry_count?: number; recovery_started_at?: string | null; failure_category?: string | null;
}) {
  let source: WorkflowSourceEvent | null = null;
  try { if (run.source_event) source = safeWorkflowSourceEvent(run.source_event as WorkflowSourceEvent); } catch { /* Unverified history is not invented. */ }
  const snapshot = run.definition_snapshot && typeof run.definition_snapshot === "object" ? run.definition_snapshot as { name?: string; actions?: WorkflowAction[] } : null;
  const receipts = Array.isArray(run.effect_records) ? run.effect_records.filter((item): item is { kind: string; key: string; status: string; id: string } =>
    item && typeof item.id === "string" && typeof item.key === "string" && ["internal_notification", "controlled_plan"].includes(item.kind) && ["created", "replayed"].includes(item.status)) : [];
  return {
    trigger: presentWorkflowTrigger(run.trigger_type), source,
    origin: source ? workflowEventOrigins[source.origin] : "Origine neînregistrată",
    snapshotName: snapshot?.name ?? "Definiție istorică indisponibilă",
    hash: /^[0-9a-f]{64}$/.test(run.definition_hash ?? "") ? run.definition_hash! : null,
    actions: Array.isArray(snapshot?.actions) ? snapshot.actions.map((action) => presentWorkflowAction(action.type)) : [],
    effects: receipts.map((receipt) => ({ ...receipt, label: receipt.kind === "controlled_plan" ? "Plan G1" : "Notificare internă", result: receipt.status === "replayed" ? "Reutilizat" : "Creat" })),
    retryLabel: `${run.retry_count ?? 0} din 2 recuperări`,
    failure: run.failure_category ? ({ permission_changed: "Permisiunile creatorului necesită verificare.", record_unavailable: "Oportunitatea nu mai este disponibilă.", action_plan_creation_failed: "Pregătirea planului nu a putut fi finalizată.", internal_failure: "Evaluarea nu a putut fi finalizată în siguranță." } as Record<string, string>)[run.failure_category] ?? "Evaluarea necesită verificare." : null
  };
}
export type WorkflowStoredPlan = {
  id: string; action_type: AskActionType; target_id: string; target_label: string; status: string;
  proposal: AskActionProposal; evidence: Array<{ sourceId: string; label: string; sourceType: string }>;
  result_entity_type: string | null; result_entity_id: string | null;
};
export function workflowPlanPreview(plan: WorkflowStoredPlan): CopilotPreparedAction {
  const email = plan.action_type === "prepare_email";
  return {
    id: plan.id, planId: plan.id, actionType: plan.action_type, type: email ? "email_draft" : "task_draft",
    title: email ? "Email pentru revizuire" : "Următorul pas comercial",
    status: "prepared_not_executed", editable: true, riskLevel: email ? "review" : "low",
    subject: plan.proposal.subject ?? plan.proposal.title, body: plan.proposal.body ?? plan.proposal.description,
    proposal: plan.proposal, target: { type: "opportunity", id: plan.target_id, label: plan.target_label },
    rationale: "Pregătit de workflow pe baza evenimentului comercial verificat.",
    evidenceSourceIds: plan.evidence.map((source) => source.sourceId),
    executionNotice: email ? "Confirmarea salvează un draft. Nu trimite emailul." : "Planul este aplicat numai după confirmarea ta."
  };
}
