import type { RecoverySummary } from "@/lib/recovery";

export const REVENew_BUSINESS_TIME_ZONE = "Europe/Bucharest";

export type BusinessContextProviderId =
  | "structured_records"
  | "execution"
  | "documents"
  | "activity"
  | "email"
  | "calendar"
  | "notes"
  | "calls";

export type BusinessContextProviderState = "available" | "not_connected" | "unavailable" | "forbidden";

export type BusinessContextSourceCheck = {
  providerId: BusinessContextProviderId;
  label: string;
  state: BusinessContextProviderState;
  checkedAt: string;
  detail: string;
};

export const UNIVERSAL_BUSINESS_CONTEXT_PROVIDERS: ReadonlyArray<{
  providerId: BusinessContextProviderId;
  label: string;
  defaultState: BusinessContextProviderState;
  detail: string;
}> = [
  { providerId: "structured_records", label: "Înregistrări comerciale", defaultState: "available", detail: "Companii, contacte și oportunități autorizate." },
  { providerId: "execution", label: "Execuție comercială", defaultState: "available", detail: "Acțiuni, responsabilități, termene și aprobări." },
  { providerId: "documents", label: "Documente", defaultState: "available", detail: "Documente asociate oportunităților vizibile." },
  { providerId: "activity", label: "Istoric comercial", defaultState: "available", detail: "Evenimente și schimbări din înregistrările vizibile." },
  { providerId: "email", label: "Email", defaultState: "not_connected", detail: "Sursa de email nu este conectată la Ask ReveNew." },
  { providerId: "calendar", label: "Calendar", defaultState: "not_connected", detail: "Sursa de calendar nu este conectată la Ask ReveNew." },
  { providerId: "notes", label: "Note externe", defaultState: "unavailable", detail: "Notele externe nu sunt disponibile în acest strat." },
  { providerId: "calls", label: "Apeluri", defaultState: "unavailable", detail: "Transcrierile apelurilor nu sunt disponibile în acest strat." }
];

export function buildBusinessContextSourceChecks(
  now = new Date(),
  overrides: Partial<Record<BusinessContextProviderId, BusinessContextProviderState>> = {},
  details: Partial<Record<BusinessContextProviderId, string>> = {}
): BusinessContextSourceCheck[] {
  const checkedAt = now.toISOString();
  return UNIVERSAL_BUSINESS_CONTEXT_PROVIDERS.map((provider) => ({
    providerId: provider.providerId,
    label: provider.label,
    state: overrides[provider.providerId] ?? provider.defaultState,
    checkedAt,
    detail: details[provider.providerId] ?? provider.detail
  }));
}

export function scopeRecoverySummaryForViewer(
  summary: RecoverySummary,
  viewer: { profileId: string | null; isManager: boolean }
): RecoverySummary {
  if (viewer.isManager || !viewer.profileId) return summary;

  const opportunities = summary.opportunities.filter((opportunity) => opportunity.ownerProfileId === viewer.profileId);
  const opportunityIds = new Set(opportunities.map((opportunity) => opportunity.id));
  return {
    opportunities,
    actions: summary.actions.filter((action) => action.assignedToProfileId === viewer.profileId || Boolean(action.opportunityId && opportunityIds.has(action.opportunityId))),
    documents: summary.documents.filter((document) => Boolean(document.opportunityId && opportunityIds.has(document.opportunityId))),
    events: summary.events.filter((event) => Boolean(event.opportunityId && opportunityIds.has(event.opportunityId))),
    signals: summary.signals.filter((signal) => Boolean(
      (signal.detectedFromOpportunityId && opportunityIds.has(signal.detectedFromOpportunityId))
      || (signal.convertedOpportunityId && opportunityIds.has(signal.convertedOpportunityId))
    ))
  };
}
