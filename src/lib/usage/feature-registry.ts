import type { UsageFeatureId } from "@/lib/usage/usage-types";

export type UsageFeatureDefinition = {
  id: UsageFeatureId;
  label: string;
  publicUnitLabel: string;
  providerBacked: boolean;
  storesPrompt: false;
};

export const usageFeatures: Record<UsageFeatureId, UsageFeatureDefinition> = {
  opportunity_analysis: {
    id: "opportunity_analysis",
    label: "Analize avansate de oportunități",
    publicUnitLabel: "analize avansate",
    providerBacked: true,
    storesPrompt: false
  },
  document_outreach_email: {
    id: "document_outreach_email",
    label: "Emailuri outreach pregătite",
    publicUnitLabel: "emailuri outreach",
    providerBacked: true,
    storesPrompt: false
  },
  document_follow_up_email: {
    id: "document_follow_up_email",
    label: "Emailuri follow-up pregătite",
    publicUnitLabel: "emailuri follow-up",
    providerBacked: true,
    storesPrompt: false
  },
  document_offer_draft: {
    id: "document_offer_draft",
    label: "Drafturi de ofertă",
    publicUnitLabel: "drafturi de ofertă",
    providerBacked: true,
    storesPrompt: false
  },
  document_call_script: {
    id: "document_call_script",
    label: "Scripturi de apel",
    publicUnitLabel: "scripturi de apel",
    providerBacked: true,
    storesPrompt: false
  },
  document_procurement_checklist: {
    id: "document_procurement_checklist",
    label: "Checklisturi pentru achiziții",
    publicUnitLabel: "checklisturi",
    providerBacked: true,
    storesPrompt: false
  },
  document_grant_summary: {
    id: "document_grant_summary",
    label: "Rezumate grant",
    publicUnitLabel: "rezumate grant",
    providerBacked: true,
    storesPrompt: false
  },
  document_linkedin_message: {
    id: "document_linkedin_message",
    label: "Mesaje LinkedIn",
    publicUnitLabel: "mesaje LinkedIn",
    providerBacked: true,
    storesPrompt: false
  },
  document_whatsapp_message: {
    id: "document_whatsapp_message",
    label: "Mesaje WhatsApp pregătite",
    publicUnitLabel: "mesaje WhatsApp",
    providerBacked: true,
    storesPrompt: false
  },
  follow_up_generation: {
    id: "follow_up_generation",
    label: "Follow-up-uri generate",
    publicUnitLabel: "follow-up-uri",
    providerBacked: true,
    storesPrompt: false
  }
};

export function getUsageFeature(featureId: UsageFeatureId) {
  return usageFeatures[featureId];
}
