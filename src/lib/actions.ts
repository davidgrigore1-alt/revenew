"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  generateCallScript,
  generateChecklist,
  generateFollowUpMessage,
  generateOfferDraft,
  generateOutreachEmail
} from "@/lib/mock-generators";
import { scoreOpportunity } from "@/lib/scoring";
import type { Business, Opportunity, OpportunityDocumentType, OpportunityStatus, OpportunityType } from "@/lib/types";
import { requireActivePaidAccess } from "@/lib/billing/paid-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentBusinessOrDemo, getOpportunityForCurrentBusiness } from "@/lib/supabase/data";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import type { ValidatedGeneratedDocument, ValidatedOpportunityAnalysis } from "@/lib/openai/validation";
import { requirePermission } from "@/lib/authz/require-permission";
import { provisionBusinessFromOnboarding } from "@/lib/business/provision-business";
import { updatePipelineStatus } from "@/lib/revenue-workspace/actions";
import { getCurrentProfile } from "@/lib/auth/profile";
import { recordProductEvent } from "@/lib/product-events";
import { canTransitionFollowUpDraft, validateFollowUpDraftFields, type FollowUpEditableStatus } from "@/lib/follow-up-studio";

export async function saveOnboarding(formData: FormData) {
  const result = await provisionBusinessFromOnboarding(formData);
  if (result.ok && result.mode === "supabase") {
    const [{ profile }, supabase] = await Promise.all([getCurrentProfile(), Promise.resolve(createSupabaseServerClient())]);
    if (profile && supabase) await supabase.from("onboarding_drafts").delete().eq("profile_id", profile.id);
    void recordProductEvent("workspace_setup_completed", { businessId: result.businessId, metadata: { entry_mode: String(formData.get("entryMode") ?? "manual") } });
  }
  return result;
}
export async function saveAnalyzedOpportunity(formData: FormData) {
  await requireActivePaidAccess();
  await requirePermission("opportunities.create");

  if (!isSupabaseConfigured) {
    return { ok: true, mode: "demo", id: null };
  }

  const supabase = createSupabaseServerClient();
  const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  if (!supabase || !business) {
    return { ok: false, error: "Nu am găsit firma curentă." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const rawSourceText = String(formData.get("rawSourceText") ?? "");
  const city = String(formData.get("city") ?? business.city);
  const county = String(formData.get("county") ?? business.county);
  const estimatedValueHigh = Number(formData.get("estimatedValue") || business.averageContractValue || 0);
  const deadline = String(formData.get("deadline") || "");
  const type = String(formData.get("type") || "manual") as OpportunityType;
  const sourceUrl = String(formData.get("sourceUrl") || "");
  const analysisJson = String(formData.get("analysis") || "");

  if (!title || !rawSourceText) {
    return { ok: false, error: "Titlul și textul oportunității sunt obligatorii." };
  }

  let analysis: ValidatedOpportunityAnalysis | null = null;
  if (analysisJson) {
    try {
      analysis = JSON.parse(analysisJson) as ValidatedOpportunityAnalysis;
    } catch (error) {
      console.error("Analyze save JSON parse error", error);
      return { ok: false, error: "Raspunsul AI nu a putut fi validat." };
    }
  }

  const summary = analysis?.ai_summary ?? `Analiza locala: ${title} pare relevanta pentru ${business.name}.`;
  const localScores = scoreOpportunity(
    { title, summary, rawSourceText, city, county, deadline, estimatedValueHigh, sourceUrl, contact: undefined },
    business
  );
  const analysisMode = analysis?.mode ?? "local_fallback";

  const { data, error } = await supabase
    .from("opportunities")
    .insert({
      business_id: business.id,
      title: analysis?.title ?? title,
      type: analysis?.type ?? type,
      status: "reviewed",
      estimated_value_low: analysis?.estimated_value_low ?? Math.round(estimatedValueHigh * 0.65),
      estimated_value_high: analysis?.estimated_value_high ?? estimatedValueHigh,
      deadline: analysis?.deadline ?? (deadline || null),
      city: analysis?.city ?? city,
      county: analysis?.county ?? county,
      fit_score: analysis?.fit_score ?? localScores.fitScore,
      urgency_score: analysis?.urgency_score ?? localScores.urgencyScore,
      money_score: analysis?.money_score ?? localScores.moneyScore,
      confidence_score: analysis?.confidence_score ?? localScores.confidenceScore,
      summary,
      relevance: analysis ? [analysis.why_relevant] : ["Oportunitatea a fost evaluata local."],
      risks: analysis?.risks ?? ["Analiza trebuie validata manual inainte de contact."],
      recommended_action: analysis?.recommended_next_action ?? "Revizuiește sursa și pregătește un prim mesaj de contact.",
      raw_source_text: rawSourceText,
      source_url: sourceUrl || null,
      contact_name: analysis?.contact_name ?? null,
      contact_email: analysis?.contact_email ?? null,
      contact_phone: analysis?.contact_phone ?? null,
      ai_summary: analysis?.ai_summary ?? null,
      why_relevant: analysis?.why_relevant ?? null,
      analysis_mode: analysisMode
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Supabase opportunity insert error", error);
    return { ok: false, error: `Salvarea oportunității a eșuat: ${error?.message ?? "insert fara rezultat"}` };
  }

  const eventType = analysisMode === "ai" ? "ai_analysis_saved" : "local_analysis_saved";
  const eventResult = await supabase.from("opportunity_events").insert({
    opportunity_id: data.id,
    event_type: eventType,
    label: analysisMode === "ai" ? "Analiza asistata salvata" : "Analiza standard salvata",
    description: "Oportunitatea a fost analizata si salvata in workspace."
  });

  if (eventResult.error) {
    console.error("Supabase opportunity event insert error", eventResult.error);
  }

  revalidatePath("/opportunities");
  redirect(`/opportunities/${data.id}`);
}

function generatedDocument(opportunity: Opportunity, business: Business, type: OpportunityDocumentType) {
  if (type === "outreach_email") return ["Email outreach", generateOutreachEmail(opportunity, business)];
  if (type === "call_script") return ["Script apel", generateCallScript(opportunity, business)];
  if (type === "offer_draft") return ["Draft oferta", generateOfferDraft(opportunity, business)];
  if (type === "follow_up_email") return ["Mesaj follow-up", generateFollowUpMessage(opportunity, business)];
  return ["Checklist actiune", generateChecklist(opportunity, business)];
}

export async function persistGeneratedDocument(opportunityId: string, type: OpportunityDocumentType, generated?: ValidatedGeneratedDocument) {
  await requireActivePaidAccess();
  await requirePermission("documents.generate");

  if (!isSupabaseConfigured) {
    return { ok: true, mode: "demo" };
  }

  const supabase = createSupabaseServerClient();
  const opportunity = await getOpportunityForCurrentBusiness(opportunityId);
  const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  if (!supabase || !opportunity || !business) {
    return { ok: false, error: "Nu am putut încărca oportunitatea." };
  }

  const [fallbackTitle, fallbackBody] = generatedDocument(opportunity, business, type);
  const title = generated?.title ?? fallbackTitle;
  const body = generated?.content ?? fallbackBody;
  const mode = generated?.mode ?? "local_fallback";
  const { data, error } = await supabase
    .from("opportunity_documents")
    .insert({
      business_id: business.id,
      opportunity_id: opportunityId,
      document_type: generated?.document_type ?? type,
      title,
      body,
      status: "draft",
      generation_mode: mode
    })
    .select("id,status,created_at,generation_mode")
    .single();

  if (error || !data) {
    console.error("Supabase document insert error", error);
    return { ok: false, error: `Salvarea documentului a esuat: ${error?.message ?? "insert fara rezultat"}` };
  }

  const eventResult = await supabase.from("opportunity_events").insert({
    opportunity_id: opportunityId,
    event_type: "document_generated",
    label: "Document generat",
    description: `${title} a fost pregatit si salvat in workspace.`
  });

  if (eventResult.error) {
    console.error("Supabase document event insert error", eventResult.error);
  }

  revalidatePath(`/opportunities/${opportunityId}`);
  return {
    ok: true,
    id: data.id,
    mode,
    title,
    body,
    status: data.status,
    createdAt: data.created_at,
    generationMode: data.generation_mode
  };
}

export async function updateGeneratedDocument(
  opportunityId: string,
  documentId: string,
  updates: { title?: string; content?: string; status?: FollowUpEditableStatus; markCopied?: boolean }
) {
  await requireActivePaidAccess();
  const authorization = await requirePermission("documents.update");

  if (!isSupabaseConfigured) {
    return { ok: true, mode: "demo" };
  }

  const supabase = createSupabaseServerClient();
  const [opportunity, business] = await Promise.all([
    getOpportunityForCurrentBusiness(opportunityId),
    getCurrentBusinessOrDemo({ redirectIfMissing: true })
  ]);
  if (!supabase || !opportunity || !business) {
    return { ok: false, error: "Documentul nu este disponibil în workspace-ul curent." };
  }

  const { data: currentDocument, error: currentError } = await supabase
    .from("opportunity_documents")
    .select("id,status,title,body,document_type")
    .eq("id", documentId)
    .eq("opportunity_id", opportunityId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (currentError || !currentDocument) {
    return { ok: false, error: "Documentul nu este disponibil în workspace-ul curent." };
  }

  if (updates.status && !canTransitionFollowUpDraft(currentDocument.status, updates.status)) {
    return { ok: false, error: "Tranziția de status nu este permisă pentru acest draft." };
  }
  if (currentDocument.status === "sent" || currentDocument.status === "archived") {
    return { ok: false, error: "Documentele trimise sau arhivate nu mai pot fi modificate din Studio." };
  }

  const isMessageDocument = ["outreach_email", "follow_up_email", "linkedin_message", "whatsapp_message"].includes(currentDocument.document_type);
  const nextTitle = updates.title ?? currentDocument.title ?? "";
  const nextBody = updates.content ?? currentDocument.body ?? "";
  const validated = isMessageDocument ? validateFollowUpDraftFields(nextTitle, nextBody) : { ok: true as const, subject: nextTitle.trim().slice(0, 160), body: nextBody.trim().slice(0, 12000) };
  if (!validated.ok) return validated;

  const now = new Date().toISOString();
  const payload: Record<string, string> = {};
  const hasContentChanges = updates.title !== undefined || updates.content !== undefined;
  if (updates.title !== undefined) payload.title = validated.subject;
  if (updates.content !== undefined) payload.body = validated.body;
  if (hasContentChanges) payload.edited_at = now;
  if (updates.status) payload.status = updates.status;
  if (updates.status === "ready_to_send") payload.ready_at = now;
  if (updates.markCopied) payload.copied_at = now;

  const { data: updatedDocument, error } = await supabase
    .from("opportunity_documents")
    .update(payload)
    .eq("id", documentId)
    .eq("opportunity_id", opportunityId)
    .eq("business_id", business.id)
    .select("id")
    .maybeSingle();
  if (error || !updatedDocument) {
    return { ok: false, error: "Documentul nu a putut fi salvat în workspace-ul curent." };
  }

  const eventType = updates.markCopied
    ? "document_copied"
    : updates.status === "approved"
      ? "document_approved"
      : updates.status === "ready_to_send"
        ? "document_ready_to_send"
        : updates.status === "archived"
          ? "document_archived"
          : "document_edited";
  const label = updates.markCopied
    ? "Draft copiat"
    : updates.status === "approved"
      ? "Draft aprobat de utilizator"
      : updates.status === "ready_to_send"
        ? "Draft pregătit pentru utilizare"
        : updates.status === "archived"
          ? "Draft arhivat"
          : "Draft revizuit";

  const { error: eventError } = await supabase.from("opportunity_events").insert({
    opportunity_id: opportunityId,
    business_id: business.id,
    actor_profile_id: authorization.profileId,
    event_type: eventType,
    label,
    description: updates.status === "approved"
      ? "Conținutul a fost aprobat explicit de un utilizator. Nu a fost trimis extern."
      : label,
    metadata: { document_id: documentId, document_status: updates.status ?? currentDocument.status, external_send: false }
  });
  if (eventError) {
    return { ok: false, error: "Documentul a fost actualizat, dar evenimentul de audit nu a putut fi salvat." };
  }

  revalidatePath(`/outreach/${documentId}`);
  revalidatePath("/outreach");
  revalidatePath(`/opportunities/${opportunityId}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { ok: true, updatedAt: now, status: updates.status ?? currentDocument.status };
}
export async function persistOpportunityStatus(opportunityId: string, status: OpportunityStatus) {
  const formData = new FormData();
  formData.set("status", status);
  return updatePipelineStatus(opportunityId, formData);
}

export async function persistFollowUp(
  opportunityId: string,
  generated?: ValidatedGeneratedDocument,
  options?: { title?: string; dueAt?: string; priority?: "low" | "medium" | "high"; description?: string }
) {
  await requireActivePaidAccess();
  const authorization = await requirePermission("actions.create");

  if (!isSupabaseConfigured) {
    return { ok: true, mode: "demo" };
  }

  const supabase = createSupabaseServerClient();
  const opportunity = await getOpportunityForCurrentBusiness(opportunityId);
  const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  if (!supabase || !opportunity || !business) {
    return { ok: false, error: "Nu am putut încărca oportunitatea." };
  }

  const description = options?.description ?? generated?.content ?? generateFollowUpMessage(opportunity, business);
  const dueAt = options?.dueAt ?? new Date(Date.now() + 3 * 86400000).toISOString();
  const { data, error } = await supabase
    .from("opportunity_actions")
    .insert({
      business_id: business.id,
      opportunity_id: opportunityId,
      type: "follow_up",
      title: options?.title ?? "Follow-up programat",
      description,
      status: "pending",
      due_at: dueAt,
      priority: options?.priority ?? "medium",
      assigned_to_profile_id: authorization.profileId
    })
    .select("id,due_at,priority,status")
    .single();

  if (error || !data) {
    console.error("Supabase follow-up insert error", error);
    return { ok: false, error: "Programarea follow-up-ului nu a putut fi salvată." };
  }

  const eventResult = await supabase.from("opportunity_events").insert({
    opportunity_id: opportunityId,
    business_id: business.id,
    actor_profile_id: authorization.profileId,
    event_type: "next_action_created",
    label: "Follow-up programat",
    description: "A fost creată o acțiune de follow-up cu text pregătit pentru revizuire.",
    metadata: { action_id: data.id, assigned_to_profile_id: authorization.profileId, due_at: data.due_at }
  });

  if (eventResult.error) {
    console.error("Supabase follow-up event insert error", eventResult.error);
  }

  return {
    ok: true,
    id: data.id,
    mode: generated?.mode ?? "local_fallback",
    description,
    dueAt: data.due_at,
    priority: data.priority,
    status: data.status
  };
}

export async function updateOpportunityAction(opportunityId: string, actionId: string, action: "done" | "postpone" | "cancel") {
  await requireActivePaidAccess();
  const authorization = await requirePermission(action === "done" ? "actions.complete" : "actions.update");

  if (!isSupabaseConfigured) {
    return { ok: true, mode: "demo" };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase nu este disponibil." };
  }

  const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  const opportunity = await getOpportunityForCurrentBusiness(opportunityId);
  if (!business || !opportunity) {
    return { ok: false, error: "Oportunitatea nu a fost găsită în workspace-ul curent." };
  }

  const now = new Date().toISOString();
  const payload: Record<string, string> = {};
  let eventType = "action_completed";
  let label = "Actiune finalizata";

  if (action === "done") {
    payload.status = "done";
    payload.completed_at = now;
  } else if (action === "postpone") {
    payload.due_at = new Date(Date.now() + 3 * 86400000).toISOString();
    eventType = "action_postponed";
    label = "Actiune amanata";
  } else {
    payload.status = "cancelled";
    payload.cancelled_at = now;
    eventType = "action_cancelled";
    label = "Actiune anulata";
  }

  const { error } = await supabase.from("opportunity_actions").update(payload).eq("id", actionId).eq("business_id", business.id).eq("opportunity_id", opportunityId);
  if (error) {
    console.error("Supabase action update error", error);
    return { ok: false, error: `Actiunea nu a putut fi actualizata: ${error.message}` };
  }

  const eventResult = await supabase.from("opportunity_events").insert({
    opportunity_id: opportunityId,
    business_id: business.id,
    actor_profile_id: authorization.profileId,
    event_type: eventType,
    label,
    description: label,
    metadata: { action_id: actionId }
  });
  if (eventResult.error) {
    console.error("Supabase action event insert error", eventResult.error);
  }

  return { ok: true };
}
