import "server-only";

import { reconcileSequenceExits } from "@/lib/communication-sequences";

import { decryptGoogleRefreshCredential } from "@/lib/google-workspace/crypto";
import { GOOGLE_DRIVE_SCOPE, GOOGLE_CALENDAR_SCOPE, GOOGLE_GMAIL_SCOPE, refreshGoogleAccessToken } from "@/lib/google-workspace/oauth";
import { normalizeCalendarEvent, normalizeGmailMessage, type GmailMessagePayload, type GoogleCalendarPayload } from "@/lib/google-workspace/normalization";
import {
  createSyncRun,
  claimGoogleWorkspaceSync,
  completeGoogleWorkspaceSync,
  googleContextCounts,
  deleteProviderEmails,
  finishSyncRun,
  getOwnedGoogleConnection,
  requireGoogleConnectorActor,
  updateConnection,
  upsertNormalizedCalendarEvents,
  upsertNormalizedEmails
} from "@/lib/google-workspace/repository";
import type { GoogleConnectionRow, WorkspaceSyncResult, WorkspaceSourceSyncResult } from "@/lib/google-workspace/types";
import { syncSelectedDriveSources } from "@/lib/google-workspace/drive";

const GMAIL_INITIAL_DAYS = 90;
const GMAIL_MAX_MESSAGES = 500;
const CALENDAR_PAST_DAYS = 60;
const CALENDAR_FUTURE_DAYS = 120;
const MAX_PAGES = 5;
const GMAIL_FETCH_CONCURRENCY = 4;
const GOOGLE_MAX_ATTEMPTS = 3;
const GOOGLE_RETRY_BASE_MS = 150;

const googleRateLimitReasons = new Set([
  "rateLimitExceeded", "userRateLimitExceeded", "dailyLimitExceeded", "quotaExceeded", "RESOURCE_EXHAUSTED"
]);

class GoogleApiError extends Error {
  constructor(readonly status: number, readonly safeCode: string) {
    super(safeCode);
    this.name = "GoogleApiError";
  }
}

function safeErrorCode(error: unknown) {
  if (error instanceof GoogleApiError) return error.safeCode;
  if (error instanceof Error) {
    if (error.message === "google_refresh_invalid") return "authorization_revoked";
    if (error.name === "AbortError" || error.message.includes("AbortError")) return "provider_timeout";
    if (/^[a-z0-9_]{3,80}$/.test(error.message)) return error.message;
  }
  return "provider_temporary_error";
}

async function googleFailureCode(response: Response) {
  if (response.status === 429) return "provider_rate_limited";
  if (response.status === 403) {
    const payload = await response.json().catch(() => null) as { error?: { status?: unknown; errors?: Array<{ reason?: unknown }> } } | null;
    const reasons = [payload?.error?.status, ...(payload?.error?.errors ?? []).map(item => item.reason)]
      .filter((value): value is string => typeof value === "string");
    return reasons.some(reason => googleRateLimitReasons.has(reason)) ? "provider_rate_limited" : "provider_permission_denied";
  }
  return response.status === 401 ? "authorization_expired"
    : response.status === 404 || response.status === 410 ? "provider_cursor_invalid"
      : response.status >= 500 ? "provider_temporary_error" : "provider_request_failed";
}

async function googleJson<T>(url: URL, accessToken: string): Promise<T> {
  for (let attempt = 1; attempt <= GOOGLE_MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, {
        headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
        signal: controller.signal,
        cache: "no-store"
      });
      if (response.ok) return await response.json() as T;
      const code = await googleFailureCode(response);
      const retryable = code === "provider_rate_limited" || response.status >= 500;
      if (!retryable || attempt === GOOGLE_MAX_ATTEMPTS) throw new GoogleApiError(response.status, code);
    } finally {
      clearTimeout(timeout);
    }
    const exponential = GOOGLE_RETRY_BASE_MS * 2 ** (attempt - 1);
    const jittered = exponential * (0.75 + Math.random() * 0.5);
    await new Promise(resolve => setTimeout(resolve, Math.min(600, jittered)));
  }
  throw new GoogleApiError(503, "provider_temporary_error");
}

async function inBatches<T, R>(items: T[], size: number, worker: (item: T) => Promise<R>) {
  const output: R[] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(...await Promise.all(items.slice(index, index + size).map(worker)));
  }
  return output;
}

async function gmailMessage(accessToken: string, id: string) {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}`);
  url.searchParams.set("format", "full");
  return googleJson<GmailMessagePayload>(url, accessToken);
}

async function gmailProfile(accessToken: string) {
  return googleJson<{ historyId?: string }>(new URL("https://gmail.googleapis.com/gmail/v1/users/me/profile"), accessToken);
}

async function gmailInitial(connection: GoogleConnectionRow, accessToken: string) {
  const ids: string[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES && ids.length < GMAIL_MAX_MESSAGES; page += 1) {
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    url.searchParams.set("maxResults", "100");
    url.searchParams.set("q", `newer_than:${GMAIL_INITIAL_DAYS}d -in:spam -in:trash`);
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const result = await googleJson<{ messages?: Array<{ id?: string }>; nextPageToken?: string }>(url, accessToken);
    ids.push(...(result.messages ?? []).flatMap((item) => item.id ? [item.id] : []));
    pageToken = result.nextPageToken;
    if (!pageToken) break;
  }
  const raw = await inBatches(Array.from(new Set(ids)).slice(0, GMAIL_MAX_MESSAGES), GMAIL_FETCH_CONCURRENCY, (id) => gmailMessage(accessToken, id));
  const messages = raw.flatMap((item) => normalizeGmailMessage(item, connection.external_email) ?? []);
  const profile = await gmailProfile(accessToken);
  return { mode: "initial" as const, messages, deletedIds: [] as string[], historyId: profile.historyId ?? null };
}

async function gmailIncremental(connection: GoogleConnectionRow, accessToken: string) {
  const added = new Set<string>();
  const deleted = new Set<string>();
  let pageToken: string | undefined;
  let latestHistoryId = connection.gmail_history_id;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/history");
    url.searchParams.set("startHistoryId", connection.gmail_history_id ?? "");
    url.searchParams.set("maxResults", "500");
    url.searchParams.set("historyTypes", "messageAdded");
    url.searchParams.append("historyTypes", "messageDeleted");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const result = await googleJson<{
      history?: Array<{
        messagesAdded?: Array<{ message?: { id?: string } }>;
        messagesDeleted?: Array<{ message?: { id?: string } }>;
      }>;
      nextPageToken?: string;
      historyId?: string;
    }>(url, accessToken);
    for (const item of result.history ?? []) {
      for (const value of item.messagesAdded ?? []) if (value.message?.id) added.add(value.message.id);
      for (const value of item.messagesDeleted ?? []) if (value.message?.id) deleted.add(value.message.id);
    }
    latestHistoryId = result.historyId ?? latestHistoryId;
    pageToken = result.nextPageToken;
    if (!pageToken) break;
  }
  const raw = await inBatches(Array.from(added).slice(0, GMAIL_MAX_MESSAGES), GMAIL_FETCH_CONCURRENCY, (id) => gmailMessage(accessToken, id));
  return {
    mode: "incremental" as const,
    messages: raw.flatMap((item) => normalizeGmailMessage(item, connection.external_email) ?? []),
    deletedIds: Array.from(deleted).slice(0, GMAIL_MAX_MESSAGES),
    historyId: latestHistoryId
  };
}

async function syncGmail(connection: GoogleConnectionRow, accessToken: string) {
  const actor = { businessId: connection.business_id, profileId: connection.owner_profile_id };
  let mode: "initial" | "incremental" | "bounded_recovery" = connection.gmail_history_id ? "incremental" : "initial";
  const runId = await createSyncRun(actor, connection.id, "gmail", mode);
  try {
    let result;
    try {
      result = connection.gmail_history_id ? await gmailIncremental(connection, accessToken) : await gmailInitial(connection, accessToken);
    } catch (error) {
      if (!(error instanceof GoogleApiError) || error.status !== 404 || !connection.gmail_history_id) throw error;
      mode = "bounded_recovery";
      result = await gmailInitial({ ...connection, gmail_history_id: null }, accessToken);
    }
    const processed = await upsertNormalizedEmails(actor, connection, result.messages);
    const deleted = await deleteProviderEmails(actor, connection.id, result.deletedIds);
    await updateConnection(connection.id, actor, {
      gmail_status: "connected", gmail_last_sync_at: new Date().toISOString(), gmail_last_error: null,
      gmail_history_id: result.historyId
    });
    await finishSyncRun(runId, actor, { status: "completed", processed_count: processed, deleted_count: deleted });
    return { ok: true as const, processed, deleted, mode };
  } catch (error) {
    const code = safeErrorCode(error);
    await updateConnection(connection.id, actor, { gmail_status: code === "authorization_revoked" ? "action_required" : "error", gmail_last_error: code });
    await finishSyncRun(runId, actor, { status: "failed", processed_count: 0, safe_error_code: code });
    return { ok: false as const, code, processed: 0, deleted: 0, mode };
  }
}

function calendarBounds() {
  const now = Date.now();
  return {
    timeMin: new Date(now - CALENDAR_PAST_DAYS * 86_400_000).toISOString(),
    timeMax: new Date(now + CALENDAR_FUTURE_DAYS * 86_400_000).toISOString()
  };
}

async function calendarList(accessToken: string, syncToken?: string | null) {
  const items: GoogleCalendarPayload[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;
  const bounds = calendarBounds();
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("maxResults", "250");
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("showDeleted", "true");
    if (syncToken) url.searchParams.set("syncToken", syncToken);
    else {
      url.searchParams.set("timeMin", bounds.timeMin);
      url.searchParams.set("timeMax", bounds.timeMax);
      url.searchParams.set("orderBy", "startTime");
    }
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const result = await googleJson<{ items?: GoogleCalendarPayload[]; nextPageToken?: string; nextSyncToken?: string }>(url, accessToken);
    items.push(...(result.items ?? []));
    nextSyncToken = result.nextSyncToken ?? nextSyncToken;
    pageToken = result.nextPageToken;
    if (!pageToken) break;
  }
  return { items, nextSyncToken };
}

async function syncCalendar(connection: GoogleConnectionRow, accessToken: string) {
  const actor = { businessId: connection.business_id, profileId: connection.owner_profile_id };
  let mode: "initial" | "incremental" | "bounded_recovery" = connection.calendar_sync_token ? "incremental" : "initial";
  const runId = await createSyncRun(actor, connection.id, "calendar", mode);
  try {
    let result;
    try {
      result = await calendarList(accessToken, connection.calendar_sync_token);
    } catch (error) {
      if (!(error instanceof GoogleApiError) || error.status !== 410 || !connection.calendar_sync_token) throw error;
      mode = "bounded_recovery";
      result = await calendarList(accessToken, null);
    }
    const events = result.items.flatMap((item) => normalizeCalendarEvent(item) ?? []);
    const processed = await upsertNormalizedCalendarEvents(actor, connection, events);
    await updateConnection(connection.id, actor, {
      calendar_status: "connected", calendar_last_sync_at: new Date().toISOString(), calendar_last_error: null,
      calendar_sync_token: result.nextSyncToken
    });
    await finishSyncRun(runId, actor, { status: "completed", processed_count: processed });
    return { ok: true as const, processed, mode };
  } catch (error) {
    const code = safeErrorCode(error);
    await updateConnection(connection.id, actor, { calendar_status: code === "authorization_revoked" ? "action_required" : "error", calendar_last_error: code });
    await finishSyncRun(runId, actor, { status: "failed", processed_count: 0, safe_error_code: code });
    return { ok: false as const, code, processed: 0, mode };
  }
}


export async function syncOwnedGoogleWorkspace():Promise<WorkspaceSyncResult> {
  const actor = await requireGoogleConnectorActor();
  const connection = await getOwnedGoogleConnection(actor);
  if (!connection?.encrypted_refresh_credential || connection.business_id!==actor.businessId ||
      connection.owner_profile_id!==actor.profileId || connection.status==="disconnected") throw new Error("google_connection_not_available");
  const startedAt=await claimGoogleWorkspaceSync(actor,connection.id);
  let overallRun:string|null=null;
  try {
    overallRun=await createSyncRun(actor,connection.id,"google_workspace","manual");
    // One shared refresh for the existing mail/calendar pipelines. Drive retains its own grant validation.
    const tokenPromise=refreshGoogleAccessToken(decryptGoogleRefreshCredential(connection.encrypted_refresh_credential));
    let deletedCount=0;
    const runContext=async(source:"gmail"|"calendar"):Promise<WorkspaceSourceSyncResult>=>{
      const granted=connection!.granted_scopes.includes(source==="gmail"?GOOGLE_GMAIL_SCOPE:GOOGLE_CALENDAR_SCOPE);
      if(!granted)return {status:"skipped",processed:0,contextAvailable:null,errorCategory:"scope_not_granted"};
      try{
        const token=await tokenPromise;
        const result=source==="gmail"?await syncGmail(connection, token.access_token):await syncCalendar(connection, token.access_token);
        if ("deleted" in result && typeof result.deleted === "number") {
  deletedCount = result.deleted;
}
        return {status:result.ok?"completed":"failed",processed:result.processed,contextAvailable:null,
          ...(!result.ok?{errorCategory:publicSyncError(result.code)}:{})};
      }catch(error){
        const code=publicSyncError(safeErrorCode(error));
        await updateConnection(connection!.id,actor,source==="gmail"
          ?{gmail_status:code==="authorization_revoked"?"action_required":"error",gmail_last_error:code}
          :{calendar_status:code==="authorization_revoked"?"action_required":"error",calendar_last_error:code});
        return {status:"failed",processed:0,contextAvailable:null,errorCategory:code};
      }
    }
    // Always observe the refresh promise, including connections with no mail/calendar grant.
    const expiryPromise=tokenPromise.then(token=>token.expires_in?new Date(Date.now()+token.expires_in*1000).toISOString():null,()=>null);
    const [mailResult,calendarResult,driveResult]=await Promise.allSettled([
      runContext("gmail"),runContext("calendar"),
      connection.drive_status==="connected"&&connection.granted_scopes.includes(GOOGLE_DRIVE_SCOPE)
        ?syncSelectedDriveSources(actor,connection.id)
        :Promise.resolve({status:"skipped" as const,selected:0,synced:0,unchanged:0,failed:0})
    ]);
    const failedContext:WorkspaceSourceSyncResult={status:"failed",processed:0,contextAvailable:null,errorCategory:"provider_temporary_error"};
    const gmail=mailResult.status==="fulfilled"?mailResult.value:{...failedContext};
    const calendar=calendarResult.status==="fulfilled"?calendarResult.value:{...failedContext};
    const drive:WorkspaceSyncResult["drive"]=driveResult.status==="fulfilled"?driveResult.value:
      {status:"failed",selected:0,synced:0,unchanged:0,failed:0,errorCategory:"drive_sync_unavailable"};
    const counts=await googleContextCounts(actor,connection.id).catch(()=>({emails:null,calendarEvents:null}));
    gmail.contextAvailable=counts.emails;calendar.contextAvailable=counts.calendarEvents;
    const sources=[gmail,calendar,drive];
    const allHealthy=sources.every(source=>source.status==="completed"||source.status==="skipped");
    const anyHealthy=gmail.status==="completed"||calendar.status==="completed"||drive.synced+drive.unchanged>0;
    const status=allHealthy?"completed" as const:anyHealthy?"partial" as const:"failed" as const;
    const completedAt=new Date().toISOString();
    await completeGoogleWorkspaceSync(actor,connection.id,startedAt,{
      status:allHealthy?"connected":anyHealthy?"error":"action_required",
      last_successful_sync_at:anyHealthy?completedAt:connection.last_successful_sync_at,
      last_sync_error:allHealthy?null:"partial_provider_failure",token_expires_at:await expiryPromise
    });
    await finishSyncRun(overallRun,actor,{status,processed_count:gmail.processed+calendar.processed+drive.synced,deleted_count:deletedCount,
      safe_error_code:allHealthy?null:"partial_provider_failure"});
    // A downstream reconciliation error must not rewrite successful connector results.
    if(anyHealthy)await reconcileSequenceExits(actor).catch(()=>{});
    return {gmail,calendar,drive,status};
  }catch(error){
    const code=publicSyncError(safeErrorCode(error));
    await completeGoogleWorkspaceSync(actor,connection.id,startedAt,{
      status:"error",last_sync_error:code
    });
    if(overallRun)await finishSyncRun(overallRun,actor,{status:"failed",processed_count:0,safe_error_code:code});
    throw new Error(code);
  }
}
function publicSyncError(code:string){
 return ["authorization_revoked","provider_permission_denied","scope_not_granted","provider_timeout","provider_rate_limited","provider_cursor_invalid"].includes(code)
  ?code:"provider_temporary_error";
}
