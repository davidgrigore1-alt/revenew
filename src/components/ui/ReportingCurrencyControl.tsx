import type { ReportingCurrency, ReportingFxRate } from "@/lib/reporting-currency";

export function ReportingCurrencyControl({ currency, onChange, fx }: {
  currency: ReportingCurrency; onChange: (currency: ReportingCurrency) => void; fx: ReportingFxRate | null;
}) {
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
    <div role="group" aria-label="Moneda de raportare analitică" className="inline-flex h-[var(--control-height)] shrink-0 items-center gap-1 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--background-soft))] p-0.5">
      {(["RON", "EUR"] as const).map(item => <button type="button" key={item} disabled={!fx} aria-pressed={currency === item} onClick={() => onChange(item)}
        className="focus-ring h-full rounded-[5px] px-3 text-xs font-medium text-[rgb(var(--text-muted))] aria-pressed:bg-[rgb(var(--surface-muted))] aria-pressed:text-[rgb(var(--primary))] disabled:cursor-not-allowed">{item}</button>)}
    </div>
    <p className="text-micro leading-5 text-[rgb(var(--text-muted))]">{fx
      ? <>Curs de referință ECB · {new Intl.DateTimeFormat("ro-RO", {day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(fx.publishedAt+"T12:00:00Z"))} · 1 EUR = {new Intl.NumberFormat("ro-RO", {maximumFractionDigits:6}).format(fx.rate)} RON</>
      : "Conversia valutară este temporar indisponibilă."}</p>
  </div>;
}
