export type WorkspaceSourceSyncResult = {
 status:"completed"|"failed"|"skipped";processed:number;contextAvailable:number|null;errorCategory?:string;
};
export type WorkspaceSyncResult = {
 status:"completed"|"partial"|"failed";
 gmail:WorkspaceSourceSyncResult;calendar:WorkspaceSourceSyncResult;
 drive:{status:"completed"|"partial"|"failed"|"skipped";selected:number;synced:number;unchanged:number;failed:number;errorCategory?:string};
};

export type GoogleCapabilityState = "not_connected" | "connected" | "syncing" | "action_required" | "error";
export type GoogleConnectionStatus = "connected" | "syncing" | "action_required" | "error" | "disconnected";

export type GoogleConnectionRow = {
  id: string;
  business_id: string;
  owner_profile_id: string;
  provider: "google_workspace";
  external_account_id: string;
  external_email: string;
  granted_scopes: string[];
  status: GoogleConnectionStatus;
  drive_status?: GoogleCapabilityState;
  gmail_status: GoogleCapabilityState;
  calendar_status: GoogleCapabilityState;
  connected_at: string;
  disconnected_at: string | null;
  current_sync_started_at: string | null;
  last_successful_sync_at: string | null;
  last_sync_error: string | null;
  gmail_last_sync_at: string | null;
  gmail_last_error: string | null;
  calendar_last_sync_at: string | null;
  calendar_last_error: string | null;
  gmail_history_id: string | null;
  calendar_sync_token: string | null;
  encrypted_refresh_credential: string | null;
  token_expires_at: string | null;
};

export type ExternalParty = { email: string; name: string | null };

export type NormalizedGoogleEmail = {
  provider_message_id: string;
  provider_thread_id: string;
  sent_at: string;
  sender_email: string | null;
  sender_name: string | null;
  recipients: ExternalParty[];
  cc_recipients: ExternalParty[];
  subject: string | null;
  normalized_text: string | null;
  excerpt: string | null;
  direction: "inbound" | "outbound";
  provider_labels: string[];
  provider_updated_at: string | null;
};

export type NormalizedGoogleCalendarEvent = {
  provider_event_id: string;
  provider_calendar_id: string;
  title: string | null;
  starts_at: string;
  ends_at: string;
  time_zone: string | null;
  participants: ExternalParty[];
  organizer: ExternalParty | null;
  normalized_description: string | null;
  event_status: "confirmed" | "tentative" | "cancelled";
  visibility: "default" | "public" | "private" | "confidential" | "limited";
  conference_url: string | null;
  provider_created_at: string | null;
  provider_updated_at: string | null;
};

export type GoogleEmailRelatedRecord = {
  id: string;
  label: string;
  href: string;
  kind: "contact" | "company" | "opportunity";
  detail: string | null;
};

export type OwnedGoogleEmailDetail = {
  id: string;
  source: "gmail";
  sentAt: string;
  direction: "inbound" | "outbound";
  sender: ExternalParty | null;
  recipients: ExternalParty[];
  ccRecipients: ExternalParty[];
  subject: string | null;
  body: string;
  excerpt: string | null;
  relatedRecords: GoogleEmailRelatedRecord[];
  commercialRelevance: "opportunity" | "company" | "contact" | "unlinked";
};

export type GoogleWorkspacePublicState = {
  configured: boolean;
  connection: null | {
    id: string;
    email: string;
    status: GoogleConnectionStatus;
    driveStatus?: GoogleCapabilityState;
    driveCount?: number;
    gmailStatus: GoogleCapabilityState;
    calendarStatus: GoogleCapabilityState;
    connectedAt: string;
    lastSuccessfulSyncAt: string | null;
    gmailLastSyncAt: string | null;
    calendarLastSyncAt: string | null;
    gmailError: string | null;
    calendarError: string | null;
    syncing: boolean;
    capabilities: { gmail: boolean; calendar: boolean; emailRead: boolean; emailSend: boolean; calendarRead: boolean; calendarWrite: boolean; drive?: boolean };
    counts: { emails: number; calendarEvents: number };
    latestRun: null | {
      source: "google_workspace" | "gmail" | "calendar";
      status: "running" | "completed" | "partial" | "failed";
      processedCount: number;
      startedAt: string;
      completedAt: string | null;
      safeErrorCode: string | null;
    };
  };
};
