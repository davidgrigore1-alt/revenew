import { getModelPricing } from "@/lib/usage/pricing-registry";
import type { ProviderUsage } from "@/lib/usage/usage-types";

export function calculateEstimatedCostMicros(usage: ProviderUsage) {
  if (usage.provider === "local") {
    return 0;
  }

  const pricing = getModelPricing(usage.model);
  return Math.max(
    0,
    Math.round(
      (usage.promptTokens * pricing.inputMicrosPerMillionTokens + usage.completionTokens * pricing.outputMicrosPerMillionTokens) /
        1_000_000
    )
  );
}
