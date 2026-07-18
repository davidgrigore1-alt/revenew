import type {
  CommercialSignalAnalysisStatus,
  CommercialSignalReviewStatus,
  LeadStatus,
  OpportunityDocument,
  OpportunityLifecycleStatus,
  OpportunityStatus,
  RecoverabilityConfidence,
  RecoverabilityUrgency
} from "@/lib/types";
import type { BadgeTone } from "@/components/ui/Badge";

export type DomainStateIcon =
  | "archive"
  | "check"
  | "clock"
  | "document"
  | "flag"
  | "pause"
  | "risk"
  | "send"
  | "spark"
  | "x";

export type DomainStatePresentation = {
  label: string;
  tone: BadgeTone;
  description?: string;
  icon?: DomainStateIcon;
  compact?: {
    label?: string;
    showDot?: boolean;
  };
  detailed?: {
    label?: string;
    description?: string;
    showDot?: boolean;
  };
};

export type PresentationPriority = "low" | "medium" | "high" | "urgent";

const opportunityStatus = {
  new: { label: "Nouă", tone: "neutral", icon: "spark" },
  reviewed: { label: "Revizuită", tone: "brand", icon: "check" },
  action_generated: { label: "Acțiune pregătită", tone: "gold", icon: "document", compact: { label: "Acțiune pregătită" } },
  contacted: { label: "Contactată", tone: "info", icon: "send" },
  follow_up_needed: { label: "Follow-up", tone: "warning", icon: "clock" },
  won: { label: "Câștigată", tone: "success", icon: "check" },
  lost: { label: "Pierdută", tone: "danger", icon: "x" },
  ignored: { label: "Ignorată", tone: "neutral", icon: "archive" }
} satisfies Record<OpportunityStatus, DomainStatePresentation>;

const opportunityLifecycle = {
  open: { label: "Deschisă", tone: "brand", icon: "flag" },
  won: { label: "Câștigată", tone: "success", icon: "check" },
  lost: { label: "Pierdută", tone: "danger", icon: "x" },
  disqualified: { label: "Descalificată", tone: "neutral", icon: "x" },
  archived: { label: "Arhivată", tone: "neutral", icon: "archive" }
} satisfies Record<OpportunityLifecycleStatus, DomainStatePresentation>;

const priority = {
  low: { label: "Scăzută", tone: "neutral", icon: "flag" },
  medium: { label: "Medie", tone: "neutral", icon: "flag" },
  high: { label: "Ridicată", tone: "warning", icon: "risk" },
  urgent: { label: "Urgentă", tone: "danger", icon: "risk" }
} satisfies Record<PresentationPriority, DomainStatePresentation>;

const documentStatus = {
  placeholder: { label: "În pregătire", tone: "neutral", icon: "document" },
  draft: { label: "Draft", tone: "neutral", icon: "document" },
  edited: { label: "Editat", tone: "brand", icon: "document" },
  copied: { label: "Copiat", tone: "info", icon: "document" },
  ready_to_send: { label: "Pregătit", tone: "info", icon: "send" },
  sent: { label: "Trimis", tone: "success", icon: "send" },
  approved: { label: "Aprobat", tone: "success", icon: "check" },
  archived: { label: "Arhivat", tone: "neutral", icon: "archive" }
} satisfies Record<OpportunityDocument["status"], DomainStatePresentation>;

const signalAnalysis = {
  not_started: { label: "Neîncepută", tone: "neutral", icon: "pause" },
  analyzing: { label: "În analiză", tone: "info", icon: "clock" },
  completed: { label: "Analiză finalizată", tone: "success", icon: "check" },
  failed: { label: "Analiză eșuată", tone: "danger", icon: "risk" }
} satisfies Record<CommercialSignalAnalysisStatus, DomainStatePresentation>;

const signalReview = {
  new: { label: "Nou", tone: "neutral", icon: "spark" },
  ready_for_review: { label: "Pregătit pentru revizuire", tone: "info", icon: "document", compact: { label: "De revizuit" } },
  approved: { label: "Aprobat", tone: "success", icon: "check" },
  dismissed: { label: "Respins", tone: "neutral", icon: "x" },
  duplicate: { label: "Duplicat", tone: "neutral", icon: "archive" },
  postponed: { label: "Amânat", tone: "warning", icon: "clock" },
  converted: { label: "Convertit", tone: "success", icon: "check" }
} satisfies Record<CommercialSignalReviewStatus, DomainStatePresentation>;

const confidence = {
  low: { label: "Scăzută", tone: "warning", icon: "risk" },
  medium: { label: "Medie", tone: "info", icon: "flag" },
  high: { label: "Ridicată", tone: "success", icon: "check" }
} satisfies Record<RecoverabilityConfidence, DomainStatePresentation>;

const urgency = {
  low: { label: "Scăzută", tone: "neutral", icon: "flag" },
  medium: { label: "Medie", tone: "info", icon: "clock" },
  high: { label: "Ridicată", tone: "warning", icon: "risk" },
  critical: { label: "Critică", tone: "danger", icon: "risk" }
} satisfies Record<RecoverabilityUrgency, DomainStatePresentation>;

const leadStatus = {
  new: { label: "Nou", tone: "neutral", icon: "spark" },
  qualified: { label: "Calificat", tone: "brand", icon: "check" },
  contacted: { label: "Contactat", tone: "info", icon: "send" },
  in_outreach: { label: "În contactare", tone: "warning", icon: "clock" },
  won: { label: "Câștigat", tone: "success", icon: "check" },
  lost: { label: "Pierdut", tone: "danger", icon: "x" }
} satisfies Record<LeadStatus, DomainStatePresentation>;

export const domainStatePresentation = {
  opportunityStatus,
  opportunityLifecycle,
  priority,
  documentStatus,
  signalAnalysis,
  signalReview,
  confidence,
  urgency,
  leadStatus
} as const;

export type DomainStateGroup = keyof typeof domainStatePresentation;

export function getDomainStatePresentation<Group extends DomainStateGroup>(
  group: Group,
  value: keyof (typeof domainStatePresentation)[Group]
): DomainStatePresentation {
  return (domainStatePresentation[group] as Record<PropertyKey, DomainStatePresentation>)[value];
}

export function getScorePresentation(score: number): Pick<DomainStatePresentation, "tone"> {
  if (score >= 85) return { tone: "success" };
  if (score >= 70) return { tone: "gold" };
  return { tone: "neutral" };
}
