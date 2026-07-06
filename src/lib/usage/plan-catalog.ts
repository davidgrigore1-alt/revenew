import type { UsageFeatureId, UsagePlanId } from "@/lib/usage/usage-types";

export type PlanUsageLimits = Partial<Record<UsageFeatureId, number | null>>;

export type UsagePlanDefinition = {
  id: UsagePlanId;
  label: string;
  publicDescription: string;
  limits: PlanUsageLimits;
  internalMonthlyBudgetMicros: number;
};

const allDocumentLimits: PlanUsageLimits = {
  document_outreach_email: 25,
  document_follow_up_email: 25,
  document_offer_draft: 10,
  document_call_script: 15,
  document_procurement_checklist: 8,
  document_grant_summary: 8,
  document_linkedin_message: 10,
  document_whatsapp_message: 10,
  follow_up_generation: 20
};

export const usagePlanCatalog: Record<UsagePlanId, UsagePlanDefinition> = {
  audit: {
    id: "audit",
    label: "Audit Revenue Recovery",
    publicDescription: "Testarea procesului de audit pentru oportunități recuperabile.",
    limits: {
      opportunity_analysis: 30,
      ...allDocumentLimits
    },
    internalMonthlyBudgetMicros: 1_500_000
  },
  managed: {
    id: "managed",
    label: "ReveNew Managed",
    publicDescription: "Operare recurentă pentru verificare, prioritizare și follow-up.",
    limits: {
      opportunity_analysis: 120,
      document_outreach_email: 120,
      document_follow_up_email: 120,
      document_offer_draft: 40,
      document_call_script: 60,
      document_procurement_checklist: 30,
      document_grant_summary: 30,
      document_linkedin_message: 40,
      document_whatsapp_message: 40,
      follow_up_generation: 100
    },
    internalMonthlyBudgetMicros: 7_500_000
  },
  growth: {
    id: "growth",
    label: "Growth",
    publicDescription: "Limită extinsă pentru echipe cu volum ridicat.",
    limits: {
      opportunity_analysis: 300,
      document_outreach_email: 300,
      document_follow_up_email: 300,
      document_offer_draft: 100,
      document_call_script: 150,
      document_procurement_checklist: 80,
      document_grant_summary: 80,
      document_linkedin_message: 100,
      document_whatsapp_message: 100,
      follow_up_generation: 250
    },
    internalMonthlyBudgetMicros: 18_000_000
  },
  custom: {
    id: "custom",
    label: "Custom",
    publicDescription: "Limită negociată și aprobată explicit.",
    limits: {},
    internalMonthlyBudgetMicros: 0
  }
};

export function getUsagePlan(planId: UsagePlanId) {
  return usagePlanCatalog[planId];
}

export function getFeatureLimit(planId: UsagePlanId, featureId: UsageFeatureId) {
  return usagePlanCatalog[planId].limits[featureId] ?? null;
}
