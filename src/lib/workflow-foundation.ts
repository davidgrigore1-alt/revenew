export const workflowTriggers = ["opportunity_created", "stage_changed", "next_action_overdue", "email_received", "reply_received", "meeting_upcoming", "approval_completed", "scheduled_review"] as const;
export const workflowConditions = ["owner", "stage", "execution_state", "severity", "company", "estimated_value", "currency", "waiting_state"] as const;
export const workflowConditionOperators = ["equals", "not_equals", "greater_than", "less_than", "is_empty", "is_not_empty"] as const;
export const safeWorkflowActions = ["create_internal_task", "prepare_email", "request_approval", "update_internal_next_action", "assign_review", "create_notification"] as const;

export type WorkflowTrigger = typeof workflowTriggers[number];
export type WorkflowConditionField = typeof workflowConditions[number];
export type WorkflowConditionOperator = typeof workflowConditionOperators[number];
export type SafeWorkflowAction = typeof safeWorkflowActions[number];
export type WorkflowStatus = "draft" | "active" | "paused" | "archived";
export type WorkflowCondition = { field: WorkflowConditionField; operator: WorkflowConditionOperator; value?: string | number | null };
export type WorkflowAction = { type: SafeWorkflowAction; requiresHumanApproval: boolean; description: string; configuration?: Record<string, string | number | boolean | null> };

export type WorkflowDefinition = {
  id: string;
  businessId?: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  source: "manual" | "ai_assisted";
};

export type WorkflowDraft = WorkflowDefinition & {
  status: "draft";
  audit: { createdBy: string; createdAt: string; source: "manual" | "ai_assisted"; publishedAt: null };
};

type LegacyAction = "create_prepared_task" | "create_internal_notification";
function normalizeAction(value: SafeWorkflowAction | LegacyAction): SafeWorkflowAction | null {
  if (value === "create_prepared_task") return "create_internal_task";
  if (value === "create_internal_notification") return "create_notification";
  return safeWorkflowActions.includes(value as SafeWorkflowAction) ? value as SafeWorkflowAction : null;
}
function clean(value: unknown, max: number) { return typeof value === "string" ? value.normalize("NFKC").trim().slice(0, max) : ""; }

export function validateWorkflowDefinition(input: Pick<WorkflowDefinition, "name" | "trigger" | "conditions" | "actions">) {
  if (clean(input.name, 120).length < 3) throw new Error("workflow_name_required");
  if (!workflowTriggers.includes(input.trigger)) throw new Error("unsupported_workflow_trigger");
  if (!input.actions.length || input.actions.length > 6) throw new Error("workflow_actions_required");
  for (const condition of input.conditions) {
    if (!workflowConditions.includes(condition.field) || !workflowConditionOperators.includes(condition.operator)) throw new Error("unsupported_workflow_condition");
    if (!["is_empty", "is_not_empty"].includes(condition.operator) && condition.value == null) throw new Error("workflow_condition_value_required");
  }
  for (const action of input.actions) if (!safeWorkflowActions.includes(action.type)) throw new Error("unsafe_workflow_action");
  return true;
}

export function createWorkflowDraft(input: {
  id: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  conditions?: WorkflowCondition[];
  actions: Array<{ type: SafeWorkflowAction | LegacyAction | string; description: string; configuration?: Record<string, string | number | boolean | null> }>;
  createdBy: string;
  createdAt?: string;
  source?: "manual" | "ai_assisted";
}): WorkflowDraft {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const actions = input.actions.slice(0, 6).map((action) => {
    const type = normalizeAction(action.type as SafeWorkflowAction | LegacyAction);
    if (!type) throw new Error("unsafe_workflow_action");
    return { type, description: clean(action.description, 240), configuration: action.configuration, requiresHumanApproval: type !== "create_notification" };
  });
  const draft: WorkflowDraft = {
    id: input.id,
    name: clean(input.name, 120),
    description: clean(input.description, 1000),
    status: "draft",
    trigger: input.trigger,
    conditions: (input.conditions ?? []).slice(0, 8),
    actions,
    createdBy: input.createdBy,
    createdAt,
    source: input.source ?? "manual",
    audit: { createdBy: input.createdBy, createdAt, source: input.source ?? "manual", publishedAt: null }
  };
  validateWorkflowDefinition(draft);
  return draft;
}

export function draftWorkflowFromQuestion(input: { id: string; question: string; createdBy: string; createdAt?: string }): WorkflowDraft | null {
  const question = input.question.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (!/workflow|flux/.test(question)) return null;
  if (/fara (?:next action|actiune urmatoare)|lipsa (?:next action|actiunii urmatoare)/.test(question)) {
    return createWorkflowDraft({ id: input.id, name: "Revizuire oportunități fără acțiune", trigger: "scheduled_review", createdBy: input.createdBy, createdAt: input.createdAt, source: "ai_assisted", conditions: [{ field: "execution_state", operator: "equals", value: "next_action_missing" }], actions: [{ type: "assign_review", description: "Pregătește o revizuire internă pentru oportunitatea fără acțiune următoare." }] });
  }
  if (/follow-up|restant|depasit/.test(question)) {
    return createWorkflowDraft({ id: input.id, name: "Revizuire follow-up-uri restante", trigger: "next_action_overdue", createdBy: input.createdBy, createdAt: input.createdAt, source: "ai_assisted", conditions: [{ field: "execution_state", operator: "equals", value: "overdue" }], actions: [{ type: "create_internal_task", description: "Pregătește un task intern de revizuire." }, { type: "prepare_email", description: "Pregătește un follow-up pentru control uman." }] });
  }
  return null;
}