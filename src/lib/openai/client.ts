import "server-only";
import OpenAI from "openai";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_OPENAI_TIMEOUT_MS = 20_000;

export function isOpenAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
}

export function createOpenAIClient() {
  if (!isOpenAIConfigured()) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

export async function runWithOpenAITimeout<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs = DEFAULT_OPENAI_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

export function getOpenAIErrorCode(error: unknown) {
  if (error && typeof error === "object") {
    const candidate = error as { code?: unknown; error?: { code?: unknown } };
    if (typeof candidate.code === "string") {
      return candidate.code;
    }
    if (typeof candidate.error?.code === "string") {
      return candidate.error.code;
    }
  }

  return null;
}
