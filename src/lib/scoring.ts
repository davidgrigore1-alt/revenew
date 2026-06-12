import type { Business, Opportunity, ScoreRange } from "@/lib/types";

function clamp(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function containsAny(text: string, values: string[]) {
  const normalized = text.toLowerCase();
  return values.some((value) => normalized.includes(value.toLowerCase()));
}

export function getScoreLabel(score: number) {
  if (score <= 39) return "Slab";
  if (score <= 69) return "Mediu";
  if (score <= 84) return "Bun";
  return "Foarte bun";
}

export function scoreOpportunity(
  input: Pick<
    Opportunity,
    | "title"
    | "summary"
    | "rawSourceText"
    | "city"
    | "county"
    | "deadline"
    | "estimatedValueHigh"
    | "sourceUrl"
    | "contact"
  >,
  business: Business
): ScoreRange {
  const text = `${input.title} ${input.summary} ${input.rawSourceText}`;
  const serviceMatch = containsAny(text, business.services) ? 35 : 14;
  const industryMatch = containsAny(text, business.targetIndustries) ? 25 : 10;
  const customerMatch = containsAny(text, business.targetCustomers) ? 20 : 8;
  const locationMatch =
    business.targetCities.includes(input.city) || input.county === business.county || input.city === business.city
      ? 18
      : 5;

  const fitScore = clamp(serviceMatch + industryMatch + customerMatch + locationMatch);

  const daysUntilDeadline = input.deadline
    ? Math.ceil((new Date(input.deadline).getTime() - new Date("2026-06-10").getTime()) / 86400000)
    : 30;
  const urgencyScore = clamp(daysUntilDeadline <= 3 ? 95 : daysUntilDeadline <= 10 ? 82 : daysUntilDeadline <= 21 ? 62 : 38);

  const moneyScore = clamp((input.estimatedValueHigh / 60000) * 100);

  const confidenceScore = clamp(
    20 +
      (input.contact ? 20 : 0) +
      (input.sourceUrl ? 15 : 0) +
      (input.rawSourceText.length > 120 ? 20 : 8) +
      (input.deadline ? 15 : 0) +
      (input.estimatedValueHigh > 0 ? 10 : 0)
  );

  return { fitScore, urgencyScore, moneyScore, confidenceScore };
}
