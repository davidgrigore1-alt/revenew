export type ModelPricing = {
  provider: "openai";
  model: string;
  version: string;
  currency: "EUR";
  inputMicrosPerMillionTokens: number;
  outputMicrosPerMillionTokens: number;
};

const fallbackPricing: ModelPricing = {
  provider: "openai",
  model: "default",
  version: "2026-06-24",
  currency: "EUR",
  inputMicrosPerMillionTokens: 150_000,
  outputMicrosPerMillionTokens: 600_000
};

const pricing: ModelPricing[] = [
  {
    provider: "openai",
    model: "gpt-4o-mini",
    version: "2026-06-24",
    currency: "EUR",
    inputMicrosPerMillionTokens: 150_000,
    outputMicrosPerMillionTokens: 600_000
  }
];

export function getModelPricing(model: string) {
  return pricing.find((item) => item.model === model) ?? { ...fallbackPricing, model };
}
