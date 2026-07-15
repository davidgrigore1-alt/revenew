import "server-only";
import { revalidatePath } from "next/cache";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { runRecoverabilityAnalysis } from "@/lib/recoverability-analysis";
import { formatRecoveryDraft, packRecoverabilityInsights, parseRecoveryDraft, unpackRecoverabilityInsights } from "@/lib/recoverability-review";
import type {
  CommercialSignal,
  CommercialSignalEvent,
  CommercialSignalPriority,
  CommercialSignalSource,
  CommercialSignalStatus
} from "@/lib/types";

export const commercialInboxSetupMessage =
  "Inboxul comercial necesită migrarea 20260714143000_recoverable_revenue_engine_v1.sql. Migrarea trebuie revizuită și aplicată manual.";

export type CommercialSignalInput = Partial<{
  source: CommercialSignalSource;
  title: string;
  sourceReference: string;
  lastInteractionAt: string;
  sourceLabel: string;
  status: CommercialSignalStatus;
  priority: CommercialSignalPriority;
  contactName: string;
  contactCompany: string;
  contactEmail: string;
  contactPhone: string;
  contactRole: string;
  rawMessage: string;
  extractedSummary: string;
  detectedNeed: string;
  serviceInterest: string;
  location: string;
  requestedDate: string;
  estimatedValueMin: number;
  estimatedValueMax: number;
  currency: string;
  urgencyScore: number;
  fitScore: number;
  confidenceScore: number;
  recommendedAction: string;
  nextStep: string;
  notes: string;
  matchedOrganizationId: string;
  matchedContactId: string;
  assignedToProfileId: string;
  suggestedDueDate: string;
  reviewDueAt: string;
  reviewedDraft: string;
  dismissalReason: string;
}>;

export type SignalApprovalInput = {
  organizationId?: string;
  contactId?: string;
  newOrganizationName?: string;
  newContactName?: string;
  newContactEmail?: string;
  newContactPhone?: string;
  ownerProfileId?: string;
  dueAt?: string;
  recommendedAction?: string;
  reviewedDraft?: string;
};

export type CommercialInboxResult = {
  tableReady: boolean;
  setupMessage?: string;
  signals: CommercialSignal[];
};

export type CommercialInboxSummary = {
  tableReady: boolean;
  setupMessage?: string;
  newCount: number;
  urgentCount: number;
  convertedCount: number;
  estimatedPotential: number;
  awaitingReviewCount: number;
  dismissedCount: number;
  duplicateCount: number;
  approvedCount: number;
  estimatedValueUnderReview: number;
  signalsWithoutOwner: number;
  highValueAttentionCount: number;
  averageReviewHours: number | null;
  latestSignal?: CommercialSignal;
  topSignals: CommercialSignal[];
};

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

type CommercialSignalRow = {
  id: string;
  business_id: string;
  source: CommercialSignalSource;
  source_label: string | null;
  status: CommercialSignalStatus;
  priority: CommercialSignalPriority;
  title: string;
  source_reference: string | null;
  last_interaction_at: string | null;
  analysis_status: CommercialSignal["analysisStatus"];
  review_status: CommercialSignal["reviewStatus"];
  analysis_mode: CommercialSignal["analysisMode"];
  recoverability_score: number | null;
  confidence_level: CommercialSignal["confidenceLevel"];
  estimated_recoverable_value: number | null;
  urgency_level: CommercialSignal["urgencyLevel"];
  primary_recovery_reason: string | null;
  analysis_explanation: string | null;
  missing_information: unknown;
  uncertainty_notes: unknown;
  suggested_due_date: string | null;
  suggested_owner_profile_id: string | null;
  matched_organization_id: string | null;
  matched_contact_id: string | null;
  duplicate_risk: boolean | null;
  duplicate_signal_id: string | null;
  review_due_at: string | null;
  reviewed_draft: string | null;
  dismissal_reason: string | null;
  analyzed_at: string | null;
  reviewed_at: string | null;
  approved_by_profile_id: string | null;
  contact_name: string | null;
  contact_company: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_role: string | null;
  raw_message: string | null;
  extracted_summary: string | null;
  detected_need: string | null;
  service_interest: string | null;
  location: string | null;
  requested_date: string | null;
  estimated_value_min: number | null;
  estimated_value_max: number | null;
  currency: string | null;
  urgency_score: number | null;
  fit_score: number | null;
  confidence_score: number | null;
  recommended_action: string | null;
  next_step: string | null;
  notes: string | null;
  converted_opportunity_id: string | null;
  import_batch_id: string | null;
  ingestion_fingerprint: string | null;
  ingestion_origin: CommercialSignal["ingestionOrigin"];
  detected_from_opportunity_id: string | null;
  created_by_profile_id: string | null;
  assigned_to_profile_id: string | null;
  occurred_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type CommercialSignalEventRow = {
  id: string;
  business_id: string;
  signal_id: string;
  event_type: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_by_profile_id: string | null;
  created_at: string | null;
};

function isMissingCommercialInboxTable(error?: SupabaseErrorLike | null) {
  const message = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`.toLowerCase();
  return error?.code === "42P01" || error?.code === "PGRST205" || message.includes("commercial_signals") || message.includes("commercial_signal_events");
}

function isMissingRecoverabilitySchema(error?: SupabaseErrorLike | null) {
  const message = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`.toLowerCase();
  return error?.code === "42703" || error?.code === "PGRST204" || [
    "recoverability_score",
    "analysis_status",
    "review_status",
    "approve_recoverable_signal"
  ].some((column) => message.includes(column));
}

function toNullString(value?: string | null, maxLength = 12_000) {
  const trimmed = typeof value === "string" ? value.trim().slice(0, maxLength) : "";
  return trimmed ? trimmed : null;
}

function toNumberOrNull(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return null;
  }
  return value;
}

function clampScore(value?: number | null) {
  const score = value ?? 50;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function safeUuid(value?: string | null) {
  const candidate = value?.trim();
  return candidate && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate) ? candidate : null;
}

function localSummary(input: CommercialSignalInput) {
  if (toNullString(input.extractedSummary)) {
    return toNullString(input.extractedSummary);
  }

  const raw = toNullString(input.rawMessage);
  if (!raw) {
    return toNullString(input.detectedNeed) ?? toNullString(input.notes);
  }

  return raw.length > 180 ? `${raw.slice(0, 177)}...` : raw;
}

function signalToRow(input: CommercialSignalInput, businessId: string, profileId: string) {
  return {
    business_id: businessId,
    source: input.source ?? "manual",
    title: toNullString(input.title, 240) ?? localSummary(input) ?? "Semnal comercial",
    source_reference: toNullString(input.sourceReference, 500),
    last_interaction_at: toNullString(input.lastInteractionAt),
    source_label: toNullString(input.sourceLabel),
    status: input.status ?? "new",
    priority: input.priority ?? "medium",
    contact_name: toNullString(input.contactName),
    contact_company: toNullString(input.contactCompany),
    contact_email: toNullString(input.contactEmail),
    contact_phone: toNullString(input.contactPhone),
    contact_role: toNullString(input.contactRole),
    raw_message: toNullString(input.rawMessage),
    extracted_summary: localSummary(input),
    detected_need: toNullString(input.detectedNeed),
    service_interest: toNullString(input.serviceInterest),
    location: toNullString(input.location),
    requested_date: toNullString(input.requestedDate),
    estimated_value_min: toNumberOrNull(input.estimatedValueMin),
    estimated_value_max: toNumberOrNull(input.estimatedValueMax),
    currency: toNullString(input.currency) ?? "EUR",
    urgency_score: clampScore(input.urgencyScore),
    fit_score: clampScore(input.fitScore),
    confidence_score: clampScore(input.confidenceScore),
    recommended_action: toNullString(input.recommendedAction),
    next_step: toNullString(input.nextStep),
    notes: toNullString(input.notes),
    matched_organization_id: safeUuid(input.matchedOrganizationId),
    matched_contact_id: safeUuid(input.matchedContactId),
    assigned_to_profile_id: safeUuid(input.assignedToProfileId),
    suggested_due_date: toNullString(input.suggestedDueDate),
    review_due_at: toNullString(input.reviewDueAt),
    reviewed_draft: toNullString(input.reviewedDraft),
    dismissal_reason: toNullString(input.dismissalReason),
    created_by_profile_id: profileId
  };
}

function signalUpdateToRow(input: CommercialSignalInput) {
  const row: Record<string, unknown> = {};
  if (input.source) row.source = input.source;
  if (input.title !== undefined) row.title = toNullString(input.title, 240) ?? "Semnal comercial";
  if (input.sourceReference !== undefined) row.source_reference = toNullString(input.sourceReference, 500);
  if (input.lastInteractionAt !== undefined) row.last_interaction_at = toNullString(input.lastInteractionAt);
  if (input.sourceLabel !== undefined) row.source_label = toNullString(input.sourceLabel);
  if (input.status) row.status = input.status;
  if (input.priority) row.priority = input.priority;
  if (input.contactName !== undefined) row.contact_name = toNullString(input.contactName);
  if (input.contactCompany !== undefined) row.contact_company = toNullString(input.contactCompany);
  if (input.contactEmail !== undefined) row.contact_email = toNullString(input.contactEmail);
  if (input.contactPhone !== undefined) row.contact_phone = toNullString(input.contactPhone);
  if (input.contactRole !== undefined) row.contact_role = toNullString(input.contactRole);
  if (input.rawMessage !== undefined) row.raw_message = toNullString(input.rawMessage);
  if (input.extractedSummary !== undefined || input.rawMessage !== undefined || input.detectedNeed !== undefined || input.notes !== undefined) row.extracted_summary = localSummary(input);
  if (input.detectedNeed !== undefined) row.detected_need = toNullString(input.detectedNeed);
  if (input.serviceInterest !== undefined) row.service_interest = toNullString(input.serviceInterest);
  if (input.location !== undefined) row.location = toNullString(input.location);
  if (input.requestedDate !== undefined) row.requested_date = toNullString(input.requestedDate);
  if (input.estimatedValueMin !== undefined) row.estimated_value_min = toNumberOrNull(input.estimatedValueMin);
  if (input.estimatedValueMax !== undefined) row.estimated_value_max = toNumberOrNull(input.estimatedValueMax);
  if (input.currency !== undefined) row.currency = toNullString(input.currency) ?? "EUR";
  if (input.urgencyScore !== undefined) row.urgency_score = clampScore(input.urgencyScore);
  if (input.fitScore !== undefined) row.fit_score = clampScore(input.fitScore);
  if (input.confidenceScore !== undefined) row.confidence_score = clampScore(input.confidenceScore);
  if (input.recommendedAction !== undefined) row.recommended_action = toNullString(input.recommendedAction);
  if (input.nextStep !== undefined) row.next_step = toNullString(input.nextStep);
  if (input.notes !== undefined) row.notes = toNullString(input.notes);
  if (input.matchedOrganizationId !== undefined) row.matched_organization_id = safeUuid(input.matchedOrganizationId);
  if (input.matchedContactId !== undefined) row.matched_contact_id = safeUuid(input.matchedContactId);
  if (input.assignedToProfileId !== undefined) row.assigned_to_profile_id = safeUuid(input.assignedToProfileId);
  if (input.suggestedDueDate !== undefined) row.suggested_due_date = toNullString(input.suggestedDueDate);
  if (input.reviewDueAt !== undefined) row.review_due_at = toNullString(input.reviewDueAt);
  if (input.reviewedDraft !== undefined) row.reviewed_draft = toNullString(input.reviewedDraft);
  if (input.dismissalReason !== undefined) row.dismissal_reason = toNullString(input.dismissalReason);
  return row;
}

function mapEvent(row: CommercialSignalEventRow): CommercialSignalEvent {
  return {
    id: row.id,
    businessId: row.business_id,
    signalId: row.signal_id,
    eventType: row.event_type,
    description: row.description ?? "",
    metadata: row.metadata ?? {},
    createdByProfileId: row.created_by_profile_id,
    createdAt: row.created_at ?? new Date().toISOString()
  };
}

function mapSignal(row: CommercialSignalRow, events: CommercialSignalEvent[] = []): CommercialSignal {
  const insights = unpackRecoverabilityInsights(stringArray(row.uncertainty_notes));
  const draft = parseRecoveryDraft(row.reviewed_draft);
  return {
    id: row.id,
    businessId: row.business_id,
    source: row.source,
    sourceLabel: row.source_label,
    status: row.status,
    priority: row.priority,
    title: row.title ?? row.extracted_summary ?? row.detected_need ?? "Semnal comercial",
    sourceReference: row.source_reference,
    lastInteractionAt: row.last_interaction_at,
    analysisStatus: row.analysis_status ?? "not_started",
    reviewStatus: row.review_status ?? "new",
    analysisMode: row.analysis_mode,
    recoverabilityScore: row.recoverability_score === null || row.recoverability_score === undefined ? null : Number(row.recoverability_score),
    confidenceLevel: row.confidence_level,
    estimatedRecoverableValue: row.estimated_recoverable_value === null || row.estimated_recoverable_value === undefined ? null : Number(row.estimated_recoverable_value),
    urgencyLevel: row.urgency_level,
    primaryRecoveryReason: row.primary_recovery_reason,
    analysisExplanation: row.analysis_explanation,
    detectedCommercialIntent: insights.detectedCommercialIntent,
    relationshipContext: insights.relationshipContext,
    scoreFactors: insights.scoreFactors,
    missingInformation: stringArray(row.missing_information),
    riskNotes: insights.riskNotes,
    uncertaintyNotes: insights.uncertaintyNotes,
    humanReviewChecklist: insights.humanReviewChecklist,
    alternativeDraftAngle: insights.alternativeDraftAngle,
    suggestedDueDate: row.suggested_due_date,
    suggestedOwnerProfileId: row.suggested_owner_profile_id,
    matchedOrganizationId: row.matched_organization_id,
    matchedContactId: row.matched_contact_id,
    duplicateRisk: Boolean(row.duplicate_risk),
    duplicateSignalId: row.duplicate_signal_id,
    reviewDueAt: row.review_due_at,
    reviewedDraft: row.reviewed_draft,
    draftSubject: draft.subject,
    draftBody: draft.body,
    dismissalReason: row.dismissal_reason,
    analyzedAt: row.analyzed_at,
    reviewedAt: row.reviewed_at,
    approvedByProfileId: row.approved_by_profile_id,
    contactName: row.contact_name,
    contactCompany: row.contact_company,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    contactRole: row.contact_role,
    rawMessage: row.raw_message,
    extractedSummary: row.extracted_summary,
    detectedNeed: row.detected_need,
    serviceInterest: row.service_interest,
    location: row.location,
    requestedDate: row.requested_date,
    estimatedValueMin: row.estimated_value_min === null ? null : Number(row.estimated_value_min),
    estimatedValueMax: row.estimated_value_max === null ? null : Number(row.estimated_value_max),
    currency: row.currency ?? "EUR",
    urgencyScore: Number(row.urgency_score ?? 50),
    fitScore: Number(row.fit_score ?? 50),
    confidenceScore: Number(row.confidence_score ?? 50),
    recommendedAction: row.recommended_action,
    nextStep: row.next_step,
    notes: row.notes,
    convertedOpportunityId: row.converted_opportunity_id,
    importBatchId: row.import_batch_id,
    ingestionFingerprint: row.ingestion_fingerprint,
    ingestionOrigin: row.ingestion_origin ?? "manual",
    detectedFromOpportunityId: row.detected_from_opportunity_id,
    createdByProfileId: row.created_by_profile_id,
    assignedToProfileId: row.assigned_to_profile_id,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    events
  };
}

async function getCurrentInboxContext() {
  const current = await getCurrentBusinessForUser({ redirectIfMissing: true });
  const supabase = createSupabaseServerClient();
  if (!current?.business || !supabase) {
    throw new Error("Nu am gasit businessul curent.");
  }
  return { supabase, business: current.business, profileId: current.profileId };
}

export async function getCommercialSignalsForCurrentBusiness(): Promise<CommercialInboxResult> {
  if (!isSupabaseConfigured) {
    return { tableReady: true, signals: [] };
  }

  const { supabase, business } = await getCurrentInboxContext();
  const { data, error } = await supabase
    .from("commercial_signals")
    .select("*,recoverability_score")
    .eq("business_id", business.id)
    .order("occurred_at", { ascending: false });

  if (error) {
    if (isMissingCommercialInboxTable(error) || isMissingRecoverabilitySchema(error)) {
      return { tableReady: false, setupMessage: commercialInboxSetupMessage, signals: [] };
    }
    throw new Error(`Commercial signals load error: ${error.message}`);
  }

  const rows = (data ?? []) as CommercialSignalRow[];
  const signalIds = rows.map((signal) => signal.id);
  let eventsBySignal = new Map<string, CommercialSignalEvent[]>();

  if (signalIds.length > 0) {
    const { data: eventRows, error: eventError } = await supabase
      .from("commercial_signal_events")
      .select("*")
      .in("signal_id", signalIds)
      .order("created_at", { ascending: false });

    if (eventError) {
      if (isMissingCommercialInboxTable(eventError)) {
        return { tableReady: false, setupMessage: commercialInboxSetupMessage, signals: [] };
      }
      throw new Error(`Commercial signal events load error: ${eventError.message}`);
    }

    eventsBySignal = (eventRows ?? []).reduce((map, row) => {
      const event = mapEvent(row as CommercialSignalEventRow);
      const events = map.get(event.signalId) ?? [];
      events.push(event);
      map.set(event.signalId, events);
      return map;
    }, new Map<string, CommercialSignalEvent[]>());
  }

  return { tableReady: true, signals: rows.map((row) => mapSignal(row, eventsBySignal.get(row.id) ?? [])) };
}

export async function getCommercialInboxSummary(): Promise<CommercialInboxSummary> {
  const result = await getCommercialSignalsForCurrentBusiness();
  const activeSignals = result.signals.filter((signal) => !["converted", "dismissed", "duplicate", "ignored", "archived"].includes(signal.status));
  const awaitingReview = result.signals.filter((signal) => ["ready_for_review", "postponed"].includes(signal.reviewStatus));
  const reviewedSignals = result.signals.filter((signal) => signal.reviewedAt && signal.createdAt);
  const topSignals = result.signals
    .filter((signal) => ["ready_for_review", "postponed"].includes(signal.reviewStatus))
    .sort((a, b) => {
      const urgencyRank = { low: 0, medium: 1, high: 2, critical: 3 };
      return (urgencyRank[b.urgencyLevel ?? "low"] - urgencyRank[a.urgencyLevel ?? "low"])
        || Number(b.recoverabilityScore ?? 0) - Number(a.recoverabilityScore ?? 0)
        || Number(b.estimatedRecoverableValue ?? 0) - Number(a.estimatedRecoverableValue ?? 0);
    })
    .slice(0, 3);

  return {
    tableReady: result.tableReady,
    setupMessage: result.setupMessage,
    newCount: result.signals.filter((signal) => signal.status === "new").length,
    urgentCount: result.signals.filter((signal) => signal.priority === "urgent" || signal.urgencyScore >= 80).length,
    convertedCount: result.signals.filter((signal) => signal.status === "converted").length,
    estimatedPotential: activeSignals.reduce((sum, signal) => sum + Number(signal.estimatedRecoverableValue ?? signal.estimatedValueMax ?? signal.estimatedValueMin ?? 0), 0),
    awaitingReviewCount: awaitingReview.length,
    dismissedCount: result.signals.filter((signal) => signal.reviewStatus === "dismissed").length,
    duplicateCount: result.signals.filter((signal) => signal.reviewStatus === "duplicate").length,
    approvedCount: result.signals.filter((signal) => ["approved", "converted"].includes(signal.reviewStatus)).length,
    estimatedValueUnderReview: awaitingReview.reduce((sum, signal) => sum + Number(signal.estimatedRecoverableValue ?? 0), 0),
    signalsWithoutOwner: awaitingReview.filter((signal) => !signal.assignedToProfileId && !signal.suggestedOwnerProfileId).length,
    highValueAttentionCount: awaitingReview.filter((signal) => ["high", "critical"].includes(signal.urgencyLevel ?? "") && Number(signal.estimatedRecoverableValue ?? 0) > 0).length,
    averageReviewHours: reviewedSignals.length > 0
      ? Math.round((reviewedSignals.reduce((sum, signal) => sum + (new Date(signal.reviewedAt!).getTime() - new Date(signal.createdAt!).getTime()), 0) / reviewedSignals.length / 3_600_000) * 10) / 10
      : null,
    latestSignal: result.signals[0],
    topSignals
  };
}

export async function getCommercialSignalForOpportunity(opportunityId: string): Promise<CommercialSignal | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const { supabase, business } = await getCurrentInboxContext();
  const { data, error } = await supabase
    .from("commercial_signals")
    .select("*,recoverability_score")
    .eq("business_id", business.id)
    .eq("converted_opportunity_id", opportunityId)
    .maybeSingle();

  if (error) {
    if (isMissingCommercialInboxTable(error) || isMissingRecoverabilitySchema(error)) {
      return null;
    }
    throw new Error(`Commercial signal opportunity lookup error: ${error.message}`);
  }

  return data ? mapSignal(data as CommercialSignalRow) : null;
}

export async function createCommercialSignal(input: CommercialSignalInput) {
  const { supabase, business, profileId } = await getCurrentInboxContext();
  const { data, error } = await supabase
    .from("commercial_signals")
    .insert(signalToRow(input, business.id, profileId))
    .select("*")
    .single();

  if (error) {
    if (isMissingCommercialInboxTable(error) || isMissingRecoverabilitySchema(error)) {
      return { ok: false, tableReady: false, message: commercialInboxSetupMessage };
    }
    return { ok: false, tableReady: true, message: "Semnalul comercial nu a putut fi creat." };
  }

  const signal = mapSignal(data as CommercialSignalRow);
  await addCommercialSignalEvent(signal.id, "signal_created", "Semnal comercial creat manual.");
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { ok: true, tableReady: true, signal };
}

export async function updateCommercialSignal(id: string, input: CommercialSignalInput) {
  const { supabase, business } = await getCurrentInboxContext();
  const { data, error } = await supabase
    .from("commercial_signals")
    .update(signalUpdateToRow(input))
    .eq("id", id)
    .eq("business_id", business.id)
    .select("*")
    .single();

  if (error) {
    if (isMissingCommercialInboxTable(error) || isMissingRecoverabilitySchema(error)) {
      return { ok: false, tableReady: false, message: commercialInboxSetupMessage };
    }
    return { ok: false, tableReady: true, message: "Semnalul comercial nu a putut fi actualizat." };
  }

  const signal = mapSignal(data as CommercialSignalRow);
  const hasHumanReviewChanges = [
    input.reviewedDraft,
    input.recommendedAction,
    input.suggestedDueDate,
    input.assignedToProfileId,
    input.matchedOrganizationId,
    input.matchedContactId
  ].some((value) => value !== undefined);
  const eventResult = await addCommercialSignalEvent(
    id,
    hasHumanReviewChanges ? "analysis_review_edited" : input.status === "reviewed" ? "signal_reviewed" : "signal_updated",
    hasHumanReviewChanges ? "Recomandarea analizei a fost editată de utilizator." : input.status === "reviewed" ? "Semnal comercial revizuit." : "Semnal comercial actualizat."
  );
  if (eventResult.ok && eventResult.event) signal.events = [eventResult.event, ...(signal.events ?? [])];
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { ok: true, tableReady: true, signal };
}

export async function ignoreCommercialSignal(id: string) {
  return updateCommercialSignal(id, { status: "ignored" });
}

export async function archiveCommercialSignal(id: string) {
  return updateCommercialSignal(id, { status: "archived" });
}

export async function addCommercialSignalEvent(signalId: string, eventType: string, description: string, metadata: Record<string, unknown> = {}) {
  const { supabase, business, profileId } = await getCurrentInboxContext();
  const { data: signal, error: signalError } = await supabase
    .from("commercial_signals")
    .select("id,business_id")
    .eq("id", signalId)
    .eq("business_id", business.id)
    .single();

  if (signalError) {
    if (isMissingCommercialInboxTable(signalError)) {
      return { ok: false, tableReady: false, message: commercialInboxSetupMessage };
    }
    return { ok: false, tableReady: true, message: "Semnalul comercial nu este disponibil." };
  }

  const { data, error } = await supabase
    .from("commercial_signal_events")
    .insert({
      business_id: signal.business_id,
      signal_id: signal.id,
      event_type: eventType,
      description,
      metadata,
      created_by_profile_id: profileId
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingCommercialInboxTable(error)) {
      return { ok: false, tableReady: false, message: commercialInboxSetupMessage };
    }
    return { ok: false, tableReady: true, message: "Evenimentul nu a putut fi înregistrat." };
  }

  return { ok: true, tableReady: true, event: mapEvent(data as CommercialSignalEventRow) };
}

function normalizedMatch(value?: string | null) {
  return value?.trim().toLocaleLowerCase("ro-RO") ?? "";
}

export async function analyzeCommercialSignal(signalId: string, planId?: string | null) {
  const { supabase, business, profileId } = await getCurrentInboxContext();
  const { data: signalRow, error: signalError } = await supabase
    .from("commercial_signals")
    .select("*,recoverability_score")
    .eq("id", signalId)
    .eq("business_id", business.id)
    .single();

  if (signalError) {
    if (isMissingCommercialInboxTable(signalError) || isMissingRecoverabilitySchema(signalError)) {
      return { ok: false, tableReady: false, message: commercialInboxSetupMessage };
    }
    return { ok: false, tableReady: true, message: "Semnalul nu a putut fi încărcat pentru analiză." };
  }

  const signal = mapSignal(signalRow as CommercialSignalRow);
  await supabase.from("commercial_signals").update({ status: "analyzing", analysis_status: "analyzing", updated_at: new Date().toISOString() })
    .eq("id", signal.id).eq("business_id", business.id);
  await addCommercialSignalEvent(signal.id, "analysis_started", "Analiza recuperabilității a început.");

  const { data: possibleDuplicates } = await supabase
    .from("commercial_signals")
    .select("id,contact_email,contact_company,title,status")
    .eq("business_id", business.id)
    .neq("id", signal.id)
    .not("status", "in", "(dismissed,duplicate,ignored,archived)")
    .limit(50);
  const email = normalizedMatch(signal.contactEmail);
  const company = normalizedMatch(signal.contactCompany);
  const signalTitle = normalizedMatch(signal.title);
  const duplicate = (possibleDuplicates ?? []).find((candidate) =>
    (email && normalizedMatch(candidate.contact_email) === email)
    || (company && signalTitle && normalizedMatch(candidate.contact_company) === company && normalizedMatch(candidate.title) === signalTitle)
  );

  let matchedOrganizationId = signal.matchedOrganizationId ?? null;
  let matchedContactId = signal.matchedContactId ?? null;
  if (!matchedOrganizationId && company) {
    const { data } = await supabase.from("crm_organizations").select("id").eq("business_id", business.id).eq("normalized_name", company).eq("is_archived", false).maybeSingle();
    matchedOrganizationId = data?.id ?? null;
  }
  if (!matchedContactId && email) {
    const { data } = await supabase.from("crm_contacts").select("id,organization_id").eq("business_id", business.id).eq("normalized_email", email).eq("is_active", true).maybeSingle();
    matchedContactId = data?.id ?? null;
    matchedOrganizationId = matchedOrganizationId ?? data?.organization_id ?? null;
  }

  const analysis = await runRecoverabilityAnalysis({ signal, business, profileId, planId, duplicateRisk: Boolean(duplicate) });
  const { data: updatedRow, error: updateError } = await supabase
    .from("commercial_signals")
    .update({
      status: "ready_for_review",
      analysis_status: "completed",
      review_status: "ready_for_review",
      analysis_mode: analysis.mode,
      recoverability_score: analysis.recoverabilityScore,
      confidence_level: analysis.confidence,
      estimated_recoverable_value: analysis.estimatedRecoverableValue,
      currency: analysis.currency,
      urgency_level: analysis.urgency,
      primary_recovery_reason: analysis.primaryRecoveryReason,
      analysis_explanation: analysis.executiveExplanation,
      missing_information: analysis.missingInformation,
      uncertainty_notes: packRecoverabilityInsights({
        detectedCommercialIntent: analysis.detectedCommercialIntent,
        relationshipContext: analysis.relationshipContext,
        scoreFactors: analysis.scoreFactors,
        riskNotes: analysis.riskNotes,
        uncertaintyNotes: analysis.uncertaintyNotes,
        humanReviewChecklist: analysis.humanReviewChecklist,
        alternativeDraftAngle: analysis.alternativeDraftAngle
      }),
      suggested_due_date: analysis.suggestedDueDate,
      suggested_owner_profile_id: analysis.suggestedOwnerProfileId,
      recommended_action: analysis.recommendedNextAction,
      duplicate_risk: analysis.duplicateRisk,
      duplicate_signal_id: duplicate?.id ?? null,
      matched_organization_id: matchedOrganizationId,
      matched_contact_id: matchedContactId,
      reviewed_draft: formatRecoveryDraft(analysis.recommendedDraftSubject, analysis.recommendedDraftBody),
      analyzed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", signal.id)
    .eq("business_id", business.id)
    .select("*,recoverability_score")
    .single();

  if (updateError) {
    await supabase.from("commercial_signals").update({ status: "failed", analysis_status: "failed" }).eq("id", signal.id).eq("business_id", business.id);
    await addCommercialSignalEvent(signal.id, "analysis_failed", "Analiza nu a putut fi salvată.");
    return { ok: false, tableReady: !isMissingRecoverabilitySchema(updateError), message: isMissingRecoverabilitySchema(updateError) ? commercialInboxSetupMessage : "Analiza nu a putut fi salvată." };
  }

  await addCommercialSignalEvent(signal.id, "analysis_completed", "Analiza recuperabilității este pregătită pentru revizuire.", {
    mode: analysis.mode,
    score: analysis.recoverabilityScore,
    urgency: analysis.urgency
  });
  if (analysis.mode === "deterministic_fallback") {
    await addCommercialSignalEvent(signal.id, "fallback_used", "Analiza a fost generată pe baza regulilor disponibile și necesită verificarea echipei.");
  }
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { ok: true, tableReady: true, signal: mapSignal(updatedRow as CommercialSignalRow), fallbackUsed: analysis.mode === "deterministic_fallback" };
}

export async function setCommercialSignalReviewDecision(
  signalId: string,
  decision: "dismissed" | "duplicate" | "postponed",
  reason: string,
  reviewDueAt?: string
) {
  const { supabase, business } = await getCurrentInboxContext();
  if (!["dismissed", "duplicate", "postponed"].includes(decision)) {
    return { ok: false, tableReady: true, message: "Decizia de revizuire este invalidă." };
  }
  const cleanReason = reason.trim().slice(0, 500);
  if (decision !== "postponed" && !cleanReason) return { ok: false, tableReady: true, message: "Motivul este obligatoriu." };
  const { data, error } = await supabase.from("commercial_signals").update({
    status: decision,
    review_status: decision,
    dismissal_reason: cleanReason || null,
    review_due_at: decision === "postponed" ? toNullString(reviewDueAt) : null,
    reviewed_at: new Date().toISOString(),
    approved_by_profile_id: null,
    updated_at: new Date().toISOString()
  }).eq("id", signalId).eq("business_id", business.id).select("*,recoverability_score").single();
  if (error) return { ok: false, tableReady: !isMissingRecoverabilitySchema(error), message: isMissingRecoverabilitySchema(error) ? commercialInboxSetupMessage : "Decizia nu a putut fi salvată." };
  await addCommercialSignalEvent(signalId, decision === "duplicate" ? "duplicate_marked" : decision === "dismissed" ? "signal_dismissed" : "review_postponed", cleanReason || "Revizuire amânată.");
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { ok: true, tableReady: true, signal: mapSignal(data as CommercialSignalRow) };
}

export async function approveCommercialSignal(signalId: string, input: SignalApprovalInput) {
  const { supabase, business } = await getCurrentInboxContext();
  const email = toNullString(input.newContactEmail, 320);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, tableReady: true, message: "Emailul contactului nu este valid." };
  }
  const { data: signalLink, error: signalLinkError } = await supabase.from("commercial_signals")
    .select("detected_from_opportunity_id").eq("id", signalId).eq("business_id", business.id).single();
  if (signalLinkError) return { ok: false, tableReady: !isMissingRecoverabilitySchema(signalLinkError), message: "Semnalul nu este disponibil pentru aprobare." };
  const commonApproval = {
    target_signal_id: signalId,
    selected_owner_profile_id: safeUuid(input.ownerProfileId),
    selected_due_at: toNullString(input.dueAt),
    reviewed_action: toNullString(input.recommendedAction)?.slice(0, 500) ?? null,
    reviewed_draft: toNullString(input.reviewedDraft)?.slice(0, 8000) ?? null
  };
  const { data, error } = signalLink.detected_from_opportunity_id
    ? await supabase.rpc("approve_detected_recoverable_signal", commonApproval)
    : await supabase.rpc("approve_recoverable_signal", {
      ...commonApproval,
      selected_organization_id: safeUuid(input.organizationId),
      selected_contact_id: safeUuid(input.contactId),
      new_organization_name: toNullString(input.newOrganizationName)?.slice(0, 240) ?? null,
      new_contact_name: toNullString(input.newContactName)?.slice(0, 240) ?? null,
      new_contact_email: email,
      new_contact_phone: toNullString(input.newContactPhone)?.slice(0, 80) ?? null
    });
  if (error) {
    return { ok: false, tableReady: !isMissingRecoverabilitySchema(error), message: isMissingRecoverabilitySchema(error) ? commercialInboxSetupMessage : "Aprobarea nu a putut fi finalizată. Verifică potrivirea companiei, contactului și responsabilului." };
  }
  const result = data as { opportunity_id?: string; already_converted?: boolean } | null;
  const { data: updatedRow } = await supabase.from("commercial_signals").select("*,recoverability_score").eq("id", signalId).eq("business_id", business.id).single();
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/opportunities");
  if (result?.opportunity_id) revalidatePath(`/opportunities/${result.opportunity_id}`);
  return {
    ok: true,
    tableReady: true,
    opportunityId: result?.opportunity_id,
    alreadyConverted: Boolean(result?.already_converted),
    signal: updatedRow ? mapSignal(updatedRow as CommercialSignalRow) : undefined
  };
}


export async function convertSignalToOpportunity(signalId: string) {
  return approveCommercialSignal(signalId, {});
}
