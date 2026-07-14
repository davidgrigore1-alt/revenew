"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/authz/require-permission";
import { requireActivePaidAccess } from "@/lib/billing/paid-access";
import { getCurrentBusinessOrDemo, getOpportunityForCurrentBusiness } from "@/lib/supabase/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { applicationLocalDateTimeToIso, isValidPipelineTransition } from "@/lib/opportunity-domain";
import type {
  OpportunityActionType,
  OpportunityCommercialType,
  OpportunityLifecycleStatus,
  OpportunityStatus
} from "@/lib/types";

const validStatuses = new Set<OpportunityStatus>(["new", "reviewed", "action_generated", "contacted", "follow_up_needed"]);
const validActionTypes = new Set<OpportunityActionType>([
  "send_email", "call_contact", "prepare_offer", "prepare_documents", "follow_up",
  "apply_to_procurement", "apply_to_grant", "research_more"
]);
const validPriorities = new Set(["low", "medium", "high"]);
const validCommercialTypes = new Set<OpportunityCommercialType>([
  "new_business", "stalled_pipeline", "reactivation", "expansion", "renewal", "commercial_recovery", "other"
]);
const terminalOutcomes = new Set<OpportunityLifecycleStatus>(["won", "lost", "disqualified"]);
const wonReasons = new Set(["won", "recovered", "expanded", "renewed", "other"]);
const negativeReasons = new Set(["customer_selected_other", "no_budget", "no_response", "timing", "not_qualified", "duplicate", "cancelled", "other"]);

function safeText(value: FormDataEntryValue | null, fallback = "", maxLength = 240) {
  return String(value ?? fallback).trim().slice(0, maxLength);
}

function actorProfileId(authorization: { profileId: string | null }) {
  if (!authorization.profileId) throw new Error("Authenticated profile unavailable.");
  return authorization.profileId;
}

type TrustedEvent = {
  opportunityId: string;
  businessId: string;
  actorProfileId: string;
  eventType: string;
  label: string;
  description: string;
  metadata?: Record<string, string | number | null>;
};

async function eventForOpportunity(input: TrustedEvent) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return;
  const { error } = await supabase.from("opportunity_events").insert({
    opportunity_id: input.opportunityId,
    business_id: input.businessId,
    actor_profile_id: input.actorProfileId,
    event_type: input.eventType,
    label: input.label,
    description: input.description,
    metadata: input.metadata ?? {}
  });
  if (error) console.error("workspace_event_insert_failed", { code: error.code });
}

function revalidateOpportunity(opportunityId: string) {
  revalidatePath("/pipeline");
  revalidatePath("/today");
  revalidatePath("/dashboard");
  revalidatePath(`/opportunities/${opportunityId}`);
}

export async function updatePipelineStatus(opportunityId: string, formData: FormData) {
  await requireActivePaidAccess();
  const authorization = await requirePermission("opportunities.update");
  const nextStatus = safeText(formData.get("status")) as OpportunityStatus;
  if (!validStatuses.has(nextStatus)) {
    return { ok: false, error: "Folosește controlul de rezultat pentru închiderea oportunității." };
  }
  if (!isSupabaseConfigured) return { ok: true, mode: "demo" };

  const supabase = createSupabaseServerClient();
  const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  const opportunity = await getOpportunityForCurrentBusiness(opportunityId);
  if (!supabase || !business || !opportunity) return { ok: false, error: "Oportunitatea nu a fost găsită în workspace-ul curent." };
  if (opportunity.status === nextStatus && opportunity.lifecycleStatus !== "archived") return { ok: true, unchanged: true };
  if (!isValidPipelineTransition(opportunity.status, nextStatus)) {
    return { ok: false, error: "Etapa selectată nu este o tranziție validă. Avansează sau revino câte o etapă." };
  }

  const { error } = await supabase
    .from("opportunities")
    .update({ status: nextStatus, lifecycle_status: "open" })
    .eq("id", opportunityId)
    .eq("business_id", business.id);
  if (error) {
    console.error("pipeline_status_update_failed", { code: error.code });
    return { ok: false, error: "Etapa nu a putut fi actualizată. Verifică migrarea Phase 1." };
  }

  await eventForOpportunity({
    opportunityId,
    businessId: business.id,
    actorProfileId: actorProfileId(authorization),
    eventType: "stage_changed",
    label: "Etapă pipeline actualizată",
    description: `Etapa a fost schimbată din ${opportunity.status} în ${nextStatus}.`,
    metadata: { previous_status: opportunity.status, next_status: nextStatus }
  });
  revalidateOpportunity(opportunityId);
  return { ok: true };
}

export async function createOpportunityTask(opportunityId: string, formData: FormData) {
  await requireActivePaidAccess();
  const authorization = await requirePermission("actions.create");
  if (!isSupabaseConfigured) return { ok: true, mode: "demo" };

  const supabase = createSupabaseServerClient();
  const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  const opportunity = await getOpportunityForCurrentBusiness(opportunityId);
  if (!supabase || !business || !opportunity) return { ok: false, error: "Oportunitatea nu a fost găsită în workspace-ul curent." };

  const type = safeText(formData.get("type"), "follow_up") as OpportunityActionType;
  const priority = safeText(formData.get("priority"), "medium") as "low" | "medium" | "high";
  const title = safeText(formData.get("title"), "Follow-up comercial", 160);
  const description = safeText(formData.get("description"), "", 1200);
  const dueDate = safeText(formData.get("dueDate"));
  const dueTime = safeText(formData.get("dueTime"), "09:00");
  const requestedAssignee = safeText(formData.get("assignedToProfileId"), "", 64);
  if (!title || !validActionTypes.has(type) || !validPriorities.has(priority)) {
    return { ok: false, error: "Verifică tipul, prioritatea și titlul acțiunii." };
  }
  if (dueDate && (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !/^\d{2}:\d{2}$/.test(dueTime))) {
    return { ok: false, error: "Data sau ora acțiunii nu este validă." };
  }
  const dueAt = dueDate ? applicationLocalDateTimeToIso(dueDate, dueTime) : null;
  if (dueDate && !dueAt) return { ok: false, error: "Data sau ora acțiunii nu este validă." };
  const assignedToProfileId = requestedAssignee || actorProfileId(authorization);
  if (!(await verifyAssignableProfile(business.id, assignedToProfileId))) {
    return { ok: false, error: "Responsabilul selectat nu aparține workspace-ului curent." };
  }

  const { data, error } = await supabase.from("opportunity_actions").insert({
    business_id: business.id,
    opportunity_id: opportunityId,
    type,
    title,
    description,
    status: "pending",
    due_at: dueAt,
    priority,
    assigned_to_profile_id: assignedToProfileId
  }).select("id").single();
  if (error || !data) {
    console.error("opportunity_task_create_failed", { code: error?.code });
    return { ok: false, error: "Acțiunea nu a putut fi creată. Verifică migrarea Phase 1." };
  }

  await eventForOpportunity({
    opportunityId,
    businessId: business.id,
    actorProfileId: actorProfileId(authorization),
    eventType: "next_action_created",
    label: "Acțiune următoare creată",
    description: title,
    metadata: { action_id: data.id, due_at: dueAt, assigned_to_profile_id: assignedToProfileId }
  });
  revalidateOpportunity(opportunityId);
  return { ok: true, id: data.id };
}

export async function completeOpportunityTask(opportunityId: string, actionId: string) {
  await requireActivePaidAccess();
  const authorization = await requirePermission("actions.complete");
  if (!isSupabaseConfigured) return { ok: true, mode: "demo" };

  const supabase = createSupabaseServerClient();
  const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  const opportunity = await getOpportunityForCurrentBusiness(opportunityId);
  if (!supabase || !business || !opportunity) return { ok: false, error: "Oportunitatea nu a fost găsită în workspace-ul curent." };

  const now = new Date().toISOString();
  const { data, error } = await supabase.from("opportunity_actions")
    .update({ status: "done", completed_at: now })
    .eq("id", actionId)
    .eq("business_id", business.id)
    .eq("opportunity_id", opportunityId)
    .eq("status", "pending")
    .select("id,title")
    .maybeSingle();
  if (error) return { ok: false, error: "Acțiunea nu a putut fi finalizată." };
  if (!data) return { ok: true, unchanged: true };

  await eventForOpportunity({
    opportunityId,
    businessId: business.id,
    actorProfileId: actorProfileId(authorization),
    eventType: "next_action_completed",
    label: "Acțiune finalizată",
    description: data.title ?? "Acțiune finalizată",
    metadata: { action_id: actionId }
  });
  revalidateOpportunity(opportunityId);
  return { ok: true };
}

async function verifyAssignableProfile(businessId: string, profileId: string) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("business_assignable_profiles", { target_business_id: businessId });
  return !error && (data ?? []).some((row: { profile_id?: string }) => row.profile_id === profileId);
}

export async function updateOpportunityCommercialDetails(opportunityId: string, formData: FormData) {
  await requireActivePaidAccess();
  const authorization = await requirePermission("opportunities.update");
  if (!isSupabaseConfigured) return { ok: true, mode: "demo" };

  const supabase = createSupabaseServerClient();
  const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  const opportunity = await getOpportunityForCurrentBusiness(opportunityId);
  if (!supabase || !business || !opportunity) return { ok: false, error: "Oportunitatea nu este disponibilă." };

  const ownerProfileId = safeText(formData.get("ownerProfileId"), "", 64) || null;
  const commercialType = safeText(formData.get("commercialType"), "other", 40) as OpportunityCommercialType;
  if (!validCommercialTypes.has(commercialType)) return { ok: false, error: "Tipul comercial nu este valid." };
  if (ownerProfileId && !(await verifyAssignableProfile(business.id, ownerProfileId))) {
    return { ok: false, error: "Responsabilul selectat nu aparține workspace-ului curent." };
  }

  const { error } = await supabase.from("opportunities")
    .update({ owner_profile_id: ownerProfileId, commercial_type: commercialType })
    .eq("id", opportunityId)
    .eq("business_id", business.id);
  if (error) return { ok: false, error: "Detaliile comerciale nu au putut fi actualizate. Verifică migrarea Phase 1." };

  await eventForOpportunity({
    opportunityId,
    businessId: business.id,
    actorProfileId: actorProfileId(authorization),
    eventType: "commercial_details_changed",
    label: "Responsabilitate comercială actualizată",
    description: ownerProfileId ? "Responsabilul și tipul comercial au fost actualizate." : "Oportunitatea a rămas neatribuită.",
    metadata: {
      previous_owner_profile_id: opportunity.ownerProfileId ?? null,
      owner_profile_id: ownerProfileId,
      commercial_type: commercialType
    }
  });
  revalidateOpportunity(opportunityId);
  return { ok: true };
}

function validMoney(value: string) {
  return /^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(value);
}

export async function recordOpportunityOutcome(opportunityId: string, formData: FormData) {
  await requireActivePaidAccess();
  const authorization = await requirePermission("opportunities.update");
  if (!isSupabaseConfigured) return { ok: true, mode: "demo" };

  const supabase = createSupabaseServerClient();
  const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  const opportunity = await getOpportunityForCurrentBusiness(opportunityId);
  if (!supabase || !business || !opportunity) return { ok: false, error: "Oportunitatea nu este disponibilă." };

  const lifecycleStatus = safeText(formData.get("lifecycleStatus"), "", 24) as OpportunityLifecycleStatus;
  const outcomeReason = safeText(formData.get("outcomeReason"), "", 40);
  const outcomeDate = safeText(formData.get("outcomeDate"), "", 10);
  const outcomeNote = safeText(formData.get("outcomeNote"), "", 1000) || null;
  const currency = safeText(formData.get("currency"), opportunity.currency ?? "RON", 3).toUpperCase();
  const amount = safeText(formData.get("actualOutcomeAmount"), "", 24).replace(",", ".");
  const reasonSet = lifecycleStatus === "won" ? wonReasons : negativeReasons;
  if (!terminalOutcomes.has(lifecycleStatus) || !reasonSet.has(outcomeReason)) return { ok: false, error: "Rezultatul sau motivul selectat nu este valid." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(outcomeDate) || Number.isNaN(Date.parse(`${outcomeDate}T00:00:00Z`))) {
    return { ok: false, error: "Data rezultatului nu este validă." };
  }
  if (!/^[A-Z]{3}$/.test(currency)) return { ok: false, error: "Moneda trebuie să aibă un cod ISO din trei litere." };
  if (lifecycleStatus === "won" && !validMoney(amount)) return { ok: false, error: "Valoarea efectivă este obligatorie și nu poate fi negativă." };

  const now = new Date().toISOString();
  const legacyStatus: OpportunityStatus = lifecycleStatus === "won" ? "won" : lifecycleStatus === "lost" ? "lost" : "ignored";
  const payload = {
    status: legacyStatus,
    lifecycle_status: lifecycleStatus,
    currency,
    actual_outcome_amount: lifecycleStatus === "won" ? amount : null,
    outcome_date: outcomeDate,
    outcome_reason: outcomeReason,
    outcome_note: outcomeNote,
    outcome_recorded_by_profile_id: actorProfileId(authorization),
    outcome_recorded_at: now
  };
  let query = supabase.from("opportunities").update(payload).eq("id", opportunityId).eq("business_id", business.id);
  const expectedUpdatedAt = safeText(formData.get("expectedUpdatedAt"), "", 64);
  if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
  const { data, error } = await query.select("id").maybeSingle();
  if (error) return { ok: false, error: "Rezultatul nu a putut fi înregistrat. Verifică datele și migrarea Phase 1." };
  if (!data) return { ok: false, error: "Oportunitatea a fost modificată între timp. Reîncarcă pagina și verifică schimbările." };

  await eventForOpportunity({
    opportunityId,
    businessId: business.id,
    actorProfileId: actorProfileId(authorization),
    eventType: opportunity.lifecycleStatus === lifecycleStatus ? "outcome_corrected" : "outcome_recorded",
    label: lifecycleStatus === "won" ? "Rezultat câștigat înregistrat" : lifecycleStatus === "lost" ? "Rezultat pierdut înregistrat" : "Oportunitate descalificată",
    description: outcomeNote ?? "Rezultat comercial înregistrat de echipă.",
    metadata: {
      lifecycle_status: lifecycleStatus,
      outcome_reason: outcomeReason,
      actual_outcome_amount: lifecycleStatus === "won" ? amount : null,
      currency
    }
  });
  revalidateOpportunity(opportunityId);
  return { ok: true };
}

export async function reopenOpportunity(opportunityId: string) {
  await requireActivePaidAccess();
  const authorization = await requirePermission("opportunities.update");
  if (!isSupabaseConfigured) return { ok: true, mode: "demo" };
  const supabase = createSupabaseServerClient();
  const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  const opportunity = await getOpportunityForCurrentBusiness(opportunityId);
  if (!supabase || !business || !opportunity) return { ok: false, error: "Oportunitatea nu este disponibilă." };

  const { error } = await supabase.from("opportunities")
    .update({ status: "reviewed", lifecycle_status: "open" })
    .eq("id", opportunityId)
    .eq("business_id", business.id);
  if (error) return { ok: false, error: "Oportunitatea nu a putut fi redeschisă." };
  await eventForOpportunity({
    opportunityId,
    businessId: business.id,
    actorProfileId: actorProfileId(authorization),
    eventType: "lifecycle_reopened",
    label: "Oportunitate redeschisă",
    description: "Rezultatul anterior rămâne în istoric; oportunitatea este din nou activă.",
    metadata: { previous_lifecycle_status: opportunity.lifecycleStatus ?? opportunity.status }
  });
  revalidateOpportunity(opportunityId);
  return { ok: true };
}
