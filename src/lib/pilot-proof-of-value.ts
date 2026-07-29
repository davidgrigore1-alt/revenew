import "server-only";

import { getRevenueRecoveryAudit, type RevenueRecoveryAudit } from "@/lib/revenue-recovery-audit";
import { getRevenueWorkspaceSummary } from "@/lib/revenue-workspace";
import type { RecoverySummary } from "@/lib/recovery";
import type { CommercialSignal, Opportunity } from "@/lib/types";

export type PilotProofRecommendation = "continue" | "adjust" | "stop";

export type PilotProofEvidence = {
  id: string;
  label: string;
  context: string;
  href: string;
  occurredAt?: string;
};

export type PilotProofOfValue = {
  generatedAt: string;
  workspaceName: string;
  recommendation: PilotProofRecommendation;
  recommendationLabel: "Continuă cadența operațională lunară" | "Ajustează domeniul pilotului" | "Oprește / dovezi insuficiente";
  executiveConclusion: string;
  recommendationBasis: string[];
  baselineNote: "Aceasta este o linie de bază operațională a stării curente, nu o măsurare istorică înainte/după.";
  startingBaseline: {
    blockedOpportunities: number;
    missingOwners: number;
    missingNextActions: number;
    overdueFollowUps: number;
    pendingApprovals: number;
    unresolvedSignals: number;
  };
  progressSignals: Array<{
    id: string;
    label: string;
    count: number;
    interpretation: string;
  }>;
  remainingBlockers: RevenueRecoveryAudit["priorities"];
  remainingBlockerCounts: {
    missingPrimaryContacts: number;
    preparedWorkNotAdvanced: number;
    opportunitiesWithoutConfirmedOutcome: number;
    prioritiesWithoutEvidence: number;
  };
  estimatedPipelineValueByCurrency: Array<{ currency: string; value: number }>;
  estimatedExposedValueByCurrency: RevenueRecoveryAudit["estimatedExposedValueByCurrency"];
  confirmedRevenueByCurrency: Array<{ currency: string; value: number }>;
  confirmedOutcomeCount: number;
  evidence: PilotProofEvidence[];
  firstSafeActionLabel: string;
  firstSafeActionHref: string;
  monthlyCadence: string[];
  commercialClose: string;
  disclaimer: string;
};

type BuildPilotProofInput = {
  audit: RevenueRecoveryAudit;
  summary: RecoverySummary;
};

function isActiveOpportunity(opportunity: Opportunity) {
  if (opportunity.lifecycleStatus) return opportunity.lifecycleStatus === "open";
  return !["won", "lost", "ignored"].includes(opportunity.status);
}

function isUserDeclaredOutcome(opportunity: Opportunity) {
  const terminal = opportunity.lifecycleStatus
    ? ["won", "lost"].includes(opportunity.lifecycleStatus)
    : ["won", "lost"].includes(opportunity.status);
  return terminal && Boolean(opportunity.outcomeRecordedAt && opportunity.outcomeRecordedByProfileId);
}

function valuesByCurrency(
  opportunities: Opportunity[],
  valueFor: (opportunity: Opportunity) => number
) {
  const totals = new Map<string, number>();
  for (const opportunity of opportunities) {
    const value = valueFor(opportunity);
    if (!Number.isFinite(value) || value <= 0) continue;
    const currency = opportunity.currency ?? "RON";
    totals.set(currency, (totals.get(currency) ?? 0) + value);
  }
  return Array.from(totals, ([currency, value]) => ({ currency, value }))
    .sort((left, right) => left.currency.localeCompare(right.currency));
}

function reviewedSignal(signal: CommercialSignal) {
  return Boolean(signal.reviewedAt)
    && ["approved", "converted", "dismissed", "duplicate"].includes(signal.reviewStatus);
}

function buildEvidence(
  audit: RevenueRecoveryAudit,
  summary: RecoverySummary,
  completedActions: RecoverySummary["actions"],
  declaredOutcomes: Opportunity[],
  preparedDocuments: Array<{ opportunity: Opportunity; documentId: string; title: string; occurredAt?: string }>,
  reviewedSignals: CommercialSignal[]
) {
  const evidence: PilotProofEvidence[] = [];
  const seen = new Set<string>();
  const add = (item: PilotProofEvidence) => {
    const key = `${item.id}:${item.href}`;
    if (seen.has(key) || evidence.length >= 12) return;
    seen.add(key);
    evidence.push(item);
  };

  for (const action of completedActions.slice(0, 3)) {
    if (!action.opportunityId) continue;
    add({
      id: `action:${action.id}`,
      label: action.title,
      context: `Acțiune finalizată · ${action.opportunityTitle}`,
      href: `/opportunities/${action.opportunityId}#workflow`,
      occurredAt: action.completedAt
    });
  }
  for (const opportunity of declaredOutcomes.slice(0, 3)) {
    add({
      id: `outcome:${opportunity.id}`,
      label: opportunity.title,
      context: `Rezultat declarat de utilizator · ${opportunity.lifecycleStatus === "won" || opportunity.status === "won" ? "câștigat" : "pierdut"}`,
      href: `/opportunities/${opportunity.id}#outcome`,
      occurredAt: opportunity.outcomeRecordedAt ?? undefined
    });
  }
  for (const item of preparedDocuments.slice(0, 2)) {
    add({
      id: `document:${item.documentId}`,
      label: item.title,
      context: `Document pregătit pentru revizuire · ${item.opportunity.title}`,
      href: `/opportunities/${item.opportunity.id}#documents`,
      occurredAt: item.occurredAt
    });
  }
  for (const signal of reviewedSignals.slice(0, 2)) {
    add({
      id: `signal:${signal.id}`,
      label: signal.title,
      context: signal.status === "converted" ? "Semnal revizuit și convertit" : "Semnal revizuit de utilizator",
      href: `/inbox?signal=${signal.id}`,
      occurredAt: signal.reviewedAt ?? undefined
    });
  }
  for (const source of audit.evidence) {
    add({
      id: `${source.sourceType}:${source.sourceId}`,
      label: source.label,
      context: "Dovadă pentru o buclă comercială încă deschisă",
      href: source.href,
      occurredAt: source.sourceTimestamp ?? undefined
    });
  }
  return evidence;
}

function recommendationFor(input: {
  sourceState: RevenueRecoveryAudit["sourceState"];
  progressCategoryCount: number;
  openBlockerCount: number;
  evidenceCount: number;
}) {
  if (input.sourceState === "empty_workspace" || input.evidenceCount === 0) {
    return {
      recommendation: "stop" as const,
      recommendationLabel: "Oprește / dovezi insuficiente" as const,
      executiveConclusion: "Datele disponibile nu susțin încă o decizie de continuare. Opriți evaluarea sau completați o bază minimă verificabilă înainte de o nouă analiză."
    };
  }
  if (input.progressCategoryCount >= 2 && input.openBlockerCount > 0) {
    return {
      recommendation: "continue" as const,
      recommendationLabel: "Continuă cadența operațională lunară" as const,
      executiveConclusion: "Spațiul de lucru conține progres operațional documentat și bucle comerciale care necesită în continuare revizuire. O cadență lunară este justificată pentru vizibilitate recurentă, nu ca promisiune de venit."
    };
  }
  return {
    recommendation: "adjust" as const,
    recommendationLabel: "Ajustează domeniul pilotului" as const,
    executiveConclusion: "Există dovezi utile, dar nu suficiente pentru a susține domeniul actual ca rutină lunară. Restrângeți evaluarea la cazurile verificabile și clarificați datele sau responsabilitatea."
  };
}

export function buildPilotProofOfValue({ audit, summary }: BuildPilotProofInput): PilotProofOfValue {
  const activeOpportunities = summary.opportunities.filter(isActiveOpportunity);
  const completedActions = summary.actions.filter((action) => action.status === "done" && Boolean(action.completedAt));
  const declaredOutcomes = summary.opportunities.filter(isUserDeclaredOutcome);
  const wonDeclaredOutcomes = declaredOutcomes.filter((opportunity) =>
    opportunity.lifecycleStatus === "won" || opportunity.status === "won"
  );
  const reviewedSignals = summary.signals.filter(reviewedSignal);
  const convertedSignals = reviewedSignals.filter((signal) => signal.status === "converted");
  const preparedDocuments = summary.opportunities.flatMap((opportunity) =>
    opportunity.documents
      .filter((document) => ["edited", "copied", "ready_to_send", "approved"].includes(document.status))
      .map((document) => ({
        opportunity,
        documentId: document.id,
        title: document.title,
        occurredAt: document.readyAt ?? document.editedAt ?? document.createdAt
      }))
  );
  const opportunitiesWithNextAction = activeOpportunities.filter((opportunity) =>
    opportunity.actions.some((action) => action.status === "pending" && Boolean(action.dueDate))
  );
  const opportunitiesWithOwner = activeOpportunities.filter((opportunity) => Boolean(opportunity.ownerProfileId));
  const blockedOpportunityIds = new Set(
    audit.priorities.map((priority) => priority.relatedOpportunityId).filter((id): id is string => Boolean(id))
  );
  const evidence = buildEvidence(
    audit,
    summary,
    completedActions,
    declaredOutcomes,
    preparedDocuments,
    reviewedSignals
  );
  const progressSignals = [
    {
      id: "completed-actions",
      label: "Acțiuni finalizate",
      count: completedActions.length,
      interpretation: "Acțiuni marcate finalizate în datele existente."
    },
    {
      id: "declared-outcomes",
      label: "Rezultate declarate",
      count: declaredOutcomes.length,
      interpretation: "Rezultate câștigate sau pierdute declarate de utilizatori."
    },
    {
      id: "reviewed-approvals",
      label: "Semnale și aprobări revizuite",
      count: reviewedSignals.length,
      interpretation: "Decizii de revizuire înregistrate explicit."
    },
    {
      id: "prepared-documents",
      label: "Documente pregătite pentru revizuire",
      count: preparedDocuments.length,
      interpretation: "Documente pregătite; nu sunt considerate trimise."
    },
    {
      id: "next-actions",
      label: "Oportunități cu acțiune următoare",
      count: opportunitiesWithNextAction.length,
      interpretation: "Cazuri active cu pas și termen urmărite."
    },
    {
      id: "assigned-opportunities",
      label: "Oportunități cu responsabil",
      count: opportunitiesWithOwner.length,
      interpretation: "Cazuri active cu responsabil înregistrat."
    },
    {
      id: "converted-signals",
      label: "Semnale convertite",
      count: convertedSignals.length,
      interpretation: "Semnale transformate printr-o decizie umană."
    }
  ];
  const progressCategoryCount = progressSignals.filter((signal) => signal.count > 0).length;
  const openBlockerCount = audit.priorities.length;
  const recommendation = recommendationFor({
    sourceState: audit.sourceState,
    progressCategoryCount,
    openBlockerCount,
    evidenceCount: evidence.length
  });
  const recommendationBasis = [
    progressCategoryCount > 0
      ? `${progressCategoryCount} categorii de progres sunt susținute de înregistrări existente.`
      : "Nu există încă semnale de progres înregistrate.",
    openBlockerCount > 0
      ? `${openBlockerCount} priorități rămân deschise și necesită decizie umană.`
      : "Nu există priorități deschise dovedite în starea curentă.",
    declaredOutcomes.length > 0
      ? `${declaredOutcomes.length} rezultate sunt declarate explicit de utilizatori.`
      : "Nu există încă rezultate declarate de utilizatori."
  ];

  return {
    generatedAt: audit.generatedAt,
    workspaceName: audit.workspaceName,
    ...recommendation,
    recommendationBasis,
    baselineNote: "Aceasta este o linie de bază operațională a stării curente, nu o măsurare istorică înainte/după.",
    startingBaseline: {
      blockedOpportunities: blockedOpportunityIds.size,
      missingOwners: audit.counts.missingOwners,
      missingNextActions: audit.counts.missingNextActions,
      overdueFollowUps: audit.counts.overdueFollowUps,
      pendingApprovals: audit.counts.pendingApprovals,
      unresolvedSignals: audit.counts.unresolvedSignals
    },
    progressSignals,
    remainingBlockers: audit.priorities.slice(0, 5),
    remainingBlockerCounts: {
      missingPrimaryContacts: audit.counts.missingPrimaryContacts,
      preparedWorkNotAdvanced: audit.counts.preparedWorkNotAdvanced,
      opportunitiesWithoutConfirmedOutcome: activeOpportunities.filter((opportunity) => !isUserDeclaredOutcome(opportunity)).length,
      prioritiesWithoutEvidence: audit.priorities.filter((priority) => priority.evidence.length === 0).length
    },
    estimatedPipelineValueByCurrency: valuesByCurrency(activeOpportunities, (opportunity) => opportunity.estimatedValueHigh),
    estimatedExposedValueByCurrency: audit.estimatedExposedValueByCurrency,
    confirmedRevenueByCurrency: valuesByCurrency(wonDeclaredOutcomes, (opportunity) => Number(opportunity.actualOutcomeAmount ?? 0)),
    confirmedOutcomeCount: declaredOutcomes.length,
    evidence,
    firstSafeActionLabel: audit.firstSafeActionLabel,
    firstSafeActionHref: audit.firstSafeActionHref,
    monthlyCadence: [
      "Revizuiește săptămânal brief-ul executiv și principalele riscuri.",
      "Verifică oportunitățile blocate și responsabilul fiecăreia.",
      "Confirmă acțiunile următoare și termenele.",
      "Revizuiește și aprobă numai acțiunile sigure.",
      "Înregistrează rezultatele declarate de utilizatori.",
      "Generează următorul raport operațional pe aceleași definiții."
    ],
    commercialClose: "Pas recomandat: continuă cu o cadență operațională lunară dacă echipa dorește vizibilitate recurentă asupra oportunităților blocate, responsabilității, disciplinei de follow-up și rezultatelor confirmate.",
    disclaimer: "Raportul descrie starea curentă pe baza datelor disponibile. Nu atribuie progresul pilotului, nu reprezintă venit contabil, nu garantează recuperarea și nu estimează ROI. Venitul confirmat este afișat numai pentru un rezultat câștigat declarat explicit de un utilizator."
  };
}

export async function getPilotProofOfValue() {
  const [audit, summary] = await Promise.all([
    getRevenueRecoveryAudit(),
    getRevenueWorkspaceSummary()
  ]);
  return buildPilotProofOfValue({ audit, summary });
}
