export const commercialExecutionStates = [
  "healthy",
  "needs_attention",
  "overdue",
  "waiting_for_client",
  "waiting_internal",
  "approval_required",
  "owner_missing",
  "next_action_missing",
  "blocked",
  "prepared",
  "ready_for_review",
  "resolved"
] as const;

export type CommercialExecutionState = typeof commercialExecutionStates[number];

export type CommercialCommunication = {
  lastInboundAt?: string | null;
  lastOutboundAt?: string | null;
  nextMeetingAt?: string | null;
  expectedResponseWindowDays?: number;
};

export type CommercialExecutionAssessment = {
  state: CommercialExecutionState;
  label: string;
  reason: string;
  rule: string;
  severity: "critical" | "attention" | "informative" | "positive";
  nextReviewAt: string | null;
  waitingIsLegitimate: boolean;
  recentInboundReply: boolean;
};

const dayMs = 86_400_000;
const labels: Record<CommercialExecutionState, string> = {
  healthy: "În ritm",
  needs_attention: "Necesită atenție",
  overdue: "Restant",
  waiting_for_client: "Așteaptă clientul",
  waiting_internal: "Așteaptă intern",
  approval_required: "Necesită aprobare",
  owner_missing: "Responsabil lipsă",
  next_action_missing: "Acțiune lipsă",
  blocked: "Blocat",
  prepared: "Pregătit",
  ready_for_review: "Gata de revizuire",
  resolved: "Rezolvat"
};

export function addBusinessDays(value: Date | string, businessDays: number) {
  const result = new Date(value);
  let remaining = Math.max(0, Math.floor(businessDays));
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const day = result.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return result;
}
function time(value?: string | null) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function result(state: CommercialExecutionState, reason: string, rule: string, extra: Partial<CommercialExecutionAssessment> = {}): CommercialExecutionAssessment {
  const severity = state === "blocked" || state === "overdue"
    ? "critical"
    : ["needs_attention", "approval_required", "owner_missing", "next_action_missing"].includes(state)
      ? "attention"
      : state === "healthy" || state === "resolved"
        ? "positive"
        : "informative";
  return { state, label: labels[state], reason, rule, severity, nextReviewAt: null, waitingIsLegitimate: false, recentInboundReply: false, ...extra };
}

export function assessCommercialExecution(input: {
  now?: Date;
  lifecycleOpen: boolean;
  ownerMissing: boolean;
  nextActionMissing: boolean;
  nextActionOverdue: boolean;
  approvalPending: boolean;
  outreachRestricted: boolean;
  explicitBlocker?: string | null;
  waitingInternal?: string | null;
  preparedWorkState?: "none" | "draft" | "prepared" | "ready_for_review";
  attentionRequired?: boolean;
  communication?: CommercialCommunication;
}): CommercialExecutionAssessment {
  const now = input.now ?? new Date();
  if (!input.lifecycleOpen) return result("resolved", "Rezultatul comercial este înregistrat explicit.", "opportunity.lifecycle_status");
  if (input.outreachRestricted) return result("blocked", "Contactarea externă este restricționată până la verificarea umană.", "opportunities.outreach_restricted_at");
  if (input.explicitBlocker) return result("blocked", input.explicitBlocker, "identified_dependency");
  if (input.approvalPending) return result("approval_required", "Există lucru pregătit sau o decizie care nu poate avansa fără aprobare umană.", "approval.pending");
  if (input.waitingInternal) return result("waiting_internal", input.waitingInternal, "internal_dependency");
  if (input.ownerMissing) return result("owner_missing", "Situația necesită execuție, dar responsabilul nu este confirmat.", "opportunity.owner_profile_id");

  const inbound = time(input.communication?.lastInboundAt);
  const outbound = time(input.communication?.lastOutboundAt);
  const meeting = time(input.communication?.nextMeetingAt);
  const responseDays = Math.min(10, Math.max(1, input.communication?.expectedResponseWindowDays ?? 3));
  if (inbound !== null && (outbound === null || inbound > outbound)) {
    return result("needs_attention", "A sosit un răspuns după ultima comunicare trimisă și trebuie revizuit.", "latest_inbound > latest_outbound", { recentInboundReply: true });
  }
  if (outbound !== null && (inbound === null || outbound > inbound)) {
    const nextReview = outbound + responseDays * dayMs;
    const nextReviewAt = new Date(nextReview).toISOString();
    if (now.getTime() <= nextReview || (meeting !== null && meeting >= now.getTime() && meeting <= nextReview + 2 * dayMs)) {
      return result("waiting_for_client", "Ultimul mesaj este trimis, iar fereastra conservatoare de răspuns nu a expirat.", "latest_outbound > latest_inbound + response_window", { nextReviewAt, waitingIsLegitimate: true });
    }
    return result("overdue", "Fereastra de răspuns a expirat fără un răspuns nou sau un pas confirmat.", "response_window_expired", { nextReviewAt });
  }
  if (input.nextActionOverdue) return result("overdue", "Următoarea acțiune a depășit termenul fără finalizare înregistrată.", "next_action.due_at < now");
  if (input.nextActionMissing) return result("next_action_missing", "Nu există un pas următor confirmat pentru oportunitatea activă.", "next_action = null");
  if (input.preparedWorkState === "ready_for_review") return result("ready_for_review", "Lucrarea este pregătită și așteaptă revizuirea utilizatorului.", "prepared_work.status = ready_for_review");
  if (input.preparedWorkState === "prepared") return result("prepared", "ReveNew a pregătit lucru intern fără a-l executa.", "prepared_work.status = prepared");
  if (input.attentionRequired) return result("needs_attention", "Datele autorizate indică un risc sau o lipsă ce necesită verificare.", "attention.reasons > 0");
  return result("healthy", "Responsabilul și următoarea acțiune sunt confirmate, fără blocaj curent.", "owner + next_action + no_blocker");
}