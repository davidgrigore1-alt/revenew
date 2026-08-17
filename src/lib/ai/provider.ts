import "server-only";

import type { CopilotProvider } from "@/lib/ai/copilot-types";
import { createOpenAICopilotProvider } from "@/lib/ai/openai-provider";

export function getCopilotProvider(): CopilotProvider {
  return createOpenAICopilotProvider();
}
