import type { CommercialSignal } from "@/lib/types";

export type ApprovalCenterState = "pending" | "applied" | "rejected";

export const approvalCenterStateLabels: Record<ApprovalCenterState, string> = {
  pending: "De aprobat",
  applied: "Aplicat",
  rejected: "Respins"
};

export function approvalStateForSignal(signal: CommercialSignal): ApprovalCenterState | null {
  if (signal.reviewStatus === "converted" || signal.status === "converted") return "applied";
  if (["dismissed", "duplicate"].includes(signal.reviewStatus) || ["dismissed", "duplicate", "ignored", "archived"].includes(signal.status)) return "rejected";
  if (["ready_for_review", "postponed"].includes(signal.reviewStatus)) return "pending";
  return null;
}

export function proposedChangeForSignal(signal: CommercialSignal) {
  if (signal.detectedFromOpportunityId) {
    return "Creează următoarea acțiune internă în oportunitatea existentă, cu responsabilul și termenul confirmate.";
  }
  return "Creează o oportunitate și prima acțiune internă din datele revizuite.";
}

export function approvalReasonForSignal(signal: CommercialSignal) {
  return signal.primaryRecoveryReason
    || signal.analysisExplanation
    || signal.recommendedAction
    || "Semnalul necesită o decizie umană înainte de orice modificare internă.";
}

export function approvalCenterSignals(signals: CommercialSignal[], state: ApprovalCenterState | "all" = "all") {
  return signals
    .map((signal) => ({ signal, state: approvalStateForSignal(signal) }))
    .filter((item): item is { signal: CommercialSignal; state: ApprovalCenterState } => Boolean(item.state))
    .filter((item) => state === "all" || item.state === state)
    .sort((left, right) => {
      const stateRank: Record<ApprovalCenterState, number> = { pending: 3, applied: 2, rejected: 1 };
      return stateRank[right.state] - stateRank[left.state]
        || Number(right.signal.recoverabilityScore ?? 0) - Number(left.signal.recoverabilityScore ?? 0)
        || String(right.signal.createdAt ?? "").localeCompare(String(left.signal.createdAt ?? ""));
    });
}
