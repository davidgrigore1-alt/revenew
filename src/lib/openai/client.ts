import "server-only";
import OpenAI from "openai";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

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
