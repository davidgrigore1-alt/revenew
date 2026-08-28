import type { GoogleCapabilityState, GoogleWorkspacePublicState, WorkspaceSyncResult } from "@/lib/google-workspace/types";

/** Presentation only. Authorization and sync decisions remain on the server. */
export type CapabilityStatus = "connected" | "active" | "controlled" | "requires_authorization" | "unavailable" | "planned" | "error" | "syncing";
export type CapabilityOperation = { label: string; status: CapabilityStatus; detail?: string };
export type ApplicationCapability = {
  id: string;
  name: string;
  description: string;
  operations: CapabilityOperation[];
};

export const capabilityLabels: Record<CapabilityStatus, string> = {
  connected: "Autorizat",
  active: "Activ",
  controlled: "Controlat",
  requires_authorization: "Permisiune necesară",
  unavailable: "Indisponibil",
  planned: "Planificat",
  error: "Necesită atenție",
  syncing: "Sincronizare"
};

export function googleProviderPresentation(state: GoogleWorkspacePublicState): { status: CapabilityStatus; label: string } {
  if (!state.configured) return { status: "unavailable", label: "Configurare necesară" };
  const c = state.connection;
  if (!c) return { status: "requires_authorization", label: "Neconectat" };
  if (c.status === "disconnected") return { status: "unavailable", label: "Deconectat" };
  if (c.status === "action_required") return { status: "requires_authorization", label: "Reconectare necesară" };
  if (c.syncing || c.status === "syncing") return { status: "syncing", label: "Sincronizare în curs" };
  if (c.status === "error") return { status: "error", label: "Necesită atenție" };
  return { status: "connected", label: "Conectat" };
}

export function googleContextHealthy(state: GoogleWorkspacePublicState) {
  const c = state.connection;
  return state.configured && c?.status === "connected" && !c.syncing
    && c.capabilities.emailRead && c.capabilities.calendarRead
    && c.gmailStatus === "connected" && c.calendarStatus === "connected";
}

function authorizedState(state: GoogleWorkspacePublicState, granted: boolean, health: GoogleCapabilityState, send = false): CapabilityStatus {
  const c = state.connection;
  if (!state.configured || !c || c.status === "disconnected") return "unavailable";
  if (c.status === "action_required" || health === "action_required" || !granted) return "requires_authorization";
  // A partial provider failure must not hide the other source's healthy state.
  if (health === "error") return "error";
  if (send) return "controlled";
  if (c.syncing || health === "syncing") return "syncing";
  return health === "connected" ? "active" : "connected";
}

export function googleCapabilities(state: GoogleWorkspacePublicState): ApplicationCapability[] {
  const c = state.connection;
  const driveActive = state.configured && !!c && c.status !== "disconnected" && !!c.capabilities.drive;
  return [
    { id: "gmail", name: "Gmail", description: "Conversații pentru context comercial.",
      operations: [
        { label: "Citire", status: authorizedState(state, !!c?.capabilities.emailRead, c?.gmailStatus ?? "not_connected") },
        { label: "Trimitere", status: authorizedState(state, !!c?.capabilities.emailSend, c?.gmailStatus ?? "not_connected", true), detail: "Confirmare explicită pentru fiecare mesaj." }
      ] },
    { id: "google-calendar", name: "Google Calendar", description: "Întâlniri și participanți; fără modificarea evenimentelor.",
      operations: [{ label: "Citire", status: authorizedState(state, !!c?.capabilities.calendarRead, c?.calendarStatus ?? "not_connected") }] },
    { id: "google-drive", name: "Google Drive", description: "Documente comerciale selectate.",
      operations: [{ label: driveActive ? c?.driveCount ? `${c.driveCount} documente selectate` : "Acces activ · niciun document selectat" : "Fișiere selectate explicit", status: driveActive ? "active" : "requires_authorization", detail: c?.driveStatus === "action_required" ? "Acces retras · reautorizează Google Drive." : undefined }] },
    { id: "google-docs", name: "Google Docs", description: "Documente comerciale din Google Workspace.",
      operations: [{ label: "Disponibil prin Google Drive", status: driveActive ? "controlled" : "requires_authorization", detail: "Text din documentele selectate; fără paginare originală." }] },
    { id: "google-sheets", name: "Google Sheets", description: "Date comerciale din foi de calcul.",
      operations: [{ label: "Disponibil prin Google Drive", status: driveActive ? "controlled" : "requires_authorization", detail: "Prima foaie exportată; nu întregul registru de calcul." }] },
    { id: "google-meet", name: "Google Meet", description: "Context suplimentar pentru întâlniri.",
      operations: [{ label: "Integrare dedicată", status: "planned", detail: "Linkurile întâlnirilor pot exista în Calendar; nu există integrare Meet dedicată." }] }
  ];
}

const safeErrors: Record<string, string> = {
  authorization_revoked: "Accesul Google a fost revocat. Reconectează contul.",
  authorization_expired: "Autorizarea Google a expirat. Reconectează contul.",
  google_refresh_invalid: "Autorizarea Google trebuie reînnoită.",
  provider_permission_denied: "Google nu a permis accesul la această sursă. Verifică autorizarea.",
  scope_not_granted: "Permisiunea necesară nu a fost acordată.",
  provider_timeout: "Google nu a răspuns la timp. Poți relua sincronizarea.",
  provider_rate_limited: "Limita temporară Google a fost atinsă. Reîncearcă mai târziu.",
  partial_provider_failure: "Unele surse nu au fost actualizate. Verifică starea fiecărei capabilități.",
  provider_cursor_invalid: "Sincronizarea necesită refacerea ferestrei de context.",
  provider_temporary_error: "Google este temporar indisponibil. Poți relua sincronizarea."
};

export function integrationErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return Object.hasOwn(safeErrors, code) ? safeErrors[code] : "Sincronizarea nu a putut fi finalizată. Verifică accesul și reîncearcă.";
}

export function workspaceSyncFeedback(result:WorkspaceSyncResult){
 const heading=result.status==="completed"?"Sincronizare finalizată":result.status==="partial"?"Sincronizare finalizată cu atenție":"Sincronizarea necesită atenție";
 const context=(label:string,source:WorkspaceSyncResult["gmail"],unit:string)=>
  source.status==="skipped"?label+" · neautorizat":source.status==="failed"?label+" · necesită atenție":
   label+(source.contextAvailable===null?" · verificat":` · ${source.contextAvailable} ${unit} în context`);
 const drive=result.drive.status==="skipped"?"Drive · neautorizat":
  result.drive.status==="failed"&&result.drive.selected===0?"Drive · necesită atenție":
  `Drive · ${result.drive.synced} actualizate · ${result.drive.unchanged} neschimbate`+
   (result.drive.failed?` · ${result.drive.failed} necesită atenție`:result.drive.selected===0?" · niciun document selectat":"");
 return [heading,context("Gmail",result.gmail,"mesaje"),context("Calendar",result.calendar,"întâlniri"),drive].join(" — ");
}

export type IntegrationActivityEvent = {
  id: string;
  provider: "Google Workspace";
  capability: "Google Workspace" | "Gmail" | "Google Calendar";
  event: string;
  result: "running" | "completed" | "partial" | "failed" | "snapshot";
  count: number | null;
  countLabel: string;
  timestamp: string;
  durationSeconds: number | null;
  warning: string | null;
};

export const activityResultLabels: Record<IntegrationActivityEvent["result"], string> = {
  running: "În curs", completed: "Finalizat", partial: "Parțial", failed: "Nereușit", snapshot: "Ultimul context disponibil"
};

/** Latest stored run plus source snapshots, not an invented historical feed. */
export function googleActivity(state: GoogleWorkspacePublicState): IntegrationActivityEvent[] {
  const c = state.connection;
  if (!c || c.status === "disconnected") return [];
  const events: IntegrationActivityEvent[] = [];
  const run = c.latestRun;
  if (run) {
    const elapsed = run.completedAt ? (Date.parse(run.completedAt) - Date.parse(run.startedAt)) / 1000 : NaN;
    events.push({
      id: "latest-run", provider: "Google Workspace",
      capability: run.source === "gmail" ? "Gmail" : run.source === "calendar" ? "Google Calendar" : "Google Workspace",
      event: run.source === "google_workspace" ? "Sincronizare · Gmail · Calendar · Drive selectat" : "Sincronizare", result: run.status, count: run.processedCount, countLabel: "elemente procesate",
      timestamp: run.startedAt, durationSeconds: Number.isFinite(elapsed) && elapsed >= 0 ? Math.round(elapsed) : null,
      warning: integrationErrorMessage(run.safeErrorCode)
    });
  }
  for (const source of [
    { capability: "Gmail" as const, time: c.gmailLastSyncAt, count: c.counts.emails, countLabel: "emailuri în context", error: c.gmailError },
    { capability: "Google Calendar" as const, time: c.calendarLastSyncAt, count: c.counts.calendarEvents, countLabel: "întâlniri în context", error: c.calendarError }
  ]) {
    if (source.time) events.push({
      id: source.capability, provider: "Google Workspace", capability: source.capability,
      event: "Context disponibil", result: "snapshot", count: source.count, countLabel: source.countLabel,
      timestamp: source.time, durationSeconds: null, warning: integrationErrorMessage(source.error)
    });
  }
  return events.sort((a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0) || a.id.localeCompare(b.id));
}
