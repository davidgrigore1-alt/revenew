export type ReveNewExplanationFact = {
  label: string;
  value?: string;
};

export type ReveNewDerivedInsight = {
  label: string;
  detail?: string;
};

export type ReveNewExplanationEvidence = {
  id: string;
  sourceTypeLabel: string;
  label: string;
  href?: string;
  occurredAt?: string | null;
  businessId?: string;
};

export type ReveNewValueProvenance = {
  kind: "estimated_unconfirmed" | "explicit_source" | "confirmed";
  amount: number;
  currency: string;
  sourceLabel: string;
  sourceHref?: string;
};

export type ReveNewExplanation = {
  headline: string;
  reason: string;
  facts: ReveNewExplanationFact[];
  derivedInsights: ReveNewDerivedInsight[];
  evidence: ReveNewExplanationEvidence[];
  hiddenEvidenceCount: number;
  missingInformation: string[];
  assumptions: string[];
  valueProvenance?: ReveNewValueProvenance;
  safeAction?: { label: string; href: string; guidance?: string };
};

export type ReveNewExplanationInput = Omit<ReveNewExplanation, "evidence" | "hiddenEvidenceCount"> & {
  evidence?: ReveNewExplanationEvidence[];
  authorizedBusinessId?: string;
  evidenceLimit?: number;
};

function safeInternalHref(href?: string) {
  if (!href) return undefined;
  return (href.startsWith("/") && !href.startsWith("//")) || href.startsWith("#") ? href : undefined;
}

function boundedUnique(values: string[], limit: number) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit);
}

/**
 * Normalizes already-authorized domain intelligence for a single shared UI.
 * Source text remains inert data: it cannot alter value kind, actions or access scope.
 */
export function buildReveNewExplanation(input: ReveNewExplanationInput): ReveNewExplanation {
  const evidenceLimit = Math.max(1, Math.min(input.evidenceLimit ?? 5, 5));
  const authorizedEvidence = (input.evidence ?? []).filter((item) =>
    !input.authorizedBusinessId || !item.businessId || item.businessId === input.authorizedBusinessId
  );
  const uniqueEvidence = new Map<string, ReveNewExplanationEvidence>();
  for (const item of authorizedEvidence) {
    const normalized = { ...item, href: safeInternalHref(item.href) };
    const key = `${normalized.id}:${normalized.sourceTypeLabel}:${normalized.href ?? ""}`;
    if (!uniqueEvidence.has(key)) uniqueEvidence.set(key, normalized);
  }
  const allEvidence = Array.from(uniqueEvidence.values());
  const safeActionHref = safeInternalHref(input.safeAction?.href);
  const sourceHref = safeInternalHref(input.valueProvenance?.sourceHref);

  return {
    headline: input.headline.trim(),
    reason: input.reason.trim(),
    facts: input.facts.filter((item) => item.label.trim()).slice(0, 4),
    derivedInsights: input.derivedInsights.filter((item) => item.label.trim()).slice(0, 4),
    evidence: allEvidence.slice(0, evidenceLimit),
    hiddenEvidenceCount: Math.max(0, allEvidence.length - evidenceLimit),
    missingInformation: boundedUnique(input.missingInformation, 4),
    assumptions: boundedUnique(input.assumptions, 3),
    ...(input.valueProvenance ? { valueProvenance: { ...input.valueProvenance, ...(sourceHref ? { sourceHref } : { sourceHref: undefined }) } } : {}),
    ...(input.safeAction && safeActionHref ? { safeAction: { ...input.safeAction, href: safeActionHref } } : {})
  };
}

export function estimatedValueProvenance(input: { amount?: number | null; currency?: string | null; sourceLabel: string; sourceHref?: string }): ReveNewValueProvenance | undefined {
  if (!input.amount || input.amount <= 0 || !input.currency) return undefined;
  return { kind: "estimated_unconfirmed", amount: input.amount, currency: input.currency, sourceLabel: input.sourceLabel, sourceHref: input.sourceHref };
}

export function explicitSourceValueProvenance(input: { amount?: number | null; currency?: string | null; sourceLabel: string; sourceHref?: string }): ReveNewValueProvenance | undefined {
  if (!input.amount || input.amount <= 0 || !input.currency) return undefined;
  return { kind: "explicit_source", amount: input.amount, currency: input.currency, sourceLabel: input.sourceLabel, sourceHref: input.sourceHref };
}
