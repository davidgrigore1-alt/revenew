import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { businessRolePermissions } from "@/lib/authz/role-permissions";
import { mapDatabaseBusinessRole } from "@/lib/authz/roles";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { assessCommercialExecution } from "@/lib/commercial-execution";
import { createStoredActionPlanForActor, type AskActionProposal, type AskActionType } from "@/lib/ai/action-planner";
import { createWorkflowDraft, validateWorkflowDefinition, type WorkflowAction, type WorkflowCondition, type WorkflowDefinition, type WorkflowStatus, type WorkflowTrigger } from "@/lib/workflow-foundation";
import { evaluateWorkflow, workflowRunStatus, type WorkflowEvent, type WorkflowRuntimeContext } from "@/lib/workflow-runtime-core";
import { interpretCommercialWorkflowRequest, validateWorkflowDraftInterpretation } from "@/lib/workflow-drafting";
import { workflowTriggerCapability, safeWorkflowSourceEvent, mayDispatchWorkflowEvent, workflowEventKey, type WorkflowSourceEvent } from "@/lib/workflow-trigger-registry";
import { workflowActivationPreflight, requiredWorkflowPermissions } from "@/lib/workflow-preflight";
import { workflowPlaybook } from "@/lib/workflow-playbooks";
import { workflowRunIdFromEvidence, type WorkflowStoredPlan } from "@/lib/workflow-trace";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type WorkflowRow = {
  id: string; business_id: string; name: string; description: string | null; status: WorkflowStatus;
  trigger_type: WorkflowTrigger; conditions: unknown; actions: unknown; created_by_profile_id: string;
  created_at: string; updated_at: string;
};
type WorkflowStatusPatch = { status: WorkflowStatus; updated_at: string; activated_at?: string; paused_at?: string; archived_at?: string };
function admin() { const client = createSupabaseAdminClient(); if (!client) throw new Error("workflow_runtime_unavailable"); return client; }
function clean(value: unknown, max: number) { return typeof value === "string" ? value.normalize("NFKC").trim().slice(0, max) : ""; }
function deterministicUuid(value: string) { const hex = createHash("sha256").update(value).digest("hex").slice(0, 32).split(""); hex[12] = "5"; hex[16] = (["8","9","a","b"] as const)[parseInt(hex[16], 16) % 4]; const joined = hex.join(""); return `${joined.slice(0,8)}-${joined.slice(8,12)}-${joined.slice(12,16)}-${joined.slice(16,20)}-${joined.slice(20)}`; }
function definitionSnapshot(definition: WorkflowDefinition) { return { name: definition.name, description: definition.description ?? "", trigger: definition.trigger, conditions: definition.conditions, actions: definition.actions, source: definition.source }; }
function definitionHash(definition: WorkflowDefinition) { return createHash("sha256").update(JSON.stringify(definitionSnapshot(definition))).digest("hex"); }
function requireQuery<T>(result: { data: T; error?: { message?: string } | null }, code: string): T { if (result.error) throw new Error(code); return result.data; }
function rowDefinition(row: WorkflowRow): WorkflowDefinition { return { id: row.id, businessId: row.business_id, name: row.name, description: row.description ?? "", status: row.status, trigger: row.trigger_type, conditions: Array.isArray(row.conditions) ? row.conditions as WorkflowCondition[] : [], actions: Array.isArray(row.actions) ? row.actions as WorkflowAction[] : [], createdBy: row.created_by_profile_id, createdAt: row.created_at, updatedAt: row.updated_at, source: row.description?.startsWith("[AI]") ? "ai_assisted" : "manual" }; }
function lifecycleOpen(row: { lifecycle_status?: string | null; status?: string | null }) { const lifecycle = String(row.lifecycle_status ?? "open"); return !["won","lost","ignored","closed"].includes(lifecycle) && !["won","lost","ignored"].includes(String(row.status)); }

async function actorPermissions(businessId: string, profileId: string) {
  const client = admin();
  const [businessResult, memberResult] = await Promise.all([
    client.from("businesses").select("owner_profile_id").eq("id", businessId).maybeSingle(),
    client.from("business_members").select("role,status").eq("business_id", businessId).eq("profile_id", profileId).eq("status", "active").maybeSingle()
  ]);
  const business = requireQuery(businessResult, "workflow_permission_lookup_failed");
  const member = requireQuery(memberResult, "workflow_permission_lookup_failed");
  const role = business?.owner_profile_id === profileId ? "business_owner" : mapDatabaseBusinessRole(member?.role);
  return role ? businessRolePermissions[role] : [];
}
const requiredPermissions = requiredWorkflowPermissions;

async function loadRuntimeContext(businessId: string, profileId: string, targetId: string) {
  const client = admin(); const now = new Date(); const future = new Date(now.getTime() + 7 * 86400000).toISOString();
  const [opportunityResult, actionResult, approvalResult, emailResult, meetingResult, businessResult, preparedResult] = await Promise.all([
    client.from("opportunities").select("id,business_id,organization_id,title,status,lifecycle_status,owner_profile_id,estimated_value_high,currency").eq("id", targetId).eq("business_id", businessId).maybeSingle(),
    client.from("opportunity_actions").select("id,title,due_at,status,assigned_to_profile_id").eq("business_id", businessId).eq("opportunity_id", targetId).eq("status", "pending").order("due_at", { ascending: true, nullsFirst: false }).limit(1).maybeSingle(),
    client.from("business_approval_requests").select("id").eq("business_id", businessId).eq("entity_id", targetId).eq("status", "pending").limit(1).maybeSingle(),
    client.from("external_email_messages").select("direction,sent_at").eq("business_id", businessId).eq("owner_profile_id", profileId).eq("linked_opportunity_id", targetId).order("sent_at", { ascending: false }).limit(20),
    client.from("external_calendar_events").select("starts_at").eq("business_id", businessId).eq("owner_profile_id", profileId).eq("linked_opportunity_id", targetId).neq("event_status", "cancelled").gte("starts_at", now.toISOString()).lte("starts_at", future).order("starts_at").limit(1).maybeSingle(),
    client.from("businesses").select("response_window_business_days").eq("id", businessId).maybeSingle(),
    client.from("ask_action_plans").select("id").eq("business_id", businessId).eq("created_by_profile_id", profileId).eq("target_id", targetId).in("status", ["prepared","executing"]).limit(1).maybeSingle()
  ]);
  const opportunity = requireQuery(opportunityResult, "workflow_context_load_failed"); requireQuery(actionResult, "workflow_context_load_failed"); requireQuery(approvalResult, "workflow_context_load_failed"); requireQuery(emailResult, "workflow_context_load_failed"); requireQuery(meetingResult, "workflow_context_load_failed"); requireQuery(businessResult, "workflow_context_load_failed"); requireQuery(preparedResult, "workflow_context_load_failed"); if (!opportunity) throw new Error("workflow_target_unavailable");
  const emails = emailResult.data ?? []; const inbound = emails.find((item) => item.direction === "inbound")?.sent_at ?? null; const outbound = emails.find((item) => item.direction === "outbound")?.sent_at ?? null;
  const action = actionResult.data; const due = action?.due_at ? Date.parse(action.due_at) : Number.NaN;
  const assessment = assessCommercialExecution({ now, lifecycleOpen: lifecycleOpen(opportunity), ownerMissing: !opportunity.owner_profile_id, nextActionMissing: !action, nextActionOverdue: Number.isFinite(due) && due < now.getTime(), approvalPending: Boolean(approvalResult.data), outreachRestricted: false, preparedWorkState: preparedResult.data ? "prepared" : "none", communication: { lastInboundAt: inbound, lastOutboundAt: outbound, nextMeetingAt: meetingResult.data?.starts_at ?? null, expectedResponseWindowDays: businessResult.data?.response_window_business_days ?? 3 } });
  let company: string | null = null;
  if (opportunity.organization_id) { const organizationResult = await client.from("organizations").select("name").eq("id", opportunity.organization_id).eq("business_id", businessId).maybeSingle(); const organization = requireQuery(organizationResult, "workflow_context_load_failed"); company = organization?.name ?? null; }
  const context: WorkflowRuntimeContext = { owner: opportunity.owner_profile_id, stage: opportunity.status, execution_state: assessment.state, severity: assessment.severity, company, estimated_value: opportunity.estimated_value_high == null ? null : Number(opportunity.estimated_value_high), currency: opportunity.currency ?? null, waiting_state: assessment.state.startsWith("waiting_") ? assessment.state : null, lifecycleOpen: lifecycleOpen(opportunity), recentInboundReply: assessment.recentInboundReply, meetingUpcoming: Boolean(meetingResult.data) };
  return { context, targetLabel: opportunity.title, pendingActionId: action?.id ?? null, ownerProfileId: opportunity.owner_profile_id ?? null };
}

function actionPlan(action: WorkflowAction, loaded: Awaited<ReturnType<typeof loadRuntimeContext>>): { type: AskActionType; proposal: AskActionProposal } | null {
  const title = clean(action.configuration?.title, 180) || clean(action.description, 180) || "Revizuiește situația comercială";
  if (action.type === "prepare_email") return { type: "prepare_email", proposal: { subject: clean(action.configuration?.subject, 500) || `Follow-up · ${loaded.targetLabel}`, body: clean(action.configuration?.body, 100000) || "Draft pregătit de workflow pentru revizuire umană. Completează mesajul pe baza contextului autorizat înainte de aprobare." } };
  if (action.type === "update_internal_next_action") return { type: "update_next_action", proposal: { title, description: action.description, dueAt: null, priority: "medium", actionId: loaded.pendingActionId } };
  if (["create_internal_task","assign_review","request_approval"].includes(action.type)) return { type: "create_task", proposal: { title, description: action.type === "request_approval" ? `Revizuire pentru aprobare · ${action.description}` : action.description, dueAt: null, priority: action.type === "request_approval" ? "high" : "medium", ownerProfileId: loaded.ownerProfileId } };
  return null;
}

// The generation is persisted, not a process-local lock. A paused owner may still
// finish an in-flight insert; deterministic DB identities make that insert safe.
const recoveryStaleAfterMs = 15 * 60 * 1000;
type EffectReceipt = { kind: "internal_notification" | "controlled_plan"; key: string; status: "created" | "replayed"; id: string };
type RuntimeRun = {
  id: string; workflow_id: string; business_id: string; trigger_type: WorkflowTrigger;
  event_key: string; target_id: string; status: string; retry_count: number;
  attempt_count: number; updated_at: string; is_test_run: boolean;
  definition_snapshot: ReturnType<typeof definitionSnapshot>; definition_hash: string;
  effect_records: EffectReceipt[]; effects_idempotent: boolean; source_event?: WorkflowSourceEvent | null;
  evaluation_action_indexes: number[] | null;
  condition_results: ReturnType<typeof evaluateWorkflow>["conditionResults"];
  commercial_state: WorkflowRuntimeContext["execution_state"];
  guard_decision: ReturnType<typeof evaluateWorkflow>["decision"];
  guard_reason: string; human_approval_required: boolean;
};

async function updateOwnedRun(run: RuntimeRun, patch: Record<string, unknown>) {
  const result = await admin().from("commercial_workflow_runs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", run.id).eq("business_id", run.business_id)
    .eq("status", "evaluating").eq("retry_count", run.retry_count)
    .select("id").maybeSingle();
  if (!requireQuery(result, "workflow_run_write_failed")) throw new Error("workflow_run_ownership_lost");
}

function storedDefinition(run: RuntimeRun, creator: { created_by_profile_id: string; created_at: string }): WorkflowDefinition {
  const snapshot = run.definition_snapshot;
  if (!snapshot || !Array.isArray(snapshot.conditions) || !Array.isArray(snapshot.actions)) throw new Error("workflow_snapshot_unavailable");
  const definition: WorkflowDefinition = {
    ...snapshot, id: run.workflow_id, businessId: run.business_id, status: "active",
    createdBy: creator.created_by_profile_id, createdAt: creator.created_at
  };
  if (!run.definition_hash || definitionHash(definition) !== run.definition_hash || definition.trigger !== run.trigger_type) throw new Error("workflow_snapshot_invalid");
  validateWorkflowDefinition(definition);
  return definition;
}

async function notificationEffect(run: RuntimeRun, definition: WorkflowDefinition, loaded: Awaited<ReturnType<typeof loadRuntimeContext>>, decision: WorkflowAction, key: string, receipt?: EffectReceipt): Promise<EffectReceipt> {
  const client = admin();
  // A legacy receipt is the only safe way to reuse an old unkeyed notification.
  if (receipt) {
    const existing = requireQuery(await client.from("communication_notifications").select("id,workflow_effect_key")
      .eq("business_id", run.business_id).eq("id", receipt.id).maybeSingle(), "workflow_notification_lookup_failed");
    if (existing && (existing.workflow_effect_key === key || (!run.effects_idempotent && existing.workflow_effect_key === null))) return { ...receipt, status: "replayed" };
    throw new Error("workflow_notification_receipt_unavailable");
  }
  if (!run.effects_idempotent) throw new Error("workflow_legacy_notification_unsafe");
  const result = await client.from("communication_notifications").insert({
    business_id: run.business_id, workflow_effect_key: key,
    recipient_profile_id: loaded.ownerProfileId ?? definition.createdBy,
    kind: "approval_needed", title: "Workflow evaluat · revizuire disponibilă",
    body: decision.description, href: `/opportunities/${run.target_id}`
  }).select("id").maybeSingle();
  if (!result.error && result.data) return { kind: "internal_notification", key, status: "created", id: result.data.id };
  // The UNIQUE index arbitrates concurrent inserts, including a lost response.
  const existing = requireQuery(await client.from("communication_notifications").select("id")
    .eq("business_id", run.business_id).eq("workflow_effect_key", key).maybeSingle(), "workflow_notification_lookup_failed");
  if (!existing) throw new Error("workflow_notification_failed");
  return { kind: "internal_notification", key, status: "replayed", id: existing.id };
}

async function executeOwnedRun(run: RuntimeRun, definition: WorkflowDefinition) {
  const started = Date.now();
  const effectRecords = [...run.effect_records];
  const planIds = () => effectRecords.filter((receipt) => receipt.kind === "controlled_plan").map((receipt) => receipt.id);
  const result = (status: string, reason: string) => ({ workflowId: run.workflow_id, runId: run.id, duplicate: false, status, reason, preparedActionPlanIds: planIds() });
  try {
    const permissions = await actorPermissions(run.business_id, definition.createdBy);
    if (requiredPermissions(definition.actions).some((permission) => !permissions.includes(permission))) throw new Error("workflow_permission_changed");
    const loaded = await loadRuntimeContext(run.business_id, definition.createdBy, run.target_id);
    const event: WorkflowEvent = { trigger: run.trigger_type, eventKey: run.event_key, targetType: "opportunity", targetId: run.target_id };
    // Stage conditions refer to the persisted transition, including recovery
    // before the first evaluation checkpoint. Commercial safety remains current.
    const conditionContext = run.trigger_type === "stage_changed" && run.source_event?.nextStage
      ? { ...loaded.context, stage: run.source_event.nextStage } : loaded.context;
    let evaluation = evaluateWorkflow(definition, event, conditionContext);
    if (run.evaluation_action_indexes !== null) {
      // Do not treat our own prepared plans or changed commercial conditions as
      // a new event. Preserve the checkpoint, but current safety guards may only
      // narrow it (closed opportunity, reply, approval, ownership, meeting).
      const safety = evaluateWorkflow({ ...definition, conditions: [] }, event, loaded.context);
      const allowed = new Set(run.evaluation_action_indexes);
      evaluation = {
        ...safety, conditionResults: run.condition_results,
        decision: run.guard_decision === "proceed" ? safety.decision : run.guard_decision,
        reason: run.guard_decision === "proceed" ? safety.reason : run.guard_reason,
        actions: safety.actions.map((action, index) => allowed.has(index) ? action : { ...action, decision: "skip" as const }),
        humanApprovalRequired: safety.actions.some((action, index) => allowed.has(index) && action.decision === "prepare")
      };
    }
    await updateOwnedRun(run, {
      condition_results: evaluation.conditionResults, commercial_state: evaluation.commercialState,
      guard_decision: evaluation.decision, guard_reason: evaluation.reason,
      human_approval_required: evaluation.humanApprovalRequired,
      evaluation_action_indexes: evaluation.actions.flatMap((action, index) => action.decision === "skip" ? [] : [index])
    });
    for (let index = 0; index < evaluation.actions.length; index += 1) {
      const decision = evaluation.actions[index];
      const effectKey = deterministicUuid(`${run.id}:${index}:${decision.type}`);
      const prior = effectRecords.find((receipt) => receipt.key === effectKey);
      if (decision.decision === "skip") continue;
      // Renew liveness and fence every effect, including receipt replay.
      await updateOwnedRun(run, {});
      let receipt: EffectReceipt;
      if (decision.type === "create_notification") {
        receipt = await notificationEffect(run, definition, loaded, decision, effectKey, prior);
      } else {
        const plan = actionPlan(decision, loaded); if (!plan) throw new Error("workflow_action_unsupported");
        if (prior) {
          const existing = requireQuery(await admin().from("ask_action_plans").select("id")
            .eq("id", prior.id).eq("business_id", run.business_id).eq("created_by_profile_id", definition.createdBy)
            .eq("target_id", run.target_id).eq("idempotency_key", effectKey).maybeSingle(), "workflow_action_plan_lookup_failed");
          if (!existing) throw new Error("workflow_action_plan_receipt_unavailable");
          receipt = { ...prior, status: "replayed" };
        } else {
          const stored = await createStoredActionPlanForActor({
            actor: { businessId: run.business_id, profileId: definition.createdBy, permissions },
            actionType: plan.type, targetId: run.target_id, targetLabel: loaded.targetLabel, proposal: plan.proposal,
            evidence: [{ sourceId: `workflow-run:${run.id}`, label: definition.name, sourceType: "Workflow" }], idempotencyKey: effectKey
          });
          receipt = { kind: "controlled_plan", key: effectKey, status: stored.replay ? "replayed" : "created", id: stored.id };
        }
      }
      const existingIndex = effectRecords.findIndex((item) => item.key === effectKey);
      if (existingIndex < 0) effectRecords.push(receipt); else effectRecords[existingIndex] = receipt;
      await updateOwnedRun(run, { effect_records: effectRecords, prepared_action_plan_ids: planIds() });
    }
    const status = workflowRunStatus(evaluation);
    // Audit before finalization: a failed audit never rewrites a terminal run.
    await updateOwnedRun(run, {});
    requireQuery(await admin().from("audit_logs").insert({
      business_id: run.business_id, profile_id: definition.createdBy, action: "commercial_workflow_evaluated",
      entity_type: "commercial_workflow_run", entity_id: run.id,
      metadata: { workflow_id: definition.id, trigger: run.trigger_type, target_type: "opportunity", target_id: run.target_id,
        result: status, guard_decision: evaluation.decision, prepared_action_count: planIds().length,
        retry_count: run.retry_count, finalization_pending: true, autonomous_external_send: false }
    }), "workflow_audit_write_failed");
    await updateOwnedRun(run, {
      status, effect_records: effectRecords, prepared_action_plan_ids: planIds(), failure_category: null,
      completed_at: new Date().toISOString(), duration_ms: Date.now() - started
    });
    return result(status, evaluation.reason);
  } catch (cause) {
    if (cause instanceof Error && cause.message === "workflow_run_ownership_lost") return result("ownership_lost", "Rularea este gestionată de o altă încercare sau este deja finalizată.");
    const category = cause instanceof Error && ["workflow_target_unavailable", "ask_action_target_missing"].includes(cause.message) ? "record_unavailable" : cause instanceof Error && /permission|forbidden/.test(cause.message) ? "permission_changed" : cause instanceof Error && cause.message.includes("action_plan") ? "action_plan_creation_failed" : "internal_failure";
    const reason = "Evaluarea nu a putut fi finalizată în siguranță.";
    try {
      await updateOwnedRun(run, { status: "failed", failure_category: category, guard_reason: reason,
        effect_records: effectRecords, prepared_action_plan_ids: planIds(), completed_at: new Date().toISOString(), duration_ms: Date.now() - started });
    } catch (writeFailure) {
      if (writeFailure instanceof Error && writeFailure.message === "workflow_run_ownership_lost") return result("ownership_lost", "Rularea este gestionată de o altă încercare sau este deja finalizată.");
      // The persisted evaluating run remains reclaimable once stale. Never
      // pretend that failure metadata was saved if persistence itself failed.
      throw new Error("workflow_run_failure_persist_failed");
    }
    return result("failed", reason);
  }
}

export async function processCommercialWorkflowEvent(input: { businessId: string; trigger: WorkflowTrigger; eventKey: string; targetId: string; triggeredByProfileId?: string | null; sourceEvent?: WorkflowSourceEvent }) {
  if (!uuidPattern.test(input.businessId) || !uuidPattern.test(input.targetId) || !clean(input.eventKey, 180)) throw new Error("workflow_event_invalid");
  if (input.sourceEvent && !mayDispatchWorkflowEvent(input.trigger, input.sourceEvent)) return [];
  const sourceEvent = input.sourceEvent ? safeWorkflowSourceEvent(input.sourceEvent) : null;
  if (sourceEvent && workflowEventKey(input.trigger, sourceEvent) !== input.eventKey) throw new Error("workflow_source_identity_invalid");
  if (["stage_changed", "approval_completed"].includes(input.trigger) && !sourceEvent) throw new Error("workflow_source_required");
  const client = admin(); const { data: rows, error } = await client.from("commercial_workflows").select("*").eq("business_id", input.businessId).eq("status", "active").eq("trigger_type", input.trigger);
  if (error) throw new Error("workflow_lookup_failed"); const results = [];
  for (const row of rows ?? []) {
    const definition = rowDefinition(row as WorkflowRow);
    const runPayload = { workflow_id: definition.id, business_id: input.businessId, triggered_by_profile_id: input.triggeredByProfileId ?? null,
      trigger_type: input.trigger, event_key: clean(input.eventKey, 180), target_id: input.targetId, status: "evaluating",
      definition_snapshot: definitionSnapshot(definition), definition_hash: definitionHash(definition), effect_records: [], effects_idempotent: true, source_event: sourceEvent };
    const { data: run, error: runError } = await client.from("commercial_workflow_runs").insert(runPayload).select("*").maybeSingle();
    if (runError || !run) {
      const existing = requireQuery(await client.from("commercial_workflow_runs").select("id,status,guard_reason")
        .eq("business_id", input.businessId).eq("workflow_id", definition.id).eq("event_key", runPayload.event_key).eq("target_id", input.targetId).maybeSingle(), "workflow_run_lookup_failed");
      if (existing) { results.push({ workflowId: definition.id, runId: existing.id, duplicate: true, status: existing.status, reason: existing.guard_reason }); continue; }
      throw new Error("workflow_run_create_failed");
    }
    results.push(await executeOwnedRun(run as RuntimeRun, definition));
  }
  return results;
}

// Explicit server entry point: the caller supplies only a run ID. Tenant,
// permissions, ownership generation and all mutation payloads come from server state.
export async function recoverCommercialWorkflowRun(runId: string) {
  if (!uuidPattern.test(runId)) throw new Error("workflow_run_invalid");
  const actor = await currentWorkflowActor(); const client = admin();
  const run = requireQuery(await client.from("commercial_workflow_runs").select("*")
    .eq("id", runId).eq("business_id", actor.businessId).maybeSingle(), "workflow_run_lookup_failed") as RuntimeRun | null;
  if (!run) throw new Error("workflow_run_not_found");
  const unavailable = (reason: string) => ({ runId: run.id, recovered: false as const, status: run.status, reason });
  const cutoff = new Date(Date.now() - recoveryStaleAfterMs).toISOString();
  if (run.is_test_run || !["failed", "evaluating"].includes(run.status)) return unavailable("Starea rulării nu permite recuperarea.");
  if (run.status === "evaluating" && (!Number.isFinite(Date.parse(run.updated_at)) || Date.parse(run.updated_at) >= Date.parse(cutoff))) return unavailable("Evaluarea este încă activă.");
  if (run.retry_count >= 2 || run.attempt_count >= 3) return unavailable("Limita de două recuperări a fost atinsă.");
  // Read creator identity only; an edited definition must never enter recovery.
  const creator = requireQuery(await client.from("commercial_workflows").select("created_by_profile_id,created_at")
    .eq("id", run.workflow_id).eq("business_id", actor.businessId).maybeSingle(), "workflow_lookup_failed");
  if (!creator) throw new Error("workflow_not_found");
  const definition = storedDefinition(run, creator);
  if (requiredPermissions(definition.actions).some((permission) => !actor.permissions.includes(permission))) throw new Error("workflow_forbidden");
  if (!run.effects_idempotent && definition.actions.some((action, index) => action.type === "create_notification" &&
    !run.effect_records.some((receipt) => receipt.kind === "internal_notification" && receipt.key === deterministicUuid(`${run.id}:${index}:${action.type}`) && uuidPattern.test(receipt.id)))) {
    return unavailable("Notificările istorice fără recipisă necesită verificare manuală înainte de recuperare.");
  }
  const now = new Date().toISOString();
  let claim = client.from("commercial_workflow_runs").update({
    status: "evaluating", retry_count: run.retry_count + 1, attempt_count: run.attempt_count + 1,
    recovery_started_at: now, updated_at: now, completed_at: null
  }).eq("id", run.id).eq("business_id", actor.businessId).eq("status", run.status)
    .eq("retry_count", run.retry_count).eq("attempt_count", run.attempt_count).eq("updated_at", run.updated_at);
  if (run.status === "evaluating") claim = claim.lt("updated_at", cutoff);
  const claimed = requireQuery(await claim.select("*").maybeSingle(), "workflow_recovery_claim_failed") as RuntimeRun | null;
  if (!claimed) return unavailable("Rularea a fost preluată sau actualizată de o altă încercare.");
  return { ...await executeOwnedRun(claimed, definition), recovered: true as const };
}

async function currentWorkflowActor() { const [authorization, current] = await Promise.all([getAuthorizationContext(), getCurrentBusinessForUser({ redirectIfMissing: false })]); if (!authorization.profileId || !current || !authorization.permissions.includes("settings.update")) throw new Error("workflow_forbidden"); return { profileId: authorization.profileId, businessId: current.business.id, permissions: authorization.permissions }; }
export async function createCommercialWorkflowDraft(input: { name: string; description?: string; trigger: WorkflowTrigger; conditions?: WorkflowCondition[]; actions: Array<Omit<WorkflowAction, "requiresHumanApproval">>; source?: "manual" | "ai_assisted" }) { const actor = await currentWorkflowActor(); const draft = createWorkflowDraft({ id: randomUUID(), name: input.name, description: input.description, trigger: input.trigger, conditions: input.conditions, actions: input.actions, createdBy: actor.profileId, source: input.source }); const { data, error } = await admin().from("commercial_workflows").insert({ id: draft.id, business_id: actor.businessId, name: draft.name, description: draft.source === "ai_assisted" ? `[AI] ${draft.description ?? ""}`.trim() : draft.description || null, status: "draft", trigger_type: draft.trigger, conditions: draft.conditions, actions: draft.actions, created_by_profile_id: actor.profileId }).select("id").single(); if (error || !data) throw new Error("workflow_draft_create_failed"); return data.id; }
export async function createCommercialWorkflowFromPlaybook(playbookId: string) {
  const playbook = workflowPlaybook(playbookId);
  if (!playbook) throw new Error("workflow_playbook_unavailable");
  // Uses existing settings.update authorization and always inserts a draft.
  return createCommercialWorkflowDraft({ name: playbook.name, description: playbook.description,
    trigger: playbook.trigger, conditions: playbook.conditions, actions: playbook.actions, source: "manual" });
}
export async function createCommercialWorkflowDraftFromQuestion(questionInput: string, confirmationId: string) {
  const actor = await currentWorkflowActor();
  const question = clean(questionInput, 1000);
  const confirmation = clean(confirmationId, 80);
  if (!uuidPattern.test(confirmation)) throw new Error("workflow_confirmation_invalid");

  const interpretation = interpretCommercialWorkflowRequest(question);
  const validation = validateWorkflowDraftInterpretation(interpretation);
  if (!validation.valid || !interpretation.definition) throw new Error("workflow_draft_not_ready");

  const id = deterministicUuid("ask-workflow:" + actor.businessId + ":" + actor.profileId + ":" + confirmation);
  const draft = createWorkflowDraft({
    id,
    name: interpretation.definition.name,
    description: interpretation.definition.description,
    trigger: interpretation.definition.trigger,
    conditions: interpretation.definition.conditions,
    actions: interpretation.definition.actions,
    createdBy: actor.profileId,
    source: "ai_assisted",
  });
  const client = admin();
  const { data, error } = await client.from("commercial_workflows").insert({
    id: draft.id,
    business_id: actor.businessId,
    name: draft.name,
    description: ("[AI] " + (draft.description ?? "")).trim(),
    status: "draft",
    trigger_type: draft.trigger,
    conditions: draft.conditions,
    actions: draft.actions,
    created_by_profile_id: actor.profileId,
  }).select("id,status").maybeSingle();

  if (error || !data) {
    const { data: existing } = await client
      .from("commercial_workflows")
      .select("id,status,created_by_profile_id")
      .eq("id", id)
      .eq("business_id", actor.businessId)
      .eq("created_by_profile_id", actor.profileId)
      .maybeSingle();
    if (existing?.status === "draft") return { id: existing.id, replay: true };
    throw new Error("workflow_draft_create_failed");
  }

  await client.from("audit_logs").insert({
    business_id: actor.businessId,
    profile_id: actor.profileId,
    action: "commercial_workflow_created_via_ask",
    entity_type: "commercial_workflow",
    entity_id: data.id,
    metadata: {
      interpretation: "deterministic",
      request_hash: createHash("sha256").update(question).digest("hex"),
      confirmation_id: confirmation,
      status: "draft",
      activation_requested: false,
      external_send: false,
    },
  });
  return { id: data.id, replay: false };
}
export async function updateCommercialWorkflowDefinition(workflowId: string, input: {
  name: string; description?: string; trigger: WorkflowTrigger; conditions: WorkflowCondition[];
  actions: Array<Omit<WorkflowAction, "requiresHumanApproval">>;
}) {
  if (!uuidPattern.test(workflowId)) throw new Error("workflow_invalid");
  const actor = await currentWorkflowActor(); const client = admin();
  const { data: row } = await client.from("commercial_workflows").select("*").eq("id", workflowId).eq("business_id", actor.businessId).maybeSingle();
  if (!row) throw new Error("workflow_not_found");
  if (!["draft", "paused"].includes(row.status)) throw new Error("workflow_edit_requires_pause");
  const current = rowDefinition(row as WorkflowRow);
  const draft = createWorkflowDraft({ id: current.id, name: input.name, description: input.description, trigger: input.trigger, conditions: input.conditions, actions: input.actions, createdBy: current.createdBy, createdAt: current.createdAt, source: current.source });
  const description = current.source === "ai_assisted" ? `[AI] ${draft.description ?? ""}`.trim() : draft.description || null;
  const { data, error } = await client.from("commercial_workflows").update({ name: draft.name, description, trigger_type: draft.trigger, conditions: draft.conditions, actions: draft.actions, updated_at: new Date().toISOString() }).eq("id", workflowId).eq("business_id", actor.businessId).in("status", ["draft", "paused"]).select("id").maybeSingle();
  if (error || !data) throw new Error("workflow_update_conflict");
  await client.from("audit_logs").insert({ business_id: actor.businessId, profile_id: actor.profileId, action: "commercial_workflow_updated", entity_type: "commercial_workflow", entity_id: workflowId, metadata: { trigger: draft.trigger, condition_count: draft.conditions.length, action_count: draft.actions.length, external_send: false } });
  return data.id;
}

export async function getCommercialWorkflowEditor(workflowId: string, selectedRunId?: string) {
  if (!uuidPattern.test(workflowId)) throw new Error("workflow_invalid");
  const actor = await currentWorkflowActor(); const client = admin();
  const [workflowResult, runsResult, opportunitiesResult] = await Promise.all([
    client.from("commercial_workflows").select("*").eq("id", workflowId).eq("business_id", actor.businessId).maybeSingle(),
    client.from("commercial_workflow_runs").select("*").eq("workflow_id", workflowId).eq("business_id", actor.businessId).order("created_at", { ascending: false }).limit(50),
    client.from("opportunities").select("id,title").eq("business_id", actor.businessId).order("updated_at", { ascending: false }).limit(100)
  ]);
  const row = requireQuery(workflowResult, "workflow_lookup_failed");
  if (!row) throw new Error("workflow_not_found");
  const runs = requireQuery(runsResult, "workflow_history_unavailable") ?? [];
  const opportunities = requireQuery(opportunitiesResult, "workflow_targets_unavailable") ?? [];
  if (selectedRunId && uuidPattern.test(selectedRunId) && !runs.some((run) => run.id === selectedRunId)) {
    const selected = requireQuery(await client.from("commercial_workflow_runs").select("*")
      .eq("id", selectedRunId).eq("workflow_id", workflowId).eq("business_id", actor.businessId).maybeSingle(), "workflow_history_unavailable");
    if (selected) runs.push(selected);
  }
  const definition = rowDefinition(row as WorkflowRow);
  let permissions: readonly string[] | null = null;
  try { permissions = await actorPermissions(actor.businessId, definition.createdBy); } catch { /* Activation remains unavailable. */ }
  const preflight = workflowActivationPreflight(definition, permissions);
  const selectedRun = runs.find((run) => run.id === selectedRunId);
  let plans: WorkflowStoredPlan[] = [];
  if (selectedRun?.prepared_action_plan_ids?.length) {
    const stored = requireQuery(await client.from("ask_action_plans")
      .select("id,action_type,target_id,target_label,status,proposal,evidence,result_entity_type,result_entity_id")
      .eq("business_id", actor.businessId).eq("created_by_profile_id", actor.profileId)
      .in("id", selectedRun.prepared_action_plan_ids).limit(6), "workflow_plans_unavailable") ?? [];
    plans = (stored as WorkflowStoredPlan[]).filter((plan) => workflowRunIdFromEvidence(plan.evidence) === selectedRun.id);
  }
  return { workflow: definition, runs, opportunities, preflight, plans };
}

export async function setCommercialWorkflowStatus(workflowId: string, status: Extract<WorkflowStatus, "active" | "paused" | "archived">) {
  if (!uuidPattern.test(workflowId)) throw new Error("workflow_invalid");
  const actor = await currentWorkflowActor();
  const client = admin();
  const { data: row } = await client.from("commercial_workflows").select("*").eq("id", workflowId).eq("business_id", actor.businessId).maybeSingle();
  if (!row) throw new Error("workflow_not_found");

  if (status === "active") {
    const definition = rowDefinition(row as WorkflowRow);
    validateWorkflowDefinition(definition);
    if (!workflowTriggerCapability(definition.trigger).automatic) {
      throw new Error("workflow_trigger_runner_unavailable");
    }
    const preflight = workflowActivationPreflight(definition, await actorPermissions(actor.businessId, definition.createdBy));
    if (!preflight.canActivate) throw new Error("workflow_activation_preflight_failed");
  }

  const now = new Date().toISOString();
  const patch: WorkflowStatusPatch = { status, updated_at: now };
  if (status === "active") patch.activated_at = now;
  if (status === "paused") patch.paused_at = now;
  if (status === "archived") patch.archived_at = now;
  const { data } = await client.from("commercial_workflows").update(patch).eq("id", workflowId).eq("business_id", actor.businessId).eq("updated_at", row.updated_at).in("status", status === "active" ? ["draft", "paused"] : ["draft", "active", "paused"]).select("id").maybeSingle();
  if (!data) throw new Error("workflow_status_conflict");
  await client.from("audit_logs").insert({ business_id: actor.businessId, profile_id: actor.profileId, action: "commercial_workflow_" + status, entity_type: "commercial_workflow", entity_id: workflowId, metadata: { status, ai_activation: false, automatic_runner: status === "active" } });
}
export async function testCommercialWorkflow(workflowId: string, targetId: string) { if (!uuidPattern.test(workflowId) || !uuidPattern.test(targetId)) throw new Error("workflow_test_invalid"); const actor = await currentWorkflowActor(); const client = admin(); const { data: row } = await client.from("commercial_workflows").select("*").eq("id", workflowId).eq("business_id", actor.businessId).maybeSingle(); if (!row) throw new Error("workflow_not_found"); const definition = { ...rowDefinition(row as WorkflowRow), status: "active" as const }; const loaded = await loadRuntimeContext(actor.businessId, actor.profileId, targetId); const eventKey = `test:${actor.profileId}:${randomUUID()}`; const evaluation = evaluateWorkflow(definition, { trigger: definition.trigger, eventKey, targetType: "opportunity", targetId }, loaded.context); const { data: run, error } = await client.from("commercial_workflow_runs").insert({ workflow_id: definition.id, business_id: actor.businessId, triggered_by_profile_id: actor.profileId, trigger_type: definition.trigger, event_key: eventKey, target_id: targetId, status: workflowRunStatus(evaluation), condition_results: evaluation.conditionResults, commercial_state: evaluation.commercialState, guard_decision: evaluation.decision, guard_reason: `TEST RUN · ${evaluation.reason}`, human_approval_required: evaluation.humanApprovalRequired, is_test_run: true, definition_snapshot: definitionSnapshot(definition), definition_hash: definitionHash(definition), completed_at: new Date().toISOString() }).select("id").single(); if (error || !run) throw new Error("workflow_test_failed"); return { runId: run.id, label: "TEST RUN", actionExecuted: false, evaluation }; }
export async function getCommercialWorkflowWorkspace() { const actor = await currentWorkflowActor(); const client = admin(); const [workflowResult, runResult, opportunityResult] = await Promise.all([client.from("commercial_workflows").select("*").eq("business_id", actor.businessId).order("updated_at", { ascending: false }).limit(50), client.from("commercial_workflow_runs").select("id,workflow_id,trigger_type,target_id,status,guard_decision,guard_reason,failure_category,is_test_run,created_at").eq("business_id", actor.businessId).order("created_at", { ascending: false }).limit(50), client.from("opportunities").select("id,title").eq("business_id", actor.businessId).order("updated_at", { ascending: false }).limit(100)]); if(workflowResult.error||runResult.error||opportunityResult.error)throw new Error("workflow_workspace_unavailable"); const workflows=workflowResult.data,runs=runResult.data,opportunities=opportunityResult.data; return { workflows: (workflows ?? []).map((row) => rowDefinition(row as WorkflowRow)), runs: runs ?? [], opportunities: opportunities ?? [] }; }
