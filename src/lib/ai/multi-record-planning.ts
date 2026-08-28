import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { getUniversalBusinessContext } from "@/lib/ai/universal-business-context";
import { getOwnedCommunicationIndex } from "@/lib/ai/google-context-tool";
import { buildOpportunityCommercialState } from "@/lib/opportunity-commercial-state";
import { createStoredActionPlanForActor, type AskActionProposal, type AskActionType } from "@/lib/ai/action-planner";
import type { CommercialSignal, Opportunity } from "@/lib/types";
import type { CopilotAnswer, CopilotMultiRecordPlanPreview, CopilotMultiRecordResult, CopilotRequest } from "@/lib/ai/copilot-types";
import {
  MULTI_RECORD_MAX_SELECTION,
  classifyMultiRecordBatchAction,
  filterAndSortMultiRecordCandidates,
  interpretMultiRecordQuery,
  isMultiRecordQuery,
  isMultiRecordSelectionReference,
  multiRecordStaleReason,
  selectionFromFollowUp,
  totalsByCurrency,
  type MultiRecordBatchAction,
  type MultiRecordCandidate,
  type MultiRecordFilter,
  type MultiRecordSort
} from "@/lib/ai/multi-record-planning-core";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type ResultSetRow = { id: string; business_id: string; created_by_profile_id: string; records: MultiRecordCandidate[]; filters: MultiRecordFilter; sort_spec: MultiRecordSort; expires_at: string; status: string };
function admin() { const client = createSupabaseAdminClient(); if (!client) throw new Error("multi_record_storage_unavailable"); return client; }
function clean(value: unknown, max: number) { return typeof value === "string" ? value.normalize("NFKC").trim().slice(0, max) : ""; }
function deterministicUuid(value: string) { const hex = createHash("sha256").update(value).digest("hex").slice(0, 32).split(""); hex[12] = "5"; hex[16] = (["8","9","a","b"] as const)[parseInt(hex[16], 16) % 4]; const joined = hex.join(""); return `${joined.slice(0,8)}-${joined.slice(8,12)}-${joined.slice(12,16)}-${joined.slice(16,20)}-${joined.slice(20)}`; }
function daysSince(value: string | null, now = Date.now()) { if (!value || !Number.isFinite(Date.parse(value))) return null; return Math.max(0, Math.floor((now - Date.parse(value)) / 86_400_000)); }
function severity(value: string): MultiRecordCandidate["severity"] { return value === "critical" || value === "attention" ? value : "informative"; }
function executionState(value: string): MultiRecordCandidate["executionState"] {
  const allowed = new Set(["healthy","needs_attention","overdue","waiting_for_client","waiting_internal","approval_required","owner_missing","next_action_missing","blocked","prepared","ready_for_review","resolved"]);
  return allowed.has(value) ? value as MultiRecordCandidate["executionState"] : "needs_attention";
}
type CommunicationSnapshot = { lastInboundAt?: string; lastOutboundAt?: string; nextMeetingAt?: string; expectedResponseWindowDays: number };
function candidateFrom(opportunity: Opportunity, signals: CommercialSignal[], communication: CommunicationSnapshot, now = Date.now()): MultiRecordCandidate {
  const state = buildOpportunityCommercialState(opportunity, { linkedSignals: signals, communication });
  const waitingAnchor = state.communication.lastOutboundAt && (!state.communication.lastInboundAt || state.communication.lastOutboundAt > state.communication.lastInboundAt) ? state.communication.lastOutboundAt : null;
  return {
    id: opportunity.id, title: opportunity.title, company: state.organization.name, estimatedValue: state.financial.estimatedValue, currency: state.financial.currency,
    stage: state.stage, ownerProfileId: state.ownership.ownerProfileId, ownerName: state.ownership.ownerName,
    executionState: executionState(state.execution.state), executionReason: state.execution.reason, severity: severity(state.execution.severity),
    lastInboundAt: state.communication.lastInboundAt, lastOutboundAt: state.communication.lastOutboundAt, nextMeetingAt: state.communication.nextMeetingAt,
    responseAgeDays: daysSince(waitingAnchor, now), nextActionState: state.flags.nextActionMissing ? "missing" : state.flags.nextActionOverdue ? "overdue" : "present",
    updatedAt: opportunity.updatedAt ?? opportunity.createdAt ?? null, route: `/opportunities/${opportunity.id}`
  };
}
async function actor() {
  const [authorization, current] = await Promise.all([getAuthorizationContext(), getCurrentBusinessForUser({ redirectIfMissing: false })]);
  if (!authorization.profileId || !current || !authorization.permissions.includes("workspace.read")) throw new Error("multi_record_forbidden");
  return { businessId: current.business.id, profileId: authorization.profileId, permissions: authorization.permissions, management: ["business_owner","business_admin","business_manager"].includes(authorization.businessRole ?? "") };
}
async function loadOwnedResultSet(resultSetId: string) {
  if (!uuidPattern.test(resultSetId)) throw new Error("multi_record_result_invalid");
  const current = await actor();
  const { data } = await admin().from("ask_multi_record_result_sets").select("id,business_id,created_by_profile_id,records,filters,sort_spec,expires_at,status").eq("id", resultSetId).eq("business_id", current.businessId).eq("created_by_profile_id", current.profileId).maybeSingle();
  const row = data as ResultSetRow | null;
  if (!row) throw new Error("multi_record_result_forbidden");
  if (row.status !== "active" || Date.parse(row.expires_at) <= Date.now()) throw new Error("multi_record_result_expired");
  return { actor: current, row };
}
function resultAnswer(input: CopilotMultiRecordResult, providerAvailable: boolean): CopilotAnswer {
  return {
    answer: input.records.length ? `Am găsit ${input.records.length} oportunități care respectă filtrele autorizate. Selectează maximum ${input.maxSelection} pentru a pregăti acțiuni sigure.` : "Nu am găsit oportunități care respectă toate filtrele în vizibilitatea autorizată.",
    summaryType: input.records.length ? "commercial" : "insufficient_information", findings: [], evidence: [], checkedSources: [], missingInformation: [],
    caveats: ["Valorile sunt expuneri estimate și monedele rămân separate."], preparedAction: null, suggestedAction: null,
    followUps: input.records.length ? ["Pregătește follow-up pentru primele 5.", "Creează task-uri interne pentru selecția curentă."] : [],
    mode: "deterministic_fallback", providerAvailable, presentation: null, workflowDraft: null, multiRecordResult: input, multiRecordPlan: null
  };
}
function clarificationAnswer(message: string, providerAvailable: boolean): CopilotAnswer {
  return { answer: message, summaryType: "insufficient_information", findings: [], evidence: [], checkedSources: [], missingInformation: [message], caveats: [], preparedAction: null, suggestedAction: null, followUps: [], mode: "deterministic_fallback", providerAvailable, presentation: null, workflowDraft: null, multiRecordResult: null, multiRecordPlan: null };
}
export async function createMultiRecordResult(request: CopilotRequest, providerAvailable: boolean): Promise<CopilotAnswer> {
  const interpretation = interpretMultiRecordQuery(request.question);
  if (interpretation.state !== "ready") return clarificationAnswer(interpretation.clarification ?? interpretation.unsupportedReason ?? "Clarifică selecția dorită.", providerAvailable);
  const [universal, communication] = await Promise.all([getUniversalBusinessContext(request.context), getOwnedCommunicationIndex()]);
  const now = Date.now();
  const candidates = universal.summary.opportunities.map((opportunity) => candidateFrom(
    opportunity,
    universal.summary.signals,
    communication[opportunity.id] ?? { expectedResponseWindowDays: 3 },
    now
  ));  const records = filterAndSortMultiRecordCandidates(candidates, interpretation.filters, interpretation.sort);
  const current = await actor(); const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
  const { data, error } = await admin().from("ask_multi_record_result_sets").insert({ business_id: current.businessId, created_by_profile_id: current.profileId, query_text: request.question, filters: interpretation.filters, sort_spec: interpretation.sort, records, expires_at: expiresAt }).select("id").single();
  if (error || !data) throw new Error("multi_record_result_create_failed");
  return resultAnswer({ resultSetId: data.id, title: "Oportunități selectate", summary: `${records.length} rezultate · sortare stabilă`, records, totals: totalsByCurrency(records), filters: interpretation.filters, sort: interpretation.sort, maxSelection: MULTI_RECORD_MAX_SELECTION, expiresAt }, providerAvailable);
}
function refinedIds(question: string, records: MultiRecordCandidate[], selected: string[]) {
  return selectionFromFollowUp(question, records, selected);
}
async function refineMultiRecordResult(request: CopilotRequest, providerAvailable: boolean): Promise<CopilotAnswer | null> {
  if (!request.selection || classifyMultiRecordBatchAction(request.question) || !isMultiRecordSelectionReference(request.question)) return null;
  const { actor: current, row } = await loadOwnedResultSet(request.selection.resultSetId);
  const ids = refinedIds(request.question, row.records, request.selection.selectedRecordIds);
  if (!ids.length) return clarificationAnswer("Rafinarea nu conține oportunități. Verifică selecția sau criteriul cerut.", providerAvailable);
  const selected = new Set(ids);
  const records = row.records.filter((record) => selected.has(record.id));
  const { data, error } = await admin().from("ask_multi_record_result_sets").insert({
    business_id: current.businessId,
    created_by_profile_id: current.profileId,
    query_text: request.question,
    filters: { ...row.filters, refinement: clean(request.question, 500) },
    sort_spec: row.sort_spec,
    records,
    expires_at: row.expires_at
  }).select("id").single();
  if (error || !data) throw new Error("multi_record_result_refine_failed");
  return resultAnswer({ resultSetId: data.id, title: "Selecție rafinată", summary: `${records.length} rezultate · aceeași ordine stabilă`, records, totals: totalsByCurrency(records), filters: row.filters, sort: row.sort_spec, maxSelection: MULTI_RECORD_MAX_SELECTION, expiresAt: row.expires_at }, providerAvailable);
}
export async function previewMultiRecordPlan(request: CopilotRequest, providerAvailable: boolean): Promise<CopilotAnswer | null> {
  const actionType = classifyMultiRecordBatchAction(request.question); if (!request.selection || !actionType || !isMultiRecordSelectionReference(request.question)) return null;
  const { row } = await loadOwnedResultSet(request.selection.resultSetId); const ids = refinedIds(request.question, row.records, request.selection.selectedRecordIds);
  if (!ids.length) return clarificationAnswer("Selectează cel puțin o oportunitate înainte de pregătirea acțiunilor.", providerAvailable);
  if (ids.length > MULTI_RECORD_MAX_SELECTION) return clarificationAnswer(`Poți pregăti cel mult ${MULTI_RECORD_MAX_SELECTION} oportunități într-un singur plan.`, providerAvailable);
  const records = row.records.filter((record) => ids.includes(record.id));
  const preview: CopilotMultiRecordPlanPreview = { resultSetId: row.id, confirmationId: randomUUID(), actionType, selectedRecordIds: ids, records, summary: `${records.length} acțiuni vor fi pregătite separat. Nicio acțiune nu este încă aplicată.`, externalSend: false };
  return { answer: preview.summary, summaryType: "commercial", findings: [], evidence: [], checkedSources: [], missingInformation: [], caveats: [actionType === "prepare_email" ? "Vor fi create numai drafturi. Emailuri trimise: 0." : "Fiecare înregistrare va fi revalidată separat înainte de pregătire și aprobare."], preparedAction: null, suggestedAction: null, followUps: [], mode: "deterministic_fallback", providerAvailable, presentation: null, workflowDraft: null, multiRecordResult: null, multiRecordPlan: preview };
}
export async function maybeRunMultiRecordPlanning(request: CopilotRequest, providerAvailable: boolean) {
  const preview = await previewMultiRecordPlan(request, providerAvailable); if (preview) return preview;
  const refined = await refineMultiRecordResult(request, providerAvailable); if (refined) return refined;
  if (isMultiRecordQuery(request.question)) return createMultiRecordResult(request, providerAvailable);
  return null;
}
function planFor(action: MultiRecordBatchAction, record: MultiRecordCandidate): { type: AskActionType; proposal: AskActionProposal } {
  if (action === "prepare_email") return { type: "prepare_email", proposal: { subject: `Follow-up · ${record.company ?? record.title}`, body: `Bună ziua,\n\nRevin privind ${record.title}. Aș dori să confirmăm următorul pas și dacă există informații pe care trebuie să le clarificăm.\n\nMulțumesc.` } };
  if (action === "create_notification") return { type: "create_notification", proposal: { title: `Revizuire necesară · ${record.title}`, description: record.executionReason, ownerProfileId: record.ownerProfileId } };
  if (action === "prepare_next_action_update") return { type: "update_next_action", proposal: { title: `Revizuiește următorul pas · ${record.title}`, description: record.executionReason, dueAt: null, priority: record.severity === "critical" ? "high" : "medium", actionId: null, ownerProfileId: record.ownerProfileId } };
  return { type: "create_task", proposal: { title: action === "assign_review" ? `Revizuiește · ${record.title}` : `Follow-up intern · ${record.title}`, description: record.executionReason, dueAt: null, priority: record.severity === "critical" ? "high" : "medium", ownerProfileId: record.ownerProfileId } };
}
export async function prepareMultiRecordActionPlans(input: { resultSetId: string; selectedRecordIds: string[]; actionType: MultiRecordBatchAction; confirmationId: string }) {
  if (!uuidPattern.test(input.confirmationId)) throw new Error("multi_record_confirmation_invalid");
  const { actor: current, row } = await loadOwnedResultSet(input.resultSetId);
  const ids = Array.from(new Set(input.selectedRecordIds.filter((id) => uuidPattern.test(id))));
  if (!ids.length || ids.length > MULTI_RECORD_MAX_SELECTION) throw new Error("multi_record_selection_invalid");
  const allowed = new Set(row.records.map((record) => record.id)); if (ids.some((id) => !allowed.has(id))) throw new Error("multi_record_selection_forbidden");
  const [universal, communication] = await Promise.all([getUniversalBusinessContext({ route: "/ai", pageType: "ai" }), getOwnedCommunicationIndex()]);
  const visibleOpportunities = new Map(universal.summary.opportunities.map((opportunity) => [opportunity.id, opportunity]));
  const currentCandidates = new Map(universal.summary.opportunities.map((opportunity) => [opportunity.id, candidateFrom(opportunity, universal.summary.signals, communication[opportunity.id] ?? { expectedResponseWindowDays: 3 })]));
  const prepared: Array<{ recordId: string; planId: string; replay: boolean; proposal: AskActionProposal; actionType: AskActionType; title: string }> = [];
  const skipped: Array<{ recordId: string; reason: string }> = [];
  for (const recordId of ids) {
    const snapshot = row.records.find((record) => record.id === recordId)!;
    const opportunity = visibleOpportunities.get(recordId) ?? null;
    const lifecycle = opportunity?.lifecycleStatus ?? opportunity?.status;
    if (opportunity && ["won","lost","disqualified","archived","ignored"].includes(String(lifecycle))) { skipped.push({ recordId, reason: "Oportunitatea este închisă." }); continue; }
    const currentCandidate = currentCandidates.get(recordId) ?? null;
    const staleReason = multiRecordStaleReason(snapshot, currentCandidate);
    if (staleReason) { skipped.push({ recordId, reason: staleReason }); continue; }
    const planned = planFor(input.actionType, currentCandidate!);
    try {
      const stored = await createStoredActionPlanForActor({ actor: { businessId: current.businessId, profileId: current.profileId, permissions: current.permissions }, actionType: planned.type, targetId: recordId, targetLabel: currentCandidate!.title, proposal: planned.proposal, evidence: [{ sourceId: `multi-record-result:${row.id}`, label: "Selecție Ask ReveNew", sourceType: "Oportunitate" }], idempotencyKey: deterministicUuid(`${current.businessId}:${current.profileId}:${input.confirmationId}:${recordId}:${input.actionType}`) });
      prepared.push({ recordId, planId: stored.id, replay: stored.replay, proposal: planned.proposal, actionType: planned.type, title: currentCandidate!.title });
    } catch { skipped.push({ recordId, reason: "Planul nu a putut fi pregătit în siguranță." }); }
  }
  return { prepared, skipped, externalSend: false as const, sentCount: 0 };
}