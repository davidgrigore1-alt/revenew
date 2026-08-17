import "server-only";

import type { ResponseInputItem, Tool } from "openai/resources/responses/responses";
import type { CopilotProvider, CopilotProviderTurn } from "@/lib/ai/copilot-types";
import { createOpenAIClient, isOpenAIConfigured, runWithOpenAITimeout } from "@/lib/openai/client";

const DEFAULT_COPILOT_MODEL = "gpt-5.6";

function getCopilotModel() {
  return process.env.OPENAI_MODEL || DEFAULT_COPILOT_MODEL;
}

const answerSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "summaryType", "evidence", "missingInformation", "caveats", "suggestedAction", "followUps"],
  properties: {
    answer: { type: "string" },
    summaryType: { type: "string", enum: ["commercial", "product_help", "insufficient_information", "temporary_error"] },
    evidence: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["sourceId"],
        properties: { sourceId: { type: "string" } }
      }
    },
    missingInformation: { type: "array", maxItems: 6, items: { type: "string" } },
    caveats: { type: "array", maxItems: 5, items: { type: "string" } },
    suggestedAction: {
      anyOf: [
        { type: "null" },
        { type: "object", additionalProperties: false, required: ["label", "route"], properties: { label: { type: "string" }, route: { type: "string" } } }
      ]
    },
    followUps: { type: "array", maxItems: 3, items: { type: "string" } }
  }
} as const;

export function createOpenAICopilotProvider(): CopilotProvider {
  return {
    available: isOpenAIConfigured,
    model: getCopilotModel,
    async createTurn(input): Promise<CopilotProviderTurn> {
      const client = createOpenAIClient();
      if (!client) throw new Error("OpenAI provider unavailable");
      const response = await runWithOpenAITimeout((signal) => client.responses.create({
        model: getCopilotModel(),
        store: false,
        instructions: input.instructions,
        input: input.items as ResponseInputItem[],
        tools: input.tools as Tool[],
        tool_choice: "auto",
        max_output_tokens: 1100,
        ...(input.requireStructuredAnswer ? {
          text: { format: { type: "json_schema", name: "revenew_copilot_answer", strict: true, schema: answerSchema } }
        } : {})
      }, { signal }), 22_000);
      const toolCalls = response.output.flatMap((item) => item.type === "function_call" ? [{ callId: item.call_id, name: item.name, argumentsJson: item.arguments }] : []);
      return {
        responseId: response.id,
        output: response.output,
        toolCalls,
        outputText: response.output_text,
        usage: {
          inputTokens: response.usage?.input_tokens ?? 0,
          outputTokens: response.usage?.output_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0
        },
        model: response.model
      };
    }
  };
}
