import type { OpportunityDocumentType } from "@/lib/types";

export type UsageMode = "off" | "observe" | "enforce";

export type UsageFeatureId =
  | "opportunity_analysis"
  | "document_outreach_email"
  | "document_follow_up_email"
  | "document_offer_draft"
  | "document_call_script"
  | "document_procurement_checklist"
  | "document_grant_summary"
  | "document_linkedin_message"
  | "document_whatsapp_message"
  | "follow_up_generation";

export type UsageProvider = "openai" | "local";

export type UsagePlanId = "audit" | "managed" | "growth" | "custom";

export type UsageCostStatus = "estimated" | "provider_confirmed" | "not_billable";

export type UsageExecutionStatus =
  | "reserved"
  | "provider_success"
  | "provider_failure"
  | "local_fallback"
  | "validation_rejected"
  | "authorization_rejected"
  | "budget_rejected"
  | "infrastructure_failure"
  | "released";

export type UsageErrorCategory =
  | "none"
  | "validation"
  | "authorization"
  | "budget"
  | "provider_quota"
  | "provider_timeout"
  | "provider_error"
  | "provider_empty_response"
  | "provider_invalid_response"
  | "infrastructure"
  | "unknown";

export type UsageReservation = {
  id: string;
  featureId: UsageFeatureId;
  businessId: string;
  profileId: string;
  idempotencyKey: string;
  reservedUnits: number;
  mode: UsageMode;
  enforceable: boolean;
  reservedAt: number;
  requestId: string;
};

export type ProviderUsage = {
  provider: UsageProvider;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costStatus?: UsageCostStatus;
  retryCount?: number;
  latencyMs?: number;
  requestId?: string;
  operationType?: string;
  providerStatusCategory?: string;
  billableFailure?: boolean;
  errorCategory?: UsageErrorCategory;
};

export type UsageSnapshot = {
  mode: UsageMode;
  planId: UsagePlanId;
  unavailable: boolean;
  periodStart: string;
  periodEnd: string;
  features: Array<{
    featureId: UsageFeatureId;
    label: string;
    used: number;
    limit: number | null;
  }>;
};

export const documentFeatureByType: Record<OpportunityDocumentType, UsageFeatureId> = {
  outreach_email: "document_outreach_email",
  follow_up_email: "document_follow_up_email",
  offer_draft: "document_offer_draft",
  call_script: "document_call_script",
  procurement_checklist: "document_procurement_checklist",
  grant_summary: "document_grant_summary",
  linkedin_message: "document_linkedin_message",
  whatsapp_message: "document_whatsapp_message"
};
