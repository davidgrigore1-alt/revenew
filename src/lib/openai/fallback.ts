import "server-only";
import {
  generateCallScript,
  generateChecklist,
  generateFollowUpMessage,
  generateOfferDraft,
  generateOutreachEmail
} from "@/lib/mock-generators";
import { scoreOpportunity } from "@/lib/scoring";
import type { Business, Opportunity, OpportunityDocumentType, OpportunityType } from "@/lib/types";
import type { OpportunityAnalysisPromptInput } from "@/lib/openai/prompts";
import type { ValidatedGeneratedDocument, ValidatedOpportunityAnalysis } from "@/lib/openai/validation";

export function buildLocalOpportunityAnalysis(input: OpportunityAnalysisPromptInput): ValidatedOpportunityAnalysis {
  const estimatedValueHigh = Number(input.estimatedValue || input.business.averageContractValue || 0);
  const summary = `Analiza locala: ${input.title} pare relevanta pentru ${input.business.name}, mai ales daca se potriveste cu serviciile si zona tinta.`;
  const scores = scoreOpportunity(
    {
      title: input.title,
      summary,
      rawSourceText: input.rawText,
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
    title: input.title,
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
    why_relevant: "Oportunitatea se potriveste partial cu profilul firmei si merita validata manual.",
    risks: ["Analiza este locala si trebuie verificata manual.", "Contactul nu este confirmat."],
    recommended_next_action: "Verifica sursa si pregateste un prim mesaj de contact.",
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
