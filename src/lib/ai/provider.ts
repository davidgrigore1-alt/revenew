import "server-only";

import type { CopilotProvider } from "@/lib/ai/copilot-types";
import { createOllamaCopilotProvider } from "@/lib/ai/ollama-provider";
import { createOpenAICopilotProvider } from "@/lib/ai/openai-provider";

export function getCopilotProvider(): CopilotProvider {
  const requested = process.env.REVENEW_AI_PROVIDER?.trim().toLowerCase();
  if (requested === "ollama") return createOllamaCopilotProvider();
  if (requested === "none") {
    const provider = createOpenAICopilotProvider();
    return { ...provider, available: () => false };
  }
  return createOpenAICopilotProvider();
}
