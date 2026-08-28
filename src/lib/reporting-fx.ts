import "server-only";
import type { ReportingFxRate } from "@/lib/reporting-currency";

const ECB_REFERENCE_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

/** Accept only the daily EUR/RON reference; no external entities or XML execution. */
export function parseEcbReportingRate(xml: string, now = new Date()): ReportingFxRate | null {
  if (xml.length > 100_000 || /<!DOCTYPE|<!ENTITY/i.test(xml)) return null;
  const dated = Array.from(xml.matchAll(/<Cube\b[^>]*\btime=['"](\d{4}-\d{2}-\d{2})['"][^>]*>([\s\S]*?)<\/Cube>/g));
  if (dated.length !== 1) return null;
  const [, publishedAt, content] = dated[0];
  const date = Date.parse(publishedAt + "T00:00:00Z");
  const today = Date.parse(now.toISOString().slice(0, 10) + "T00:00:00Z");
  // Weekends/ECB holidays are valid; very old or future references are not.
  if (!Number.isFinite(date) || new Date(date).toISOString().slice(0, 10) !== publishedAt || date > today || today - date > 10 * 86_400_000) return null;
  const quotes = Array.from(content.matchAll(/<Cube\b[^>]*\bcurrency=['"]RON['"][^>]*\brate=['"]([0-9]+(?:\.[0-9]+)?)['"][^>]*\/\s*>/g));
  if (quotes.length !== 1) return null;
  const rate = Number(quotes[0][1]);
  return Number.isFinite(rate) && rate > 0 ? { base: "EUR", quote: "RON", rate, publishedAt, source: "ECB" } : null;
}

export async function getReportingFxRate(): Promise<ReportingFxRate | null> {
  try {
    const response = await fetch(ECB_REFERENCE_URL, {
      next: { revalidate: 21_600 },
      signal: AbortSignal.timeout(5_000),
      headers: { Accept: "application/xml" }
    });
    if (!response.ok) return null;
    return parseEcbReportingRate(await response.text());
  } catch {
    // A missing reference must never interrupt the authorized commercial view.
    return null;
  }
}
