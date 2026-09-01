import "server-only";
import { workflowRunIdFromEvidence } from "@/lib/workflow-trace";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { getOpportunityForCurrentBusiness } from "@/lib/supabase/data";
import type { CopilotEvidence, CopilotPageContext, CopilotPreparedAction } from "@/lib/ai/copilot-types";
import { prepareOpportunityCommunicationDraft } from "@/lib/communication-os";
import { applicationDateKey, applicationLocalDateTimeToIso, assertFutureActionDueAt } from "@/lib/opportunity-domain";

export const askActionTypes = ["create_task", "update_next_action", "assign_owner", "add_note", "prepare_email", "update_opportunity_field", "create_notification"] as const;
export type AskActionType = typeof askActionTypes[number];
export type AskActionRisk = "low" | "review" | "external";
export type AskActionProposal = {
  title?: string; description?: string; dueAt?: string | null; priority?: "low" | "medium" | "high"; actionId?: string | null;
  ownerProfileId?: string | null; ownerLabel?: string | null; note?: string; subject?: string; body?: string;
  field?: "status" | "recommended_action" | "deadline"; value?: string;
};

type StoredPlan = {
  id: string; business_id: string; created_by_profile_id: string; action_type: AskActionType; risk_level: AskActionRisk;
  target_type: "opportunity" | "organization" | "contact" | "email" | "meeting"; target_id: string; target_label: string;
  status: "prepared" | "approved" | "executing" | "executed" | "rejected" | "expired" | "failed";
  proposal: AskActionProposal; evidence: Array<{ sourceId: string; label: string; sourceType: string }>;
  expected_target_updated_at: string | null; result_entity_type: string | null; result_entity_id: string | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statusValues = new Set(["new", "reviewed", "action_generated", "contacted", "follow_up_needed"]);

function admin() { const client = createSupabaseAdminClient(); if (!client) throw new Error("ask_action_storage_unavailable"); return client; }
function clean(value: unknown, max: number) { return typeof value === "string" ? value.normalize("NFKC").trim().slice(0, max) : ""; }
function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }

export function classifyAskActionIntent(question: string): AskActionType | null {
  const q = normalize(question);
  if (/(?:creeaza|creaza|adauga).*(?:task|sarcina)/.test(q)) return "create_task";
  if (/(?:muta|schimba|actualizeaza).*(?:urmatoarea actiune|pasul urmator|termen)|pregateste.*(?:urmatorul pas|pasul urmator|urmatoarea actiune)/.test(q)) return "update_next_action";
  if (/(?:atribuie|asigneaza|seteaza).*(?:responsabil|owner)|(?:responsabil|owner).*(?:lui|este)/.test(q)) return "assign_owner";
  if (/(?:adauga|creeaza|creaza).*(?:nota|notita)/.test(q)) return "add_note";
  if (/(?:pregateste|scrie|creeaza|creaza).*(?:email|mesaj|raspuns|follow-up)/.test(q)) return "prepare_email";
  if (/(?:muta|schimba|actualizeaza).*(?:status|stadiu|etapa|actiunea recomandata|deadline)/.test(q)) return "update_opportunity_field";
  return null;
}

function dueDate(question: string) {
  const q = normalize(question);
  const localDay = new Date(`${applicationDateKey(new Date())}T12:00:00Z`);
  const weekday = /\bjoi\b/.test(q) ? 4 : /\bvineri\b/.test(q) ? 5 : null;
  const offset = /\bmaine\b/.test(q) ? 1 : weekday === null ? null : (weekday - localDay.getUTCDay() + 7) % 7 || 7;
  const explicitDate = q.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1];
  if (!explicitDate && offset === null) return null;
  if (offset !== null) localDay.setUTCDate(localDay.getUTCDate() + offset);
  const time = q.match(/\b(?:ora|la)\s+([01]?\d|2[0-3])(?::([0-5]\d))?\b/);
  const due = applicationLocalDateTimeToIso(explicitDate ?? localDay.toISOString().slice(0, 10), time ? `${time[1].padStart(2, "0")}:${time[2] ?? "00"}` : "10:00");
  if (!due) throw new Error("ask_action_due_future_required");
  return due;
}
function textAfter(question: string, pattern: RegExp, fallback: string) { const match = question.match(pattern); return clean(match?.[1] || fallback, 500); }

export function proposalForIntent(type: AskActionType, question: string): AskActionProposal {
  if (type === "create_task") return { title: textAfter(question, /(?:task|sarcin[ăa])(?:\s+(?:pentru|ca|s[ăa]))?\s+(.+)/i, question), description: clean(question, 1200), dueAt: dueDate(question), priority: /urgent|critic/i.test(question) ? "high" : "medium" };
  if (type === "update_next_action") return { title: textAfter(question, /(?:acțiune|actiune|pas)(?:a)?\s+(?:pe|la|pentru)?\s*(.+)/i, "Revizuiește următorul pas comercial"), description: clean(question, 1200), dueAt: dueDate(question), priority: "medium" };
  if (type === "add_note") return { note: textAfter(question, /(?:not[ăa]|noti[țt][ăa])(?:\s+c[ăa])?\s+(.+)/i, question) };
  if (type === "prepare_email") return { subject: "Următorul pas comercial", body: clean(question, 3000) };
  if (type === "update_opportunity_field") {
    const q = normalize(question); if (/follow.?up/.test(q)) return { field: "status", value: "follow_up_needed" };
    if (/contact/.test(q)) return { field: "status", value: "contacted" };
    if (/reviz/.test(q)) return { field: "status", value: "reviewed" };
    return { field: "recommended_action", value: clean(question, 1000) };
  }
  return { ownerLabel: textAfter(question, /(?:lui|responsabil(?:ul)?\s+(?:este)?|owner(?:ul)?\s+(?:este)?)\s+([A-Za-zĂÂÎȘȚăâîșț .'-]+)/i, "") };
}

export function riskFor(type: AskActionType): AskActionRisk { return ["prepare_email", "assign_owner", "update_opportunity_field"].includes(type) ? "review" : "low"; }
function titleFor(type: AskActionType) { return ({ create_task: "Task comercial pregătit", update_next_action: "Următoarea acțiune pregătită", assign_owner: "Atribuire de responsabil pregătită", add_note: "Notă internă pregătită", prepare_email: "Email pregătit", update_opportunity_field: "Actualizare de oportunitate pregătită", create_notification: "Notificare internă pregătită" } as const)[type]; }

function permissionFor(type: AskActionType) { return ({ create_task: "actions.create", update_next_action: "actions.create", assign_owner: "opportunities.assign", add_note: "actions.create", prepare_email: "documents.generate", update_opportunity_field: "opportunities.update", create_notification: "actions.create" } as const)[type]; }
async function resolveOwner(businessId: string, proposal: AskActionProposal) {
  if (!proposal.ownerLabel) return proposal;
  const { data: members } = await admin().from("business_members").select("profile_id,profiles!inner(full_name,email)").eq("business_id", businessId).eq("status", "active");
  const wanted = normalize(proposal.ownerLabel);
  const profileFor = (row: any) => Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const matches = (members ?? []).filter((row: any) => { const profile = profileFor(row); return normalize(`${profile?.full_name ?? ""} ${profile?.email ?? ""}`).includes(wanted); });
  if (matches.length !== 1) return { ...proposal, ownerProfileId: null };
  const profile = profileFor(matches[0]);
  return { ...proposal, ownerProfileId: matches[0].profile_id, ownerLabel: profile?.full_name ?? profile?.email ?? proposal.ownerLabel };
}

export async function createStoredActionPlanForActor(input: {
  actor: { businessId: string; profileId: string; permissions: readonly string[] };
  actionType: AskActionType;
  targetId: string;
  targetLabel: string;
  proposal: AskActionProposal;
  evidence?: Array<{ sourceId: string; label: string; sourceType: string }>;
  idempotencyKey: string;
}) {
  if (!uuidPattern.test(input.actor.businessId) || !uuidPattern.test(input.actor.profileId) || !uuidPattern.test(input.targetId) || !uuidPattern.test(input.idempotencyKey)) throw new Error("ask_action_plan_invalid");
  if (!input.actor.permissions.includes(permissionFor(input.actionType))) throw new Error("ask_action_forbidden");
  if (!(await validMember(input.actor.businessId, input.actor.profileId))) throw new Error("ask_action_forbidden");
  const client = admin();
  const { data: target } = await client.from("opportunities").select("id,updated_at").eq("id", input.targetId).eq("business_id", input.actor.businessId).maybeSingle();
  if (!target) throw new Error("ask_action_target_missing");
  const proposal = validateProposal(input.actionType, input.proposal);
  if (proposal.ownerProfileId && !(await validMember(input.actor.businessId, proposal.ownerProfileId))) throw new Error("ask_action_owner_forbidden");
  const { data: existing } = await client.from("ask_action_plans").select("id").eq("business_id", input.actor.businessId).eq("idempotency_key", input.idempotencyKey).maybeSingle();
  if (existing) return { id: existing.id, replay: true as const };
  const payload = {
    business_id: input.actor.businessId,
    created_by_profile_id: input.actor.profileId,
    action_type: input.actionType,
    risk_level: riskFor(input.actionType),
    target_type: "opportunity",
    target_id: input.targetId,
    target_label: clean(input.targetLabel, 160) || "Oportunitate",
    proposal,
    evidence: (input.evidence ?? []).slice(0, 8),
    expected_target_updated_at: target.updated_at,
    idempotency_key: input.idempotencyKey
  };
  const { data, error } = await client.from("ask_action_plans").insert(payload).select("id").maybeSingle();
  if (!error && data) return { id: data.id, replay: false as const };
  const { data: raced } = await client.from("ask_action_plans").select("id").eq("business_id", input.actor.businessId).eq("idempotency_key", input.idempotencyKey).maybeSingle();
  if (raced) return { id: raced.id, replay: true as const };
  throw new Error("ask_action_plan_create_failed");
}
export async function prepareAskActionPlan(input: { question: string; context: CopilotPageContext; evidence: CopilotEvidence[]; proposalOverride?: AskActionProposal }): Promise<CopilotPreparedAction | null> {
  const type = classifyAskActionIntent(input.question); if (!type) return null;
  const authorization = await getAuthorizationContext(); const current = await getCurrentBusinessForUser({ redirectIfMissing: false });
  if (!authorization.profileId || !current || !authorization.permissions.includes(permissionFor(type))) return null;
  const targetId = input.context.opportunityId ?? (type === "add_note" ? input.context.organizationId : undefined);
  if (!targetId || !uuidPattern.test(targetId)) return null;
  const opportunity = input.context.opportunityId ? await getOpportunityForCurrentBusiness(input.context.opportunityId) : null;
  if (input.context.opportunityId && !opportunity) return null;
  let proposal = { ...proposalForIntent(type, input.question), ...(input.proposalOverride ?? {}) };
  const explicitDue = type === "create_task" || type === "update_next_action" ? dueDate(input.question) : null;
  if (explicitDue) proposal.dueAt = explicitDue;
  if (type === "create_task" || type === "update_next_action") assertFutureActionDueAt(proposal.dueAt);
  if (type === "update_next_action") proposal.actionId = opportunity?.actions?.find((item) => item.status === "pending")?.id ?? null;
  if (type === "assign_owner") proposal = await resolveOwner(current.business.id, proposal);
  const targetType = input.context.opportunityId ? "opportunity" : "organization";
  const targetLabel = opportunity?.title ?? input.context.contextLabel ?? "Înregistrarea curentă";
  const evidence = input.evidence.slice(0, 8).map((item) => ({ sourceId: item.sourceId, label: item.label, sourceType: item.sourceType }));
  const { data, error } = await admin().from("ask_action_plans").insert({ business_id: current.business.id, created_by_profile_id: authorization.profileId, action_type: type, risk_level: riskFor(type), target_type: targetType, target_id: targetId, target_label: targetLabel, proposal, evidence, expected_target_updated_at: opportunity?.updatedAt ?? null }).select("id").single();
  if (error || !data) throw new Error("ask_action_plan_create_failed");
  return { id: data.id, planId: data.id, type: type === "prepare_email" ? "email_draft" : type === "create_task" ? "task_draft" : type === "update_next_action" ? "next_action_draft" : type === "create_notification" ? "notification_draft" : "record_update_draft", actionType: type, riskLevel: riskFor(type), title: titleFor(type), status: "prepared_not_executed", editable: true, subject: proposal.subject ?? proposal.title, body: proposal.body ?? proposal.note ?? proposal.description, rationale: `Propunerea este limitată la ${targetLabel} și va fi revalidată înainte de aplicare.`, evidenceSourceIds: evidence.map((item) => item.sourceId), executionNotice: type === "prepare_email" ? "Emailul va fi salvat ca draft. Nu va fi trimis." : "Nicio modificare nu a fost aplicată. Este necesară aprobarea explicită.", target: { type: targetType, id: targetId, label: targetLabel }, proposal, ownerResolutionRequired: type === "assign_owner" && !proposal.ownerProfileId };
}

function validateProposal(type: AskActionType, raw: unknown): AskActionProposal {
  const value = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  if (type === "create_task" || type === "update_next_action") assertFutureActionDueAt(typeof value.dueAt === "string" ? value.dueAt : null);
  if (type === "create_task" || type === "update_next_action" || type === "create_notification") { const title = clean(value.title, 180); if (title.length < 3) throw new Error("ask_action_title_required"); const dueAt = clean(value.dueAt, 40); return { title, description: clean(value.description, 1200), dueAt: dueAt && Number.isFinite(Date.parse(dueAt)) ? new Date(dueAt).toISOString() : null, priority: ["low","medium","high"].includes(String(value.priority)) ? value.priority as any : "medium", ownerProfileId: clean(value.ownerProfileId, 80) || null, actionId: uuidPattern.test(clean(value.actionId, 80)) ? clean(value.actionId, 80) : null }; }
  if (type === "assign_owner") { const ownerProfileId = clean(value.ownerProfileId, 80); if (!uuidPattern.test(ownerProfileId)) throw new Error("ask_action_owner_required"); return { ownerProfileId, ownerLabel: clean(value.ownerLabel, 160) }; }
  if (type === "add_note") { const note = clean(value.note, 5000); if (note.length < 2) throw new Error("ask_action_note_required"); return { note }; }
  if (type === "prepare_email") return { subject: clean(value.subject, 500), body: clean(value.body, 100000) };
  const field = clean(value.field, 40); if (!["status","recommended_action","deadline"].includes(field)) throw new Error("ask_action_field_forbidden"); const next = clean(value.value, 1000); if (field === "status" && !statusValues.has(next)) throw new Error("ask_action_value_forbidden"); return { field: field as AskActionProposal["field"], value: next };
}

async function validMember(businessId: string, profileId: string) { const { data: member } = await admin().from("business_members").select("profile_id").eq("business_id", businessId).eq("profile_id", profileId).eq("status", "active").maybeSingle(); const { data: business } = await admin().from("businesses").select("owner_profile_id").eq("id", businessId).maybeSingle(); return Boolean(member || business?.owner_profile_id === profileId); }

export async function approveAskActionPlan(planId: string, editedProposal: unknown) {
  if (!uuidPattern.test(planId)) throw new Error("ask_action_plan_invalid");
  const authorization = await getAuthorizationContext(); const current = await getCurrentBusinessForUser({ redirectIfMissing: false });
  if (!authorization.profileId || !current) throw new Error("ask_action_forbidden");
  
  const client = admin(); const { data: raw } = await client.from("ask_action_plans").select("*").eq("id", planId).eq("business_id", current.business.id).eq("created_by_profile_id", authorization.profileId).maybeSingle();
  const plan = raw as StoredPlan | null; if (!plan) throw new Error("ask_action_forbidden");
  if (!authorization.permissions.includes(permissionFor(plan.action_type))) throw new Error("ask_action_forbidden");
  if (plan.status === "executed") return { ok: true as const, replay: true, resultEntityType: plan.result_entity_type, resultEntityId: plan.result_entity_id };
  if (plan.status !== "prepared") throw new Error("ask_action_replay_blocked");
  const intervention = plan.evidence.find((source) => source.sourceType === "commercial_intervention");
  if (intervention) {
    const { assertCommercialInterventionCurrent } = await import("@/lib/commercial-interventions-server");
    await assertCommercialInterventionCurrent(plan.target_id, intervention.sourceId);
  }
  const proposal = validateProposal(plan.action_type, editedProposal);
  if (proposal.ownerProfileId && !(await validMember(plan.business_id, proposal.ownerProfileId))) throw new Error("ask_action_owner_forbidden");
  if (plan.target_type === "opportunity") { const { data: target } = await client.from("opportunities").select("id,updated_at").eq("id", plan.target_id).eq("business_id", plan.business_id).maybeSingle(); if (!target) throw new Error("ask_action_target_missing"); if (plan.expected_target_updated_at && target.updated_at !== plan.expected_target_updated_at) { await client.from("ask_action_plans").update({ status: "expired", safe_failure_code: "target_changed", updated_at: new Date().toISOString() }).eq("id", plan.id).eq("status", "prepared"); throw new Error("ask_action_stale"); } }
  if (plan.action_type === "create_task" || plan.action_type === "update_next_action") {
    if (intervention && !proposal.dueAt) throw new Error("ask_action_due_future_required");
    assertFutureActionDueAt(proposal.dueAt);
  }
  const now = new Date().toISOString(); const { data: claimed } = await client.from("ask_action_plans").update({ status: "executing", proposal, approved_at: now, approved_by_profile_id: authorization.profileId, updated_at: now }).eq("id", plan.id).eq("status", "prepared").select("id").maybeSingle(); if (!claimed) throw new Error("ask_action_replay_blocked");
  try {
    let resultType = ""; let resultId: string | null = null;
    if (plan.action_type === "create_notification") { const recipient = proposal.ownerProfileId ?? authorization.profileId; const { data, error } = await client.from("communication_notifications").insert({ business_id: plan.business_id, recipient_profile_id: recipient, kind: "approval_needed", title: proposal.title, body: proposal.description || "Revizuire comercială pregătită prin Ask ReveNew.", href: `/opportunities/${plan.target_id}` }).select("id").single(); if (error || !data) throw new Error("notification_create_failed"); resultType = "communication_notification"; resultId = data.id; }
    else if (plan.action_type === "create_task" || (plan.action_type === "update_next_action" && !proposal.actionId)) { const { data, error } = await client.from("opportunity_actions").insert({ business_id: plan.business_id, opportunity_id: plan.target_id, type: "follow_up", title: proposal.title, description: proposal.description || "Acțiune pregătită și aprobată prin Ask ReveNew.", status: "pending", due_at: proposal.dueAt, priority: proposal.priority ?? "medium", assigned_to_profile_id: proposal.ownerProfileId ?? authorization.profileId }).select("id").single(); if (error || !data) throw new Error("task_create_failed"); resultType = "opportunity_action"; resultId = data.id; }
    else if (plan.action_type === "update_next_action" && proposal.actionId) { const { data } = await client.from("opportunity_actions").update({ title: proposal.title, description: proposal.description, due_at: proposal.dueAt, priority: proposal.priority ?? "medium" }).eq("id", proposal.actionId).eq("business_id", plan.business_id).eq("opportunity_id", plan.target_id).eq("status", "pending").select("id").maybeSingle(); if (!data) throw new Error("next_action_changed"); resultType = "opportunity_action"; resultId = data.id; }
    else if (plan.action_type === "assign_owner") { const { data } = await client.from("opportunities").update({ owner_profile_id: proposal.ownerProfileId, updated_at: now }).eq("id", plan.target_id).eq("business_id", plan.business_id).select("id").maybeSingle(); if (!data) throw new Error("owner_update_failed"); resultType = "opportunity"; resultId = data.id; }
    else if (plan.action_type === "add_note") { const { data, error } = await client.from("workspace_notes").insert({ business_id: plan.business_id, author_profile_id: authorization.profileId, target_type: plan.target_type === "organization" ? "company" : "opportunity", target_id: plan.target_id, content: proposal.note, is_pinned: false }).select("id").single(); if (error || !data) throw new Error("note_create_failed"); resultType = "workspace_note"; resultId = data.id; }
    else if (plan.action_type === "update_opportunity_field") { const payload: Record<string, unknown> = { updated_at: now }; payload[proposal.field!] = proposal.field === "deadline" && proposal.value ? new Date(proposal.value).toISOString() : proposal.value; const { data } = await client.from("opportunities").update(payload).eq("id", plan.target_id).eq("business_id", plan.business_id).select("id").maybeSingle(); if (!data) throw new Error("opportunity_update_failed"); resultType = "opportunity"; resultId = data.id; }
    else if (plan.action_type === "prepare_email") { const draft = await prepareOpportunityCommunicationDraft({ businessId: plan.business_id, profileId: authorization.profileId }, { opportunityId: plan.target_id, subject: proposal.subject ?? "Următorul pas comercial", body: proposal.body ?? "", evidence: plan.evidence.map((item) => ({ type: item.sourceType, id: item.sourceId, label: item.label })) }); resultType = "communication_draft"; resultId = draft.id; }
    else throw new Error("ask_action_type_unsupported");
    await client.from("audit_logs").insert({ business_id: plan.business_id, profile_id: authorization.profileId, action: "ask_action_executed", entity_type: "ask_action_plan", entity_id: plan.id, metadata: { action_type: plan.action_type, target_type: plan.target_type, target_id: plan.target_id, result_entity_type: resultType, result_entity_id: resultId, ai_involved: true, human_approved: true, origin: workflowRunIdFromEvidence(plan.evidence) ? "workflow" : "user", workflow_run_id: workflowRunIdFromEvidence(plan.evidence) } });
    await client.from("ask_action_plans").update({ status: "executed", executed_at: now, result_entity_type: resultType, result_entity_id: resultId, safe_failure_code: null, updated_at: now }).eq("id", plan.id).eq("status", "executing");
    return { ok: true as const, replay: false, resultEntityType: resultType, resultEntityId: resultId };
  } catch (error) { await client.from("ask_action_plans").update({ status: "failed", safe_failure_code: "execution_failed", updated_at: new Date().toISOString() }).eq("id", plan.id).eq("status", "executing"); throw error; }
}



