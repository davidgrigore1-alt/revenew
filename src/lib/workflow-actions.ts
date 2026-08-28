"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createCommercialWorkflowDraft, createCommercialWorkflowFromPlaybook, recoverCommercialWorkflowRun, setCommercialWorkflowStatus, testCommercialWorkflow, updateCommercialWorkflowDefinition } from "@/lib/workflow-runtime";
import { safeWorkflowActions, workflowConditionOperators, workflowConditions, workflowTriggers, type SafeWorkflowAction, type WorkflowCondition, type WorkflowConditionField, type WorkflowConditionOperator, type WorkflowStatus, type WorkflowTrigger } from "@/lib/workflow-foundation";
import { workflowOperatorsForField } from "@/lib/workflow-presentation";

function text(formData: FormData, key: string, max: number) {
  const value = formData.get(key);
  return typeof value === "string" ? value.normalize("NFKC").trim().slice(0, max) : "";
}
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function json(formData: FormData, key: string, max = 20_000): unknown {
  const raw = text(formData, key, max);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { throw new Error("workflow_definition_invalid"); }
}
function parseConditions(value: unknown): WorkflowCondition[] {
  if (!Array.isArray(value) || value.length > 8) throw new Error("workflow_conditions_invalid");
  return value.map((item) => {
    if (!isRecord(item)) throw new Error("workflow_condition_invalid");
    const field = String(item.field ?? "") as WorkflowConditionField;
    const operator = String(item.operator ?? "") as WorkflowConditionOperator;
    if (!workflowConditions.includes(field) || !workflowConditionOperators.includes(operator) || !workflowOperatorsForField(field).includes(operator)) throw new Error("workflow_condition_invalid");
    if (operator === "is_empty" || operator === "is_not_empty") return { field, operator, value: null };
    if (field === "estimated_value") {
      const numeric = Number(item.value);
      if (!Number.isFinite(numeric)) throw new Error("workflow_condition_value_required");
      return { field, operator, value: numeric };
    }
    const valueText = typeof item.value === "string" ? item.value.normalize("NFKC").trim().slice(0, 160) : "";
    if (!valueText) throw new Error("workflow_condition_value_required");
    return { field, operator, value: valueText };
  });
}
function parseActions(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6) throw new Error("workflow_actions_invalid");
  return value.map((item) => {
    if (!isRecord(item)) throw new Error("workflow_action_invalid");
    const type = String(item.type ?? "") as SafeWorkflowAction;
    if (!safeWorkflowActions.includes(type)) throw new Error("workflow_action_invalid");
    const description = typeof item.description === "string" ? item.description.normalize("NFKC").trim().slice(0, 240) : "";
    const sourceConfig = isRecord(item.configuration) ? item.configuration : {};
    const configuration: Record<string, string> = {};
    const allowed = type === "prepare_email" ? ["subject", "body"] : ["title"];
    for (const key of allowed) {
      const candidate = sourceConfig[key];
      if (typeof candidate === "string" && candidate.trim()) configuration[key] = candidate.normalize("NFKC").trim().slice(0, key === "body" ? 5000 : 500);
    }
    return { type, description: description || "Pregătește următorul pas pentru revizuire umană.", configuration };
  });
}
function definition(formData: FormData) {
  const trigger = text(formData, "trigger", 80) as WorkflowTrigger;
  if (!workflowTriggers.includes(trigger)) throw new Error("workflow_trigger_invalid");
  return {
    name: text(formData, "name", 120),
    description: text(formData, "description", 1000),
    trigger,
    conditions: parseConditions(json(formData, "conditions")),
    actions: parseActions(json(formData, "actions"))
  };
}

export async function createWorkflowFromPlaybook(formData: FormData) {
  let id: string;
  try { id = await createCommercialWorkflowFromPlaybook(text(formData, "playbookId", 80)); }
  catch { redirect("/workflows/new?error=draft"); }
  revalidatePath("/workflows");
  redirect(`/workflows/${id}?created=playbook`);
}

export async function createWorkflowAndOpen(formData: FormData) {
  const id = await createCommercialWorkflowDraft({
    name: text(formData, "name", 120), description: text(formData, "description", 1000),
    trigger: "opportunity_created", conditions: [],
    actions: [{ type: "create_internal_task", description: "Pregătește următorul pas pentru revizuire umană.", configuration: { title: "Revizuiește oportunitatea nouă" } }]
  });
  redirect(`/workflows/${id}`);
}
// createCommercialWorkflowDraftFromQuestion is invoked only by the confirmation-gated Ask API.
export async function createWorkflowWithAi(formData: FormData) {
  const question = text(formData, "question", 1000);
  redirect("/ai?tab=ask&question=" + encodeURIComponent(question));
}
export async function saveWorkflowDefinition(formData: FormData) {
  const workflowId = text(formData, "workflowId", 80);
  await updateCommercialWorkflowDefinition(workflowId, definition(formData));
  revalidatePath("/workflows"); revalidatePath(`/workflows/${workflowId}`);
  redirect(`/workflows/${workflowId}?saved=1`);
}
export async function createWorkflowDefinition(formData: FormData) {
  await createCommercialWorkflowDraft(definition(formData));
  revalidatePath("/workflows");
}
export async function changeWorkflowStatus(formData: FormData) {
  const workflowId = text(formData, "workflowId", 80);
  const status = text(formData, "status", 24) as Extract<WorkflowStatus, "active" | "paused" | "archived">;
  if (!["active", "paused", "archived"].includes(status)) throw new Error("workflow_status_invalid");
  try { await setCommercialWorkflowStatus(workflowId, status); }
  catch { redirect(`/workflows/${workflowId}?activation=blocked#activation-review`); }
  revalidatePath("/workflows"); revalidatePath(`/workflows/${workflowId}`);
}
export async function runWorkflowTest(formData: FormData) {
  const workflowId = text(formData, "workflowId", 80);
  const result = await testCommercialWorkflow(workflowId, text(formData, "targetId", 80));
  revalidatePath("/workflows"); revalidatePath(`/workflows/${workflowId}`);
  redirect(`/workflows/${workflowId}?view=runs&run=${result.runId}&tested=1`);
}

// Explicit recovery request only; client-supplied tenant/status/receipts are never accepted.
export async function recoverWorkflowRun(formData: FormData) {
  try {
    const result = await recoverCommercialWorkflowRun(text(formData, "runId", 80));
    revalidatePath("/workflows");
    return result;
  } catch {
    return { recovered: false, reason: "Recuperarea nu a putut fi efectuată în siguranță. Verifică accesul și starea rulării." };
  }
}
