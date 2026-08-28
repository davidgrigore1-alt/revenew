import "server-only";

import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import type { CopilotPageContext } from "@/lib/ai/copilot-types";
import {
  buildBusinessContextSourceChecks,
  REVENew_BUSINESS_TIME_ZONE,
  scopeRecoverySummaryForViewer
} from "@/lib/ai/universal-business-context-core";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { getRevenueWorkspaceSummary } from "@/lib/revenue-workspace";
import { getGoogleWorkspacePublicState } from "@/lib/google-workspace/repository";

function activeContextLabel(page: CopilotPageContext) {
  if (page.contextLabel) return page.contextLabel;
  if (page.route.startsWith("/crm/contacts/")) return "Contactul curent";
  if (page.pageType === "company") return "Compania curentă";
  if (page.pageType === "opportunity") return "Oportunitatea curentă";
  if (page.pageType === "dashboard" || page.route === "/dashboard") return "Control Center";
  if (page.pageType === "ai" || page.route === "/ai") return "Inteligență operațională";
  if (page.route === "/inbox") return "Inbox Comercial";
  if (page.route === "/today") return "Activitatea mea";
  if (page.route === "/approvals") return "Aprobări";
  if (page.route === "/prepared") return "Lucru pregătit";
  if (page.route === "/meetings") return "Întâlniri";
  if (page.route === "/workflows" || page.route.startsWith("/workflows/")) return "Workflow-uri";
  return "Întregul spațiu de lucru";
}

export async function getUniversalBusinessContext(page: CopilotPageContext) {
  const [workspaceSummary, authorization, currentBusiness, googleState] = await Promise.all([
    getRevenueWorkspaceSummary(),
    getAuthorizationContext(),
    getCurrentBusinessForUser({ redirectIfMissing: false }),
    getGoogleWorkspacePublicState()
  ]);
  const scopedSummary = scopeRecoverySummaryForViewer(workspaceSummary, workspaceSummary.viewer);
  const google = googleState.connection;
  const emailGranted = Boolean(google?.capabilities.gmail);
  const calendarGranted = Boolean(google?.capabilities.calendar);
  const emailAvailable = Boolean(google?.gmailStatus === "connected" && google.gmailLastSyncAt);
  const calendarAvailable = Boolean(google?.calendarStatus === "connected" && google.calendarLastSyncAt);
  const sourceChecks = buildBusinessContextSourceChecks(new Date(), {
    email: emailAvailable ? "available" : emailGranted ? "unavailable" : "not_connected",
    calendar: calendarAvailable ? "available" : calendarGranted ? "unavailable" : "not_connected"
  }, {
    email: emailAvailable ? "Context Gmail autorizat și sincronizat pentru utilizatorul curent." : emailGranted ? "Gmail este autorizat, dar contextul nu este disponibil până la o sincronizare reușită." : "Gmail nu este autorizat pentru utilizatorul curent.",
    calendar: calendarAvailable ? "Context Calendar autorizat și sincronizat pentru utilizatorul curent." : calendarGranted ? "Calendar este autorizat, dar contextul nu este disponibil până la o sincronizare reușită." : "Calendar nu este autorizat pentru utilizatorul curent."
  });

  return {
    workspace: {
      id: currentBusiness?.business.id ?? "demo",
      name: currentBusiness?.business.name ?? "Spațiu demonstrativ ReveNew",
      source: currentBusiness?.source ?? "demo",
      timeZone: REVENew_BUSINESS_TIME_ZONE
    },
    actor: {
      profileId: authorization.profileId,
      role: authorization.businessRole ?? (workspaceSummary.viewer.isManager ? "manager" : "individual"),
      scope: workspaceSummary.viewer.isManager ? "management" as const : "individual" as const
    },
    activeContext: {
      route: page.route,
      pageType: page.pageType,
      label: activeContextLabel(page),
      organizationId: page.organizationId ?? null,
      opportunityId: page.opportunityId ?? null,
      contactId: page.contactId ?? null,
      selectedRecordId: page.selectedRecordId ?? null
    },
    sourceChecks,
    summary: scopedSummary,
    today: workspaceSummary.today
  };
}
