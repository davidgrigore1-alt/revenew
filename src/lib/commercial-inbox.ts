import "server-only";
import { revalidatePath } from "next/cache";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import type {
  CommercialSignal,
  CommercialSignalEvent,
  CommercialSignalPriority,
  CommercialSignalSource,
  CommercialSignalStatus
} from "@/lib/types";

export const commercialInboxSetupMessage =
  "Modulul Inbox Comercial necesita activarea structurii de date. Ruleaza migratia 202606110010_commercial_inbox.sql.";

export type CommercialSignalInput = Partial<{
  source: CommercialSignalSource;
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
}>;

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

function toNullString(value?: string | null) {
  const trimmed = value?.trim();
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
    created_by_profile_id: profileId
  };
}

function signalUpdateToRow(input: CommercialSignalInput) {
  const row: Record<string, unknown> = {};
  if (input.source) row.source = input.source;
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
  return {
    id: row.id,
    businessId: row.business_id,
    source: row.source,
    sourceLabel: row.source_label,
    status: row.status,
    priority: row.priority,
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
    .select("*")
    .eq("business_id", business.id)
    .order("occurred_at", { ascending: false });

  if (error) {
    if (isMissingCommercialInboxTable(error)) {
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
  const activeSignals = result.signals.filter((signal) => !["converted", "ignored", "archived"].includes(signal.status));
  const topSignals = result.signals
    .filter((signal) => ["new", "reviewed"].includes(signal.status))
    .sort((a, b) => b.urgencyScore + b.fitScore + b.confidenceScore - (a.urgencyScore + a.fitScore + a.confidenceScore))
    .slice(0, 3);

  return {
    tableReady: result.tableReady,
    setupMessage: result.setupMessage,
    newCount: result.signals.filter((signal) => signal.status === "new").length,
    urgentCount: result.signals.filter((signal) => signal.priority === "urgent" || signal.urgencyScore >= 80).length,
    convertedCount: result.signals.filter((signal) => signal.status === "converted").length,
    estimatedPotential: activeSignals.reduce((sum, signal) => sum + Number(signal.estimatedValueMax ?? signal.estimatedValueMin ?? 0), 0),
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
    .select("*")
    .eq("business_id", business.id)
    .eq("converted_opportunity_id", opportunityId)
    .maybeSingle();

  if (error) {
    if (isMissingCommercialInboxTable(error)) {
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
    if (isMissingCommercialInboxTable(error)) {
      return { ok: false, tableReady: false, message: commercialInboxSetupMessage };
    }
    return { ok: false, tableReady: true, message: error.message };
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
    if (isMissingCommercialInboxTable(error)) {
      return { ok: false, tableReady: false, message: commercialInboxSetupMessage };
    }
    return { ok: false, tableReady: true, message: error.message };
  }

  const signal = mapSignal(data as CommercialSignalRow);
  await addCommercialSignalEvent(id, input.status === "reviewed" ? "signal_reviewed" : "signal_updated", input.status === "reviewed" ? "Semnal comercial revizuit." : "Semnal comercial actualizat.");
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
    return { ok: false, tableReady: true, message: signalError.message };
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
    return { ok: false, tableReady: true, message: error.message };
  }

  return { ok: true, tableReady: true, event: mapEvent(data as CommercialSignalEventRow) };
}

export async function convertSignalToOpportunity(signalId: string) {
  const { supabase, business } = await getCurrentInboxContext();
  const { data: signalRow, error: signalError } = await supabase
    .from("commercial_signals")
    .select("*")
    .eq("id", signalId)
    .eq("business_id", business.id)
    .single();

  if (signalError) {
    if (isMissingCommercialInboxTable(signalError)) {
      return { ok: false, tableReady: false, message: commercialInboxSetupMessage };
    }
    return { ok: false, tableReady: true, message: signalError.message };
  }

  const signal = mapSignal(signalRow as CommercialSignalRow);
  if (signal.convertedOpportunityId) {
    return { ok: true, tableReady: true, alreadyConverted: true, opportunityId: signal.convertedOpportunityId, signal };
  }

  const sourceName = signal.sourceLabel ?? signal.source;
  const title = signal.contactCompany && signal.detectedNeed
    ? `${signal.contactCompany} - ${signal.detectedNeed}`
    : `Oportunitate din ${sourceName}`;
  const rawSourceText = [
    signal.rawMessage,
    signal.extractedSummary ? `Sumar: ${signal.extractedSummary}` : "",
    signal.contactName || signal.contactCompany ? `Contact: ${[signal.contactName, signal.contactRole, signal.contactCompany].filter(Boolean).join(", ")}` : "",
    signal.contactEmail ? `Email: ${signal.contactEmail}` : "",
    signal.contactPhone ? `Telefon: ${signal.contactPhone}` : "",
    signal.recommendedAction ? `Actiune recomandata: ${signal.recommendedAction}` : "",
    signal.nextStep ? `Urmatorul pas: ${signal.nextStep}` : ""
  ].filter(Boolean).join("\n");

  const { data: opportunity, error: opportunityError } = await supabase
    .from("opportunities")
    .insert({
      business_id: business.id,
      title,
      type: "b2b_lead",
      status: "new",
      estimated_value_low: signal.estimatedValueMin ?? null,
      estimated_value_high: signal.estimatedValueMax ?? signal.estimatedValueMin ?? null,
      city: signal.location ?? business.city ?? null,
      county: null,
      fit_score: signal.fitScore,
      urgency_score: signal.urgencyScore,
      money_score: signal.estimatedValueMax || signal.estimatedValueMin ? Math.min(100, Math.max(40, Math.round(((signal.estimatedValueMax ?? signal.estimatedValueMin ?? 0) / Math.max(business.averageContractValue || 1, 1)) * 60))) : 50,
      confidence_score: signal.confidenceScore,
      summary: signal.extractedSummary ?? signal.detectedNeed ?? "Oportunitate creata din Inbox Comercial.",
      relevance: [signal.serviceInterest, signal.detectedNeed].filter(Boolean),
      risks: [],
      recommended_action: signal.recommendedAction ?? signal.nextStep ?? "Revizuiește semnalul și contactează lead-ul.",
      raw_source_text: rawSourceText,
      contact_name: signal.contactName ?? null,
      contact_email: signal.contactEmail ?? null,
      contact_phone: signal.contactPhone ?? null,
      analysis_mode: "local_fallback"
    })
    .select("id")
    .single();

  if (opportunityError) {
    return { ok: false, tableReady: true, message: opportunityError.message };
  }

  const { data: updatedSignalRow, error: updateError } = await supabase
    .from("commercial_signals")
    .update({ status: "converted", converted_opportunity_id: opportunity.id })
    .eq("id", signal.id)
    .eq("business_id", business.id)
    .select("*")
    .single();

  if (updateError) {
    return { ok: false, tableReady: true, message: updateError.message };
  }

  await addCommercialSignalEvent(signal.id, "signal_converted_to_opportunity", "Semnal transformat in oportunitate.", { opportunity_id: opportunity.id });
  await supabase.from("opportunity_events").insert({
    opportunity_id: opportunity.id,
    event_type: "created_from_commercial_signal",
    label: "Creat din Inbox Comercial",
    description: "Oportunitate creata din Inbox Comercial."
  });

  const updatedSignal = mapSignal(updatedSignalRow as CommercialSignalRow);
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath(`/opportunities/${opportunity.id}`);
  return { ok: true, tableReady: true, opportunityId: opportunity.id, signal: updatedSignal };
}
