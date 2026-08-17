import { analyzeCommercialSignalIntelligence, type CommercialSignalIntent } from "@/lib/commercial-signal-intelligence";
import { isOpenOpportunity } from "@/lib/opportunity-domain";
import type { CommercialSignal, Opportunity } from "@/lib/types";

export type DiscoveryEvidenceStrength = "strong" | "partial" | "limited";
export type CommercialDiscoveryState = "ready" | "clean" | "insufficient_data";

export type CommercialDiscoveryEvidence = {
  sourceId: string;
  sourceType: "commercial_signal" | "classification" | "company_relation" | "value_clue" | "tracking_state";
  label: string;
  occurredAt: string | null;
};

export type PossibleExistingOpportunity = {
  id: string;
  title: string;
  href: string;
  reason: string;
};

export type CommercialOpportunityDiscoveryCandidate = {
  id: string;
  fingerprint: string;
  candidateType: "untracked_commercial_signal" | "possible_existing_match";
  sourceTitle: string;
  companyName: string | null;
  contactName: string | null;
  reason: string;
  whyItMatters: string;
  evidenceStrength: DiscoveryEvidenceStrength;
  evidence: CommercialDiscoveryEvidence[];
  missingInformation: string[];
  possibleExistingOpportunities: PossibleExistingOpportunity[];
  reviewPriority: "high" | "medium";
  occurredAt: string | null;
  explicitAmount?: number;
  currency?: string;
  amountLabel?: string;
  reviewHref: string;
  sourceHref: string;
  safeNextAction: string;
};

export type CommercialOpportunityDiscoveryResult = {
  state: CommercialDiscoveryState;
  candidates: CommercialOpportunityDiscoveryCandidate[];
  totalCandidates: number;
  strongEvidenceCount: number;
  explicitValueCount: number;
  inspectedSourceCount: number;
};

const qualifyingIntents = new Set<CommercialSignalIntent>([
  "quote_request",
  "follow_up",
  "renewal",
  "complaint_risk",
  "referral",
  "client_decision"
]);

const sourceLabels: Record<string, string> = {
  email: "Email",
  phone: "Notă telefonică",
  whatsapp: "Mesaj WhatsApp copiat",
  csv_import: "Import controlat",
  manual: "Notă manuală",
  referral: "Recomandare",
  website_form: "Formular website",
  missed_call: "Apel ratat",
  other: "Sursă comercială"
};

const intentReasons: Record<CommercialSignalIntent, string> = {
  quote_request: "Cerere de ofertă fără oportunitate asociată",
  follow_up: "Follow-up comercial fără oportunitate asociată",
  renewal: "Semnal de reînnoire fără oportunitate asociată",
  complaint_risk: "Semnal comercial cu risc, fără urmărire confirmată",
  referral: "Recomandare comercială fără oportunitate asociată",
  client_decision: "Decizie comercială fără oportunitate asociată",
  lost_reason: "Context privind o oportunitate pierdută",
  call_note: "Notă după apel de clarificat",
  internal_note: "Notă internă de clarificat",
  unknown: "Semnal comercial de clarificat"
};

function validDate(value?: string | null) {
  return value && !Number.isNaN(Date.parse(value)) ? value : null;
}

function ageInDays(value: string | null, now: Date) {
  return value ? Math.max(0, Math.floor((now.getTime() - Date.parse(value)) / 86_400_000)) : Number.POSITIVE_INFINITY;
}

function likelyMatches(signal: CommercialSignal, opportunities: Opportunity[]): PossibleExistingOpportunity[] {
  return opportunities
    .filter(isOpenOpportunity)
    .map((opportunity) => {
      const sameCompany = Boolean(signal.matchedOrganizationId && opportunity.organizationId === signal.matchedOrganizationId);
      const sameContact = Boolean(signal.matchedContactId && opportunity.contacts?.some((item) => item.contactId === signal.matchedContactId));
      if (!sameCompany && !sameContact) return null;
      return {
        id: opportunity.id,
        title: opportunity.title,
        href: `/opportunities/${opportunity.id}`,
        reason: sameContact ? "Același contact este asociat unei oportunități active." : "Aceeași companie are o oportunitate activă; contextul trebuie comparat de o persoană."
      };
    })
    .filter((item): item is PossibleExistingOpportunity => Boolean(item))
    .slice(0, 3);
}

function evidenceStrength(input: {
  signal: CommercialSignal;
  intent: CommercialSignalIntent;
  confidence: "low" | "medium" | "high";
  explicitAmount: boolean;
  occurredAt: string | null;
  now: Date;
}) {
  const knownCompany = Boolean(input.signal.matchedOrganizationId || input.signal.contactCompany);
  const enoughContext = [input.signal.title, input.signal.rawMessage, input.signal.extractedSummary].filter(Boolean).join(" ").length >= 35;
  const recent = ageInDays(input.occurredAt, input.now) <= 45;
  if (knownCompany && recent && (input.explicitAmount || input.confidence === "high") && input.intent !== "referral") return "strong" as const;
  if (knownCompany && recent && enoughContext && qualifyingIntents.has(input.intent)) return "partial" as const;
  return "limited" as const;
}

function sourceFingerprint(signal: CommercialSignal) {
  return `commercial-source:${signal.businessId}:${signal.ingestionFingerprint || signal.id}`;
}

export function discoverCommercialOpportunityCandidates(
  input: { signals: CommercialSignal[]; opportunities: Opportunity[] },
  options: { now?: Date; limit?: number } = {}
): CommercialOpportunityDiscoveryResult {
  const now = options.now ?? new Date();
  const limit = Math.max(1, Math.min(options.limit ?? 10, 10));
  const unique = new Map<string, CommercialOpportunityDiscoveryCandidate>();
  let qualifiedSourceCount = 0;
  let unlinkedQualifiedSourceCount = 0;

  for (const signal of input.signals) {
    const intelligence = analyzeCommercialSignalIntelligence(signal, { duplicateRisk: signal.duplicateRisk }, now);
    const qualifies = qualifyingIntents.has(intelligence.signalType);
    if (qualifies) qualifiedSourceCount += 1;

    const closed = ["approved", "reviewed", "converted", "dismissed", "duplicate", "ignored", "archived"].includes(signal.status)
      || ["approved", "converted", "dismissed", "duplicate"].includes(signal.reviewStatus);
    const linked = Boolean(signal.detectedFromOpportunityId || signal.convertedOpportunityId);
    if (!qualifies || closed || linked) continue;
    unlinkedQualifiedSourceCount += 1;

    const occurredAt = validDate(signal.occurredAt) ?? validDate(signal.lastInteractionAt) ?? validDate(signal.createdAt);
    const explicitValue = intelligence.valueClue?.kind === "explicit" && intelligence.valueClue.amount && intelligence.valueClue.currency
      ? { amount: intelligence.valueClue.amount, currency: intelligence.valueClue.currency, label: intelligence.valueClue.label }
      : null;
    const strength = evidenceStrength({ signal, intent: intelligence.signalType, confidence: intelligence.confidence, explicitAmount: Boolean(explicitValue), occurredAt, now });
    if (strength === "limited") continue;

    const matches = likelyMatches(signal, input.opportunities);
    const fingerprint = sourceFingerprint(signal);
    const reviewHref = `/inbox?signal=${encodeURIComponent(signal.id)}`;
    const evidence: CommercialDiscoveryEvidence[] = [
      { sourceId: signal.id, sourceType: "commercial_signal", label: `Sursă: ${signal.sourceLabel || sourceLabels[signal.source] || "Sursă comercială"}`, occurredAt },
      ...intelligence.detectionReasons.slice(0, 2).map((label) => ({ sourceId: signal.id, sourceType: "classification" as const, label, occurredAt })),
      ...(signal.matchedOrganizationId || signal.contactCompany ? [{ sourceId: signal.id, sourceType: "company_relation" as const, label: `Companie identificată: ${signal.contactCompany || "companie existentă în CRM"}`, occurredAt }] : []),
      ...(explicitValue ? [{ sourceId: signal.id, sourceType: "value_clue" as const, label: `${explicitValue.label}. Valoarea este menționată în sursă, nu este venit confirmat.`, occurredAt }] : []),
      { sourceId: signal.id, sourceType: "tracking_state", label: "Nu există o oportunitate asociată acestui semnal.", occurredAt }
    ];

    const candidate: CommercialOpportunityDiscoveryCandidate = {
      id: `commercial-discovery:${signal.id}`,
      fingerprint,
      candidateType: matches.length > 0 ? "possible_existing_match" : "untracked_commercial_signal",
      sourceTitle: signal.title,
      companyName: signal.contactCompany ?? null,
      contactName: signal.contactName ?? null,
      reason: matches.length > 0 ? `Posibil deja urmărit · ${intentReasons[intelligence.signalType]}` : intentReasons[intelligence.signalType],
      whyItMatters: matches.length > 0
        ? "Semnalul poate aparține unei oportunități active. Compararea previne dublarea și păstrează contextul corect."
        : "Semnalul conține intenție comercială verificabilă, dar nu este urmărit printr-o oportunitate confirmată.",
      evidenceStrength: strength,
      evidence,
      missingInformation: intelligence.missingInformation.slice(0, 5),
      possibleExistingOpportunities: matches,
      reviewPriority: strength === "strong" && ageInDays(occurredAt, now) <= 14 ? "high" : "medium",
      occurredAt,
      ...(explicitValue ? { explicitAmount: explicitValue.amount, currency: explicitValue.currency, amountLabel: explicitValue.label } : {}),
      reviewHref,
      sourceHref: reviewHref,
      safeNextAction: matches.length > 0 ? "Compară semnalul cu oportunitatea existentă înainte de asociere." : "Verifică sursa înainte de a pregăti oportunitatea."
    };
    if (!unique.has(fingerprint)) unique.set(fingerprint, candidate);
  }

  const strengthRank: Record<DiscoveryEvidenceStrength, number> = { strong: 3, partial: 2, limited: 1 };
  const candidates = Array.from(unique.values())
    .sort((left, right) => strengthRank[right.evidenceStrength] - strengthRank[left.evidenceStrength]
      || Number(right.explicitAmount !== undefined) - Number(left.explicitAmount !== undefined)
      || String(right.occurredAt ?? "").localeCompare(String(left.occurredAt ?? ""))
      || left.id.localeCompare(right.id));
  const visible = candidates.slice(0, limit);
  const state: CommercialDiscoveryState = candidates.length > 0
    ? "ready"
    : qualifiedSourceCount > 0 && unlinkedQualifiedSourceCount === 0
      ? "clean"
      : "insufficient_data";

  return {
    state,
    candidates: visible,
    totalCandidates: candidates.length,
    strongEvidenceCount: candidates.filter((item) => item.evidenceStrength === "strong").length,
    explicitValueCount: candidates.filter((item) => item.explicitAmount !== undefined).length,
    inspectedSourceCount: input.signals.length
  };
}
