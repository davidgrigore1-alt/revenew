import "server-only";
import type { OpportunityDocumentType, OpportunityType } from "@/lib/types";

export const opportunityTypes: OpportunityType[] = [
  "public_procurement",
  "b2b_lead",
  "grant",
  "partnership",
  "invoice_followup",
  "contract_renewal",
  "cold_outreach",
  "website_lead",
  "manual"
];

export const documentTypes: OpportunityDocumentType[] = [
  "outreach_email",
  "follow_up_email",
  "offer_draft",
  "call_script",
  "procurement_checklist",
  "grant_summary",
  "linkedin_message",
  "whatsapp_message"
];

export type AnalysisMode = "ai" | "local_fallback";

export type ValidatedOpportunityAnalysis = {
  mode: AnalysisMode;
  type: OpportunityType;
  title: string;
  description: string;
  estimated_value_low: number;
  estimated_value_high: number;
  fit_score: number;
  urgency_score: number;
  money_score: number;
  confidence_score: number;
  deadline: string | null;
  city: string | null;
  county: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  ai_summary: string;
  why_relevant: string;
  risks: string[];
  recommended_next_action: string;
  suggested_documents: string[];
};

export type ValidatedGeneratedDocument = {
  mode: AnalysisMode;
  document_type: OpportunityDocumentType;
  title: string;
  content: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Răspunsul AI nu a putut fi validat.");
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function score(value: unknown) {
  return Math.max(0, Math.min(100, Math.round(numberValue(value))));
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

export function parseJsonObject(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Răspunsul AI nu a putut fi validat.");
    }
    return JSON.parse(match[0]) as unknown;
  }
}

export function validateOpportunityAnalysis(value: unknown, mode: AnalysisMode): ValidatedOpportunityAnalysis {
  const data = asRecord(value);
  const type = opportunityTypes.includes(data.type as OpportunityType) ? (data.type as OpportunityType) : "manual";
  const title = stringValue(data.title).trim();
  const aiSummary = stringValue(data.ai_summary || data.description).trim();
  const recommended = stringValue(data.recommended_next_action).trim();

  if (!title || !aiSummary || !recommended) {
    throw new Error("Răspunsul AI nu a putut fi validat.");
  }

  const high = Math.max(0, Math.round(numberValue(data.estimated_value_high)));
  const low = Math.max(0, Math.min(high, Math.round(numberValue(data.estimated_value_low, Math.round(high * 0.65)))));

  return {
    mode,
    type,
    title,
    description: stringValue(data.description, aiSummary),
    estimated_value_low: low,
    estimated_value_high: high,
    fit_score: score(data.fit_score),
    urgency_score: score(data.urgency_score),
    money_score: score(data.money_score),
    confidence_score: score(data.confidence_score),
    deadline: nullableString(data.deadline),
    city: nullableString(data.city),
    county: nullableString(data.county),
    contact_name: nullableString(data.contact_name),
    contact_email: nullableString(data.contact_email),
    contact_phone: nullableString(data.contact_phone),
    ai_summary: aiSummary,
    why_relevant: stringValue(data.why_relevant, aiSummary),
    risks: stringArray(data.risks),
    recommended_next_action: recommended,
    suggested_documents: stringArray(data.suggested_documents)
  };
}

export function validateGeneratedDocument(value: unknown, mode: AnalysisMode, fallbackType: OpportunityDocumentType): ValidatedGeneratedDocument {
  const data = asRecord(value);
  const documentType = documentTypes.includes(data.document_type as OpportunityDocumentType)
    ? (data.document_type as OpportunityDocumentType)
    : fallbackType;
  const title = stringValue(data.title).trim();
  const content = stringValue(data.content).trim();

  if (!title || !content) {
    throw new Error("Răspunsul AI nu a putut fi validat.");
  }

  return {
    mode,
    document_type: documentType,
    title,
    content
  };
}
