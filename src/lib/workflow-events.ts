import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { processCommercialWorkflowEvent } from "@/lib/workflow-runtime";
import { mayDispatchWorkflowEvent, workflowEventKey, type WorkflowEventOrigin, type WorkflowSourceEvent } from "@/lib/workflow-trigger-registry";
import type { WorkflowTrigger } from "@/lib/workflow-foundation";

function admin() { const client = createSupabaseAdminClient(); if (!client) throw new Error("workflow_events_unavailable"); return client; }
async function dispatch(businessId: string, targetId: string, trigger: WorkflowTrigger, sourceEvent: WorkflowSourceEvent) {
  if (!mayDispatchWorkflowEvent(trigger, sourceEvent)) return { failed: false, suppressed: true };
  const target = await admin().from("opportunities").select("id").eq("id", targetId).eq("business_id", businessId).maybeSingle();
  if (target.error || !target.data) throw new Error("workflow_event_target_unavailable");
  const results = await processCommercialWorkflowEvent({ businessId, targetId, trigger, sourceEvent,
    eventKey: workflowEventKey(trigger, sourceEvent), triggeredByProfileId: sourceEvent.actorProfileId });
  return { failed: results.some((result) => result.status === "failed"), suppressed: false };
}

// Called only after the canonical mutation persisted its event; not a browser action.
export async function dispatchStageChangedEvent(businessId: string, eventId: string) {
  try {
    const { data: event, error } = await admin().from("opportunity_events")
      .select("id,business_id,opportunity_id,event_type,occurred_at,actor_profile_id,metadata")
      .eq("id", eventId).eq("business_id", businessId).eq("event_type", "stage_changed").maybeSingle();
    if (error || !event) throw new Error("workflow_source_event_unavailable");
    const metadata = event.metadata ?? {};
    return await dispatch(businessId, event.opportunity_id, "stage_changed", {
      kind: "opportunity_event", id: event.id, occurredAt: event.occurred_at,
      actorProfileId: event.actor_profile_id, origin: metadata.origin as WorkflowEventOrigin,
      previousStage: metadata.previous_status, nextStage: metadata.next_status,
      causationRunId: metadata.workflow_run_id ?? null
    });
  } catch { return { failed: true, suppressed: false }; }
}

export async function dispatchApprovalCompletedEvent(businessId: string, approvalId: string) {
  try {
    const { data: approval, error } = await admin().from("business_approval_requests")
      .select("id,status,entity_type,entity_id,decided_at,decided_by_profile_id")
      .eq("id", approvalId).eq("business_id", businessId).maybeSingle();
    if (error || !approval) throw new Error("workflow_approval_unavailable");
    if (!["approved", "executed"].includes(approval.status) || !approval.decided_at || !approval.decided_by_profile_id) return { failed: false, suppressed: true };
    let targetId: string;
    if (approval.entity_type === "opportunity") targetId = approval.entity_id;
    else if (approval.entity_type === "opportunity_document") {
      const document = await admin().from("opportunity_documents").select("opportunity_id")
        .eq("id", approval.entity_id).eq("business_id", businessId).maybeSingle();
      if (document.error || !document.data) throw new Error("workflow_approval_target_unavailable");
      targetId = document.data.opportunity_id;
    } else return { failed: false, suppressed: true };
    return await dispatch(businessId, targetId, "approval_completed", {
      kind: "approval", id: approval.id, occurredAt: approval.decided_at,
      origin: "user", actorProfileId: approval.decided_by_profile_id
    });
  } catch { return { failed: true, suppressed: false }; }
}
