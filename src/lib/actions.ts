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

export async function saveOnboarding(formData: FormData) {
  return provisionBusinessFromOnboarding(formData);
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
  updates: { title?: string; content?: string; status?: "edited" | "copied" | "ready_to_send" | "sent" }
) {
  await requireActivePaidAccess();
  await requirePermission("documents.update");

  if (!isSupabaseConfigured) {
    return { ok: true, mode: "demo" };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase nu este disponibil." };
  }

  const opportunity = await getOpportunityForCurrentBusiness(opportunityId);
  if (!opportunity) {
    return { ok: false, error: "Oportunitatea nu a fost găsită în workspace-ul curent." };
  }

  const now = new Date().toISOString();
  const payload: Record<string, string> = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.content !== undefined) payload.body = updates.content;
  if (updates.status) payload.status = updates.status;
  if (updates.status === "edited") payload.edited_at = now;
  if (updates.status === "copied") payload.copied_at = now;
  if (updates.status === "ready_to_send") payload.ready_at = now;
  if (updates.status === "sent") payload.sent_at = now;

  const { error } = await supabase.from("opportunity_documents").update(payload).eq("id", documentId).eq("opportunity_id", opportunityId);
  if (error) {
    console.error("Supabase document update error", error);
    return { ok: false, error: `Documentul nu a putut fi salvat: ${error.message}` };
  }

  const eventType =
    updates.status === "copied"
      ? "document_copied"
      : updates.status === "ready_to_send"
        ? "document_ready_to_send"
        : updates.status === "sent"
          ? "document_marked_sent"
          : "document_edited";
  const label =
    updates.status === "copied"
      ? "Document copiat"
      : updates.status === "ready_to_send"
        ? "Document pregatit de trimis"
        : updates.status === "sent"
          ? "Document marcat ca trimis"
          : "Document editat";

  const eventResult = await supabase.from("opportunity_events").insert({
    opportunity_id: opportunityId,
    event_type: eventType,
    label,
    description: label
  });
  if (eventResult.error) {
    console.error("Supabase document event insert error", eventResult.error);
    return { ok: false, error: `Evenimentul nu a putut fi salvat: ${eventResult.error.message}` };
  }

  return { ok: true, updatedAt: now };
}

export async function persistOpportunityStatus(opportunityId: string, status: OpportunityStatus) {
  await requireActivePaidAccess();
  await requirePermission("opportunities.update");

  if (!isSupabaseConfigured) {
    return { ok: true, mode: "demo" };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase nu este disponibil." };
  }

  const opportunity = await getOpportunityForCurrentBusiness(opportunityId);
  if (!opportunity) {
    return { ok: false, error: "Oportunitatea nu a fost găsită în workspace-ul curent." };
  }

  const { error } = await supabase.from("opportunities").update({ status }).eq("id", opportunityId);
  if (error) {
    console.error("Supabase status update error", error);
    return { ok: false, error: `Actualizarea statusului a esuat: ${error.message}` };
  }

  const eventType = status === "contacted" ? "marked_contacted" : status === "won" ? "marked_won" : status === "lost" ? "marked_lost" : "ignored";
  const eventResult = await supabase.from("opportunity_events").insert({
    opportunity_id: opportunityId,
    event_type: eventType,
    label: "Status actualizat",
    description: `Statusul a fost schimbat in ${status}.`
  });

  if (eventResult.error) {
    console.error("Supabase status event insert error", eventResult.error);
  }

  return { ok: true, mode: "supabase" };
}

export async function persistFollowUp(
  opportunityId: string,
  generated?: ValidatedGeneratedDocument,
  options?: { title?: string; dueAt?: string; priority?: "low" | "medium" | "high"; description?: string }
) {
  await requireActivePaidAccess();
  await requirePermission("actions.create");

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
      priority: options?.priority ?? "medium"
    })
    .select("id,due_at,priority,status")
    .single();

  if (error || !data) {
    console.error("Supabase follow-up insert error", error);
    return { ok: false, error: `Programarea follow-up-ului a esuat: ${error?.message ?? "insert fara rezultat"}` };
  }

  const eventResult = await supabase.from("opportunity_events").insert({
    opportunity_id: opportunityId,
    event_type: "follow_up_scheduled",
    label: "Follow-up programat",
    description: "A fost creata o actiune de follow-up cu text pregatit pentru revizuire."
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
  await requirePermission(action === "done" ? "actions.complete" : "actions.update");

  if (!isSupabaseConfigured) {
    return { ok: true, mode: "demo" };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Supabase nu este disponibil." };
  }

  const opportunity = await getOpportunityForCurrentBusiness(opportunityId);
  if (!opportunity) {
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

  const { error } = await supabase.from("opportunity_actions").update(payload).eq("id", actionId).eq("opportunity_id", opportunityId);
  if (error) {
    console.error("Supabase action update error", error);
    return { ok: false, error: `Actiunea nu a putut fi actualizata: ${error.message}` };
  }

  const eventResult = await supabase.from("opportunity_events").insert({
    opportunity_id: opportunityId,
    event_type: eventType,
    label,
    description: label
  });
  if (eventResult.error) {
    console.error("Supabase action event insert error", eventResult.error);
  }

  return { ok: true };
}
