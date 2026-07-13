"use server";

import { getCurrentProfile } from "@/lib/auth/profile";
import { recordProductEvent } from "@/lib/product-events";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedKeys = new Set(["businessName", "legalName", "cui", "website", "industry", "customIndustry", "countryCode", "administrativeArea", "city", "postalCode", "companyPhoneCountry", "companyPhone", "mainOffering", "shortDescription", "averageContractValue", "currency", "leadSources", "customLeadSource", "mainCommercialProblem", "customCommercialProblem"]);

export async function saveOnboardingProgress(currentStep: number, entryMode: "manual" | "import", rawDraft: Record<string, unknown>) {
  const { authUser, profile } = await getCurrentProfile();
  const supabase = createSupabaseServerClient();
  if (!authUser || !profile || !supabase) return { ok: false, error: "Progresul nu poate fi salvat momentan." };
  const draft = Object.fromEntries(Object.entries(rawDraft).filter(([key, value]) => allowedKeys.has(key) && (typeof value === "string" || Array.isArray(value))));
  if (JSON.stringify(draft).length > 12_000) return { ok: false, error: "Datele introduse depășesc limita permisă." };
  const { error } = await supabase.from("onboarding_drafts").upsert({ profile_id: profile.id, current_step: Math.max(0, Math.min(currentStep, 4)), entry_mode: entryMode, draft }, { onConflict: "profile_id" });
  if (error) return { ok: false, error: "Progresul nu a putut fi salvat. Datele din formular rămân disponibile în această pagină." };
  if (currentStep === 0) void recordProductEvent("onboarding_started", { metadata: { entry_mode: entryMode } });
  return { ok: true };
}
