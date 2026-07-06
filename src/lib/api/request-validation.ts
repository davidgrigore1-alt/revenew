import type { OpportunityDocumentType, OpportunityType } from "@/lib/types";
import { documentTypes, opportunityTypes } from "@/lib/openai/validation";

export type SafeAnalysisRequest = {
  title: string;
  sourceType: OpportunityType;
  rawText: string;
  sourceUrl: string | null;
  city: string | null;
  county: string | null;
  estimatedValue: number | null;
  deadline: string | null;
};

export type SafeDocumentRequest = {
  opportunityId: string;
  documentType: OpportunityDocumentType;
  tone: string | null;
};

const maxBodyBytes = 24_000;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const safeSlugPattern = /^[a-z0-9][a-z0-9-]{2,79}$/i;

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeLongText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim().slice(0, maxLength);
}

function nullableText(value: unknown, maxLength: number) {
  const normalized = normalizeText(value, maxLength);
  return normalized || null;
}

export function assertJsonRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { ok: false as const, status: 400, error: "Cererea trebuie să folosească JSON." };
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
    return { ok: false as const, status: 413, error: "Cererea este prea mare." };
  }

  return { ok: true as const };
}

export function validateAnalysisRequest(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false as const, status: 400, error: "Cererea nu este validă." };
  }

  const data = value as Record<string, unknown>;
  const title = normalizeText(data.title, 160);
  const rawText = normalizeLongText(data.rawText, 6000);
  const sourceType = opportunityTypes.includes(data.sourceType as OpportunityType) ? (data.sourceType as OpportunityType) : "manual";
  const estimatedValue = Number(data.estimatedValue);

  if (!title || !rawText) {
    return { ok: false as const, status: 400, error: "Titlul și textul oportunității sunt obligatorii." };
  }

  return {
    ok: true as const,
    data: {
      title,
      sourceType,
      rawText,
      sourceUrl: nullableText(data.sourceUrl, 500),
      city: nullableText(data.city, 80),
      county: nullableText(data.county, 80),
      estimatedValue: Number.isFinite(estimatedValue) && estimatedValue > 0 ? Math.round(estimatedValue) : null,
      deadline: nullableText(data.deadline, 40)
    } satisfies SafeAnalysisRequest
  };
}

export function validateDocumentRequest(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false as const, status: 400, error: "Cererea nu este validă." };
  }

  const data = value as Record<string, unknown>;
  const opportunityId = normalizeText(data.opportunityId, 80);
  const documentType = data.documentType as OpportunityDocumentType;

  if (!uuidPattern.test(opportunityId) && !safeSlugPattern.test(opportunityId)) {
    return { ok: false as const, status: 400, error: "Oportunitatea nu este validă." };
  }

  if (!documentTypes.includes(documentType)) {
    return { ok: false as const, status: 400, error: "Tipul documentului nu este valid." };
  }

  return {
    ok: true as const,
    data: {
      opportunityId,
      documentType,
      tone: nullableText(data.tone, 120)
    } satisfies SafeDocumentRequest
  };
}
