import type { Opportunity, OpportunityDocument } from "@/lib/types";

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

export type PreparedWorkItem = {
  id: string;
  type: PreparedWorkType;
  status: PreparedWorkStatus;
  target: { type: "opportunity" | "company" | "contact"; id: string; label: string };
  title: string;
  proposal: string;
  reason: string;
  evidence: Array<{ id: string; label: string; href: string }>;
  willChange: string[];
  willNotChange: string[];
  approver: string;
  reviewHref: string;
  editable: boolean;
};

function documentStatus(document: OpportunityDocument): PreparedWorkStatus | null {
  if (document.sentAt || document.status === "sent" || document.sendStatus === "sent") return "executed";
  if (document.status === "approved") return "approved";
  if (document.status === "ready_to_send" || document.readyAt) return "ready_for_review";
  if (["draft", "edited", "copied"].includes(document.status)) return "prepared";
  if (document.status === "archived") return "expired";
  return null;
}

function typeForDocument(document: OpportunityDocument): PreparedWorkType {
  if (document.type === "outreach_email" || document.type === "follow_up_email") return "prepared_email";
  return "prepared_opportunity_update";
}

export function preparedWorkForOpportunity(opportunity: Opportunity): PreparedWorkItem[] {
  return opportunity.documents.flatMap((document) => {
    const status = documentStatus(document);
    if (!status || status === "executed" || status === "expired") return [];
    const href = "/outreach/" + document.id;
    return [{
      id: "prepared-document:" + document.id,
      type: typeForDocument(document),
      status,
      target: { type: "opportunity" as const, id: opportunity.id, label: opportunity.title },
      title: document.title,
      proposal: document.content?.trim().slice(0, 1200) || "Conținutul pregătit poate fi verificat în editorul documentului.",
      reason: "Material asociat explicit oportunității și pregătit pentru un pas controlat.",
      evidence: [{ id: "document:" + document.id, label: "Document comercial persistent", href }],
      willChange: ["Conținutul poate fi editat și trecut prin revizuire."],
      willNotChange: ["Nu se trimite niciun mesaj automat.", "Oportunitatea nu este marcată câștigată automat."],
      approver: "Utilizator autorizat",
      reviewHref: href,
      editable: true
    }];
  });
}