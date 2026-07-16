"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/authz/require-permission";
import { getCurrentBusinessOrDemo } from "@/lib/supabase/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createFollowUpContentFingerprint,
  createFollowUpIdempotencyKey,
  getEmailSendingConfiguration,
  isValidRecipientEmail,
  normalizeEmail,
  sendWithConfiguredProvider,
  type EmailSendingMode
} from "@/lib/follow-up-sending";

type SendDocument = {
  id: string;
  business_id: string;
  opportunity_id: string;
  document_type: string;
  title: string;
  body: string | null;
  status: string;
  approved_content_fingerprint: string | null;
  send_status: string;
  sending_mode: EmailSendingMode | null;
  recipient_snapshot: string | null;
  idempotency_key: string | null;
  send_attempt_count: number;
  sent_at: string | null;
  provider_message_id: string | null;
  safe_failure_category: string | null;
};

export type FollowUpReadiness = {
  ready: boolean;
  mode: EmailSendingMode;
  requestedMode: EmailSendingMode;
  liveConfigured: boolean;
  recipient: string;
  fingerprint: string;
  revisionMatches: boolean;
  sendStatus: string;
  sendingMode: EmailSendingMode | null;
  sentAt: string | null;
  failureCategory: string | null;
  checks: Array<{ key: string; label: string; passed: boolean }>;
};

async function loadSendContext(documentId: string) {
  const [authorization, business] = await Promise.all([
    requirePermission("documents.mark_sent"),
    getCurrentBusinessOrDemo({ redirectIfMissing: true })
  ]);
  const supabase = createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!business || !supabase || !admin) throw new Error("Trimiterea securizată nu este configurată pe server.");

  const { data: document, error: documentError } = await supabase
    .from("opportunity_documents")
    .select("id,business_id,opportunity_id,document_type,title,body,status,approved_content_fingerprint,send_status,sending_mode,recipient_snapshot,idempotency_key,send_attempt_count,sent_at,provider_message_id,safe_failure_category")
    .eq("id", documentId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (documentError || !document) throw new Error("Draftul nu este disponibil în workspace-ul curent.");

  const { data: opportunity, error: opportunityError } = await supabase
    .from("opportunities")
    .select("id,business_id,contact_email,contact_name,organization_id")
    .eq("id", document.opportunity_id)
    .eq("business_id", business.id)
    .maybeSingle();
  if (opportunityError || !opportunity) throw new Error("Oportunitatea asociată nu este disponibilă în workspace-ul curent.");

  const { data: contactLinks, error: contactError } = await supabase
    .from("opportunity_contacts")
    .select("id,is_primary,crm_contacts(id,business_id,email,organization_id)")
    .eq("opportunity_id", opportunity.id)
    .eq("business_id", business.id)
    .order("is_primary", { ascending: false });
  const links = contactError ? [] : (contactLinks ?? []);
  const primary = links.find((link) => link.is_primary) ?? links[0];
  const linkedContact = primary?.crm_contacts as unknown as { id?: string; business_id?: string; email?: string | null; organization_id?: string | null } | null;
  const recipient = normalizeEmail(opportunity.contact_email ?? linkedContact?.email);
  const relationshipValid = !contactError
    && opportunity.business_id === business.id
    && (!linkedContact || linkedContact.business_id === business.id);

  const subject = (document.title ?? "").trim();
  const body = (document.body ?? "").trim();
  const fingerprint = createFollowUpContentFingerprint({
    businessId: business.id,
    documentId: document.id,
    opportunityId: opportunity.id,
    recipient,
    subject,
    body
  });
  const revisionMatches = Boolean(document.approved_content_fingerprint && document.approved_content_fingerprint === fingerprint);
  const config = getEmailSendingConfiguration();
  const checks = [
    { key: "authenticated", label: "Utilizator autentificat", passed: authorization.authenticated },
    { key: "workspace", label: "Apartenență validă la workspace", passed: Boolean(authorization.profileId && business.id) },
    { key: "scope", label: "Draft și oportunitate în workspace-ul curent", passed: document.business_id === business.id },
    { key: "relationships", label: "Relații oportunitate/contact valide", passed: relationshipValid },
    { key: "recipient", label: "Adresă de email validă", passed: isValidRecipientEmail(recipient) },
    { key: "subject", label: "Subiect complet", passed: subject.length > 0 },
    { key: "body", label: "Mesaj complet", passed: body.length > 0 },
    { key: "approval", label: "Draft aprobat pentru utilizare", passed: ["approved", "ready_to_send"].includes(document.status) },
    { key: "revision", label: "Conținut identic cu versiunea aprobată", passed: revisionMatches },
    { key: "not_delivered", label: "Fără livrare reală anterioară", passed: document.send_status !== "sent" && !document.sent_at },
    { key: "not_sending", label: "Nicio trimitere în curs", passed: document.send_status !== "sending" }
  ];

  return {
    authorization,
    business,
    supabase,
    admin,
    document: document as SendDocument,
    opportunity,
    recipient,
    subject,
    body,
    fingerprint,
    config,
    readiness: {
      ready: checks.every((check) => check.passed),
      mode: config.mode,
      requestedMode: config.requestedMode,
      liveConfigured: config.liveConfigured,
      recipient,
      fingerprint,
      revisionMatches,
      sendStatus: document.send_status,
      sendingMode: document.sending_mode,
      sentAt: document.sent_at,
      failureCategory: document.safe_failure_category,
      checks
    } satisfies FollowUpReadiness
  };
}

async function audit(context: Awaited<ReturnType<typeof loadSendContext>>, eventType: string, label: string, description: string, metadata: Record<string, unknown>) {
  const { error } = await context.supabase.from("opportunity_events").insert({
    opportunity_id: context.opportunity.id,
    business_id: context.business.id,
    actor_profile_id: context.authorization.profileId,
    event_type: eventType,
    label,
    description,
    metadata: { document_id: context.document.id, ...metadata }
  });
  if (error) throw new Error("Evenimentul de audit nu a putut fi salvat.");
}

export async function getFollowUpSendReadiness(documentId: string): Promise<FollowUpReadiness> {
  return (await loadSendContext(documentId)).readiness;
}

export async function openFollowUpSendConfirmation(documentId: string) {
  const context = await loadSendContext(documentId);
  await audit(context, "follow_up_readiness_checked", "Pregătire verificată", "Condițiile de trimitere au fost verificate pe server.", { ready: context.readiness.ready, mode: context.config.mode });
  if (context.readiness.ready) {
    await audit(context, "follow_up_confirmation_opened", "Confirmare finală deschisă", "Utilizatorul a deschis confirmarea finală. Nu a fost inițiată încă trimiterea.", { mode: context.config.mode });
  }
  return { ok: true as const, readiness: context.readiness };
}

function refresh(documentId: string, opportunityId: string) {
  revalidatePath(`/outreach/${documentId}`);
  revalidatePath(`/opportunities/${opportunityId}`);
  revalidatePath("/outreach");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function sendApprovedFollowUp(documentId: string, finalConfirmation: boolean) {
  if (finalConfirmation !== true) return { ok: false as const, error: "Confirmarea finală este obligatorie." };
  const context = await loadSendContext(documentId);
  const { document, readiness, config } = context;

  if (document.send_status === "sending") {
    await audit(context, "follow_up_replay_blocked", "Trimitere duplicată blocată", "Există deja o încercare în curs pentru această versiune.", { mode: config.mode });
    return { ok: false as const, replay: true, error: "O trimitere este deja în curs." };
  }
  if (document.send_status === "sent" || (["test_completed", "disabled"].includes(document.send_status) && document.sending_mode === config.mode && readiness.revisionMatches)) {
    await audit(context, "follow_up_replay_blocked", "Reluare blocată", "Rezultatul persistent existent a fost returnat fără un nou apel către furnizor.", { mode: document.sending_mode, send_status: document.send_status });
    return { ok: true as const, replay: true, status: document.send_status, mode: document.sending_mode, sentAt: document.sent_at };
  }
  if (!readiness.ready) return { ok: false as const, error: "Draftul nu îndeplinește toate condițiile de trimitere.", readiness };

  const attempt = document.send_attempt_count + 1;
  const idempotencyKey = createFollowUpIdempotencyKey({
    businessId: context.business.id,
    documentId,
    approvedFingerprint: context.fingerprint,
    mode: config.mode,
    attempt
  });
  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await context.admin
    .from("opportunity_documents")
    .update({
      send_status: "sending",
      sending_mode: config.mode,
      recipient_snapshot: context.recipient,
      idempotency_key: idempotencyKey,
      send_attempt_count: attempt,
      send_started_at: now,
      safe_failure_category: null,
      provider_message_id: null
    })
    .eq("id", documentId)
    .eq("business_id", context.business.id)
    .eq("approved_content_fingerprint", context.fingerprint)
    .eq("send_status", document.send_status)
    .eq("send_attempt_count", document.send_attempt_count)
    .select("id")
    .maybeSingle();

  if (claimError || !claimed) {
    await audit(context, "follow_up_replay_blocked", "Concurență blocată", "O altă cerere a revendicat deja această versiune.", { mode: config.mode });
    return { ok: false as const, replay: true, error: "O altă cerere a inițiat deja trimiterea." };
  }

  await audit(context, "follow_up_send_attempted", "Trimitere inițiată", "Utilizatorul a confirmat explicit încercarea de trimitere.", { mode: config.mode, attempt });

  if (config.mode === "disabled") {
    const { data: persisted } = await context.admin.from("opportunity_documents").update({ send_status: "disabled", safe_failure_category: "delivery_not_configured", last_send_result_at: new Date().toISOString() }).eq("id", documentId).eq("business_id", context.business.id).eq("idempotency_key", idempotencyKey).eq("send_status", "sending").select("id").maybeSingle();
    if (!persisted) return { ok: false as const, status: "sending", mode: "disabled" as const, error: "Rezultatul nu a putut fi salvat. Nu a fost contactat niciun furnizor." };
    await audit(context, "follow_up_provider_disabled", "Livrare neconfigurată", "Nu a fost contactat niciun furnizor și mesajul nu a fost marcat ca trimis.", { mode: "disabled", attempt });
    refresh(documentId, context.opportunity.id);
    return { ok: false as const, status: "disabled", mode: "disabled" as const, error: "Livrarea nu este configurată. Nu a fost trimis niciun email." };
  }

  if (config.mode === "test") {
    const completedAt = new Date().toISOString();
    const { data: persisted } = await context.admin.from("opportunity_documents").update({ send_status: "test_completed", last_send_result_at: completedAt }).eq("id", documentId).eq("business_id", context.business.id).eq("idempotency_key", idempotencyKey).eq("send_status", "sending").select("id").maybeSingle();
    if (!persisted) return { ok: false as const, status: "sending", mode: "test" as const, error: "Rezultatul testului nu a putut fi salvat. Nu a fost livrat niciun email." };
    await audit(context, "follow_up_test_completed", "Test intern finalizat", "Fluxul intern a fost finalizat în modul test. Nu a fost livrat niciun email extern.", { mode: "test", attempt });
    refresh(documentId, context.opportunity.id);
    return { ok: true as const, status: "test_completed", mode: "test" as const, sentAt: null };
  }

  const providerResult = await sendWithConfiguredProvider({ recipient: context.recipient, subject: context.subject, body: context.body, idempotencyKey });
  const completedAt = new Date().toISOString();
  if (!providerResult.ok) {
    const { data: persisted } = await context.admin.from("opportunity_documents").update({ send_status: "failed", safe_failure_category: providerResult.category, last_send_result_at: completedAt }).eq("id", documentId).eq("business_id", context.business.id).eq("idempotency_key", idempotencyKey).eq("send_status", "sending").select("id").maybeSingle();
    if (!persisted) return { ok: false as const, status: "sending", mode: "live" as const, error: "Eșecul furnizorului nu a putut fi salvat. Nu reîncerca automat." };
    await audit(context, "follow_up_send_failed", "Trimitere eșuată", "Furnizorul nu a confirmat livrarea. Mesajul nu a fost marcat ca trimis.", { mode: "live", attempt, failure_category: providerResult.category });
    refresh(documentId, context.opportunity.id);
    return { ok: false as const, status: "failed", mode: "live" as const, error: "Furnizorul nu a confirmat livrarea. Poți reîncerca după verificarea configurației." };
  }

  const { data: persisted } = await context.admin.from("opportunity_documents").update({
    send_status: "sent",
    status: "sent",
    sent_at: completedAt,
    sent_by: context.authorization.profileId,
    provider_message_id: providerResult.providerMessageId,
    last_send_result_at: completedAt
  }).eq("id", documentId).eq("business_id", context.business.id).eq("idempotency_key", idempotencyKey).eq("send_status", "sending").select("id").maybeSingle();
  if (!persisted) return { ok: false as const, status: "sending", mode: "live" as const, error: "Furnizorul a răspuns, dar rezultatul nu a putut fi confirmat în aplicație. Nu reîncerca automat." };

  await audit(context, "follow_up_send_succeeded", "Email trimis", "Furnizorul live a confirmat trimiterea, iar rezultatul a fost salvat.", { mode: "live", attempt });
  refresh(documentId, context.opportunity.id);
  return { ok: true as const, status: "sent", mode: "live" as const, sentAt: completedAt };
}
