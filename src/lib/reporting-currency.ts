/** Presentation only: never writes or replaces an opportunity's original amount. */
export type ReportingCurrency = "RON" | "EUR";
export type ReportingFxRate = { base: "EUR"; quote: "RON"; rate: number; publishedAt: string; source: "ECB" };
export type OriginalAmount = { value: number | null | undefined; currency: string };

export function caseCountLabel(count: number) { return `${count} ${count === 1 ? "caz" : "cazuri"}`; }

export function convertReportingAmount(value: number | null | undefined, original: string, target: ReportingCurrency, fx: ReportingFxRate | null): number | null {
  if (value == null || !Number.isFinite(value) || !["RON", "EUR"].includes(original)) return null;
  if (original === target) return value;
  if (!fx || fx.base !== "EUR" || fx.quote !== "RON" || !Number.isFinite(fx.rate) || fx.rate <= 0) return null;
  const converted = original === "EUR" ? value * fx.rate : value / fx.rate;
  return Number.isFinite(converted) ? converted : null;
}

export function summarizeReportingAmounts(rows: OriginalAmount[], target: ReportingCurrency, fx: ReportingFxRate | null) {
  const originals = new Map<string, { currency: string; value: number; count: number }>();
  let total = 0, excludedCount = 0, eligibleCount = 0;
  let unavailable = !fx || !Number.isFinite(fx.rate) || fx.rate <= 0;
  for (const row of rows) {
    if (row.value == null || !Number.isFinite(row.value)) { excludedCount++; continue; }
    const original = originals.get(row.currency) ?? { currency: row.currency, value: 0, count: 0 };
    original.value += row.value;
    original.count++;
    originals.set(row.currency, original);
    if (!["RON", "EUR"].includes(row.currency)) { excludedCount++; continue; }
    eligibleCount++;
    const converted = convertReportingAmount(row.value, row.currency, target, fx);
    if (converted === null) unavailable = true;
    else total += converted;
  }
  return { total: unavailable || !Number.isFinite(total) || (rows.length > 0 && eligibleCount === 0) ? null : total, originals: Array.from(originals.values()).sort((a,b) => a.currency.localeCompare(b.currency)), excludedCount };
}
