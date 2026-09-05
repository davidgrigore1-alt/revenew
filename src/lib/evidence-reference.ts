export type EvidenceSource = "opportunity" | "action" | "document" | "event" | "signal" | "approval" | "contact" | "response" | "outcome" | "email" | "calendar";
type EvidenceMetadata = {
  sourceType: EvidenceSource;
  sourceId: string;
  title: string;
  occurredAt: string | null;
  supportingFact?: string;
  provider?: "gmail" | "google_calendar" | "google_drive";
  mimeType?: string;
  sourceDocumentId?: string;
  sourceSegmentId?: string;
  sourceLocation?: string;
  syncedAt?: string | null;
  sourceVersion?: string;
  commercialRelationship?: string;
  originalHref?: string;
  entityHref?: string;
};

/** Authorization belongs to the source loader. Metadata must never carry a body. */
export type EvidenceReference = EvidenceMetadata & (
  | { visibility: "metadata"; excerpt?: never }
  | { visibility: "authorized_content"; excerpt: string }
);

export const evidenceSourceLabels: Record<EvidenceSource, string> = {
  opportunity: "Oportunitate", action: "Acțiune", document: "Document", event: "Activitate",
  signal: "Semnal comercial", approval: "Aprobare", contact: "Contact",
  response: "Răspuns comercial", outcome: "Rezultat", email: "Gmail", calendar: "Google Calendar"
};

/** Only existing internal destinations; never render a provider-supplied URL. */
export function evidenceHref(href?: string): string | undefined {
  if (!href || !/^\/(?:opportunities|inbox|approvals|outreach|ai|crm)(?:[/?#]|$)/.test(href) || /[\\\s\u0000-\u001f]/.test(href)) return undefined;
  // Older canonical evidence carries section anchors. Those sections now live
  // behind explicit tabs; preserve the target instead of opening a hidden section.
  const section = href.match(/^(\/opportunities\/[^/?#]+)#([^?#]+)$/);
  const tabs: Record<string, { tab: string; anchor: string }> = {
    "workflow-actions-list": { tab: "workflow", anchor: "workflow-actions-list" },
    "workflow-actions": { tab: "workflow", anchor: "workflow-actions-list" },
    "opportunity-documents": { tab: "workflow", anchor: "opportunity-documents" },
    "opportunity-contacts": { tab: "workflow", anchor: "action-contacts" },
    "action-responsibility": { tab: "responsibility", anchor: "action-responsibility" },
    "action-schedule": { tab: "schedule", anchor: "action-schedule" },
    "commercial-response": { tab: "response", anchor: "action-response" },
    "action-outcome": { tab: "responsibility", anchor: "action-responsibility" }
  };
  const target = section && Object.hasOwn(tabs, section[2]) ? tabs[section[2]] : null;
  return target && section ? section[1] + "?tab=" + target.tab + "#" + target.anchor : href;
}

export function safeOriginalEvidenceHref(href?: string): string | undefined {
  if (!href) return undefined;
  try { const url = new URL(href); return url.protocol === "https:" && url.hostname === "drive.google.com" && !url.username && !url.password && !url.port && /^\/file\/d\/[A-Za-z0-9_-]+\/view$/.test(url.pathname) ? url.toString() : undefined; } catch { return undefined; }
}

export function metadataEvidence(input: EvidenceMetadata): EvidenceReference {
  // Explicit projection deliberately discards any extra body/token/raw payload.
  return {
    sourceType: input.sourceType, sourceId: input.sourceId, title: input.title,
    occurredAt: input.occurredAt && Number.isFinite(Date.parse(input.occurredAt)) ? input.occurredAt : null,
    mimeType: input.mimeType, sourceDocumentId: input.sourceDocumentId, sourceSegmentId: input.sourceSegmentId, sourceLocation: input.sourceLocation,
    syncedAt: input.syncedAt && Number.isFinite(Date.parse(input.syncedAt)) ? input.syncedAt : null,
    sourceVersion: input.sourceVersion?.slice(0,128),
    commercialRelationship: input.commercialRelationship, originalHref: safeOriginalEvidenceHref(input.originalHref),
    supportingFact: input.supportingFact, provider: input.provider,
    entityHref: evidenceHref(input.entityHref), visibility: "metadata"
  };
}
