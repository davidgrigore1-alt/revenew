import "server-only";

import { createHash } from "node:crypto";
import { buildCommercialInterventions, type InterventionCommunication, type InterventionPrivateContext } from "@/lib/commercial-interventions";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { getRevenueWorkspaceSummary } from "@/lib/revenue-workspace";
import { getOwnedGoogleConnection, requireGoogleConnectorActor } from "@/lib/google-workspace/repository";
import { getResponseWindowBusinessDays } from "@/lib/communication-os";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createStoredActionPlanForActor, approveAskActionPlan, riskFor, type AskActionProposal } from "@/lib/ai/action-planner";
import { buildOpportunityCommercialState } from "@/lib/opportunity-commercial-state";
import { suggestFutureActionDueAt } from "@/lib/opportunity-domain";
import type { CommercialSignal, Opportunity } from "@/lib/types";
import type { CopilotPreparedAction } from "@/lib/ai/copilot-types";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const uuid = (value: string) => { const h = hash(value); return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`; };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function interventionActor() {
  const [authorization, current] = await Promise.all([getAuthorizationContext(), getCurrentBusinessForUser({ redirectIfMissing: false })]);
  if (!authorization.authenticated || !authorization.profileId || !current || current.source !== "supabase" || current.profileId !== authorization.profileId || !authorization.permissions.includes("opportunities.read")) throw new Error("intervention_forbidden");
  return { businessId: current.business.id, profileId: authorization.profileId, permissions: authorization.permissions, isManager: ["business_owner", "business_admin", "business_manager"].includes(authorization.businessRole ?? "") };
}

/** Bounded metadata projection: no bodies, subjects, participant lists, or provider identifiers. */
async function privateFacts(actor: Awaited<ReturnType<typeof interventionActor>>, opportunityIds: string[], now: Date): Promise<InterventionPrivateContext> {
  const empty: InterventionPrivateContext = { businessId: actor.businessId, profileId: actor.profileId, state: "not_connected", byOpportunityId: {} };
  if (!opportunityIds.length) return empty;
  try {
    const googleActor = await requireGoogleConnectorActor();
    if (googleActor.businessId !== actor.businessId || googleActor.profileId !== actor.profileId) return { ...empty, state: "unavailable" };
    const connection = await getOwnedGoogleConnection(googleActor);
    if (!connection) return empty;
    const client = createSupabaseAdminClient();
    if (!client) return { ...empty, state: "unavailable" };
    const ids = opportunityIds.slice(0, 200);
    const [emails, events, drafts, responseWindowDays] = await Promise.all([
      client.from("external_email_messages").select("id,linked_opportunity_id,sent_at,direction")
        .eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId).eq("connection_id", connection.id)
        .in("linked_opportunity_id", ids).lte("sent_at", now.toISOString()).order("sent_at", { ascending: false }).order("id").limit(1000),
      client.from("external_calendar_events").select("id,linked_opportunity_id,starts_at")
        .eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId).eq("connection_id", connection.id)
        .in("linked_opportunity_id", ids).neq("event_status", "cancelled").gte("starts_at", now.toISOString())
        .lte("starts_at", new Date(now.getTime() + 3 * 86_400_000).toISOString()).order("starts_at").order("id").limit(200),
      client.from("communication_drafts").select("id,linked_opportunity_id,updated_at,source_message_id")
        .eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId).eq("connection_id", connection.id)
        .in("linked_opportunity_id", ids).in("status", ["draft", "ready", "failed"]).order("updated_at", { ascending: false }).order("id").limit(200),
      getResponseWindowBusinessDays(googleActor)
    ]);
    const byOpportunityId: Record<string, InterventionCommunication> = {};
    const entry = (id: string) => byOpportunityId[id] ??= { responseWindowDays };
    const emailComplete = !emails.error && (emails.data?.length ?? 0) < 1000;
    const eventComplete = !events.error && (events.data?.length ?? 0) < 200;
    const draftComplete = !drafts.error && (drafts.data?.length ?? 0) < 200;
    // A truncated mailbox cannot prove that a reply has no newer outbound.
    if (emailComplete) for (const row of emails.data ?? []) {
      if (row.direction !== "inbound" && row.direction !== "outbound") continue;
      const value = entry(row.linked_opportunity_id);
      const direction: "inbound" | "outbound" = row.direction;
      if (!value[direction]) value[direction] = { id: row.id, at: row.sent_at };
    }
    if (eventComplete && draftComplete) for (const row of events.data ?? []) {
      const value = entry(row.linked_opportunity_id);
      if (!value.meeting) value.meeting = { id: row.id, at: row.starts_at };
    }
    if (draftComplete) for (const row of drafts.data ?? []) {
      const value = entry(row.linked_opportunity_id);
      if (!value.prepared) value.prepared = { id: row.id, at: row.updated_at, href: row.source_message_id ? `/inbox?email=${row.source_message_id}` : "/inbox" };
    }
    return { ...empty, state: emailComplete && eventComplete && draftComplete && connection.status === "connected" && connection.gmail_status === "connected" && connection.calendar_status === "connected" ? "available" : "partial", byOpportunityId };
  } catch { return { ...empty, state: "unavailable" }; }
}

async function currentBrief(actor: Awaited<ReturnType<typeof interventionActor>>, records?: { opportunities: Opportunity[]; signals: CommercialSignal[] }) {
  const data = records ?? await getRevenueWorkspaceSummary();
  const opportunities = data.opportunities.filter((item) => item.businessId === actor.businessId && (actor.isManager || item.ownerProfileId === actor.profileId)).slice(0, 200);
  const now = new Date();
  const context = await privateFacts(actor, opportunities.map((item) => item.id), now);
  const brief = buildCommercialInterventions({ opportunities, signals: data.signals, viewer: actor, privateContext: context, now });
  return { opportunities, brief: { ...brief, items: brief.items.map(({ revision, ...item }) => ({ ...item, version: hash(`${context.state}:${revision}`) })) } };
}
export type InterventionBrief = Awaited<ReturnType<typeof currentBrief>>["brief"];
export type InterventionView = InterventionBrief["items"][number];

/** Also used by the canonical G1 approver: its generic route cannot bypass freshness. */
export async function assertCommercialInterventionCurrent(opportunityId: string, version: string) {
  const { brief } = await currentBrief(await interventionActor());
  if (!brief.items.some((item) => item.opportunityId === opportunityId && item.version === version)) throw new Error("ask_action_stale");
}

export async function getCommercialInterventionBrief(records: { opportunities: Opportunity[]; signals: CommercialSignal[] }): Promise<InterventionBrief | null> {
  try { return (await currentBrief(await interventionActor(), records)).brief; }
  catch { return null; }
}

/** Re-read the same bounded data at preparation AND approval. The browser supplies no action/filter/evidence. */
export async function handleCommercialIntervention(input: { opportunityId: string; version: string; operation: "prepare" | "approve"; planId?: string; proposal?: unknown }) {
  if (!uuidPattern.test(input.opportunityId) || !/^[a-f0-9]{64}$/.test(input.version)) throw new Error("intervention_invalid");
  const actor = await interventionActor();
  const { brief, opportunities } = await currentBrief(actor);
  const item = brief.items.find((candidate) => candidate.opportunityId === input.opportunityId);
  if (!item || item.version !== input.version) throw new Error("intervention_changed");
  if (item.safeAction === "review") throw new Error("intervention_review_existing");
  const key = uuid(`intervention-v1:${actor.businessId}:${actor.profileId}:${item.id}:${item.version}`);
  if (input.operation === "approve") {
    if (!input.planId || !uuidPattern.test(input.planId)) throw new Error("intervention_invalid");
    const client = createSupabaseAdminClient();
    if (!client) throw new Error("intervention_unavailable");
    const { data: plan, error } = await client.from("ask_action_plans").select("id")
      .eq("id", input.planId).eq("business_id", actor.businessId).eq("created_by_profile_id", actor.profileId)
      .eq("idempotency_key", key).eq("target_id", item.opportunityId).eq("action_type", item.safeAction).maybeSingle();
    if (error || !plan) throw new Error("intervention_changed");
    return approveAskActionPlan(plan.id, input.proposal);
  }
  const opportunity = opportunities.find((record) => record.id === item.opportunityId)!;
  const state = buildOpportunityCommercialState(opportunity);
  const proposal: AskActionProposal = item.safeAction === "prepare_email"
    ? { subject: "Confirmarea următorului pas", body: `Bună ziua,\n\nVă mulțumesc pentru răspuns. Aș dori să confirmăm următorul pas${item.meetingAt ? " și agenda întâlnirii" : " al discuției noastre"}. Ce aspecte ar trebui să clarificăm înainte de a continua?\n\nCu bine,` }
    : { title: item.recommendation, description: item.reasons.map((reason) => reason.label).join("\n"), priority: item.priority === "critical" ? "high" : "medium", ownerProfileId: opportunity.ownerProfileId, dueAt: suggestFutureActionDueAt({ critical: item.priority === "critical", meetingAt: item.safeAction === "create_task" ? item.meetingAt : null }), ...(item.safeAction === "update_next_action" ? { actionId: state.nextAction?.id ?? null } : {}) };
  const plan = await createStoredActionPlanForActor({ actor, actionType: item.safeAction, targetId: item.opportunityId, targetLabel: item.title, proposal,
    evidence: [{ sourceId: item.version, label: "Contextul intervenției la pregătire", sourceType: "commercial_intervention" }, ...item.evidence.map((source) => ({ sourceId: source.id, label: source.label, sourceType: source.source }))], idempotencyKey: key });
  const action: CopilotPreparedAction = {
    id: plan.id, planId: plan.id, type: item.safeAction === "prepare_email" ? "email_draft" : item.safeAction === "create_task" ? "task_draft" : "next_action_draft",
    actionType: item.safeAction, title: item.safeAction === "prepare_email" ? "Răspuns pregătit pentru revizuire" : "Următorul pas pregătit",
    status: "prepared_not_executed", editable: true, subject: proposal.subject ?? proposal.title, body: proposal.body ?? proposal.description,
    proposal, riskLevel: riskFor(item.safeAction), target: { type: "opportunity", id: item.opportunityId, label: item.title },
    rationale: item.recommendation, evidenceSourceIds: item.evidence.map((source) => source.id),
    executionNotice: item.safeAction === "prepare_email" ? "Aprobarea salvează un draft în Inbox. Niciun email nu este trimis." : "Doar aprobarea explicită aplică această acțiune internă. Contextul este reverificat."
  };
  return { ok: true, action };
}
