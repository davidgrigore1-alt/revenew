import { parseRecoveryDraft } from "@/lib/recoverability-review";
import type { CommercialSignal } from "@/lib/types";

export type SignalPreparationMode = "ai" | "local_fallback" | "not_prepared";

export type SignalPreparation = {
  mode: SignalPreparationMode;
  modeLabel: string;
  summary: string;
  intent: string;
  confidence: string;
  affectedRecord: string;
  missingInfo: string[];
  recommendedNextAction: string;
  suggestedOpportunityTitle: string;
  suggestedActionTitle: string;
  suggestedActionDueHint: string;
  internalNote: string;
  emailDraft: string;
  evidence: string[];
  risks: string[];
  approvalRecommendation: string;
};

function clean(value?: string | null, maxLength = 600) {
  return value?.trim().replace(/[<>]/g, "").slice(0, maxLength) ?? "";
}

function unique(items: Array<string | null | undefined>, limit: number) {
  return Array.from(new Set(items.map((item) => clean(item, 260)).filter(Boolean))).slice(0, limit);
}

export function signalPreparationMode(signal: CommercialSignal): SignalPreparationMode {
  if (signal.analysisStatus !== "completed") return "not_prepared";
  return signal.analysisMode === "ai" ? "ai" : "local_fallback";
}

export function buildSignalPreparation(signal: CommercialSignal): SignalPreparation {
  const mode = signalPreparationMode(signal);
  const draft = parseRecoveryDraft(signal.reviewedDraft);
  const affectedRecord = signal.detectedFromOpportunityId
    ? "Oportunitate existentă și următoarea acțiune internă"
    : signal.matchedOrganizationId
      ? "Companie CRM și oportunitate propusă"
      : "Oportunitate nouă, după confirmarea companiei";
  const missingInfo = unique(signal.missingInformation, 8);
  const evidence = unique([
    signal.deadlineClue,
    signal.valueClue,
    ...(signal.contextHints ?? []),
    ...(signal.detectionReasons ?? []),
    clean(signal.rawMessage || signal.extractedSummary, 220)
  ], 6);
  const risks = unique([
    ...(signal.riskNotes ?? []),
    ...(signal.uncertaintyNotes ?? []),
    signal.duplicateRisk ? "Există un posibil semnal duplicat care trebuie verificat." : null
  ], 6);
  const confidence = signal.confidenceLevel === "high" ? "ridicată" : signal.confidenceLevel === "medium" ? "medie" : "redusă";

  return {
    mode,
    modeLabel: mode === "ai" ? "AI" : mode === "local_fallback" ? "Fallback local · reguli locale" : "Nepregătit",
    summary: clean(signal.analysisExplanation || signal.extractedSummary || signal.rawMessage, 900) || "Semnalul nu are încă un rezumat pregătit.",
    intent: clean(signal.signalTypeLabel || signal.detectedCommercialIntent, 300) || "Intenție de clarificat",
    confidence,
    affectedRecord,
    missingInfo,
    recommendedNextAction: clean(signal.recommendedAction, 500) || "Confirmă contextul și stabilește următorul pas intern.",
    suggestedOpportunityTitle: clean(signal.title, 240),
    suggestedActionTitle: clean(signal.recommendedAction, 240) || "Clarifică următorul pas comercial",
    suggestedActionDueHint: signal.suggestedDueDate || "Termen de confirmat",
    internalNote: clean(signal.relationshipContext || signal.primaryRecoveryReason, 700) || "Contextul trebuie verificat înainte de aprobare.",
    emailDraft: clean(draft.body, 1800),
    evidence,
    risks,
    approvalRecommendation: missingInfo.length > 2 || signal.confidenceLevel === "low"
      ? "Completează informațiile lipsă înainte de aprobare."
      : "Poate fi trimis spre aprobare după verificarea contextului și a termenului."
  };
}
