import { getOpenAIErrorCode } from "@/lib/openai/client";
import type { UsageErrorCategory } from "@/lib/usage/usage-types";

export type ProviderFailureClassification = {
  errorCategory: UsageErrorCategory;
  providerStatusCategory: string;
  billableFailure: boolean;
};

export function classifyOpenAIProviderFailure(error: unknown): ProviderFailureClassification {
  const code = getOpenAIErrorCode(error);
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const name = error instanceof Error ? error.name.toLowerCase() : "";

  if (code === "insufficient_quota") {
    return { errorCategory: "provider_quota", providerStatusCategory: "quota", billableFailure: false };
  }

  if (name.includes("abort") || name.includes("timeout") || message.includes("timeout")) {
    return { errorCategory: "provider_timeout", providerStatusCategory: "timeout", billableFailure: true };
  }

  if (message.includes("răspuns gol") || message.includes("raspuns gol")) {
    return { errorCategory: "provider_empty_response", providerStatusCategory: "empty_response", billableFailure: true };
  }

  if (message.includes("validat")) {
    return { errorCategory: "provider_invalid_response", providerStatusCategory: "invalid_response", billableFailure: true };
  }

  return { errorCategory: "provider_error", providerStatusCategory: "error", billableFailure: true };
}
