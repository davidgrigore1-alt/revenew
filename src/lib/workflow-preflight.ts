import { validateWorkflowDefinition, type WorkflowAction, type WorkflowDefinition } from "@/lib/workflow-foundation";
import { workflowTriggerCapability, workflowTriggerRegistry, workflowStageLabels } from "@/lib/workflow-trigger-registry";
import { presentWorkflowAction, presentWorkflowConditionField, presentWorkflowOperator, workflowOperatorsForField } from "@/lib/workflow-presentation";

export function requiredWorkflowPermissions(actions: WorkflowAction[]) {
  return Array.from(new Set(actions.map((action) => action.type === "prepare_email" ? "documents.generate" : "actions.create")));
}
export function workflowActivationPreflight(definition: WorkflowDefinition, permissions: readonly string[] | null) {
  const errors: string[] = [];
  const capability = workflowTriggerRegistry[definition.trigger] ? workflowTriggerCapability(definition.trigger) : null;
  try {
    validateWorkflowDefinition(definition);
    if (definition.conditions.length > 8 || definition.conditions.some((condition) =>
      !workflowOperatorsForField(condition.field).includes(condition.operator) ||
      (!["is_empty", "is_not_empty"].includes(condition.operator) && (condition.value === "" ||
        (condition.field === "estimated_value" && (typeof condition.value !== "number" || !Number.isFinite(condition.value))))))) throw new Error("invalid_condition");
    for (const action of definition.actions) {
      if (action.requiresHumanApproval !== (action.type !== "create_notification")) throw new Error("unsafe_control");
      const allowed = action.type === "prepare_email" ? ["subject", "body"] : ["title"];
      if (Object.entries(action.configuration ?? {}).some(([key, value]) => !allowed.includes(key) || typeof value !== "string" || value.length > (key === "body" ? 5000 : 500))) throw new Error("unsafe_configuration");
    }
  } catch { errors.push("Definiția conține condiții, acțiuni sau configurații nepermise."); }
  if (!capability?.automatic) errors.push(capability?.explanation ?? "Declanșatorul nu este disponibil.");
  const missingPermissions = requiredWorkflowPermissions(definition.actions).filter((permission) => !permissions?.includes(permission));
  if (permissions === null) errors.push("Permisiunile creatorului nu au putut fi verificate.");
  else if (missingPermissions.length) errors.push("Creatorul nu mai are permisiunile necesare pentru acțiunile configurate.");
  return {
    canActivate: errors.length === 0, errors, available: capability?.automatic ?? false,
    trigger: workflowTriggerRegistry[definition.trigger]?.label ?? "Declanșator nevalid",
    triggerExplanation: capability?.explanation ?? "", target: "Oportunitatea din același workspace",
    conditions: definition.conditions.map((condition) => `${presentWorkflowConditionField(condition.field)} ${presentWorkflowOperator(condition.operator)}${condition.value == null ? "" : " " + (condition.field === "stage" ? workflowStageLabels[String(condition.value)] ?? "Etapă nevalidă" : condition.value)}`),
    actions: definition.actions.map((action) => presentWorkflowAction(action.type)),
    externalEffect: "Niciun email, eveniment Calendar sau CRM extern nu este modificat automat.",
    approval: "Notificările sunt interne. Taskurile, următorul pas și emailurile rămân planuri G1 pentru confirmare.",
    permissions: permissions !== null && !missingPermissions.length ? "Permisiunile creatorului sunt confirmate; runtime-ul le verifică din nou la fiecare rulare." : "Autoritate insuficientă sau neverificată."
  };
}
export type WorkflowActivationPreflight = ReturnType<typeof workflowActivationPreflight>;
