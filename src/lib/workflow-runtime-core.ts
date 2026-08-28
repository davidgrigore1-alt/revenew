import type { CommercialExecutionState } from "@/lib/commercial-execution";
import type { WorkflowAction, WorkflowCondition, WorkflowDefinition, WorkflowTrigger } from "@/lib/workflow-foundation";

export type WorkflowRuntimeContext = {
  owner: string | null;
  stage: string | null;
  execution_state: CommercialExecutionState;
  severity: "critical" | "attention" | "informative" | "positive";
  company: string | null;
  estimated_value: number | null;
  currency: string | null;
  waiting_state: CommercialExecutionState | null;
  lifecycleOpen: boolean;
  recentInboundReply: boolean;
  meetingUpcoming: boolean;
};
export type WorkflowEvent = { trigger: WorkflowTrigger; eventKey: string; targetType: "opportunity"; targetId: string };
export type ConditionResult = WorkflowCondition & { matched: boolean; observedValue: string | number | null };
export type WorkflowActionDecision = WorkflowAction & { decision: "prepare" | "execute_internal" | "skip"; reason: string };
export type WorkflowGuardDecision = "proceed" | "waiting" | "stop" | "blocked" | "conditions_not_met";
export type WorkflowEvaluation = {
  triggerMatched: boolean;
  conditionResults: ConditionResult[];
  conditionsMatched: boolean;
  commercialState: CommercialExecutionState;
  decision: WorkflowGuardDecision;
  reason: string;
  actions: WorkflowActionDecision[];
  humanApprovalRequired: boolean;
};

const labels: Record<WorkflowGuardDecision, string> = {
  proceed: "Condițiile sunt confirmate. Lucrul sigur poate fi pregătit.",
  waiting: "Omis — fereastra de răspuns este încă activă.",
  stop: "Oprit — situația comercială nu mai necesită acest workflow.",
  blocked: "Blocat — este necesară o verificare umană înainte de continuare.",
  conditions_not_met: "Omis — condițiile workflow-ului nu sunt îndeplinite."
};
function observed(context: WorkflowRuntimeContext, field: WorkflowCondition["field"]) { return context[field] ?? null; }
function isEmpty(value: unknown) { return value == null || value === ""; }
function compare(condition: WorkflowCondition, current: string | number | null) {
  if (condition.operator === "is_empty") return isEmpty(current);
  if (condition.operator === "is_not_empty") return !isEmpty(current);
  if (condition.operator === "equals") return String(current ?? "") === String(condition.value ?? "");
  if (condition.operator === "not_equals") return String(current ?? "") !== String(condition.value ?? "");
  if (current == null || condition.value == null || current === "" || condition.value === "") return false;
  const left = Number(current); const right = Number(condition.value);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  return condition.operator === "greater_than" ? left > right : left < right;
}
function decisions(actions: WorkflowAction[], decision: WorkflowGuardDecision, reason: string, skipTypes: WorkflowAction["type"][] = []): WorkflowActionDecision[] {
  return actions.map((action) => {
    const skipped = decision !== "proceed" || skipTypes.includes(action.type);
    return { ...action, decision: skipped ? "skip" : action.type === "create_notification" ? "execute_internal" : "prepare", reason: skipped ? reason : action.type === "create_notification" ? "Notificare internă permisă de definiția validată." : "Acțiune pregătită pentru revizuire prin planul sigur G1." };
  });
}

export function evaluateWorkflow(definition: WorkflowDefinition, event: WorkflowEvent, context: WorkflowRuntimeContext): WorkflowEvaluation {
  const triggerMatched = definition.status === "active" && definition.trigger === event.trigger;
  const conditionResults = definition.conditions.map((condition) => ({ ...condition, observedValue: observed(context, condition.field), matched: compare(condition, observed(context, condition.field)) }));
  const conditionsMatched = triggerMatched && conditionResults.every((condition) => condition.matched);
  if (!triggerMatched || !conditionsMatched) return { triggerMatched, conditionResults, conditionsMatched, commercialState: context.execution_state, decision: "conditions_not_met", reason: labels.conditions_not_met, actions: decisions(definition.actions, "conditions_not_met", labels.conditions_not_met), humanApprovalRequired: false };

  if (!context.lifecycleOpen || context.execution_state === "resolved") return { triggerMatched, conditionResults, conditionsMatched, commercialState: context.execution_state, decision: "stop", reason: "Oprit — oportunitatea este deja închisă.", actions: decisions(definition.actions, "stop", "Oportunitatea este închisă."), humanApprovalRequired: false };
  if (context.recentInboundReply || event.trigger === "reply_received") return { triggerMatched, conditionResults, conditionsMatched, commercialState: context.execution_state, decision: "stop", reason: "Oprit — clientul a răspuns deja.", actions: decisions(definition.actions, "stop", "Răspunsul primit oprește lucrul de tip no-response."), humanApprovalRequired: false };
  if (context.execution_state === "waiting_for_client") return { triggerMatched, conditionResults, conditionsMatched, commercialState: context.execution_state, decision: "waiting", reason: labels.waiting, actions: decisions(definition.actions, "waiting", "Fereastra legitimă de răspuns nu a expirat."), humanApprovalRequired: false };
  if (context.execution_state === "approval_required") {
    const permitted = definition.actions.filter((action) => action.type === "request_approval" || action.type === "create_notification");
    const canProceed = permitted.length > 0;
    const actionDecisions = definition.actions.map((action) => permitted.includes(action) ? { ...action, decision: action.type === "create_notification" ? "execute_internal" as const : "prepare" as const, reason: "Workflow-ul poate ridica revizuirea lipsă fără a aplica schimbarea protejată." } : { ...action, decision: "skip" as const, reason: "Aprobarea umană lipsește." });
    return { triggerMatched, conditionResults, conditionsMatched, commercialState: context.execution_state, decision: canProceed ? "proceed" : "blocked", reason: canProceed ? "Aprobarea lipsă este ridicată pentru revizuire." : labels.blocked, actions: actionDecisions, humanApprovalRequired: canProceed };
  }
  if (context.meetingUpcoming) {
    const skip = definition.actions.filter((action) => action.type === "prepare_email").map((action) => action.type);
    const remaining = definition.actions.some((action) => !skip.includes(action.type));
    return { triggerMatched, conditionResults, conditionsMatched, commercialState: context.execution_state, decision: remaining ? "proceed" : "stop", reason: remaining ? "Întâlnirea apropiată oprește doar outreach-ul redundant." : "Oprit — există deja o întâlnire apropiată.", actions: decisions(definition.actions, "proceed", "Există deja o întâlnire apropiată.", skip), humanApprovalRequired: remaining && definition.actions.some((action) => !skip.includes(action.type) && action.requiresHumanApproval) };
  }
  if (context.execution_state === "owner_missing") {
    const allowed = new Set(["assign_review", "request_approval", "create_notification"]);
    const actionDecisions = definition.actions.map((action) => allowed.has(action.type) ? { ...action, decision: action.type === "create_notification" ? "execute_internal" as const : "prepare" as const, reason: "Acțiunea clarifică ownership-ul fără a presupune un responsabil." } : { ...action, decision: "skip" as const, reason: "Responsabilul nu este confirmat." });
    const canProceed = actionDecisions.some((action) => action.decision !== "skip");
    return { triggerMatched, conditionResults, conditionsMatched, commercialState: context.execution_state, decision: canProceed ? "proceed" : "blocked", reason: canProceed ? "Ownership-ul va fi ridicat pentru revizuire." : "Blocat — responsabilul nu este confirmat.", actions: actionDecisions, humanApprovalRequired: canProceed };
  }
  const actionDecisions = decisions(definition.actions, "proceed", labels.proceed);
  return { triggerMatched, conditionResults, conditionsMatched, commercialState: context.execution_state, decision: "proceed", reason: labels.proceed, actions: actionDecisions, humanApprovalRequired: actionDecisions.some((action) => action.decision === "prepare") };
}

export function workflowRunStatus(evaluation: WorkflowEvaluation): "blocked" | "prepared" | "completed" {
  if (["waiting", "stop", "blocked", "conditions_not_met"].includes(evaluation.decision)) return "blocked";
  return evaluation.actions.some((action) => action.decision === "prepare") ? "prepared" : "completed";
}
