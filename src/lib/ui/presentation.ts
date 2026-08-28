import type { CommercialExecutionState } from "@/lib/commercial-execution";
import type { CommunicationDraftStatus } from "@/lib/communication-os";
import type { PreparedWorkStatus } from "@/lib/prepared-work";
import type { OpportunityStatus } from "@/lib/types";

export const DEFAULT_PRODUCT_TIME_ZONE = "Europe/Bucharest";

export type PresentationTone = "neutral" | "info" | "success" | "warning" | "danger" | "brand";
export type StatePresentation = { label: string; description?: string; tone: PresentationTone };

const executionStates = {
  healthy: { label: "În ritm", description: "Nu există blocaje comerciale active.", tone: "success" },
  needs_attention: { label: "Necesită atenție", description: "Există informații noi sau un pas care trebuie verificat.", tone: "warning" },
  overdue: { label: "Restant", description: "Fereastra sigură de răspuns sau termenul următorului pas a expirat.", tone: "danger" },
  waiting_for_client: { label: "Așteaptă clientul", description: "Ultimul mesaj a fost trimis, iar fereastra de răspuns este încă deschisă.", tone: "info" },
  waiting_internal: { label: "Așteaptă intern", description: "Progresul depinde de o clarificare internă.", tone: "warning" },
  approval_required: { label: "Necesită aprobare", description: "Lucrarea pregătită trebuie confirmată de un utilizator autorizat.", tone: "warning" },
  owner_missing: { label: "Responsabil lipsă", description: "Situația nu are încă un responsabil confirmat.", tone: "danger" },
  next_action_missing: { label: "Acțiune lipsă", description: "Nu există un pas următor confirmat.", tone: "warning" },
  blocked: { label: "Blocat", description: "O dependență identificată împiedică progresul.", tone: "danger" },
  prepared: { label: "Acțiune pregătită", description: "ReveNew a pregătit lucru fără a-l executa.", tone: "brand" },
  ready_for_review: { label: "Gata de revizuire", description: "Conținutul este pregătit pentru control uman.", tone: "brand" },
  resolved: { label: "Rezolvat", description: "Rezultatul comercial este înregistrat.", tone: "success" }
} satisfies Record<CommercialExecutionState, StatePresentation>;

const opportunityStates = {
  new: { label: "Nouă", tone: "neutral" },
  reviewed: { label: "Revizuit", tone: "brand" },
  action_generated: { label: "Acțiune pregătită", tone: "brand" },
  contacted: { label: "Contact inițiat", tone: "info" },
  follow_up_needed: { label: "Follow-up necesar", tone: "warning" },
  won: { label: "Câștigată", tone: "success" },
  lost: { label: "Pierdută", tone: "danger" },
  ignored: { label: "Ignorată", tone: "neutral" }
} satisfies Record<OpportunityStatus, StatePresentation>;

const communicationStates = {
  draft: { label: "Draft", tone: "neutral" },
  ready: { label: "Gata de revizuire", tone: "brand" },
  sending: { label: "Se trimite", tone: "info" },
  sent: { label: "Trimis", tone: "success" },
  discarded: { label: "Eliminat", tone: "neutral" },
  failed: { label: "Trimitere nereușită", tone: "danger" }
} satisfies Record<CommunicationDraftStatus, StatePresentation>;

const preparedWorkStates = {
  prepared: { label: "Pregătit", tone: "brand" },
  ready_for_review: { label: "Gata de revizuire", tone: "brand" },
  approved: { label: "Aprobat", tone: "success" },
  rejected: { label: "Respins", tone: "neutral" },
  executed: { label: "Executat", tone: "success" },
  expired: { label: "Expirat", tone: "neutral" }
} satisfies Record<PreparedWorkStatus, StatePresentation>;

const approvalStates: Record<string, StatePresentation> = {
  pending: { label: "Așteaptă aprobarea", tone: "warning" },
  approved: { label: "Aprobat", tone: "success" },
  rejected: { label: "Respins", tone: "neutral" },
  executed: { label: "Executat", tone: "success" },
  expired: { label: "Expirat", tone: "neutral" }
};

const priorityStates: Record<string, StatePresentation> = {
  low: { label: "Prioritate scăzută", tone: "neutral" },
  medium: { label: "Prioritate medie", tone: "info" },
  high: { label: "Prioritate ridicată", tone: "warning" },
  urgent: { label: "Urgent", tone: "danger" },
  critical: { label: "Critic", tone: "danger" }
};

const sequenceStates = {
  draft: { label: "Draft", tone: "neutral" },
  active: { label: "Activă", tone: "success" },
  paused: { label: "În pauză", tone: "warning" },
  completed: { label: "Finalizată", tone: "success" },
  archived: { label: "Arhivată", tone: "neutral" }
} satisfies Record<"draft" | "active" | "paused" | "completed" | "archived", StatePresentation>;
const workflowStates = {
  draft: { label: "Draft", tone: "neutral" },
  active: { label: "Activ", tone: "success" },
  paused: { label: "În pauză", tone: "warning" },
  archived: { label: "Arhivat", tone: "neutral" }
} satisfies Record<"draft" | "active" | "paused" | "archived", StatePresentation>;
const workflowRunStates = {
  pending: { label: "În așteptare", tone: "neutral" },
  evaluating: { label: "Se verifică", tone: "info" },
  blocked: { label: "Omis în siguranță", tone: "warning" },
  prepared: { label: "Lucru pregătit", tone: "brand" },
  completed: { label: "Finalizat", tone: "success" },
  failed: { label: "Necesită verificare", tone: "danger" },
  cancelled: { label: "Anulat", tone: "neutral" }
} satisfies Record<"pending" | "evaluating" | "blocked" | "prepared" | "completed" | "failed" | "cancelled", StatePresentation>;
const directionStates = {
  inbound: { label: "Primit", tone: "info" },
  outbound: { label: "Trimis", tone: "neutral" }
} satisfies Record<"inbound" | "outbound", StatePresentation>;

const sourceLabels: Record<string, string> = {
  Email: "Gmail",
  "Eveniment calendar": "Google Calendar",
  Calendar: "Google Calendar",
  Oportunitate: "ReveNew",
  Companie: "ReveNew",
  Contact: "ReveNew",
  Acțiune: "ReveNew",
  "Istoric comercial": "ReveNew",
  "Semnal comercial": "ReveNew"
};

function validDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatProductDate(value?: string | Date | null, options?: { timeZone?: string; year?: boolean; weekday?: "long" | "short" | "narrow" }) {
  const date = validDate(value);
  if (!date) return "Dată neconfirmată";
  return new Intl.DateTimeFormat("ro-RO", {
    weekday: options?.weekday,
    day: "numeric",
    month: "short",
    ...(options?.year === false ? {} : { year: "numeric" }),
    timeZone: options?.timeZone ?? DEFAULT_PRODUCT_TIME_ZONE
  }).format(date);
}

export function formatProductDateTime(value?: string | Date | null, options?: { timeZone?: string; year?: boolean }) {
  const date = validDate(value);
  if (!date) return "Moment neconfirmat";
  return new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "short",
    ...(options?.year === false ? {} : { year: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
    timeZone: options?.timeZone ?? DEFAULT_PRODUCT_TIME_ZONE
  }).format(date);
}

export function formatProductTime(value?: string | Date | null, options?: { timeZone?: string }) {
  const date = validDate(value);
  if (!date) return "Oră neconfirmată";
  return new Intl.DateTimeFormat("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: options?.timeZone ?? DEFAULT_PRODUCT_TIME_ZONE
  }).format(date);
}
export function formatProductRelativeTime(value?: string | Date | null, now = new Date()) {
  const date = validDate(value);
  if (!date) return "Moment neconfirmat";
  const minutes = Math.round((date.getTime() - now.getTime()) / 60_000);
  const absoluteMinutes = Math.abs(minutes);
  const formatter = new Intl.RelativeTimeFormat("ro-RO", { numeric: "auto" });
  if (absoluteMinutes < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) <= 7) return formatter.format(days, "day");
  return formatProductDateTime(date, { year: date.getFullYear() !== now.getFullYear() });
}

export function formatProductCurrency(value?: number | null, currency = "RON") {
  if (value == null || !Number.isFinite(value)) return "Valoare neconfirmată";
  const safeCurrency = /^[A-Z]{3}$/.test(currency) ? currency : "RON";
  return new Intl.NumberFormat("ro-RO", { style: "currency", currency: safeCurrency, maximumFractionDigits: 0 }).format(value);
}


const userFacingTokens: Record<string, string> = {
  follow_up_needed: opportunityStates.follow_up_needed.label,
  action_generated: opportunityStates.action_generated.label,
  contacted: opportunityStates.contacted.label,
  reviewed: opportunityStates.reviewed.label,
  waiting_for_client: executionStates.waiting_for_client.label,
  waiting_internal: executionStates.waiting_internal.label,
  approval_required: executionStates.approval_required.label,
  owner_missing: executionStates.owner_missing.label,
  next_action_missing: executionStates.next_action_missing.label,
  ready_for_review: executionStates.ready_for_review.label,
  provider_error: "Eroare de conectare",
  deterministic_fallback: "Răspuns verificat"
};

export function formatUserFacingText(value?: string | null, options?: { stripUrls?: boolean }) {
  if (!value) return "";
  let result = value.normalize("NFKC");
  result = result.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})/g, (timestamp) => formatProductDateTime(timestamp));
  for (const [machineValue, label] of Object.entries(userFacingTokens)) {
    result = result.replace(new RegExp(machineValue, "gi"), label);
  }
  result = result.replace(/\b(?:determinist(?:ă|e|ic)?|canonical(?:ă|e)?|provider)\b/gi, "verificat");
  if (options?.stripUrls) result = result.replace(/https?:\/\/\S+/gi, "");
  return result.replace(/\s+/g, " ").trim();
}

export const presentExecutionState = (value: CommercialExecutionState) => executionStates[value];
export const presentOpportunityState = (value: OpportunityStatus) => opportunityStates[value];
export const presentCommunicationState = (value: CommunicationDraftStatus) => communicationStates[value];
export const presentPreparedWorkState = (value: PreparedWorkStatus) => preparedWorkStates[value];
export const presentApprovalState = (value: string) => approvalStates[value] ?? { label: "De verificat", tone: "neutral" as const };
export const presentPriority = (value: string) => priorityStates[value] ?? { label: "Prioritate neconfirmată", tone: "neutral" as const };
export const presentSequenceState = (value: keyof typeof sequenceStates) => sequenceStates[value];
export const presentWorkflowState = (value: keyof typeof workflowStates) => workflowStates[value];
export const presentWorkflowRunState = (value: keyof typeof workflowRunStates) => workflowRunStates[value];
export const presentDirection = (value: "inbound" | "outbound") => directionStates[value];
export const presentSourceIdentity = (value: string) => sourceLabels[value] ?? "ReveNew";
