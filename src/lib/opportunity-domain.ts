import type {
  CommercialPipelineStage,
  Opportunity,
  OpportunityAction,
  OpportunityCommercialType,
  OpportunityLifecycleStatus,
  OpportunityStatus,
  OpportunityType
} from "@/lib/types";

export const DEFAULT_STALE_ACTIVITY_DAYS = 14;
export const APPLICATION_TIME_ZONE = "Europe/Bucharest";

const applicationDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APPLICATION_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function dateParts(date: Date) {
  const parts = Object.fromEntries(
    applicationDateFormatter.formatToParts(date).map((part) => [part.type, part.value])
  );
  return { year: parts.year, month: parts.month, day: parts.day };
}

export function applicationDateKey(date = new Date()) {
  const parts = dateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function applicationMonthKey(date = new Date()) {
  const parts = dateParts(date);
  return `${parts.year}-${parts.month}`;
}

// Convert product-local input to an unambiguous instant. The round trip also
// rejects impossible wall-clock values during daylight-saving transitions.
export function applicationLocalDateTimeToIso(dateKey: string, timeKey: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeKey);
  if (!dateMatch || !timeMatch) return null;
  const [, yearText, monthText, dayText] = dateMatch;
  const [, hourText, minuteText] = timeMatch;
  const [year, month, day, hour, minute] = [yearText, monthText, dayText, hourText, minuteText].map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;

  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = desiredAsUtc;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: APPLICATION_TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  });
  for (let pass = 0; pass < 2; pass += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(candidate)).map((part) => [part.type, part.value]));
    const representedAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    candidate -= representedAsUtc - desiredAsUtc;
  }
  const roundTrip = Object.fromEntries(formatter.formatToParts(new Date(candidate)).map((part) => [part.type, part.value]));
  if (`${roundTrip.year}-${roundTrip.month}-${roundTrip.day}` !== dateKey || `${roundTrip.hour}:${roundTrip.minute}` !== timeKey) return null;
  return new Date(candidate).toISOString();
}

export const commercialTypeLabels: Record<OpportunityCommercialType, string> = {
  new_business: "Business nou",
  stalled_pipeline: "Pipeline blocat",
  reactivation: "Reactivare",
  expansion: "Extindere",
  renewal: "Reînnoire",
  commercial_recovery: "Recuperare comercială",
  other: "Alt tip"
};

export const lifecycleLabels: Record<OpportunityLifecycleStatus, string> = {
  open: "Deschisă",
  won: "Câștigată",
  lost: "Pierdută",
  disqualified: "Descalificată",
  archived: "Arhivată"
};

export function lifecycleForOpportunity(opportunity: Pick<Opportunity, "lifecycleStatus" | "status">): OpportunityLifecycleStatus {
  if (opportunity.lifecycleStatus) return opportunity.lifecycleStatus;
  if (opportunity.status === "won") return "won";
  if (opportunity.status === "lost") return "lost";
  if (opportunity.status === "ignored") return "disqualified";
  return "open";
}

export function commercialTypeForOpportunity(
  opportunity: Pick<Opportunity, "commercialType" | "type">
): OpportunityCommercialType {
  if (opportunity.commercialType) return opportunity.commercialType;
  if (opportunity.type === "contract_renewal") return "renewal";
  if (opportunity.type === "invoice_followup") return "commercial_recovery";
  return "other";
}

export function stageForLegacyStatus(status: OpportunityStatus): CommercialPipelineStage {
  if (status === "won") return "won";
  if (status === "lost" || status === "ignored") return "lost";
  if (status === "follow_up_needed") return "proposal";
  if (status === "action_generated" || status === "contacted") return "qualified";
  return "lead";
}

export function stageForOpportunity(opportunity: Pick<Opportunity, "lifecycleStatus" | "status">): CommercialPipelineStage {
  const lifecycle = lifecycleForOpportunity(opportunity);
  if (lifecycle === "won") return "won";
  if (lifecycle === "lost" || lifecycle === "disqualified" || lifecycle === "archived") return "lost";
  return stageForLegacyStatus(opportunity.status);
}

export function isOpenOpportunity(opportunity: Pick<Opportunity, "lifecycleStatus" | "status">) {
  return lifecycleForOpportunity(opportunity) === "open";
}

// Canonical next-action rule: earliest incomplete task with a due date, followed by
// undated tasks in creation order. IDs provide a stable final tie-breaker.
export function selectPrimaryNextAction(actions: OpportunityAction[]): OpportunityAction | null {
  const pending = actions.filter((action) => action.status === "pending");
  pending.sort((left, right) => {
    const leftDue = left.dueDate || "9999-12-31T23:59:59.999Z";
    const rightDue = right.dueDate || "9999-12-31T23:59:59.999Z";
    return leftDue.localeCompare(rightDue)
      || String(left.createdAt ?? "").localeCompare(String(right.createdAt ?? ""))
      || left.id.localeCompare(right.id);
  });
  return pending[0] ?? null;
}

export function legacyTypeLabel(type: OpportunityType) {
  return type.replaceAll("_", " ");
}
