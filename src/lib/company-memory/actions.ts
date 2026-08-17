"use server";

import { answerCompanyQuestion, type CompanyQuestionAnswer } from "@/lib/company-commercial-memory";
import { getCompanyIntelligenceSnapshot } from "@/lib/company-intelligence";

export async function askAboutCompany(organizationId: string, question: string): Promise<CompanyQuestionAnswer> {
  const safeOrganizationId = organizationId.trim();
  const safeQuestion = question.trim().slice(0, 240);
  if (!safeOrganizationId || safeOrganizationId.length > 80 || safeQuestion.length < 2) {
    return {
      intent: "unknown",
      state: "insufficient",
      headline: "Întrebarea nu poate fi verificată încă",
      answer: "Formulează o întrebare scurtă despre informațiile comerciale ale companiei.",
      evidence: [],
      missingInformation: ["Companie autorizată și întrebare validă"]
    };
  }

  const result = await getCompanyIntelligenceSnapshot(safeOrganizationId);
  if (!result.ready || !result.snapshot) {
    return {
      intent: "unknown",
      state: "insufficient",
      headline: "Nu am putut încărca memoria comercială",
      answer: "Compania nu este disponibilă în spațiul de lucru autorizat sau datele nu au putut fi încărcate.",
      evidence: [],
      missingInformation: ["Acces autorizat la companie"]
    };
  }

  return answerCompanyQuestion(result.snapshot, safeQuestion);
}
