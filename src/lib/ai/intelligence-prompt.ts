import type { CopilotEvidence, CopilotRequest } from "./copilot-types";

/** Fit complete JSON inside even the provider's minimum 6000-character budget.
 * Short request-local aliases save output tokens; they never become stored IDs. */
export function buildIntelligencePrompt(request: CopilotRequest, evidence: CopilotEvidence[], limits: string[], repair: string | null = null) {
  const selected: CopilotEvidence[] = [];
  const identities = new Map<string, string>();
  const payload = {
    question: request.question.slice(0, 1600),
    analysis: request.analysisIntent?{operation:request.analysisIntent.operation,city:request.analysisIntent.city??null,currency:request.analysisIntent.currency??null,historical:request.analysisIntent.historical??false}:null,
    scope: { pageType: request.context.pageType, pinnedVersion: request.context.documentVersionId ?? null },
    evidence: selected,
    limitations: limits.slice(0, 4).map(limit => limit.slice(0, 200)),
    repair
  };
  const calculationOnly=request.analysisIntent&&["sum","top","missing","count"].includes(request.analysisIntent.operation)&&evidence.some(e=>e.provenance?.classification==="computed_result");
  const pool=calculationOnly?evidence.filter(e=>e.provenance?.classification==="computed_result"):evidence;
  for (const item of pool) {
    if (selected.length === 8) break;
    const alias = `E${selected.length + 1}`;
    const candidate: CopilotEvidence = { sourceId: alias, label: item.label.slice(0, 140), fact: item.fact.slice(0, 800), sourceType: item.sourceType, claimType: item.claimType, comparisonKind:item.comparisonKind, observedAt: item.observedAt, route: null };
    selected.push(candidate);
    if (JSON.stringify(payload).length > 5800) { selected.pop(); break; }
    identities.set(alias, item.sourceId);
  }
  return { text: JSON.stringify(payload), evidence: selected, identities };
}
