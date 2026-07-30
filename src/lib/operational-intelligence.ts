import "server-only";

import type {
  WorkspaceDecisionItem,
  WorkspaceDecisionQueue,
  WorkspaceDecisionSeverity,
  WorkspaceDecisionType
} from "@/lib/workspace-decision-queue";

export type OperationalIntelligenceRecommendation = {
  id: string;
  title: string;
  typeLabel: string;
  severity: WorkspaceDecisionSeverity;
  whyItMatters: string;
  evidenceLabel: string;
  evidenceHref: string;
  evidenceCount: number;
  uncertainty: string;
  controlNote: string;
  actionLabel: string;
  actionHref: string;
  estimatedValue?: number;
  currency?: string;
  companyName?: string;
  opportunityTitle?: string;
};

export type OperationalIntelligenceCenter = {
  state: "unavailable" | "insufficient_data" | "monitoring" | "attention" | "critical";
  stateLabel: string;
  headline: string;
  observation: string;
  decisionTitle: string;
  evidenceLabel: string;
  evidenceHref: string | null;
  safeActionLabel: string;
  safeActionHref: string;
  totalCandidates: number;
  evidenceCount: number;
  criticalCount: number;
  attentionCount: number;
  estimatedExposedValueByCurrency: Array<{ currency: string; value: number }>;
  recommendations: OperationalIntelligenceRecommendation[];
};

export function unavailableOperationalIntelligence(): OperationalIntelligenceCenter {
  return {
    state: "unavailable",
    stateLabel: "Date indisponibile",
    headline: "Inteligența operațională nu poate fi încărcată momentan.",
    observation: "ReveNew nu formulează recomandări atunci când datele nu pot fi verificate.",
    decisionTitle: "Reia analiza după restabilirea accesului la date",
    evidenceLabel: "Nicio dovadă nu este presupusă",
    evidenceHref: null,
    safeActionLabel: "Revino la Control Center",
    safeActionHref: "/dashboard",
    totalCandidates: 0,
    evidenceCount: 0,
    criticalCount: 0,
    attentionCount: 0,
    estimatedExposedValueByCurrency: [],
    recommendations: []
  };
}

const typeLabels: Record<WorkspaceDecisionType, string> = {
  overdue_follow_up: "Follow-up întârziat",
  pending_approval: "Aprobare umană",
  prepared_work_not_advanced: "Execuție nefinalizată",
  unresolved_signal: "Semnal comercial",
  opportunity_without_next_action: "Acțiune lipsă",
  opportunity_without_owner: "Responsabil lipsă",
  company_without_primary_contact: "Contact principal lipsă",
  inactive_active_opportunity: "Oportunitate inactivă",
  high_value_blocked_opportunity: "Valoare estimată expusă"
};

function recommendationFor(item: WorkspaceDecisionItem): OperationalIntelligenceRecommendation {
  const primaryEvidence = item.evidence[0];
  const evidenceCount = item.evidence.length;

  return {
    id: item.id,
    title: item.title,
    typeLabel: typeLabels[item.type],
    severity: item.severity,
    whyItMatters: item.whyItMatters,
    evidenceLabel: primaryEvidence?.label ?? "Dovezi insuficiente pentru această recomandare",
    evidenceHref: primaryEvidence?.href ?? item.actionHref,
    evidenceCount,
    uncertainty: evidenceCount > 0
      ? `Prioritizare deterministă bazată pe ${evidenceCount === 1 ? "o dovadă existentă" : `${evidenceCount} dovezi existente`}; contextul trebuie verificat de o persoană.`
      : "Recomandarea nu trebuie aplicată înainte de completarea și verificarea dovezilor.",
    controlNote: "ReveNew recomandă; o persoană verifică și aprobă orice pas cu impact comercial.",
    actionLabel: item.actionLabel,
    actionHref: item.actionHref,
    ...(item.estimatedValue && item.currency ? { estimatedValue: item.estimatedValue, currency: item.currency } : {}),
    ...(item.relatedCompanyName ? { companyName: item.relatedCompanyName } : {}),
    ...(item.relatedOpportunityTitle ? { opportunityTitle: item.relatedOpportunityTitle } : {})
  };
}

export function buildOperationalIntelligenceCenter(
  queue: WorkspaceDecisionQueue
): OperationalIntelligenceCenter {
  const recommendations = queue.items.slice(0, 3).map(recommendationFor);
  const primary = recommendations[0] ?? null;
  const evidenceCount = recommendations.reduce((total, recommendation) => total + recommendation.evidenceCount, 0);
  const estimatedExposedValueByCurrency = Object.entries(queue.estimatedExposedValueByCurrency)
    .filter(([, value]) => Number.isFinite(value) && value > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, value]) => ({ currency, value }));

  if (!primary) {
    const insufficientData = queue.sourceState === "empty_workspace";
    return {
      state: insufficientData ? "insufficient_data" : "monitoring",
      stateLabel: insufficientData ? "Date insuficiente" : "Monitorizare",
      headline: insufficientData
        ? "Nu există încă suficiente date pentru o recomandare verificabilă."
        : "Nu există o decizie comercială prioritară în datele disponibile.",
      observation: insufficientData
        ? "Adaugă un semnal sau o oportunitate reală pentru ca ReveNew să poată ordona riscurile și acțiunile sigure."
        : "ReveNew continuă să urmărească termenele, responsabilitatea, aprobările și dovezile existente.",
      decisionTitle: insufficientData ? "Completează baza minimă de analiză" : "Continuă monitorizarea operațională",
      evidenceLabel: insufficientData ? "Nu există dovezi disponibile" : "Nu există un blocaj dovedit acum",
      evidenceHref: null,
      safeActionLabel: insufficientData ? "Adaugă primul semnal" : "Verifică recuperarea veniturilor",
      safeActionHref: insufficientData ? "/inbox?create=1" : "/recoverable",
      totalCandidates: queue.totalCandidates,
      evidenceCount: 0,
      criticalCount: queue.criticalCount,
      attentionCount: queue.attentionCount,
      estimatedExposedValueByCurrency,
      recommendations: []
    };
  }

  const state = queue.criticalCount > 0 ? "critical" : "attention";
  return {
    state,
    stateLabel: state === "critical" ? "Intervenție necesară" : "Revizuire necesară",
    headline: `ReveNew a identificat ${queue.totalCandidates === 1 ? "o decizie comercială" : `${queue.totalCandidates} decizii comerciale`} care necesită verificare umană.`,
    observation: primary.whyItMatters,
    decisionTitle: primary.title,
    evidenceLabel: primary.evidenceLabel,
    evidenceHref: primary.evidenceHref,
    safeActionLabel: primary.actionLabel,
    safeActionHref: primary.actionHref,
    totalCandidates: queue.totalCandidates,
    evidenceCount,
    criticalCount: queue.criticalCount,
    attentionCount: queue.attentionCount,
    estimatedExposedValueByCurrency,
    recommendations
  };
}
