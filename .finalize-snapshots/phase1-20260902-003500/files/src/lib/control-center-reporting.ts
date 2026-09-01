import type { VisualCase } from "@/lib/control-center-visuals";
import { convertReportingAmount, summarizeReportingAmounts, type ReportingCurrency, type ReportingFxRate } from "@/lib/reporting-currency";

export type ReportingCase = VisualCase & { opportunityTitle?: string };
export const attentionClasses = [
  { label: "Restant", token: "--danger-text" },
  { label: "Necesită atenție", token: "--warning-text" },
  { label: "De urmărit", token: "--text-muted" }
] as const;

function calendarDate(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(value).toISOString().slice(0,10) === value ? value : null;
  const parts = new Intl.DateTimeFormat("en-CA", {timeZone:"Europe/Bucharest",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(value));
  return ["year","month","day"].map(key => parts.find(part => part.type === key)?.value).join("-");
}

export function buildReportingControlCenter(cases: ReportingCase[], currency: ReportingCurrency, fx: ReportingFxRate | null, asOf: string) {
  const unique = Array.from(new Map(cases.map(item => [item.id, item])).values());
  const summary = summarizeReportingAmounts(unique, currency, fx);
  const today = calendarDate(asOf);
  const buckets = ["Depășit", "≤ 7 zile", "8–14 zile", "Mai târziu"].map(label => ({ label, values: [0,0,0], counts: [0,0,0], cases: [] as ReportingCase[] }));
  type Contribution = { item: ReportingCase; converted: number; classification: string };
  const byDate = new Map<string, { value: number; cases: Contribution[] }>();
  let undated = 0, undatedCount = 0;
  const undatedCases: ReportingCase[] = [];
  for (const item of unique) {
    const date = calendarDate(item.deadline);
    const classification = item.overdue ? 0 : item.severity === "informative" ? 2 : 1;
    const converted = fx ? convertReportingAmount(item.value, item.currency, currency, fx) : null;
    if (!date) {
      undatedCount++;
      undatedCases.push(item);
      if (converted !== null) undated += converted;
      continue;
    }
    if (today) {
      const days = (Date.parse(date) - Date.parse(today)) / 86_400_000;
      const bucket = buckets[days < 0 ? 0 : days <= 7 ? 1 : days <= 14 ? 2 : 3];
      bucket.counts[classification]++;
      bucket.cases.push(item);
      if (converted !== null) bucket.values[classification] += converted;
    }
    if (converted === null || summary.total === null) continue;
    const point = byDate.get(date) ?? { value: 0, cases: [] };
    point.value += converted;
    point.cases.push({ item, converted, classification: attentionClasses[classification].label });
    byDate.set(date, point);
  }
  let cumulative = 0, cumulativeCount = 0;
  const composition = new Map<string, { currency: string; count: number }>();
  const points = Array.from(byDate).sort(([a],[b]) => a.localeCompare(b)).map(([date, point]) => {
    cumulative += point.value;
    cumulativeCount += point.cases.length;
    for (const row of point.cases) {
      const previous = composition.get(row.item.currency);
      composition.set(row.item.currency, { currency: row.item.currency, count: (previous?.count ?? 0)+1 });
    }
    return { date, ...point, cumulative, cumulativeCount, cumulativeOriginals: Array.from(composition.values()).sort((a,b)=>a.currency.localeCompare(b.currency)) };
  });
  const todayInRange = Boolean(today && points.length > 1 && today >= points[0].date && today <= points[points.length-1].date);
  const overduePoints = today ? points.filter(point => point.date < today) : [];
  return {
    ...summary, points,
    buckets: buckets.map(bucket => ({ ...bucket, summary: summarizeReportingAmounts(bucket.cases, currency, fx) })),
    undated, undatedCount, undatedOriginals: summarizeReportingAmounts(undatedCases, currency, fx).originals,
    count: unique.length, datedValue: cumulative, currency, today, todayInRange,
    overdueValue: overduePoints.reduce((total,point)=>total+point.value,0),
    overdueCount: overduePoints.reduce((total,point)=>total+point.cases.length,0)
  };
}
