"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/authz/require-permission";
import { requireActivePaidAccess } from "@/lib/billing/paid-access";
import {
  commercialMilestones, responseCategories, responseChannels,
  responseSummaryRequired, type CommercialMilestone, type CommercialResponseCategory, type CommercialResponseChannel
} from "@/lib/commercial-response";
import { getCurrentBusinessOrDemo, getOpportunityForCurrentBusiness } from "@/lib/supabase/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OpportunityActionType } from "@/lib/types";

const validActionTypes = new Set<OpportunityActionType>([
  "send_email", "call_contact", "prepare_offer", "prepare_documents", "follow_up", "apply_to_procurement", "apply_to_grant", "research_more"
]);

export type RecordCommercialResponseInput = {
  category: CommercialResponseCategory;
  channel: CommercialResponseChannel;
  summary: string;
  respondedAt: string;
  contactId?: string;
  sourceDocumentId?: string;
  nextActionType: OpportunityActionType;
  nextActionTitle: string;
  nextActionDueAt: string;
  milestone?: CommercialMilestone | "";
};

function refresh(opportunityId: string) {
  revalidatePath(`/opportunities/${opportunityId}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/today");
}

function clean(value: string | undefined, max: number) {
  return (value ?? "").trim().slice(0, max);
}

function validDateTime(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

async function addEvent(input: { opportunityId: string; businessId: string; profileId: string; type: string; label: string; description: string; metadata?: Record<string, unknown> }) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return;
  await supabase.from("opportunity_events").insert({
    opportunity_id: input.opportunityId, business_id: input.businessId, actor_profile_id: input.profileId,
    event_type: input.type, label: input.label, description: input.description, metadata: input.metadata ?? {}
  });
}

export async function recordCommercialResponse(opportunityId: string, input: RecordCommercialResponseInput) {
  await requireActivePaidAccess();
  const authorization = await requirePermission("opportunities.update");
  const profileId = authorization.profileId;
  const [business, opportunity] = await Promise.all([
    getCurrentBusinessOrDemo({ redirectIfMissing: true }), getOpportunityForCurrentBusiness(opportunityId)
  ]);
  const supabase = createSupabaseServerClient();
  if (!profileId || !business || !opportunity || !supabase) return { ok: false as const, error: "Oportunitatea nu este disponibilă în workspace-ul curent." };

  if (!responseCategories.includes(input.category) || !responseChannels.includes(input.channel)) return { ok: false as const, error: "Categoria sau canalul răspunsului nu este valid." };
  const summary = clean(input.summary, 1200);
  if (responseSummaryRequired(input.category) && summary.length < 3) return { ok: false as const, error: "Adaugă un rezumat concis al răspunsului." };
  const safeSummary = summary || "Nu a fost primit un răspuns până la data selectată.";
  const respondedAt = validDateTime(input.respondedAt);
  const dueAt = validDateTime(input.nextActionDueAt);
  const nextActionTitle = clean(input.nextActionTitle, 160);
  if (!respondedAt || !dueAt || !validActionTypes.has(input.nextActionType) || nextActionTitle.length < 3) return { ok: false as const, error: "Verifică data răspunsului și următoarea acțiune." };
  if (input.milestone && !commercialMilestones.includes(input.milestone)) return { ok: false as const, error: "Milestone-ul comercial nu este valid." };

  const contactId = clean(input.contactId, 64) || null;
  if (contactId && !opportunity.contacts?.some((association) => association.contactId === contactId)) return { ok: false as const, error: "Contactul selectat nu aparține acestei oportunități." };
  const sourceDocumentId = clean(input.sourceDocumentId, 64) || null;
  if (sourceDocumentId && !opportunity.documents.some((document) => document.id === sourceDocumentId)) return { ok: false as const, error: "Documentul sursă nu aparține acestei oportunități." };

  const { data: action, error: actionError } = await supabase.from("opportunity_actions").insert({
    business_id: business.id, opportunity_id: opportunityId, type: input.nextActionType, title: nextActionTitle,
    description: `Acțiune confirmată după răspuns: ${input.category}.`, status: "pending", due_at: dueAt,
    priority: ["meeting_requested", "unsubscribe", "bounced"].includes(input.category) ? "high" : "medium", assigned_to_profile_id: profileId
  }).select("id").single();
  if (actionError || !action) return { ok: false as const, error: "Următoarea acțiune nu a putut fi creată." };

  const { data: response, error: responseError } = await supabase.from("commercial_responses").insert({
    business_id: business.id, opportunity_id: opportunityId, contact_id: contactId, source_document_id: sourceDocumentId,
    response_category: input.category, channel: input.channel, response_summary: safeSummary, responded_at: respondedAt,
    next_action_type: input.nextActionType, next_action_title: nextActionTitle, next_action_due_at: dueAt,
    milestone: input.milestone || null, recorded_by: profileId
  }).select("id").single();
  if (responseError || !response) {
    await supabase.from("opportunity_actions").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", action.id).eq("business_id", business.id).eq("opportunity_id", opportunityId).eq("status", "pending");
    return { ok: false as const, error: "Răspunsul nu a putut fi înregistrat în siguranță." };
  }

  await addEvent({ opportunityId, businessId: business.id, profileId, type: "commercial_response_recorded", label: "Răspuns comercial înregistrat", description: `Categorie: ${input.category}. Canal: ${input.channel}.`, metadata: { response_id: response.id, category: input.category, channel: input.channel, contact_id: contactId } });
  await addEvent({ opportunityId, businessId: business.id, profileId, type: "next_action_created", label: "Acțiune următoare confirmată", description: nextActionTitle, metadata: { response_id: response.id, action_id: action.id, due_at: dueAt } });
  if (input.milestone) await addEvent({ opportunityId, businessId: business.id, profileId, type: input.milestone.includes("meeting") ? "meeting_milestone" : input.milestone.includes("proposal") ? "proposal_milestone" : "commercial_milestone", label: "Milestone comercial înregistrat", description: input.milestone, metadata: { response_id: response.id, milestone: input.milestone } });
  if (["unsubscribe", "bounced"].includes(input.category)) await addEvent({ opportunityId, businessId: business.id, profileId, type: input.category === "unsubscribe" ? "unsubscribe_recorded" : "bounced_address_recorded", label: input.category === "unsubscribe" ? "Dezabonare înregistrată" : "Adresă respinsă înregistrată", description: "Outreach-ul viitor este restricționat până la o intervenție controlată.", metadata: { response_id: response.id } });
  refresh(opportunityId);
  return { ok: true as const, responseId: response.id, actionId: action.id };
}

export async function openOutcomeConfirmation(opportunityId: string, outcome: "won" | "lost") {
  await requireActivePaidAccess();
  const authorization = await requirePermission("opportunities.update");
  const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  const opportunity = await getOpportunityForCurrentBusiness(opportunityId);
  if (!authorization.profileId || !business || !opportunity || opportunity.lifecycleStatus !== "open") return { ok: false as const, error: "Oportunitatea nu mai este deschisă pentru confirmarea rezultatului." };
  await addEvent({ opportunityId, businessId: business.id, profileId: authorization.profileId, type: "outcome_confirmation_opened", label: "Confirmare rezultat deschisă", description: outcome === "won" ? "Confirmarea finală pentru câștig a fost deschisă." : "Confirmarea finală pentru pierdere a fost deschisă." });
  return { ok: true as const };
}
