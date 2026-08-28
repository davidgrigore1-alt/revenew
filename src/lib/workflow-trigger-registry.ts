import type { WorkflowTrigger } from "@/lib/workflow-foundation";

export type WorkflowEventOrigin = "user" | "external_authorized" | "system_import" | "workflow";
export type WorkflowSourceEvent = {
  kind: "opportunity" | "opportunity_event" | "approval";
  id: string;
  occurredAt: string;
  origin: WorkflowEventOrigin;
  actorProfileId?: string | null;
  previousStage?: string;
  nextStage?: string;
  causationRunId?: string | null;
};
type TriggerRegistration = {
  value: WorkflowTrigger; label: string; description: string; group: string;
  automatic: boolean; targetType: "opportunity"; canonicalSource: string | null;
  eventKeyStrategy: string | null; explanation: string;
};
const later = { automatic: false, targetType: "opportunity" as const, canonicalSource: null, eventKeyStrategy: null };
export const workflowTriggerRegistry: Record<WorkflowTrigger, TriggerRegistration> = {
  opportunity_created: { value: "opportunity_created", label: "Oportunitate creată", description: "O oportunitate creată manual din CRM.", group: "Oportunități", automatic: true, targetType: "opportunity", canonicalSource: "crm.createCrmOpportunity", eventKeyStrategy: "opportunity:{id}:created", explanation: "După crearea autorizată din CRM; importurile și celelalte căi de creare nu sunt conectate." },
  stage_changed: { value: "stage_changed", label: "Etapă schimbată", description: "O tranziție reală salvată din controlul pipeline.", group: "Oportunități", automatic: true, targetType: "opportunity", canonicalSource: "opportunity_events.stage_changed", eventKeyStrategy: "opportunity-event:{id}:stage_changed", explanation: "Numai la schimbarea efectivă a etapei prin controlul pipeline, nu la editări generale." },
  approval_completed: { value: "approval_completed", label: "Aprobare finalizată", description: "O cerere aprobată explicit pentru o oportunitate sau un document asociat.", group: "Control", automatic: true, targetType: "opportunity", canonicalSource: "business_approval_requests.approved", eventKeyStrategy: "approval:{id}:approved", explanation: "După decizia aprobată, cu țintă verificată; nu înseamnă că operațiunea protejată a fost executată." },
  reply_received: { ...later, value: "reply_received", label: "Răspuns primit", description: "Un răspuns relevant al clientului.", group: "Comunicare", explanation: "Asocierea Gmail după contact nu dovedește un răspuns la conversația oportunității. Lipsește corelarea verificată a răspunsului." },
  email_received: { ...later, value: "email_received", label: "Email primit", description: "Un mesaj nou în sursa autorizată.", group: "Comunicare", explanation: "Un email primit nu este automat un eveniment comercial relevant." },
  next_action_overdue: { ...later, value: "next_action_overdue", label: "Acțiune următoare restantă", description: "Pasul următor a depășit termenul.", group: "Oportunități", explanation: "Necesită un mecanism de evaluare la termen; nu există polling sau verificări automate periodice." },
  meeting_upcoming: { ...later, value: "meeting_upcoming", label: "Întâlnire apropiată", description: "Pregătire înaintea întâlnirii.", group: "Întâlniri", explanation: "Necesită planificare temporală; sincronizarea calendarului nu declanșează acest workflow." },
  scheduled_review: { ...later, value: "scheduled_review", label: "Revizuire programată", description: "Revizuire la momentul stabilit.", group: "Control", explanation: "Necesită un scheduler, amânat pentru o etapă ulterioară." }
};

export function workflowTriggerCapability(trigger: WorkflowTrigger) {
  const registration = workflowTriggerRegistry[trigger];
  return { ...registration, label: registration.automatic ? "Trigger activ" : "Trigger disponibil ulterior" };
}
export const workflowStageLabels: Record<string, string> = { new: "Nouă", reviewed: "Revizuită", action_generated: "Acțiune pregătită", contacted: "Contactat", follow_up_needed: "Follow-up necesar" };
export const workflowEventOrigins: Record<WorkflowEventOrigin, string> = {
  user: "Acțiune confirmată de utilizator", external_authorized: "Sursă externă autorizată",
  system_import: "Sistem / import", workflow: "Workflow — înlănțuire oprită"
};
export function workflowEventKey(trigger: WorkflowTrigger, source: WorkflowSourceEvent) {
  if (trigger === "opportunity_created" && source.kind === "opportunity") return `opportunity:${source.id}:created`;
  if (trigger === "stage_changed" && source.kind === "opportunity_event") return `opportunity-event:${source.id}:stage_changed`;
  if (trigger === "approval_completed" && source.kind === "approval") return `approval:${source.id}:approved`;
  throw new Error("workflow_source_incompatible");
}
const sourceUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function safeWorkflowSourceEvent(value: WorkflowSourceEvent): WorkflowSourceEvent {
  if (!sourceUuid.test(value.id) || !Number.isFinite(Date.parse(value.occurredAt)) ||
    !["opportunity", "opportunity_event", "approval"].includes(value.kind) || !Object.hasOwn(workflowEventOrigins, value.origin)) throw new Error("workflow_source_invalid");
  const stages = ["new", "reviewed", "action_generated", "contacted", "follow_up_needed"];
  if (value.previousStage !== undefined && !stages.includes(value.previousStage)) throw new Error("workflow_source_invalid");
  if (value.nextStage !== undefined && !stages.includes(value.nextStage)) throw new Error("workflow_source_invalid");
  return { kind: value.kind, id: value.id, occurredAt: value.occurredAt, origin: value.origin,
    actorProfileId: value.actorProfileId && sourceUuid.test(value.actorProfileId) ? value.actorProfileId : null,
    ...(value.previousStage ? { previousStage: value.previousStage } : {}),
    ...(value.nextStage ? { nextStage: value.nextStage } : {}),
    causationRunId: value.causationRunId && sourceUuid.test(value.causationRunId) ? value.causationRunId : null };
}
export function mayDispatchWorkflowEvent(trigger: WorkflowTrigger, source: WorkflowSourceEvent) {
  if (!workflowTriggerRegistry[trigger]?.automatic || source.origin === "workflow" || source.causationRunId) return false;
  if (!Object.hasOwn(workflowEventOrigins, source.origin)) return false;
  return trigger !== "stage_changed" || Boolean(source.previousStage && source.nextStage && source.previousStage !== source.nextStage);
}
