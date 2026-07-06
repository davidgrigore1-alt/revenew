import "server-only";
import {
  generateCallScript,
  generateChecklist,
  generateFollowUpMessage,
  generateOfferDraft,
  generateOutreachEmail
} from "@/lib/mock-generators";
import { scoreOpportunity } from "@/lib/scoring";
import { cleanCommercialLongText, cleanCommercialText } from "@/lib/text/signal-quality";
import type { Business, Opportunity, OpportunityDocumentType, OpportunityType } from "@/lib/types";
import type { OpportunityAnalysisPromptInput } from "@/lib/openai/prompts";
import type { ValidatedGeneratedDocument, ValidatedOpportunityAnalysis } from "@/lib/openai/validation";

export function buildLocalOpportunityAnalysis(input: OpportunityAnalysisPromptInput): ValidatedOpportunityAnalysis {
  const estimatedValueHigh = Number(input.estimatedValue || input.business.averageContractValue || 0);
  const title = cleanCommercialText(input.title, "Oportunitate de confirmat");
  const rawText = cleanCommercialLongText(input.rawText, "Textul sursă nu conține suficiente detalii comerciale utile.");
  const summary = `Analiză standard: "${title}" merită validată comercial pentru ${input.business.name}, cu accent pe potrivirea serviciilor, locație și termen.`;
  const scores = scoreOpportunity(
    {
      title,
      summary,
      rawSourceText: rawText,
      city: input.city ?? input.business.city,
      county: input.county ?? input.business.county,
      deadline: input.deadline ?? undefined,
      estimatedValueHigh,
      sourceUrl: input.sourceUrl ?? undefined,
      contact: undefined
    },
    input.business
  );

  return {
    mode: "local_fallback",
    type: (input.sourceType as OpportunityType) || "manual",
    title,
    description: summary,
    estimated_value_low: Math.round(estimatedValueHigh * 0.65),
    estimated_value_high: estimatedValueHigh,
    fit_score: scores.fitScore,
    urgency_score: scores.urgencyScore,
    money_score: scores.moneyScore,
    confidence_score: scores.confidenceScore,
    deadline: input.deadline || null,
    city: input.city || input.business.city || null,
    county: input.county || input.business.county || null,
    contact_name: null,
    contact_email: null,
    contact_phone: null,
    ai_summary: summary,
    why_relevant: "Oportunitatea se potrivește parțial cu profilul firmei și merită validată înainte de outreach.",
    risks: ["Datele sursă trebuie confirmate înainte de contact.", "Contactul și criteriile comerciale nu sunt confirmate."],
    recommended_next_action: "Verifică sursa, confirmă persoana responsabilă și pregătește un prim mesaj de contact.",
    suggested_documents: ["outreach_email", "call_script"]
  };
}

export function buildLocalGeneratedDocument(documentType: OpportunityDocumentType, business: Business, opportunity: Opportunity): ValidatedGeneratedDocument {
  if (documentType === "outreach_email") {
    return { mode: "local_fallback", document_type: documentType, title: "Email outreach", content: generateOutreachEmail(opportunity, business) };
  }
  if (documentType === "call_script") {
    return { mode: "local_fallback", document_type: documentType, title: "Script apel", content: generateCallScript(opportunity, business) };
  }
  if (documentType === "offer_draft") {
    return { mode: "local_fallback", document_type: documentType, title: "Draft oferta", content: generateOfferDraft(opportunity, business) };
  }
  if (documentType === "follow_up_email") {
    return { mode: "local_fallback", document_type: documentType, title: "Mesaj follow-up", content: generateFollowUpMessage(opportunity, business) };
  }
  return { mode: "local_fallback", document_type: documentType, title: "Checklist actiune", content: generateChecklist(opportunity, business) };
}
