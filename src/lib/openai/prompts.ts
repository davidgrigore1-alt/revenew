import "server-only";
import type { Business, Opportunity, OpportunityDocumentType, OpportunityType } from "@/lib/types";

export type OpportunityAnalysisPromptInput = {
  business: Business;
  title: string;
  sourceType: OpportunityType | string;
  rawText: string;
  sourceUrl?: string | null;
  city?: string | null;
  county?: string | null;
  estimatedValue?: number | null;
  deadline?: string | null;
};

export type DocumentGenerationPromptInput = {
  documentType: OpportunityDocumentType;
  business: Business;
  opportunity: Opportunity;
  tone?: string | null;
};

export function buildOpportunityAnalysisPrompt(input: OpportunityAnalysisPromptInput) {
  const { business } = input;

  return `Esti MoneyHunter AI, un asistent B2B pentru firme romanesti. Analizeaza oportunitatea comerciala si raspunde DOAR cu JSON valid.

Limba: romana.
Stil: direct, practic, business-focused, fara hype.
Reguli:
- Nu promite venit garantat.
- Nu inventa date de contact. Daca nu exista clar in text, foloseste null.
- Estimeaza conservator valoarea daca este incerta.
- Daca deadline-ul lipseste, deadline trebuie sa fie null.
- Daca increderea este scazuta, explica motivul in ai_summary sau risks.
- Recomandarea trebuie sa fie o actiune B2B practica.
- Scorurile sunt intregi 0-100.

Business:
- Nume: ${business.name}
- Denumire legala: ${business.legalName || "n/a"}
- Industrie: ${business.industry || "n/a"}
- Oraș/Judet: ${business.city || "n/a"} / ${business.county || "n/a"}
- Servicii: ${business.services.join(", ") || "n/a"}
- Clienti tinta: ${business.targetCustomers.join(", ") || "n/a"}
- Industrii tinta: ${business.targetIndustries.join(", ") || "n/a"}
- Orașe tinta: ${business.targetCities.join(", ") || "n/a"}
- Valoare medie contract: ${business.averageContractValue || 0} EUR

Oportunitate introdusa:
- Titlu: ${input.title}
- Tip sursa: ${input.sourceType}
- URL sursa: ${input.sourceUrl || "n/a"}
- Oraș/Judet: ${input.city || "n/a"} / ${input.county || "n/a"}
- Valoare estimata de utilizator: ${input.estimatedValue ?? "n/a"}
- Deadline: ${input.deadline || "n/a"}
- Text brut:
${input.rawText}

Returneaza exact acest JSON:
{
  "type": "b2b_lead | public_procurement | grant | partnership | invoice_followup | contract_renewal | cold_outreach | website_lead | manual",
  "title": "string",
  "description": "string",
  "estimated_value_low": 0,
  "estimated_value_high": 0,
  "fit_score": 0,
  "urgency_score": 0,
  "money_score": 0,
  "confidence_score": 0,
  "deadline": null,
  "city": null,
  "county": null,
  "contact_name": null,
  "contact_email": null,
  "contact_phone": null,
  "ai_summary": "string",
  "why_relevant": "string",
  "risks": ["string"],
  "recommended_next_action": "string",
  "suggested_documents": ["outreach_email"]
}`;
}

export function buildDocumentGenerationPrompt(input: DocumentGenerationPromptInput) {
  const { business, opportunity } = input;

  return `Esti MoneyHunter AI si generezi documente comerciale B2B in romana. Raspunde DOAR cu JSON valid.

Document cerut: ${input.documentType}
Ton dorit: ${input.tone || "profesionist, direct, pragmatic"}

Reguli:
- Nu inventa nume, telefoane, emailuri sau fapte.
- Nu exagera si nu promite rezultate garantate.
- Foloseste informatiile disponibile despre business si oportunitate.
- Pentru email: include clar subiect si corp.
- Pentru oferta: foloseste sectiuni Context, Solutie propusa, Beneficii, Pasi urmatori.
- Pentru script apel: concis si practic.
- Pentru checklist: actionabil.
- Pentru WhatsApp/LinkedIn: scurt si natural.

Business:
- Nume: ${business.name}
- Denumire legala: ${business.legalName || "n/a"}
- Industrie: ${business.industry || "n/a"}
- Oraș/Judet: ${business.city || "n/a"} / ${business.county || "n/a"}
- Servicii: ${business.services.join(", ") || "n/a"}
- Clienti tinta: ${business.targetCustomers.join(", ") || "n/a"}

Oportunitate:
- Titlu: ${opportunity.title}
- Tip: ${opportunity.type}
- Valoare estimata: ${opportunity.estimatedValueLow} - ${opportunity.estimatedValueHigh} EUR
- Deadline: ${opportunity.deadline || "n/a"}
- Oraș/Judet: ${opportunity.city || "n/a"} / ${opportunity.county || "n/a"}
- Sumar: ${opportunity.summary}
- Recomandare: ${opportunity.recommendedAction}
- Text sursa: ${opportunity.rawSourceText}

Returneaza exact acest JSON:
{
  "document_type": "${input.documentType}",
  "title": "string",
  "content": "string"
}`;
}
