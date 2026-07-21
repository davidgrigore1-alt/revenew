import type { CommercialSignal } from "@/lib/types";

export type FirstValueStepState = "complete" | "current" | "action";

export type FirstValueJourneyStep = {
  id: "signal" | "analysis" | "preparation" | "approval";
  label: string;
  description: string;
  state: FirstValueStepState;
};

export type FirstValueJourney = {
  steps: FirstValueJourneyStep[];
  nextHref: string;
  nextAction: string;
  complete: boolean;
  signalId?: string;
};

const reviewedEventTypes = new Set([
  "analysis_review_edited",
  "signal_reviewed",
  "recommendation_feedback_recorded",
  "signal_dismissed",
  "duplicate_marked"
]);

function wasReviewedByAHuman(signal: CommercialSignal) {
  return Boolean(signal.reviewedAt)
    || (signal.events ?? []).some((event) => reviewedEventTypes.has(event.eventType));
}

function hasPreparedAction(signal: CommercialSignal) {
  return signal.analysisStatus === "completed"
    && Boolean(signal.recommendedAction?.trim() || signal.reviewedDraft?.trim() || signal.draftBody?.trim());
}

function isInApprovalFlow(signal: CommercialSignal) {
  return ["ready_for_review", "postponed", "approved", "converted", "dismissed", "duplicate"].includes(signal.reviewStatus)
    || ["ready_for_review", "postponed", "approved", "converted", "dismissed", "duplicate", "ignored", "archived"].includes(signal.status);
}

function preferredSignal(signals: CommercialSignal[]) {
  return [...signals].sort((left, right) => {
    const score = (signal: CommercialSignal) =>
      (isInApprovalFlow(signal) ? 8 : 0)
      + (wasReviewedByAHuman(signal) ? 4 : 0)
      + (hasPreparedAction(signal) ? 2 : 0)
      + (signal.analysisStatus === "completed" ? 1 : 0);
    return score(right) - score(left)
      || String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? ""));
  })[0];
}

export function deriveFirstValueJourney(signals: CommercialSignal[]): FirstValueJourney {
  const signal = preferredSignal(signals);
  const hasSignal = Boolean(signal);
  const hasAnalysis = signal?.analysisStatus === "completed";
  const reviewed = Boolean(signal && wasReviewedByAHuman(signal));
  const prepared = Boolean(signal && hasPreparedAction(signal));
  const inApproval = Boolean(signal && reviewed && isInApprovalFlow(signal));
  const signalHref = signal ? `/inbox?signal=${encodeURIComponent(signal.id)}` : "/inbox?create=1";

  const completion = [hasSignal, reviewed, prepared, inApproval];
  const currentIndex = completion.findIndex((value) => !value);
  const stateFor = (index: number): FirstValueStepState => completion[index]
    ? "complete"
    : currentIndex === index ? "current" : "action";

  const steps: FirstValueJourneyStep[] = [
    {
      id: "signal",
      label: "Adaugă primul semnal",
      description: hasSignal ? "Semnalul există în Inbox Comercial." : "Adaugă manual o cerere sau importă un fișier CSV.",
      state: stateFor(0)
    },
    {
      id: "analysis",
      label: "Revizuiește riscul comercial",
      description: reviewed
        ? "Revizuirea umană este înregistrată în istoricul semnalului."
        : hasAnalysis
          ? "Analiza este disponibilă; verifică faptele, riscul și incertitudinile."
          : "Generează analiza explicabilă, apoi verifică rezultatul.",
      state: stateFor(1)
    },
    {
      id: "preparation",
      label: "Pregătește acțiunea recomandată",
      description: prepared
        ? "Recomandarea și draftul intern sunt pregătite pentru control uman."
        : "Confirmă următorul pas, responsabilul și termenul.",
      state: stateFor(2)
    },
    {
      id: "approval",
      label: "Trimite spre aprobare",
      description: inApproval
        ? "Elementul este în fluxul de aprobare sau are deja o decizie înregistrată."
        : "Aprobarea umană rămâne obligatorie înaintea aplicării interne.",
      state: stateFor(3)
    }
  ];

  if (!hasSignal) return { steps, nextHref: "/inbox?create=1", nextAction: "Adaugă primul semnal", complete: false };
  if (!hasAnalysis) return { steps, nextHref: signalHref, nextAction: "Generează analiza", complete: false, signalId: signal.id };
  if (!reviewed) return { steps, nextHref: signalHref, nextAction: "Revizuiește riscul comercial", complete: false, signalId: signal.id };
  if (!prepared) return { steps, nextHref: signalHref, nextAction: "Pregătește acțiunea", complete: false, signalId: signal.id };
  if (!inApproval) return { steps, nextHref: signalHref, nextAction: "Trimite spre aprobare", complete: false, signalId: signal.id };

  return {
    steps,
    nextHref: `/approvals?signal=${encodeURIComponent(signal.id)}`,
    nextAction: "Revizuiește aprobarea",
    complete: true,
    signalId: signal.id
  };
}
