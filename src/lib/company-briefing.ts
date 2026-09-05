import type { CompanyIntelligenceSnapshot } from "@/lib/company-intelligence";
import { isOpenOpportunity } from "@/lib/opportunity-domain";

export const companyRelationshipLabels: Record<string, string> = { prospect: "Prospect", customer: "Client", partner: "Partener", inactive: "Inactiv" };

/** These anchors live in the existing Flux tab, which is not the detail route's default. */
export function companySourceHref(href: string | undefined) {
  return href && /^\/opportunities\/[^/?#]+#(?:workflow-actions|documents|opportunity-documents)$/.test(href) ? href.replace("#", "?tab=workflow#") : href;
}

/** Presentation of the authorized snapshot; no new relationship or ownership inference. */
export function companyBriefing(snapshot: CompanyIntelligenceSnapshot) {
  const active = snapshot.opportunities.filter(isOpenOpportunity);
  const owners = Array.from(new Map(active.filter(item => item.ownerProfileId).map(item => [item.ownerProfileId!, { id: item.ownerProfileId!, name: item.ownerName, href: item.href }])).values());
  const unassigned = active.filter(item => !item.ownerProfileId).length;
  // Attention already covers the actionable gaps also projected into memory and knowledgeGaps.
  // Keep code AND source: an absent owner and an absent next step are different decisions.
  const pendingSignalApprovals = new Set(snapshot.attention.filter(item => item.code === "pending_approval").map(item => item.evidence.sourceId));
  // For the same signal, the pending approval is the concrete decision behind its generic alert.
  const absenceIssues = new Set(["missing_primary_contact", "missing_next_action", "inactive_company"]);
  const actionable = snapshot.attention.filter(item => !(snapshot.coverage?.atLimit && absenceIssues.has(item.code)) && (item.code !== "high_priority_signal" || !pendingSignalApprovals.has(item.evidence.sourceId)));
  const issues = Array.from(new Map(actionable.map(item => [`${item.code}:${item.evidence.sourceType}:${item.evidence.sourceId}`, item])).values());
  return {
    active, owners, unassigned, issues,
    relationship: companyRelationshipLabels[snapshot.organization.relationshipStatus ?? ""] ?? "Neclasificată",
    responsibility: snapshot.coverage?.responsibilityUnavailable ? "Identități indisponibile" : owners.length > 1 ? `${owners.length} responsabili în oportunitățile active` : owners[0]?.name ?? (owners.length ? "Identitate neconfirmată" : "Neatribuit"),
    contacts: [...snapshot.contacts].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.fullName.localeCompare(b.fullName, "ro"))
  };
}
