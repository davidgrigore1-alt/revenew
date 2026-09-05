import "server-only";

import { randomUUID } from "crypto";
import type { CopilotProvider, CopilotProviderTurn } from "@/lib/ai/copilot-types";

const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "qwen3.5:9b";
const DEFAULT_KEEP_ALIVE = "30m";
const DEFAULT_NUM_CTX = 8_192;
const DEFAULT_NUM_PREDICT = 480;
const DEFAULT_MAX_INPUT_CHARS = 12_000;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

const answerSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "summaryType", "evidence", "missingInformation", "caveats", "suggestedAction", "followUps"],
  properties: {
    answer: { type: "string" },
    summaryType: { type: "string", enum: ["commercial", "product_help", "insufficient_information", "temporary_error"] },
    evidence: { type: "array", maxItems: 8, items: { type: "object", additionalProperties: false, required: ["sourceId"], properties: { sourceId: { type: "string" } } } },
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

function getConfig() {
  const rawUrl = process.env.OLLAMA_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "http:" || !LOCAL_HOSTS.has(parsed.hostname) || parsed.username || parsed.password) {
    throw new Error("OLLAMA_BASE_URL must be a credential-free loopback HTTP URL");
  }
  const model = process.env.OLLAMA_MODEL?.trim() || DEFAULT_MODEL;
  if (!/^[a-z0-9][a-z0-9._:/-]{0,100}$/i.test(model)) throw new Error("OLLAMA_MODEL is invalid");
  const requestedTimeout = Number.parseInt(process.env.OLLAMA_TIMEOUT_MS ?? "45000", 10);
  const timeoutMs = Number.isFinite(requestedTimeout) ? Math.min(90_000, Math.max(5_000, requestedTimeout)) : 45_000;

  const requestedContext = Number.parseInt(process.env.OLLAMA_NUM_CTX ?? String(DEFAULT_NUM_CTX), 10);
  const numCtx = Number.isFinite(requestedContext)
    ? Math.min(32_768, Math.max(4_096, requestedContext))
    : DEFAULT_NUM_CTX;

  const requestedPredict = Number.parseInt(process.env.OLLAMA_NUM_PREDICT ?? String(DEFAULT_NUM_PREDICT), 10);
  const numPredict = Number.isFinite(requestedPredict)
    ? Math.min(900, Math.max(128, requestedPredict))
    : DEFAULT_NUM_PREDICT;

  const requestedKeepAlive = process.env.OLLAMA_KEEP_ALIVE?.trim() || DEFAULT_KEEP_ALIVE;
  const keepAlive = /^(?:-1|0|\d+[smh])$/i.test(requestedKeepAlive)
    ? requestedKeepAlive
    : DEFAULT_KEEP_ALIVE;

  const requestedMaxInput = Number.parseInt(process.env.OLLAMA_MAX_INPUT_CHARS ?? String(DEFAULT_MAX_INPUT_CHARS), 10);
  const maxInputChars = Number.isFinite(requestedMaxInput)
    ? Math.min(24_000, Math.max(6_000, requestedMaxInput))
    : DEFAULT_MAX_INPUT_CHARS;

  return {
    baseUrl: parsed.toString().replace(/\/$/, ""),
    model,
    timeoutMs,
    numCtx,
    numPredict,
    keepAlive,
    maxInputChars
  };
}

function configured() {
  if (process.env.REVENEW_AI_PROVIDER?.trim().toLowerCase() !== "ollama") return false;
  try { getConfig(); return true; } catch { return false; }
}

function itemText(items: unknown[], maxChars: number) {
  return items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const value = item as Record<string, unknown>;
    if (typeof value.content === "string") return [value.content];
    if (!Array.isArray(value.content)) return [];
    return value.content.flatMap((part) => part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string"
      ? [String((part as Record<string, unknown>).text)] : []);
  }).join("\n\n").slice(0, maxChars);
}

function structuredOutputInstruction(schema: unknown) {
  return [
    "STRUCTURED OUTPUT CONTRACT:",
    "Returnează exclusiv JSON valid care respectă exact schema de mai jos.",
    "Fără markdown, fără text înainte sau după JSON.",
    JSON.stringify(schema)
  ].join("\n");
}

export function createOllamaCopilotProvider(): CopilotProvider {
  return {
    kind: "ollama",
    deterministicFirst: true,
    available: configured,
    model() {
      try { return getConfig().model; } catch { return DEFAULT_MODEL; }
    },
    async createTurn(input): Promise<CopilotProviderTurn> {
      const config = getConfig();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
      try {
        const responseFormat = input.responseSchema ?? answerSchema;
        const userText = itemText(input.items, config.maxInputChars);
        const response = await fetch(`${config.baseUrl}/api/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: input.signal ? AbortSignal.any([controller.signal,input.signal]) : controller.signal,
          cache: "no-store",
          body: JSON.stringify({
            model: config.model,
            stream: false,
            think: false,
            keep_alive: config.keepAlive,
            format: responseFormat,
            messages: [
              {
                role: "system",
                content: `${input.instructions}\n\n${structuredOutputInstruction(responseFormat)}`
              },
              { role: "user", content: userText }
            ],
            options: {
              temperature: 0,
              num_ctx: config.numCtx,
              num_predict: config.numPredict
            }
          })
        });
        if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
        const payload = await response.json() as {
          model?: string;
          message?: { content?: string; thinking?: string };
          done_reason?: string;
          total_duration?: number;
          load_duration?: number;
          prompt_eval_count?: number;
          prompt_eval_duration?: number;
          eval_count?: number;
          eval_duration?: number;
        };
        const outputText = payload.message?.content?.trim() ?? "";
        if (!outputText) throw new Error("Ollama returned no structured answer");
        if (payload.done_reason === "length") throw new Error("Ollama structured answer was truncated");

        const inputTokens = payload.prompt_eval_count ?? 0;
        const outputTokens = payload.eval_count ?? 0;

        console.info("ollama_turn_complete", {
          model: payload.model ?? config.model,
          thinking: false,
          inputChars: userText.length,
          numCtx: config.numCtx,
          numPredict: config.numPredict,
          inputTokens,
          outputTokens,
          totalMs: Math.round((payload.total_duration ?? 0) / 1_000_000),
          loadMs: Math.round((payload.load_duration ?? 0) / 1_000_000),
          promptEvalMs: Math.round((payload.prompt_eval_duration ?? 0) / 1_000_000),
          evalMs: Math.round((payload.eval_duration ?? 0) / 1_000_000)
        });
        return {
          responseId: randomUUID(),
          output: [],
          toolCalls: [],
          outputText,
          usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
          model: payload.model ?? config.model
        };
      } finally {
        clearTimeout(timeout);
      }
    }
  };
}
