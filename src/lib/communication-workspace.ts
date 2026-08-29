"use server";

import { revalidatePath } from "next/cache";

import { requireGoogleConnectorActor } from "@/lib/google-workspace/repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const statuses = new Set(["draft", "active", "paused", "archived"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function adminClient() {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("communication_workspace_unavailable");
  return admin;
}
function text(formData: FormData, name: string, max: number) {
  return String(formData.get(name) ?? "").trim().slice(0, max);
}

export async function saveResponseWindow(formData: FormData) {
  const actor = await requireGoogleConnectorActor();
  const value = Number(formData.get("businessDays"));
  if (!Number.isInteger(value) || value < 1 || value > 20) throw new Error("Fereastra trebuie să fie între 1 și 20 de zile lucrătoare.");
  const { error } = await adminClient()
  .from("businesses")
  .update({
    response_window_business_days: value,
    updated_at: new Date().toISOString(),
  })
  .eq("id", actor.businessId);

if (error) {
  console.error("saveResponseWindow database error", {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
    businessId: actor.businessId,
    value,
  });

  throw new Error("Fereastra de răspuns nu a putut fi salvată.");
}
  revalidatePath("/sequences");
  revalidatePath("/inbox");
}
export async function saveCommunicationSignature(formData: FormData) {
  const actor = await requireGoogleConnectorActor();
  const signature = text(formData, "signature", 4000);
  const { error } = await adminClient().from("communication_preferences").upsert({
    profile_id: actor.profileId,
    business_id: actor.businessId,
    signature_text: signature || null,
    updated_at: new Date().toISOString()
  }, { onConflict: "profile_id,business_id" });
  if (error) {
    console.error("saveCommunicationSignature database error", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    throw new Error("Semnătura nu a putut fi salvată.");
  }
  revalidatePath("/sequences");
}

export async function createCommunicationTemplate(formData: FormData) {
  const actor = await requireGoogleConnectorActor();
  const name = text(formData, "name", 120);
  const subject = text(formData, "subject", 500);
  const body = text(formData, "body", 50000);
  if (!name || !body) throw new Error("Numele și conținutul șablonului sunt obligatorii.");
  const { error } = await adminClient().from("communication_templates").insert({
    business_id: actor.businessId,
    created_by: actor.profileId,
    name, subject, body, status: "active"
  });
  if (error) throw new Error("Șablonul nu a putut fi creat.");
  revalidatePath("/sequences");
}

export async function updateCommunicationTemplate(formData: FormData) {
  const actor = await requireGoogleConnectorActor();
  const templateId = text(formData, "templateId", 40);
  const name = text(formData, "name", 120);
  const subject = text(formData, "subject", 500);
  const body = text(formData, "body", 50000);
  if (!uuidPattern.test(templateId) || !name || !body) throw new Error("Șablon invalid.");
  const { error } = await adminClient().from("communication_templates").update({ name, subject, body, updated_at: new Date().toISOString() })
    .eq("id", templateId).eq("business_id", actor.businessId).eq("status", "active");
  if (error) throw new Error("Șablonul nu a putut fi actualizat.");
  await adminClient().from("audit_logs").insert({ business_id: actor.businessId, profile_id: actor.profileId, action: "communication_template_updated", entity_type: "communication_template", entity_id: templateId, metadata: { content_logged: false } });
  revalidatePath("/sequences");
}
export async function archiveCommunicationTemplate(formData: FormData) {
  const actor = await requireGoogleConnectorActor();
  const templateId = text(formData, "templateId", 40);
  if (!uuidPattern.test(templateId)) throw new Error("Șablon invalid.");
  const { error } = await adminClient().from("communication_templates").update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", templateId).eq("business_id", actor.businessId);
  if (error) throw new Error("Șablonul nu a putut fi arhivat.");
  revalidatePath("/sequences");
}

type SequenceStep =
  | { type: "email"; mode: "prepare_only"; label: string }
  | { type: "wait"; businessDays: number; label: string }
  | { type: "manual_task"; label: string };

function sequenceSteps(raw: FormDataEntryValue | null): SequenceStep[] {
  if (typeof raw !== "string" || !raw.trim()) return [
    { type: "email", mode: "prepare_only", label: "Pregătește email pentru revizuire" },
    { type: "wait", businessDays: 3, label: "Așteaptă răspunsul clientului" },
    { type: "manual_task", label: "Revizuire manuală dacă nu există răspuns" }
  ];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Pașii secvenței nu sunt valizi."); }
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 12) throw new Error("Secvența trebuie să aibă între 1 și 12 pași.");
  return parsed.map((candidate): SequenceStep => {
    if (!candidate || typeof candidate !== "object") throw new Error("Pas de secvență invalid.");
    const item = candidate as Record<string, unknown>;
    const label = typeof item.label === "string" ? item.label.normalize("NFKC").trim().slice(0, 180) : "";
    if (!label) throw new Error("Fiecare pas are nevoie de un titlu.");
    if (item.type === "email") return { type: "email", mode: "prepare_only", label };
    if (item.type === "manual_task") return { type: "manual_task", label };
    if (item.type === "wait") {
      const businessDays = Number(item.businessDays);
      if (!Number.isInteger(businessDays) || businessDays < 1 || businessDays > 20) throw new Error("Așteptarea trebuie să fie între 1 și 20 de zile lucrătoare.");
      return { type: "wait", businessDays, label };
    }
    throw new Error("Tip de pas neacceptat.");
  });
}

export async function updateSequenceSteps(formData: FormData) {
  const actor = await requireGoogleConnectorActor();
  const sequenceId = text(formData, "sequenceId", 40);
  if (!uuidPattern.test(sequenceId)) throw new Error("Secvență invalidă.");
  const steps = sequenceSteps(formData.get("steps"));
  const { data, error } = await adminClient().from("outreach_sequences").update({ steps, updated_at: new Date().toISOString() })
    .eq("id", sequenceId).eq("business_id", actor.businessId).in("status", ["draft", "paused"]).select("id").maybeSingle();
  if (error || !data) throw new Error("O secvență activă trebuie pusă în pauză înainte de editare.");
  await adminClient().from("audit_logs").insert({ business_id: actor.businessId, profile_id: actor.profileId, action: "sequence_steps_updated", entity_type: "outreach_sequence", entity_id: sequenceId, metadata: { step_count: steps.length, autonomous_send: false } });
  revalidatePath("/sequences");
}
export async function createSequenceDraft(formData: FormData) {
  const actor = await requireGoogleConnectorActor();
  const name = text(formData, "name", 120);
  const description = text(formData, "description", 1000);
  if (!name) throw new Error("Numele secvenței este obligatoriu.");
  const steps = sequenceSteps(formData.get("steps"));
  const admin = adminClient();
  const { data, error } = await admin.from("outreach_sequences").insert({
    business_id: actor.businessId,
    owner_profile_id: actor.profileId,
    name,
    description: description || null,
    target: "Înrolare explicită",
    status: "draft",
    steps,
    exit_conditions: { on_reply: true, on_meeting_booked: true, on_opportunity_closed: true, manual: true }
  }).select("id").single();
  if (error || !data) throw new Error("Secvența nu a putut fi creată.");
  await admin.from("audit_logs").insert({ business_id: actor.businessId, profile_id: actor.profileId, action: "sequence_draft_created", entity_type: "outreach_sequence", entity_id: data.id, metadata: { step_count: steps.length, autonomous_send: false } });
  revalidatePath("/sequences");
}

export async function setSequenceStatus(formData: FormData) {
  const actor = await requireGoogleConnectorActor();
  const sequenceId = text(formData, "sequenceId", 40);
  const status = text(formData, "status", 20);
  if (!uuidPattern.test(sequenceId) || !statuses.has(status)) throw new Error("Actualizare invalidă.");
  const patch: Record<string, string | null> = { status, updated_at: new Date().toISOString() };
  if (status === "active") patch.activated_at = new Date().toISOString();
  if (status === "paused") patch.paused_at = new Date().toISOString();
  const { error } = await adminClient().from("outreach_sequences").update(patch)
    .eq("id", sequenceId).eq("business_id", actor.businessId);
  if (error) throw new Error("Starea secvenței nu a putut fi actualizată.");
  await adminClient().from("audit_logs").insert({ business_id: actor.businessId, profile_id: actor.profileId, action: status === "active" ? "sequence_activated" : status === "paused" ? "sequence_paused" : status === "archived" ? "sequence_archived" : "sequence_returned_to_draft", entity_type: "outreach_sequence", entity_id: sequenceId, metadata: { status, autonomous_send: false } });
  revalidatePath("/sequences");
}

export async function exitSequenceEnrollment(formData: FormData) {
  const actor = await requireGoogleConnectorActor();
  const enrollmentId = text(formData, "enrollmentId", 40);
  if (!uuidPattern.test(enrollmentId)) throw new Error("Înrolare invalidă.");
  const now = new Date().toISOString();
  const { data, error } = await adminClient().from("sequence_enrollments").update({
    status: "exited", exit_reason: "manual", exited_at: now, next_step_at: null, updated_at: now
  }).eq("id", enrollmentId).eq("business_id", actor.businessId).in("status", ["active", "paused"]).select("sequence_id,opportunity_id").maybeSingle();
  if (error || !data) throw new Error("Înrolarea nu a putut fi oprită.");
  await adminClient().from("audit_logs").insert({ business_id: actor.businessId, profile_id: actor.profileId, action: "sequence_enrollment_exited", entity_type: "outreach_sequence", entity_id: data.sequence_id, metadata: { enrollment_id: enrollmentId, opportunity_id: data.opportunity_id, exit_reason: "manual" } });
  revalidatePath("/sequences");
}
export async function enrollOpportunityInSequence(formData: FormData) {
  const actor = await requireGoogleConnectorActor();
  const sequenceId = text(formData, "sequenceId", 40);
  const opportunityId = text(formData, "opportunityId", 40);
  if (!uuidPattern.test(sequenceId) || !uuidPattern.test(opportunityId)) throw new Error("Înrolare invalidă.");
  const admin = adminClient();
  const [sequence, opportunity] = await Promise.all([
    admin.from("outreach_sequences").select("id,status").eq("id", sequenceId).eq("business_id", actor.businessId).maybeSingle(),
    admin.from("opportunities").select("id").eq("id", opportunityId).eq("business_id", actor.businessId).maybeSingle()
  ]);
  if (!sequence.data || !opportunity.data) throw new Error("Secvența sau oportunitatea nu aparține workspace-ului curent.");
  const { error } = await admin.from("sequence_enrollments").insert({
    sequence_id: sequenceId,
    business_id: actor.businessId,
    opportunity_id: opportunityId,
    owner_profile_id: actor.profileId,
    enrolled_by: actor.profileId,
    status: sequence.data.status === "active" ? "active" : "paused",
    current_step: 0,
    next_step_at: sequence.data.status === "active" ? new Date().toISOString() : null
  });
  if (error) throw new Error(error.code === "23505" ? "Oportunitatea este deja înrolată în această secvență." : "Înrolarea nu a putut fi salvată.");
  await admin.from("audit_logs").insert({
    business_id: actor.businessId,
    profile_id: actor.profileId,
    action: "sequence_enrollment_created",
    entity_type: "outreach_sequence",
    entity_id: sequenceId,
    metadata: { opportunity_id: opportunityId, autonomous_send: false }
  });
  revalidatePath("/sequences");
}

export async function getCommunicationWorkspace() {
  const actor = await requireGoogleConnectorActor();
  const admin = adminClient();
  const [preferences, templates, sequences, enrollments, opportunities, business, organizations, connection] = await Promise.all([
    admin.from("communication_preferences").select("signature_text").eq("profile_id", actor.profileId).eq("business_id", actor.businessId).maybeSingle(),
    admin.from("communication_templates").select("id,name,subject,body,status,updated_at").eq("business_id", actor.businessId).order("updated_at", { ascending: false }),
    admin.from("outreach_sequences").select("id,name,description,status,steps,exit_conditions,updated_at").eq("business_id", actor.businessId).order("updated_at", { ascending: false }),
    admin.from("sequence_enrollments").select("id,sequence_id,opportunity_id,status,current_step,next_step_at,exit_reason").eq("business_id", actor.businessId),
    admin.from("opportunities").select("id,title,status,organization_id").eq("business_id", actor.businessId).order("updated_at", { ascending: false }).limit(100),
    admin.from("businesses").select("response_window_business_days").eq("id", actor.businessId).maybeSingle(),
    admin.from("crm_organizations").select("id,name").eq("business_id", actor.businessId),
    admin.from("external_connections").select("external_email,granted_scopes,status").eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId).eq("provider", "google_workspace").neq("status", "disconnected").order("updated_at", { ascending: false }).limit(1).maybeSingle()
  ]);
  return {
    signature: preferences.data?.signature_text ?? "",
    responseWindowBusinessDays: business.data?.response_window_business_days ?? 3,
    templates: templates.data ?? [],
    sequences: sequences.data ?? [],
    enrollments: enrollments.data ?? [],
    opportunities: (opportunities.data ?? []).map((item) => ({ ...item, companyName: (organizations.data ?? []).find((organization) => organization.id === item.organization_id)?.name ?? null })),
    senderEmail: connection.data?.external_email ?? null
  };
}