import type { CommercialOpportunityDiscoveryCandidate } from "@/lib/commercial-opportunity-discovery";
import type { CompanyMemoryItem } from "@/lib/company-intelligence";
import type { ExecutiveBriefPriority } from "@/lib/executive-morning-brief";
import type { OperationalIntelligenceRecommendation } from "@/lib/operational-intelligence";
import type { OpportunityTimelineEvent } from "@/lib/opportunity-intelligence-timeline";
import {
  buildReveNewExplanation,
  estimatedValueProvenance,
  explicitSourceValueProvenance,
  type ReveNewExplanation
} from "@/lib/revenew-explanation";

const briefSourceLabels: Record<string, string> = {
  opportunity: "Oportunitate comercială",
  opportunity_action: "Acțiune comercială",
  opportunity_document: "Document comercial",
  commercial_signal: "Semnal comercial",
  approval: "Aprobare umană"
};

function missingInformationForExecutivePriority(priority: ExecutiveBriefPriority) {
  const context = [priority.title, priority.reason, ...priority.supportingFacts].join(" ");
  const missing: string[] = [];
  if (/responsabil|neatribuit/i.test(context)) missing.push("Responsabilul comercial nu este confirmat.");
  if (/fără acțiune|acțiune lipsă|următorul pas nu/i.test(context)) missing.push("Acțiunea următoare și termenul nu sunt confirmate.");
  if (/contact principal/i.test(context)) missing.push("Contactul principal nu este confirmat.");
  if (priority.kind === "decision" && /aprobare|decizie/i.test(context)) missing.push("Decizia de aprobare nu este încă înregistrată.");
  if (priority.evidence.length === 0) missing.push("Dovada directă nu este încă disponibilă.");
  if (!priority.company && !priority.opportunity && priority.kind !== "decision") missing.push("Contextul comercial complet nu este confirmat.");
  return missing;
}

export function explanationForExecutivePriority(priority: ExecutiveBriefPriority): ReveNewExplanation {
  const sourceHref = priority.evidence[0]?.href ?? priority.safeAction.href;
  return buildReveNewExplanation({
    headline: priority.title,
    reason: priority.reason,
    facts: priority.evidence.map((item) => ({ label: item.label, ...(item.sourceTimestamp ? { value: "Înregistrare datată" } : {}) })),
    derivedInsights: [
      { label: priority.whyItMatters },
      ...priority.supportingFacts.map((label) => ({ label }))
    ],
    evidence: priority.evidence.map((item) => ({
      id: item.sourceId,
      sourceTypeLabel: briefSourceLabels[item.sourceType] ?? "Înregistrare comercială",
      label: item.label,
      href: item.href,
      occurredAt: item.sourceTimestamp
    })),
    missingInformation: missingInformationForExecutivePriority(priority),
    assumptions: priority.derivedReasonAssumption ? [priority.derivedReasonAssumption] : [],
    valueProvenance: estimatedValueProvenance({ amount: priority.amount, currency: priority.currency, sourceLabel: priority.opportunity ? `Oportunitatea „${priority.opportunity}”` : "Oportunitate comercială", sourceHref }),
    safeAction: { label: priority.safeAction.label, href: priority.safeAction.href, guidance: "Revizuiește faptele înainte de orice acțiune externă." }
  });
}

export function explanationForRecommendation(recommendation: OperationalIntelligenceRecommendation): ReveNewExplanation {
  return buildReveNewExplanation({
    headline: recommendation.title,
    reason: recommendation.whyNow,
    facts: recommendation.trace.knownFacts.map((label) => ({ label })),
    derivedInsights: [
      { label: recommendation.whyItMatters },
      { label: recommendation.consequenceOfInaction, detail: "Consecință operațională dacă elementul rămâne nerezolvat." }
    ],
    evidence: recommendation.evidence.map((item, index) => ({ id: `${recommendation.id}:${index}`, sourceTypeLabel: item.sourceTypeLabel, label: item.label, href: item.href, occurredAt: item.observedAt })),
    missingInformation: recommendation.missingInformation,
    assumptions: recommendation.assumptions,
    valueProvenance: estimatedValueProvenance({ amount: recommendation.estimatedValue, currency: recommendation.currency, sourceLabel: recommendation.opportunityTitle ? `Oportunitatea „${recommendation.opportunityTitle}”` : "Oportunitate comercială", sourceHref: recommendation.evidenceHref }),
    safeAction: { ...recommendation.safeNextAction, guidance: recommendation.trace.humanDecision }
  });
}

export function explanationForDiscovery(candidate: CommercialOpportunityDiscoveryCandidate): ReveNewExplanation {
  return buildReveNewExplanation({
    headline: candidate.sourceTitle,
    reason: candidate.reason,
    facts: candidate.evidence.filter((item) => item.sourceType !== "classification" && item.sourceType !== "tracking_state").map((item) => ({ label: item.label })),
    derivedInsights: [
      { label: candidate.whyItMatters },
      ...candidate.evidence.filter((item) => item.sourceType === "classification" || item.sourceType === "tracking_state").map((item) => ({ label: item.label }))
    ],
    evidence: candidate.evidence.map((item) => ({ id: `${item.sourceType}:${item.sourceId}`, sourceTypeLabel: item.sourceType === "commercial_signal" ? "Semnal comercial" : item.sourceType === "value_clue" ? "Valoare în sursă" : "Context verificabil", label: item.label, href: candidate.sourceHref, occurredAt: item.occurredAt })),
    missingInformation: candidate.missingInformation,
    assumptions: candidate.possibleExistingOpportunities.length > 0 ? ["Potrivirea indică doar context comun; o persoană confirmă dacă este aceeași oportunitate."] : [],
    valueProvenance: explicitSourceValueProvenance({ amount: candidate.explicitAmount, currency: candidate.currency, sourceLabel: candidate.sourceTitle, sourceHref: candidate.sourceHref }),
    safeAction: { label: "Revizuiește semnalul", href: candidate.reviewHref, guidance: candidate.safeNextAction }
  });
}

export function explanationForTimelineEvent(event: OpportunityTimelineEvent): ReveNewExplanation | undefined {
  if (event.nature !== "derived") return undefined;
  return buildReveNewExplanation({
    headline: event.title,
    reason: event.summary,
    facts: event.evidence.map((label) => ({ label })),
    derivedInsights: [{ label: event.title, detail: event.summary }],
    evidence: [{ id: event.source.id, sourceTypeLabel: event.source.label, label: event.source.label, href: event.source.href, occurredAt: event.occurredAt }],
    missingInformation: event.type === "missing_next_action" ? ["Acțiunea următoare și termenul nu sunt confirmate."] : [],
    assumptions: event.type === "inactivity_gap" ? ["Calculul folosește numai activitatea înregistrată în ReveNew."] : [],
    safeAction: event.source.href ? { label: event.type === "missing_next_action" ? "Completează următoarea acțiune" : "Verifică dovada", href: event.source.href, guidance: "Verifică înregistrările înainte de a decide pasul următor." } : undefined
  });
}

export function explanationForCompanyMemory(item: CompanyMemoryItem): ReveNewExplanation | undefined {
  if (item.type === "meaningful_activity") return undefined;
  const href = item.href ?? item.evidence.href;
  return buildReveNewExplanation({
    headline: item.title,
    reason: item.description,
    facts: [{ label: item.evidence.label, value: item.evidence.sourceTimestamp ? "Înregistrare datată" : "Dată neconfirmată" }],
    derivedInsights: item.whyItMatters ? [{ label: item.whyItMatters }] : [],
    evidence: [{ id: item.evidence.sourceId, sourceTypeLabel: "Dovadă comercială", label: item.evidence.label, href: item.evidence.href, occurredAt: item.evidence.sourceTimestamp }],
    missingInformation: /fără responsabil/i.test(item.title) ? ["Responsabilul comercial nu este confirmat."] : /contact principal/i.test(item.title) ? ["Contactul principal nu este confirmat."] : /fără acțiune/i.test(item.title) ? ["Acțiunea următoare și termenul nu sunt confirmate."] : [],
    assumptions: /activitate/i.test(item.title) ? ["Interpretarea folosește numai activitatea înregistrată în ReveNew."] : [],
    safeAction: href ? { label: item.actionLabel, href, guidance: "Verifică dovada înainte de a modifica relația comercială." } : undefined
  });
}
