export const responseCategories = [
  "positive_interest", "meeting_requested", "information_requested", "objection", "not_now",
  "no_response", "wrong_contact", "unsubscribe", "bounced", "negative", "other"
] as const;

export type CommercialResponseCategory = (typeof responseCategories)[number];

export const responseCategoryLabels: Record<CommercialResponseCategory, string> = {
  positive_interest: "Interes pozitiv",
  meeting_requested: "Întâlnire solicitată",
  information_requested: "Informații solicitate",
  objection: "Obiecție",
  not_now: "Nu acum",
  no_response: "Fără răspuns",
  wrong_contact: "Contact nepotrivit",
  unsubscribe: "Dezabonare solicitată",
  bounced: "Adresă respinsă",
  negative: "Răspuns negativ",
  other: "Alt răspuns"
};

export const responseChannels = ["email", "phone", "linkedin", "whatsapp", "meeting", "other"] as const;
export type CommercialResponseChannel = (typeof responseChannels)[number];
export const responseChannelLabels: Record<CommercialResponseChannel, string> = {
  email: "Email", phone: "Telefon", linkedin: "LinkedIn", whatsapp: "WhatsApp", meeting: "Întâlnire", other: "Alt canal"
};

export const commercialMilestones = [
  "response_received", "meeting_scheduled", "qualification_completed", "proposal_requested", "proposal_sent", "negotiation_started"
] as const;
export type CommercialMilestone = (typeof commercialMilestones)[number];
export const milestoneLabels: Record<CommercialMilestone, string> = {
  response_received: "Răspuns primit",
  meeting_scheduled: "Întâlnire programată",
  qualification_completed: "Calificare finalizată",
  proposal_requested: "Propunere solicitată",
  proposal_sent: "Propunere trimisă",
  negotiation_started: "Negociere începută"
};

export const suggestedNextActions = {
  positive_interest: { type: "call_contact", title: "Programează o întâlnire", days: 2, milestone: "response_received" },
  meeting_requested: { type: "call_contact", title: "Confirmă întâlnirea comercială", days: 1, milestone: "meeting_scheduled" },
  information_requested: { type: "prepare_documents", title: "Pregătește materialele solicitate", days: 2, milestone: "proposal_requested" },
  objection: { type: "research_more", title: "Pregătește răspunsul la obiecție", days: 2, milestone: "response_received" },
  not_now: { type: "follow_up", title: "Programează revenirea comercială", days: 30, milestone: "response_received" },
  no_response: { type: "follow_up", title: "Programează un follow-up controlat", days: 5, milestone: null },
  wrong_contact: { type: "research_more", title: "Identifică persoana de contact potrivită", days: 3, milestone: null },
  unsubscribe: { type: "research_more", title: "Oprește outreach-ul și verifică restricția", days: 1, milestone: "response_received" },
  bounced: { type: "research_more", title: "Verifică sau înlocuiește adresa de email", days: 1, milestone: null },
  negative: { type: "research_more", title: "Documentează motivul și decide următorul pas", days: 2, milestone: "response_received" },
  other: { type: "follow_up", title: "Clarifică următorul pas comercial", days: 3, milestone: "response_received" }
} as const;

export function getSuggestedNextAction(category: CommercialResponseCategory) {
  return suggestedNextActions[category];
}

export function responseSummaryRequired(category: CommercialResponseCategory) {
  return category !== "no_response";
}

export function isPositiveResponse(category: CommercialResponseCategory) {
  return ["positive_interest", "meeting_requested", "information_requested"].includes(category);
}

export function countsAsReceivedResponse(category: CommercialResponseCategory) {
  return !["no_response", "bounced"].includes(category);
}
