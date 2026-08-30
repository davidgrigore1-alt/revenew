import type { Opportunity, OpportunityDocument, OpportunityDocumentType } from "@/lib/types";

export const preparedWorkTypes = [
  "prepared_email",
  "prepared_task",
  "prepared_next_action",
  "prepared_owner_assignment",
  "prepared_opportunity_update",
  "prepared_meeting_brief",
  "prepared_followup_plan"
] as const;

export type PreparedWorkType = typeof preparedWorkTypes[number];
export type PreparedWorkStatus = "prepared" | "ready_for_review" | "approved" | "rejected" | "executed" | "expired";

export type PreparedWorkEvidence = {
  id: string;
  label: string;
  description?: string | null;
  href?: string;
  occurredAt?: string;
};

export type PreparedWorkItem = {
  id: string;
  documentId: string;
  documentType?: OpportunityDocumentType;
  type: PreparedWorkType;
  status: PreparedWorkStatus;
  target: { type: "opportunity"; id: string; label: string; href: string };
  company?: { id: string; label: string; href: string };
  contact?: { id?: string; label: string; href?: string };
  owner?: { id: string; label: string };
  deadline?: string;
  currency: string;
  estimatedValueLow?: number | null;
  estimatedValueHigh?: number | null;
  title: string;
  proposal: string;
  reason?: string | null;
  evidence: PreparedWorkEvidence[];
  provenance: { label: string; mode?: "ai" | "local_fallback"; createdAt?: string };
  willChange: string[];
  willNotChange: string[];
  approver: string;
  reviewHref: string;
  reviewLabel: string;
  editable: boolean;
  preparedAt?: string;
};

export type PreparedWorkContext = {
  canUpdate?: boolean;
  company?: PreparedWorkItem["company"];
  contact?: PreparedWorkItem["contact"];
  owner?: PreparedWorkItem["owner"];
  reason?: string | null;
  evidence?: PreparedWorkEvidence[];
  requireDocumentType?: boolean;
};

const messageDocumentTypes = new Set<OpportunityDocumentType>([
  "outreach_email",
  "follow_up_email",
  "linkedin_message",
  "whatsapp_message"
]);

const internalDocumentTypes = new Set<OpportunityDocumentType>([
  "offer_draft",
  "procurement_checklist",
  "grant_summary"
]);

export function documentStatus(document: OpportunityDocument): PreparedWorkStatus | null {
  if (document.sentAt || document.status === "sent" || document.sendStatus === "sent") return "executed";
  if (document.status === "approved") return "approved";
  if (document.status === "ready_to_send") return "ready_for_review";
  if (["draft", "edited", "copied"].includes(document.status)) return "prepared";
  if (document.status === "archived") return "expired";
  return null;
}

function typeForDocument(document: OpportunityDocument): PreparedWorkType {
  return document.type && messageDocumentTypes.has(document.type) ? "prepared_email" : "prepared_opportunity_update";
}

export function destinationForDocument(document: OpportunityDocument, opportunityId: string, requireDocumentType = false) {
  if (document.type && messageDocumentTypes.has(document.type)) {
    return { href: `/outreach/${document.id}`, label: "Revizuiește în Studio", supportsUpdate: true };
  }
  if (document.type && internalDocumentTypes.has(document.type)) {
    return { href: `/documents/${document.id}`, label: "Deschide documentul", supportsUpdate: false };
  }
  if (!document.type && !requireDocumentType) {
    return { href: `/outreach/${document.id}`, label: "Revizuiește", supportsUpdate: true };
  }
  return { href: `/opportunities/${opportunityId}?tab=files`, label: "Deschide în oportunitate", supportsUpdate: false };
}

export function preparedWorkForOpportunity(opportunity: Opportunity, context: PreparedWorkContext = {}): PreparedWorkItem[] {
  return opportunity.documents.flatMap((document) => {
    const status = documentStatus(document);
    if (!status || status === "executed" || status === "expired" || (context.requireDocumentType && !document.type)) return [];
    const destination = destinationForDocument(document, opportunity.id, context.requireDocumentType);
    return [{
      id: `prepared-document:${document.id}`,
      documentId: document.id,
      documentType: document.type,
      type: typeForDocument(document),
      status,
      target: { type: "opportunity" as const, id: opportunity.id, label: opportunity.title, href: `/opportunities/${opportunity.id}` },
      company: context.company,
      contact: context.contact,
      owner: context.owner,
      deadline: opportunity.deadline,
      currency: opportunity.currency ?? "RON",
      estimatedValueLow: opportunity.estimatedValueLow,
      estimatedValueHigh: opportunity.estimatedValueHigh,
      title: document.title,
      proposal: document.content?.trim().slice(0, 1200) || "Documentul nu are încă un conținut disponibil pentru previzualizare.",
      reason: context.reason ?? null,
      evidence: context.evidence ?? [],
      provenance: {
        label: document.generationMode === "ai" ? "Document generat asistat și salvat" : "Document salvat în workspace",
        mode: document.generationMode,
        createdAt: document.createdAt
      },
      willChange: [destination.supportsUpdate && context.canUpdate ? "Conținutul poate fi revizuit și salvat în Studio." : "Documentul poate fi verificat în contextul său persistent."],
      willNotChange: ["Nu se trimite nimic extern din Lucru pregătit.", "Aprobarea nu înseamnă trimitere.", "Oportunitatea nu este marcată câștigată automat."],
      approver: "Utilizator autorizat",
      reviewHref: destination.href,
      reviewLabel: destination.label,
      editable: Boolean(destination.supportsUpdate && context.canUpdate),
      preparedAt: document.status === "ready_to_send"
        ? document.readyAt ?? document.editedAt ?? document.createdAt
        : document.status === "copied"
          ? document.copiedAt ?? document.editedAt ?? document.createdAt
          : document.editedAt ?? document.createdAt
    }];
  });
}
