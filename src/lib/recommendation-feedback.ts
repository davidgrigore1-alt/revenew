import type { CommercialSignal, CommercialSignalEvent } from "@/lib/types";

export type RecommendationFeedbackState =
  | "pending_review"
  | "accepted_as_is"
  | "edited_before_approval"
  | "rejected"
  | "applied"
  | "not_useful";

export type RecommendationFeedback = {
  state: RecommendationFeedbackState;
  statusLabel: string;
  decisionLabel: string;
  modeLabel: string;
  wasEdited: boolean;
  originalAction: string | null;
  finalAction: string | null;
  rejectionReason: string | null;
  decidedAt: string | null;
  conversionType: "new_opportunity" | "existing_opportunity_action" | null;
  relatedOpportunityId: string | null;
};

const stateLabels: Record<RecommendationFeedbackState, string> = {
  pending_review: "În așteptare",
  accepted_as_is: "Acceptată fără modificări",
  edited_before_approval: "Editată înainte de aprobare",
  rejected: "Respinsă cu motiv",
  applied: "Aplicată",
  not_useful: "Neutilă · închisă"
};

function clean(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.trim().replace(/[<>]/g, "").slice(0, maxLength) || null : null;
}

function metadataBoolean(event: CommercialSignalEvent | undefined, key: string) {
  return event?.metadata?.[key] === true;
}

function metadataString(event: CommercialSignalEvent | undefined, key: string, maxLength = 500) {
  return clean(event?.metadata?.[key], maxLength);
}

function latestEvent(signal: CommercialSignal, eventTypes: string[]) {
  return [...(signal.events ?? [])]
    .filter((event) => eventTypes.includes(event.eventType))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
}

export function recommendationModeLabel(signal: CommercialSignal) {
  if (signal.analysisMode === "ai") return "AI";
  if (signal.analysisMode === "deterministic_fallback") return "Fallback local";
  return "Reguli locale";
}

export function recommendationFeedbackForSignal(signal: CommercialSignal): RecommendationFeedback {
  const feedbackEvent = latestEvent(signal, ["recommendation_feedback_recorded"]);
  const editEvent = latestEvent(signal, ["analysis_review_edited"]);
  const rejectionEvent = latestEvent(signal, ["signal_dismissed", "duplicate_marked", "signal_archived"]);
  const converted = signal.reviewStatus === "converted" || signal.status === "converted";
  const rejected = ["dismissed", "duplicate"].includes(signal.reviewStatus)
    || ["dismissed", "duplicate", "ignored", "archived"].includes(signal.status);
  const notUseful = ["ignored", "archived"].includes(signal.status) && signal.reviewStatus !== "duplicate";
  const wasEdited = metadataBoolean(feedbackEvent, "edited") || Boolean(editEvent);
  const originalAction = metadataString(feedbackEvent, "original_recommended_action")
    ?? metadataString(editEvent, "original_recommended_action")
    ?? clean(signal.recommendedAction);
  const finalAction = metadataString(feedbackEvent, "final_approved_action")
    ?? metadataString(editEvent, "final_recommended_action")
    ?? (converted ? clean(signal.recommendedAction) : null);
  const conversionType = metadataString(feedbackEvent, "conversion_type") === "existing_opportunity_action"
    ? "existing_opportunity_action" as const
    : metadataString(feedbackEvent, "conversion_type") === "new_opportunity"
      ? "new_opportunity" as const
      : converted
        ? signal.detectedFromOpportunityId ? "existing_opportunity_action" as const : "new_opportunity" as const
        : null;

  let state: RecommendationFeedbackState = "pending_review";
  if (converted) state = "applied";
  else if (rejected) state = notUseful ? "not_useful" : "rejected";
  else if (wasEdited) state = "edited_before_approval";

  const decisionLabel = converted
    ? wasEdited ? stateLabels.edited_before_approval : feedbackEvent ? stateLabels.accepted_as_is : stateLabels.applied
    : stateLabels[state];

  return {
    state,
    statusLabel: stateLabels[state],
    decisionLabel,
    modeLabel: recommendationModeLabel(signal),
    wasEdited,
    originalAction,
    finalAction,
    rejectionReason: clean(signal.dismissalReason) ?? metadataString(rejectionEvent, "reason"),
    decidedAt: feedbackEvent?.createdAt ?? rejectionEvent?.createdAt ?? signal.reviewedAt ?? null,
    conversionType,
    relatedOpportunityId: metadataString(feedbackEvent, "opportunity_id", 80) ?? signal.convertedOpportunityId ?? signal.detectedFromOpportunityId ?? null
  };
}

export function recommendationFeedbackCounts(signals: CommercialSignal[]) {
  return signals
    .filter((signal) => signal.analysisStatus === "completed" || signal.events?.some((event) => event.eventType === "recommendation_feedback_recorded"))
    .reduce((counts, signal) => {
      const feedback = recommendationFeedbackForSignal(signal);
      if (feedback.state === "pending_review" || feedback.state === "edited_before_approval") counts.pending += 1;
      if (feedback.state === "applied") counts.applied += 1;
      if (feedback.wasEdited) counts.edited += 1;
      if (feedback.state === "rejected" || feedback.state === "not_useful") counts.rejected += 1;
      return counts;
    }, { pending: 0, applied: 0, edited: 0, rejected: 0 });
}
