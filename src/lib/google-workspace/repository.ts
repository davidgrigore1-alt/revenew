import "server-only";

import { encryptGoogleRefreshCredential } from "@/lib/google-workspace/crypto";
import { GOOGLE_DRIVE_SCOPE, GOOGLE_CALENDAR_SCOPE, GOOGLE_GMAIL_SCOPE, GOOGLE_GMAIL_SEND_SCOPE, isGoogleWorkspaceConfigured } from "@/lib/google-workspace/oauth";
import { senderMatchesExact, type EmailQueryIntent } from "@/lib/google-workspace/email-intent";
import type { GoogleConnectionRow, GoogleWorkspacePublicState, NormalizedGoogleCalendarEvent, NormalizedGoogleEmail, OwnedGoogleEmailDetail } from "@/lib/google-workspace/types";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type Actor = { businessId: string; profileId: string };
type EntityLinks = { linked_contact_id: string | null; linked_organization_id: string | null; linked_opportunity_id: string | null };
type ExternalEmailRow = {
  id: string; provider_message_id: string; provider_thread_id: string; sent_at: string;
  sender_email: string | null; sender_name: string | null; recipients: Array<{ email: string; name: string | null }>;
  subject: string | null; normalized_text: string | null; excerpt: string | null; direction: "inbound" | "outbound";
  cc_recipients: Array<{ email: string; name: string | null }>;
  linked_contact_id: string | null; linked_organization_id: string | null; linked_opportunity_id: string | null;
};
type ExternalCalendarRow = {
  id: string; provider_event_id: string; title: string | null; starts_at: string; ends_at: string;
  participants: Array<{ email: string; name: string | null }>; organizer: { email: string; name: string | null } | null;
  normalized_description: string | null; event_status: string; conference_url: string | null;
  linked_contact_id: string | null; linked_organization_id: string | null; linked_opportunity_id: string | null;
};

function adminClient() {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("google_connector_storage_unavailable");
  return admin;
}

export async function requireGoogleConnectorActor(): Promise<Actor> {
  const [current, authorization] = await Promise.all([
    getCurrentBusinessForUser({ redirectIfMissing: false }),
    getAuthorizationContext()
  ]);
  if (!current || current.source !== "supabase" || !authorization.authenticated || !authorization.profileId) {
    throw new Error("google_connector_actor_forbidden");
  }
  if (authorization.profileId !== current.profileId) throw new Error("google_connector_actor_mismatch");
  return { businessId: current.business.id, profileId: authorization.profileId };
}

export async function getOwnedGoogleConnection(actor: Actor, includeDisconnected = false) {
  let query = adminClient().from("external_connections").select("*")
    .eq("business_id", actor.businessId)
    .eq("owner_profile_id", actor.profileId)
    .eq("provider", "google_workspace")
    .order("connected_at", { ascending: false })
    .limit(1);
  if (!includeDisconnected) query = query.neq("status", "disconnected");
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error("google_connection_lookup_failed");
  return data as GoogleConnectionRow | null;
}

export async function saveGoogleConnection(input: {
  actor: Actor;
  externalAccountId: string;
  email: string;
  grantedScopes: string[];
  refreshToken?: string;
  expiresInSeconds?: number;
}) {
  const admin = adminClient();
  const { data: existing, error: existingError } = await admin.from("external_connections")
    .select("encrypted_refresh_credential")
    .eq("business_id", input.actor.businessId)
    .eq("owner_profile_id", input.actor.profileId)
    .eq("provider", "google_workspace")
    .eq("external_account_id", input.externalAccountId)
    .maybeSingle();
  if (existingError) throw new Error("google_connection_lookup_failed");
  const encrypted = input.refreshToken
    ? encryptGoogleRefreshCredential(input.refreshToken)
    : existing?.encrypted_refresh_credential ?? null;
  if (!encrypted) throw new Error("google_refresh_credential_missing");
  const gmail = input.grantedScopes.includes(GOOGLE_GMAIL_SCOPE);
  const calendar = input.grantedScopes.includes(GOOGLE_CALENDAR_SCOPE);
  const payload = {
    business_id: input.actor.businessId,
    owner_profile_id: input.actor.profileId,
    provider: "google_workspace",
    external_account_id: input.externalAccountId,
    external_email: input.email.trim().toLowerCase(),
    granted_scopes: input.grantedScopes,
    status: gmail || calendar ? "connected" : "action_required",
    gmail_status: gmail ? "connected" : "action_required",
    calendar_status: calendar ? "connected" : "action_required",
    connected_at: new Date().toISOString(),
    disconnected_at: null,
    last_sync_error: null,
    gmail_last_error: null,
    calendar_last_error: null,
    encrypted_refresh_credential: encrypted,
    token_expires_at: input.expiresInSeconds ? new Date(Date.now() + input.expiresInSeconds * 1000).toISOString() : null
  };
  const { data, error } = await admin.from("external_connections").upsert(payload, {
  onConflict: "business_id,owner_profile_id,provider,external_account_id"
}).select("*").single();

if (error || !data) {
  console.error("google_connection_save_failed_detail", {
    code: error?.code,
    message: error?.message,
    details: error?.details,
    hint: error?.hint
  });
  throw new Error("google_connection_save_failed");
}

return data as GoogleConnectionRow;
}

export async function getGoogleWorkspacePublicState(): Promise<GoogleWorkspacePublicState> {
  if (!isGoogleWorkspaceConfigured()) return { configured: false, connection: null };
  try {
    const actor = await requireGoogleConnectorActor();
    const connection = await getOwnedGoogleConnection(actor);
    if (!connection) return { configured: true, connection: null };
    const admin = adminClient();
    const [emails, events, latest, driveFiles] = await Promise.all([
      admin.from("external_email_messages").select("id", { count: "exact", head: true })
        .eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId).eq("connection_id", connection.id),
      admin.from("external_calendar_events").select("id", { count: "exact", head: true })
        .eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId).eq("connection_id", connection.id)
        .neq("event_status", "cancelled"),
      admin.from("external_sync_runs").select("source,status,processed_count,started_at,completed_at,safe_error_code")
        .eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId).eq("connection_id", connection.id)
        .eq("source", "google_workspace").order("started_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("external_document_sources").select("id", { count: "exact", head: true })
        .eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId).eq("connection_id", connection.id).neq("state", "removed")
    ]);
    const scopes = new Set(connection.granted_scopes ?? []);
    return {
      configured: true,
      connection: {
        id: connection.id,
        email: connection.external_email,
        status: connection.status,
        driveStatus: connection.drive_status ?? "not_connected",
        driveCount: driveFiles.count ?? 0,
        gmailStatus: connection.gmail_status,
        calendarStatus: connection.calendar_status,
        connectedAt: connection.connected_at,
        lastSuccessfulSyncAt: connection.last_successful_sync_at,
        gmailLastSyncAt: connection.gmail_last_sync_at,
        calendarLastSyncAt: connection.calendar_last_sync_at,
        gmailError: connection.gmail_last_error,
        calendarError: connection.calendar_last_error,
        syncing: connection.status === "syncing",
        capabilities: { gmail: scopes.has(GOOGLE_GMAIL_SCOPE), calendar: scopes.has(GOOGLE_CALENDAR_SCOPE), emailRead: scopes.has(GOOGLE_GMAIL_SCOPE), emailSend: scopes.has(GOOGLE_GMAIL_SEND_SCOPE), calendarRead: scopes.has(GOOGLE_CALENDAR_SCOPE), calendarWrite: false, drive: scopes.has(GOOGLE_DRIVE_SCOPE) && connection.drive_status === "connected" },
        counts: { emails: emails.count ?? 0, calendarEvents: events.count ?? 0 },
        latestRun: latest.data ? {
          source: latest.data.source,
          status: latest.data.status,
          processedCount: latest.data.processed_count,
          startedAt: latest.data.started_at,
          completedAt: latest.data.completed_at,
          safeErrorCode: latest.data.safe_error_code
        } : null
      }
    };
  } catch {
    return { configured: true, connection: null };
  }
}

async function linksForEmails(actor: Actor, emails: string[]): Promise<EntityLinks> {
  const normalized = Array.from(new Set(emails.map((value) => value.trim().toLowerCase()).filter(Boolean))).slice(0, 40);
  if (!normalized.length) return { linked_contact_id: null, linked_organization_id: null, linked_opportunity_id: null };
  const admin = adminClient();
  const { data: contacts, error } = await admin.from("crm_contacts")
    .select("id,organization_id,normalized_email")
    .eq("business_id", actor.businessId)
    .in("normalized_email", normalized);
  if (error || !contacts?.length) return { linked_contact_id: null, linked_organization_id: null, linked_opportunity_id: null };
  const exactContacts = contacts.filter((item) => normalized.includes(item.normalized_email));
  if (exactContacts.length !== 1) return { linked_contact_id: null, linked_organization_id: null, linked_opportunity_id: null };
  const contact = exactContacts[0];
  const { data: opportunityLinks } = await admin.from("opportunity_contacts")
    .select("opportunity_id")
    .eq("business_id", actor.businessId)
    .eq("contact_id", contact.id)
    .limit(2);
  return {
    linked_contact_id: contact.id,
    linked_organization_id: contact.organization_id ?? null,
    linked_opportunity_id: opportunityLinks?.length === 1 ? opportunityLinks[0].opportunity_id : null
  };
}

export async function upsertNormalizedEmails(actor: Actor, connection: GoogleConnectionRow, messages: NormalizedGoogleEmail[]) {
  if (!messages.length) return 0;
  const admin = adminClient();
  const rows = [];
  for (const message of messages) {
    const counterparties = message.direction === "inbound"
      ? [message.sender_email ?? ""]
      : message.recipients.map((item) => item.email);
    const links = await linksForEmails(actor, counterparties);
    rows.push({
      ...message,
      ...links,
      business_id: actor.businessId,
      owner_profile_id: actor.profileId,
      connection_id: connection.id,
      synced_at: new Date().toISOString()
    });
  }
  for (let index = 0; index < rows.length; index += 50) {
    const { error } = await admin.from("external_email_messages").upsert(rows.slice(index, index + 50), {
      onConflict: "connection_id,provider_message_id"
    });
    if (error) throw new Error("gmail_context_store_failed");
  }
  return rows.length;
}

export async function upsertNormalizedCalendarEvents(actor: Actor, connection: GoogleConnectionRow, events: NormalizedGoogleCalendarEvent[]) {
  if (!events.length) return 0;
  const admin = adminClient();
  const rows = [];
  for (const event of events) {
    const links = await linksForEmails(actor, event.participants.map((item) => item.email));
    rows.push({
      ...event,
      ...links,
      business_id: actor.businessId,
      owner_profile_id: actor.profileId,
      connection_id: connection.id,
      synced_at: new Date().toISOString()
    });
  }
  for (let index = 0; index < rows.length; index += 50) {
    const { error } = await admin.from("external_calendar_events").upsert(rows.slice(index, index + 50), {
      onConflict: "connection_id,provider_calendar_id,provider_event_id"
    });
    if (error) throw new Error("calendar_context_store_failed");
  }
  return rows.length;
}

export async function deleteProviderEmails(actor: Actor, connectionId: string, providerIds: string[]) {
  if (!providerIds.length) return 0;
  const { error, count } = await adminClient().from("external_email_messages")
    .delete({ count: "exact" })
    .eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId).eq("connection_id", connectionId)
    .in("provider_message_id", providerIds.slice(0, 500));
  if (error) throw new Error("gmail_context_delete_failed");
  return count ?? 0;
}

export async function updateConnection(connectionId: string, actor: Actor, values: Record<string, unknown>) {
  const { data, error } = await adminClient().from("external_connections").update(values)
    .eq("id", connectionId).eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId)
    .select("*").single();
  if (error || !data) throw new Error("google_connection_update_failed");
  return data as GoogleConnectionRow;
}

/** Atomic claim on existing state: no process-local mutex or unsafe timeout takeover. */
export async function claimGoogleWorkspaceSync(actor:Actor,connectionId:string){
 const startedAt=new Date().toISOString();
 const {data,error}=await adminClient().from("external_connections")
  .update({status:"syncing",current_sync_started_at:startedAt})
  .eq("id",connectionId).eq("business_id",actor.businessId).eq("owner_profile_id",actor.profileId)
  .neq("status","disconnected").is("current_sync_started_at",null).select("id").maybeSingle();
 if(error)throw new Error("google_connection_update_failed");
 if(!data)throw new Error("sync_already_running");
 return startedAt;
}
export async function completeGoogleWorkspaceSync(actor:Actor,connectionId:string,startedAt:string,values:Record<string,unknown>){
 const {error}=await adminClient().from("external_connections")
  .update({...values,current_sync_started_at:null})
  .eq("id",connectionId).eq("business_id",actor.businessId).eq("owner_profile_id",actor.profileId)
  .eq("current_sync_started_at",startedAt).neq("status","disconnected");
 if(error)throw new Error("google_connection_update_failed");
}
export async function googleContextCounts(actor:Actor,connectionId:string){
 const [emails,events]=await Promise.all([
  adminClient().from("external_email_messages").select("id",{count:"exact",head:true})
   .eq("business_id",actor.businessId).eq("owner_profile_id",actor.profileId).eq("connection_id",connectionId),
  adminClient().from("external_calendar_events").select("id",{count:"exact",head:true})
   .eq("business_id",actor.businessId).eq("owner_profile_id",actor.profileId).eq("connection_id",connectionId).neq("event_status","cancelled")
 ]);
 return {emails:emails.error?null:emails.count,calendarEvents:events.error?null:events.count};
}
export async function createSyncRun(actor: Actor, connectionId: string, source: "google_workspace" | "gmail" | "calendar", mode: "initial" | "incremental" | "bounded_recovery" | "manual") {
  const { data, error } = await adminClient().from("external_sync_runs").insert({
    business_id: actor.businessId, owner_profile_id: actor.profileId, connection_id: connectionId,
    source, mode, status: "running"
  }).select("id").single();
  if (error || !data) throw new Error("google_sync_run_create_failed");
  return data.id as string;
}

export async function finishSyncRun(runId: string, actor: Actor, values: {
  status: "completed" | "partial" | "failed"; processed_count: number; deleted_count?: number; safe_error_code?: string | null;
}) {
  await adminClient().from("external_sync_runs").update({ ...values, completed_at: new Date().toISOString() })
    .eq("id", runId).eq("business_id", actor.businessId).eq("owner_profile_id", actor.profileId);
}

export async function disconnectOwnedGoogleConnection(actor: Actor, connection: GoogleConnectionRow) {
  const admin = adminClient();
  await Promise.all([
    admin.from("external_email_messages").delete().eq("connection_id", connection.id).eq("owner_profile_id", actor.profileId).eq("business_id", actor.businessId),
    admin.from("external_calendar_events").delete().eq("connection_id", connection.id).eq("owner_profile_id", actor.profileId).eq("business_id", actor.businessId),
    admin.from("external_sync_runs").delete().eq("connection_id", connection.id).eq("owner_profile_id", actor.profileId).eq("business_id", actor.businessId)
  ]);
  await updateConnection(connection.id, actor, {
    status: "disconnected", drive_status: "not_connected", gmail_status: "not_connected", calendar_status: "not_connected",
    disconnected_at: new Date().toISOString(), current_sync_started_at: null,
    encrypted_refresh_credential: null, gmail_history_id: null, calendar_sync_token: null,
    last_sync_error: null, gmail_last_error: null, calendar_last_error: null
  });
}

export async function getOwnedExternalContext(input: {
  actor: Actor; organizationId?: string; opportunityId?: string; contactId?: string; emailId?: string; eventId?: string; query?: string; from?: string; to?: string;
  emailIntent?: Partial<EmailQueryIntent>; limit?: number;
}) {
  const admin = adminClient();
  const connection = await getOwnedGoogleConnection(input.actor);
  if (!connection) return { connection: null, emails: [] as ExternalEmailRow[], events: [] as ExternalCalendarRow[] };
  if ([input.contactId, input.emailId, input.eventId].some((id) => id !== undefined && !googleContextIdPattern.test(id))) throw new Error("google_context_id_invalid");
  let emailQuery = admin.from("external_email_messages")
    .select("id,provider_message_id,provider_thread_id,sent_at,sender_email,sender_name,recipients,subject,normalized_text,excerpt,direction,linked_contact_id,linked_organization_id,linked_opportunity_id")
    .eq("business_id", input.actor.businessId).eq("owner_profile_id", input.actor.profileId).eq("connection_id", connection.id)
    .order("sent_at", { ascending: false }).limit(input.emailIntent?.sender ? 200 : 24);
  let eventQuery = admin.from("external_calendar_events")
    .select("id,provider_event_id,title,starts_at,ends_at,participants,organizer,normalized_description,event_status,conference_url,linked_contact_id,linked_organization_id,linked_opportunity_id")
    .eq("business_id", input.actor.businessId).eq("owner_profile_id", input.actor.profileId).eq("connection_id", connection.id)
    .neq("event_status", "cancelled").order("starts_at", { ascending: true }).limit(16);
  if (input.organizationId) {
    emailQuery = emailQuery.eq("linked_organization_id", input.organizationId);
    eventQuery = eventQuery.eq("linked_organization_id", input.organizationId);
  }
  if (input.opportunityId) {
    emailQuery = emailQuery.eq("linked_opportunity_id", input.opportunityId);
    eventQuery = eventQuery.eq("linked_opportunity_id", input.opportunityId);
  }
  if (input.contactId) {
    emailQuery = emailQuery.eq("linked_contact_id", input.contactId);
    eventQuery = eventQuery.eq("linked_contact_id", input.contactId);
  }
  if (input.emailId) emailQuery = emailQuery.eq("id", input.emailId);
  if (input.eventId) eventQuery = eventQuery.eq("id", input.eventId);
  if (input.emailIntent?.direction) emailQuery = emailQuery.eq("direction", input.emailIntent.direction);
  if (input.emailIntent?.from) emailQuery = emailQuery.gte("sent_at", input.emailIntent.from);
  if (input.emailIntent?.to) emailQuery = emailQuery.lt("sent_at", input.emailIntent.to);
  if (input.emailIntent?.relevance === "linked") {
    emailQuery = emailQuery.or("linked_contact_id.not.is.null,linked_organization_id.not.is.null,linked_opportunity_id.not.is.null");
  } else if (input.emailIntent?.relevance === "unlinked") {
    emailQuery = emailQuery.is("linked_contact_id", null).is("linked_organization_id", null).is("linked_opportunity_id", null);
  }
  if (input.query?.trim()) {
    const safe = input.query.trim().replace(/[^a-zA-Z0-9ăâîșțĂÂÎȘȚ@.\-\s]/g, " ").replace(/\s{2,}/g, " ").slice(0, 80);
    const emailAddress = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(safe);
    emailQuery = emailQuery.or(emailAddress
      ? `sender_email.eq.${safe.toLowerCase()},subject.ilike.%${safe}%,normalized_text.ilike.%${safe}%`
      : `subject.ilike.%${safe}%,normalized_text.ilike.%${safe}%`);
    eventQuery = eventQuery.or(`title.ilike.%${safe}%,normalized_description.ilike.%${safe}%`);
  }
  if (input.from) eventQuery = eventQuery.gte("starts_at", input.from);
  if (input.to) eventQuery = eventQuery.lt("starts_at", input.to);
  const [emails, events] = await Promise.all([emailQuery, input.emailId ? Promise.resolve({ data: [], error: null }) : eventQuery]);
  if (emails.error || events.error) throw new Error("google_context_query_failed");
  const exactEmails = ((emails.data ?? []) as ExternalEmailRow[])
    .filter((item) => !input.emailIntent?.sender || senderMatchesExact(item.sender_email, item.sender_name, input.emailIntent.sender))
    .slice(0, Math.min(12, Math.max(1, input.limit ?? input.emailIntent?.limit ?? 12)));
  return { connection, emails: exactEmails, events: (events.data ?? []) as ExternalCalendarRow[] };
}

const googleContextIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getOwnedGoogleEmailDetail(actor: Actor, messageId: string): Promise<OwnedGoogleEmailDetail | null> {
  if (!googleContextIdPattern.test(messageId)) return null;
  const connection = await getOwnedGoogleConnection(actor);
  if (!connection) return null;
  const admin = adminClient();
  const { data, error } = await admin.from("external_email_messages")
    .select("id,sent_at,sender_email,sender_name,recipients,cc_recipients,subject,normalized_text,excerpt,direction,linked_contact_id,linked_organization_id,linked_opportunity_id")
    .eq("id", messageId)

    .eq("business_id", actor.businessId)
    .eq("owner_profile_id", actor.profileId)
    .eq("connection_id", connection.id)
    .maybeSingle();
  if (error) throw new Error("google_email_detail_lookup_failed");
  if (!data) return null;
  const row = data as ExternalEmailRow;
  const relatedRecords: OwnedGoogleEmailDetail["relatedRecords"] = [];
  const [contact, company, opportunity] = await Promise.all([
    row.linked_contact_id
      ? admin.from("crm_contacts").select("id,full_name,job_title").eq("id", row.linked_contact_id).eq("business_id", actor.businessId).maybeSingle()
      : null,
    row.linked_organization_id
      ? admin.from("crm_organizations").select("id,name,website").eq("id", row.linked_organization_id).eq("business_id", actor.businessId).maybeSingle()
      : null,
    row.linked_opportunity_id
      ? admin.from("opportunities").select("id,title,status").eq("id", row.linked_opportunity_id).eq("business_id", actor.businessId).maybeSingle()
      : null
  ]);
  if (contact?.data) relatedRecords.push({ id: contact.data.id, label: contact.data.full_name || "Contact CRM", href: "/contacts", kind: "contact", detail: contact.data.job_title ?? null });
  if (company?.data) relatedRecords.push({ id: company.data.id, label: company.data.name || "Companie", href: `/crm/organizations/${company.data.id}`, kind: "company", detail: company.data.website ?? null });
  if (opportunity?.data) relatedRecords.push({ id: opportunity.data.id, label: opportunity.data.title || "Oportunitate", href: `/opportunities/${opportunity.data.id}`, kind: "opportunity", detail: opportunity.data.status ?? null });
  const relevance: OwnedGoogleEmailDetail["commercialRelevance"] = row.linked_opportunity_id ? "opportunity" : row.linked_organization_id ? "company" : row.linked_contact_id ? "contact" : "unlinked";
  return {
    id: row.id, source: "gmail", sentAt: row.sent_at, direction: row.direction,
    sender: row.sender_email ? { email: row.sender_email, name: row.sender_name } : null,
    recipients: Array.isArray(row.recipients) ? row.recipients.slice(0, 40) : [],
    ccRecipients: Array.isArray(row.cc_recipients) ? row.cc_recipients.slice(0, 40) : [],
    subject: row.subject, body: row.normalized_text || row.excerpt || "", excerpt: row.excerpt,
    relatedRecords, commercialRelevance: relevance
  };
}

export async function getOwnedGoogleEmailThread(actor: Actor, messageId: string) {
  const source = await getOwnedGoogleEmailSource(actor, messageId);
  if (!source) return null;
  return source.thread.slice(0, 25).reverse().map((item) => ({
    id: item.id,
    sentAt: item.sent_at,
    sender: item.sender_email ? { email: item.sender_email, name: item.sender_name } : null,
    subject: item.subject,
    body: item.normalized_text || "",
    direction: item.direction
  }));
}
export async function getOwnedGoogleEmailSource(actor: Actor, messageId: string) {
  if (!googleContextIdPattern.test(messageId)) return null;
  const connection = await getOwnedGoogleConnection(actor);
  if (!connection?.encrypted_refresh_credential) return null;
  const admin = adminClient();
  const { data, error } = await admin.from("external_email_messages")
    .select("id,provider_message_id,provider_thread_id,sent_at,sender_email,sender_name,recipients,cc_recipients,subject,normalized_text,excerpt,direction,linked_contact_id,linked_organization_id,linked_opportunity_id")
    .eq("id", messageId)
    .eq("business_id", actor.businessId)
    .eq("owner_profile_id", actor.profileId)
    .eq("connection_id", connection.id)
    .maybeSingle();
  if (error) throw new Error("google_email_source_lookup_failed");
  if (!data) return null;
  const { data: thread } = await admin.from("external_email_messages")
    .select("id,sent_at,sender_email,sender_name,subject,normalized_text,direction")
    .eq("business_id", actor.businessId)
    .eq("owner_profile_id", actor.profileId)
    .eq("connection_id", connection.id)
    .eq("provider_thread_id", data.provider_thread_id)
    .order("sent_at", { ascending: false })
    .limit(25);
  return {
    connection,
    message: data as ExternalEmailRow,
    thread: (thread ?? []).map((item) => ({ ...item, normalized_text: item.normalized_text?.slice(0, 6000) ?? null }))
  };
}
