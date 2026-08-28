import "server-only";

import { createHash } from "crypto";

import { decryptGoogleRefreshCredential } from "@/lib/google-workspace/crypto";
import { sendGmailMessage } from "@/lib/google-workspace/gmail-send";
import { GOOGLE_GMAIL_SEND_SCOPE, refreshGoogleAccessToken } from "@/lib/google-workspace/oauth";
import { getOwnedGoogleEmailSource, type Actor } from "@/lib/google-workspace/repository";
import { rewriteCommunicationDraft, type CommunicationRewriteMode } from "@/lib/communication-writing";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type CommunicationDraftStatus = "draft" | "ready" | "sending" | "sent" | "discarded" | "failed";
export type CommunicationDraft = {
  id: string;
  business_id: string;
  owner_profile_id: string;
  connection_id: string;
  source_message_id: string | null;
  provider_thread_id: string | null;
  linked_contact_id: string | null;
  linked_organization_id: string | null;
  linked_opportunity_id: string | null;
  to_recipients: string[];
  cc_recipients: string[];
  subject: string;
  body: string;
  status: CommunicationDraftStatus;
  prepared_by: "human" | "ai";
  evidence: Array<{ type: string; id: string; label: string; timestamp?: string }>;
  approved_at: string | null;
  approved_by: string | null;
  content_fingerprint: string | null;
  provider_message_id: string | null;
  send_attempt_count: number;
  safe_failure_code: string | null;
  sent_at: string | null;
  updated_at: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function adminClient() {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("communication_storage_unavailable");
  return admin;
}

function addresses(value: unknown, max = 20) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => typeof item === "string" ? item : "").map((item) => item.trim().toLowerCase()).filter((item) => emailPattern.test(item)))).slice(0, max);
}

function fingerprint(draft: Pick<CommunicationDraft, "id" | "business_id" | "owner_profile_id" | "to_recipients" | "cc_recipients" | "subject" | "body">) {
  return createHash("sha256").update(JSON.stringify({
    id: draft.id,
    businessId: draft.business_id,
    ownerId: draft.owner_profile_id,
    to: draft.to_recipients,
    cc: draft.cc_recipients,
    subject: draft.subject.trim(),
    body: draft.body.trim()
  })).digest("hex");
}

async function audit(actor: Actor, action: string, draftId: string, metadata: Record<string, unknown> = {}) {
  const { error } = await adminClient().from("audit_logs").insert({
    business_id: actor.businessId,
    profile_id: actor.profileId,
    action,
    entity_type: "communication_draft",
    entity_id: draftId,
    metadata
  });
  if (error) throw new Error("communication_audit_failed");
}

export async function getOwnedCommunicationDraft(actor: Actor, draftId: string) {
  if (!uuidPattern.test(draftId)) return null;
  const { data, error } = await adminClient().from("communication_drafts").select("*")
    .eq("id", draftId).eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId).maybeSingle();
  if (error) throw new Error("communication_draft_lookup_failed");
  return data as CommunicationDraft | null;
}

export async function prepareReplyDraft(actor: Actor, sourceMessageId: string, preparedBy: "human" | "ai" = "human") {
  const source = await getOwnedGoogleEmailSource(actor, sourceMessageId);
  if (!source) throw new Error("communication_source_unavailable");
  const message = source.message;
  const recipient = message.direction === "inbound"
    ? message.sender_email
    : message.recipients?.find((item) => item?.email)?.email ?? null;
  if (!recipient || !emailPattern.test(recipient)) throw new Error("communication_recipient_unavailable");
  const subject = /^re:/i.test(message.subject ?? "") ? message.subject ?? "" : `Re: ${message.subject || "(fără subiect)"}`;
  const evidence = [{
    type: "EMAIL",
    id: message.id,
    label: message.subject || "Conversație Gmail",
    timestamp: message.sent_at
  }];
  const { data: existing } = await adminClient().from("communication_drafts").select("*")
    .eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId)
    .eq("source_message_id", sourceMessageId).in("status", ["draft", "ready", "failed"])
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (existing) return existing as CommunicationDraft;
  const { data: preferences } = await adminClient().from("communication_preferences").select("signature_text")
    .eq("profile_id", actor.profileId).eq("business_id", actor.businessId).maybeSingle();
  const signature = preferences?.signature_text?.trim() ?? "";
  const { data, error } = await adminClient().from("communication_drafts").insert({
    business_id: actor.businessId,
    owner_profile_id: actor.profileId,
    connection_id: source.connection.id,
    source_message_id: sourceMessageId,
    provider_thread_id: message.provider_thread_id,
    linked_contact_id: message.linked_contact_id,
    linked_organization_id: message.linked_organization_id,
    linked_opportunity_id: message.linked_opportunity_id,
    to_recipients: [recipient.toLowerCase()],
    cc_recipients: [],
    subject,
    body: signature ? "\n\n" + signature : "",
    status: "draft",
    prepared_by: preparedBy,
    evidence
  }).select("*").single();
  if (error || !data) throw new Error("communication_draft_create_failed");
  await audit(actor, "communication_draft_prepared", data.id, { prepared_by: preparedBy, source_type: "EMAIL" });
  return data as CommunicationDraft;
}

export async function prepareOpportunityCommunicationDraft(actor: Actor, input: { opportunityId: string; subject: string; body: string; evidence?: Array<{ type: string; id: string; label: string; timestamp?: string }> }) {
  if (!uuidPattern.test(input.opportunityId)) throw new Error("communication_target_unavailable");
  const client = adminClient();
  const { data: connection } = await client.from("external_connections").select("id")
    .eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId).eq("provider", "google_workspace")
    .neq("status", "disconnected").order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!connection) throw new Error("communication_connection_required");
  const { data: message } = await client.from("external_email_messages")
    .select("id,provider_thread_id,direction,sender_email,recipients,linked_contact_id,linked_organization_id,sent_at,subject")
    .eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId).eq("connection_id", connection.id)
    .eq("linked_opportunity_id", input.opportunityId).order("sent_at", { ascending: false }).limit(1).maybeSingle();
  if (!message) throw new Error("communication_recipient_unavailable");
  const recipient = message.direction === "inbound" ? message.sender_email : (message.recipients as Array<{ email?: string }> | null)?.find((item) => emailPattern.test(item?.email ?? ""))?.email;
  if (!recipient || !emailPattern.test(recipient)) throw new Error("communication_recipient_unavailable");
  const { data, error } = await client.from("communication_drafts").insert({
    business_id: actor.businessId, owner_profile_id: actor.profileId, connection_id: connection.id,
    source_message_id: message.id, provider_thread_id: message.provider_thread_id,
    linked_contact_id: message.linked_contact_id, linked_organization_id: message.linked_organization_id,
    linked_opportunity_id: input.opportunityId, to_recipients: [recipient.toLowerCase()], cc_recipients: [],
    subject: input.subject.trim().slice(0, 500), body: input.body.trim().slice(0, 100000), status: "draft", prepared_by: "ai",
    evidence: input.evidence?.slice(0, 8) ?? [{ type: "EMAIL", id: message.id, label: message.subject || "Conversație Gmail", timestamp: message.sent_at }]
  }).select("*").single();
  if (error || !data) throw new Error("communication_draft_create_failed");
  await audit(actor, "communication_draft_prepared", data.id, { prepared_by: "ai", source_type: "EMAIL", ask_action: true, external_send: false });
  return data as CommunicationDraft;
}
export async function updateCommunicationDraft(actor: Actor, draftId: string, input: { to?: unknown; cc?: unknown; subject?: unknown; body?: unknown }) {
  const current = await getOwnedCommunicationDraft(actor, draftId);
  if (!current || current.status === "sent" || current.status === "sending" || current.status === "discarded") throw new Error("communication_draft_not_editable");
  const to = addresses(input.to);
  const cc = addresses(input.cc).filter((item) => !to.includes(item));
  const subject = typeof input.subject === "string" ? input.subject.trim().slice(0, 500) : "";
  const body = typeof input.body === "string" ? input.body.trim().slice(0, 100000) : "";
  if (!to.length) throw new Error("communication_recipient_required");
  const { data, error } = await adminClient().from("communication_drafts").update({
    to_recipients: to,
    cc_recipients: cc,
    subject,
    body,
    status: "draft",
    approved_at: null,
    approved_by: null,
    content_fingerprint: null,
    safe_failure_code: null,
    updated_at: new Date().toISOString()
  }).eq("id", draftId).eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId)
    .neq("status", "sent").neq("status", "sending").select("*").maybeSingle();
  if (error || !data) throw new Error("communication_draft_update_failed");
  await audit(actor, "communication_draft_updated", draftId);
  return data as CommunicationDraft;
}

export async function refineCommunicationDraft(actor: Actor, draftId: string, mode: CommunicationRewriteMode) {
  const current = await getOwnedCommunicationDraft(actor, draftId);
  if (!current || !["draft", "failed", "ready"].includes(current.status)) throw new Error("communication_draft_not_editable");
  const rewritten = await rewriteCommunicationDraft(current.body, mode);
  const updated = await updateCommunicationDraft(actor, draftId, {
    to: current.to_recipients,
    cc: current.cc_recipients,
    subject: current.subject,
    body: rewritten.body
  });
  await audit(actor, "communication_draft_refined", draftId, {
    mode,
    ai_involved: rewritten.aiInvolved,
    source_bound: Boolean(current.source_message_id)
  });
  return { draft: updated, rationale: rewritten.rationale, aiInvolved: rewritten.aiInvolved };
}

export async function discardCommunicationDraft(actor: Actor, draftId: string) {
  const current = await getOwnedCommunicationDraft(actor, draftId);
  if (!current || !["draft", "failed", "ready"].includes(current.status)) throw new Error("communication_draft_not_editable");
  const { data, error } = await adminClient().from("communication_drafts").update({
    status: "discarded",
    approved_at: null,
    approved_by: null,
    content_fingerprint: null,
    updated_at: new Date().toISOString()
  }).eq("id", draftId).eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId)
    .in("status", ["draft", "failed", "ready"]).select("*").maybeSingle();
  if (error || !data) throw new Error("communication_draft_discard_failed");
  await audit(actor, "communication_draft_discarded", draftId, { source_bound: Boolean(current.source_message_id) });
  return data as CommunicationDraft;
}
export async function markCommunicationDraftReady(actor: Actor, draftId: string) {
  const current = await getOwnedCommunicationDraft(actor, draftId);
  if (!current || !["draft", "failed", "ready"].includes(current.status)) throw new Error("communication_draft_not_ready");
  if (!current.to_recipients.length || !current.body.trim()) throw new Error("communication_draft_incomplete");
  const contentFingerprint = fingerprint(current);
  const now = new Date().toISOString();
  const { data, error } = await adminClient().from("communication_drafts").update({
    status: "ready",
    approved_at: now,
    approved_by: actor.profileId,
    content_fingerprint: contentFingerprint,
    safe_failure_code: null,
    updated_at: now
  }).eq("id", draftId).eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId)
    .in("status", ["draft", "failed", "ready"]).select("*").maybeSingle();
  if (error || !data) throw new Error("communication_draft_ready_failed");
  await audit(actor, "communication_draft_ready_for_send", draftId, { human_approval: true });
  await adminClient().from("communication_notifications").insert({
    business_id: actor.businessId,
    recipient_profile_id: actor.profileId,
    kind: "approval_needed",
    title: "Email pregătit pentru confirmarea finală",
    body: data.subject || "Draft fără subiect",
    href: data.source_message_id ? `/inbox?email=${data.source_message_id}` : "/inbox"
  });
  return data as CommunicationDraft;
}

export async function sendApprovedGmailDraft(actor: Actor, draftId: string, finalConfirmation: boolean) {
  if (finalConfirmation !== true) throw new Error("communication_final_confirmation_required");
  const current = await getOwnedCommunicationDraft(actor, draftId);
  if (!current) throw new Error("communication_draft_unavailable");
  if (current.status === "sent") return { draft: current, replay: true };
  if (current.status === "sending") throw new Error("communication_send_in_progress");
  if (current.status !== "ready" || current.approved_by !== actor.profileId || !current.approved_at) throw new Error("communication_approval_required");
  const expectedFingerprint = fingerprint(current);
  if (!current.content_fingerprint || current.content_fingerprint !== expectedFingerprint) throw new Error("communication_revision_changed");

  const admin = adminClient();
  const { data: connection, error: connectionError } = await admin.from("external_connections")
    .select("id,external_email,granted_scopes,status,encrypted_refresh_credential")
    .eq("id", current.connection_id).eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId)
    .neq("status", "disconnected").maybeSingle();
  if (connectionError || !connection?.encrypted_refresh_credential) throw new Error("communication_connection_unavailable");
  if (!(connection.granted_scopes as string[]).includes(GOOGLE_GMAIL_SEND_SCOPE)) throw new Error("communication_send_capability_required");

  const idempotencyKey = createHash("sha256").update(`${draftId}:${expectedFingerprint}`).digest("hex");
  const { data: claimed, error: claimError } = await admin.from("communication_drafts").update({
    status: "sending",
    idempotency_key: idempotencyKey,
    send_attempt_count: current.send_attempt_count + 1,
    safe_failure_code: null,
    updated_at: new Date().toISOString()
  }).eq("id", draftId).eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId)
    .eq("status", "ready").eq("content_fingerprint", expectedFingerprint).select("id").maybeSingle();
  if (claimError || !claimed) throw new Error("communication_send_replay_blocked");
  await audit(actor, "communication_send_attempted", draftId, { provider: "gmail", human_confirmation: true });

  try {
    const refreshCredential = decryptGoogleRefreshCredential(connection.encrypted_refresh_credential);
    const token = await refreshGoogleAccessToken(refreshCredential);
    const result = await sendGmailMessage({
      accessToken: token.access_token,
      to: current.to_recipients,
      cc: current.cc_recipients,
      subject: current.subject,
      body: current.body,
      threadId: current.provider_thread_id
    });
    const sentAt = new Date().toISOString();
    const { data: sent, error: sentError } = await admin.from("communication_drafts").update({
      status: "sent",
      provider_message_id: result.providerMessageId,
      sent_at: sentAt,
      safe_failure_code: null,
      updated_at: sentAt
    }).eq("id", draftId).eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId)
      .eq("status", "sending").eq("idempotency_key", idempotencyKey).select("*").maybeSingle();
    if (sentError || !sent) throw new Error("communication_send_result_persist_failed");

    const { error: contextUpdateError } = await admin.from("external_email_messages").upsert({
      business_id: actor.businessId,
      owner_profile_id: actor.profileId,
      connection_id: current.connection_id,
      provider_message_id: result.providerMessageId,
      provider_thread_id: result.providerThreadId ?? current.provider_thread_id ?? result.providerMessageId,
      sent_at: sentAt,
      sender_email: connection.external_email,
      sender_name: null,
      recipients: current.to_recipients.map((email) => ({ email, name: null })),
      cc_recipients: current.cc_recipients.map((email) => ({ email, name: null })),
      subject: current.subject,
      normalized_text: current.body,
      excerpt: current.body.slice(0, 280),
      direction: "outbound",
      provider_labels: ["SENT"],
      linked_contact_id: current.linked_contact_id,
      linked_organization_id: current.linked_organization_id,
      linked_opportunity_id: current.linked_opportunity_id,
      provider_updated_at: sentAt,
      synced_at: sentAt
    }, { onConflict: "connection_id,provider_message_id" });

    try {
      await audit(actor, "communication_send_succeeded", draftId, {
        provider: "gmail",
        linked_opportunity_id: current.linked_opportunity_id,
        waiting_state_started: !contextUpdateError,
        context_update: contextUpdateError ? "deferred_to_sync" : "succeeded"
      });
    } catch {
      return { draft: sent as CommunicationDraft, replay: false, auditPending: true };
    }
    return { draft: sent as CommunicationDraft, replay: false, auditPending: false };
  } catch (error) {
    const safeCode = error instanceof Error && error.message === "google_refresh_invalid"
      ? "gmail_send_authorization_required"
      : error instanceof Error && error.message.startsWith("gmail_send_") ? error.message : "gmail_send_failed";
    await admin.from("communication_drafts").update({
      status: "failed",
      safe_failure_code: safeCode,
      updated_at: new Date().toISOString()
    }).eq("id", draftId).eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId)
      .eq("status", "sending").eq("idempotency_key", idempotencyKey);
    await admin.from("communication_notifications").insert({
      business_id: actor.businessId,
      recipient_profile_id: actor.profileId,
      kind: "send_failed",
      title: safeCode === "gmail_send_authorization_required" ? "Gmail necesită reconectare" : "Trimiterea Gmail necesită verificare",
      body: "Draftul a rămas disponibil. ReveNew nu va reîncerca automat.",
      href: current.source_message_id ? `/inbox?email=${current.source_message_id}` : "/inbox"
    });
    await audit(actor, "communication_send_failed", draftId, { provider: "gmail", safe_failure_code: safeCode });
    throw new Error(safeCode);
  }
}
export async function listOwnedCommunicationNotifications(actor: Actor) {
  const { data, error } = await adminClient().from("communication_notifications")
    .select("id,kind,title,body,href,read_at,created_at")
    .eq("business_id", actor.businessId).eq("recipient_profile_id", actor.profileId)
    .order("created_at", { ascending: false }).limit(20);
  if (error) throw new Error("communication_notifications_lookup_failed");
  return data ?? [];
}
export async function listOwnedCommunicationDrafts(actor: Actor) {
  const { data, error } = await adminClient().from("communication_drafts")
    .select("id,source_message_id,status,updated_at,sent_at")
    .eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId)
    .in("status", ["draft", "ready", "sending", "failed"])
    .order("updated_at", { ascending: false }).limit(100);
  if (error) throw new Error("communication_drafts_list_failed");
  return data ?? [];
}
export async function getResponseWindowBusinessDays(actor: Actor) {
  const { data, error } = await adminClient().from("businesses").select("response_window_business_days")
    .eq("id", actor.businessId).maybeSingle();
  if (error) throw new Error("communication_response_window_lookup_failed");
  return Math.min(20, Math.max(1, data?.response_window_business_days ?? 3));
}
export async function listOwnedCommunicationTemplates(actor: Actor) {
  const { data, error } = await adminClient().from("communication_templates")
    .select("id,name,subject,body")
    .eq("business_id", actor.businessId).eq("status", "active")
    .order("name", { ascending: true }).limit(100);
  if (error) throw new Error("communication_templates_list_failed");
  return data ?? [];
}
