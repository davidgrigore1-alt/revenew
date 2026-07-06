import Link from "next/link";
import { ForbiddenState } from "@/components/authz/ForbiddenState";
import { AdminEmptyState, AdminHeader, AdminMetricCard, AdminRangeLinks, AdminSection } from "@/components/admin/AdminUi";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { hasPermission } from "@/lib/authz/has-permission";
import { formatMicros, loadAdminInsights, resolveAdminDateRange } from "@/lib/admin/insights";

export const dynamic = "force-dynamic";

export default async function AdminUsagePage({ searchParams }: { searchParams?: { range?: string } }) {
  const authorization = await getAuthorizationContext();
  if (!hasPermission(authorization, "platform.usage.read_all")) {
    return <div className="px-4 py-8 sm:px-6 xl:px-8"><ForbiddenState /></div>;
  }

  const range = resolveAdminDateRange(searchParams?.range);
  const insights = await loadAdminInsights(range);
  const successCount = insights.usageEvents.filter((event) => event.status === "settled").length;
  const totalUnits = insights.usageEvents.reduce((sum, event) => sum + event.totalTokens + event.units, 0);

  return (
    <main className="px-4 py-8 sm:px-6 xl:px-8">
      <AdminHeader
        title="Utilizare"
        description="Explorer operațional pentru evenimente metered, fără prompturi, secrete sau răspunsuri provider brute."
        rangeLabel={range.label}
        actions={
          <>
            <AdminRangeLinks active={range.key} />
            <Link href={`/admin/usage/export?range=${range.key}`} className="focus-ring rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-semibold text-[rgb(var(--foreground))]">
              Export CSV
            </Link>
          </>
        }
      />

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard label="Cereri" value={insights.totals.requestCount === null ? "Indisponibil" : `${insights.totals.requestCount}`} detail="Evenimente de utilizare în perioada selectată." />
        <AdminMetricCard label="Succes" value={insights.usageAvailable ? `${successCount}` : "Indisponibil"} detail="Evenimente finalizate și decontate." />
        <AdminMetricCard label="Eșuate" value={insights.totals.failedRequestCount === null ? "Indisponibil" : `${insights.totals.failedRequestCount}`} detail="Erori provider sau cereri marcate failed." />
        <AdminMetricCard label="Unități / tokeni" value={insights.usageAvailable ? `${totalUnits.toLocaleString("ro-RO")}` : "Indisponibil"} detail="Tokeni plus unități metered, unde există." />
        <AdminMetricCard label="Cost total" value={formatMicros(insights.totals.providerCostMicros)} detail="Cost API estimat centralizat." />
      </div>

      {!insights.usageAvailable ? (
        <div className="mt-6">
          <AdminEmptyState
            title="Datele de consum nu sunt încă disponibile în acest mediu"
            description="Schema de usage metering nu este disponibilă sau nu poate fi citită. Nu afișăm zero-uri artificiale și nu folosim date demonstrative."
          />
        </div>
      ) : null}

      <div className="mt-6">
        <AdminSection title="Evenimente de utilizare" description="Primele 1000 evenimente din perioada selectată. Paginarea server-side completă poate fi extinsă pe aceeași structură.">
          {insights.usageEvents.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.12em] text-[rgb(var(--muted-foreground))]">
                  <tr><th className="py-2 pr-3">Timestamp</th><th className="py-2 pr-3">Business</th><th className="py-2 pr-3">Feature</th><th className="py-2 pr-3">Provider</th><th className="py-2 pr-3">Model</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Input</th><th className="py-2 pr-3">Output</th><th className="py-2 pr-3">Cost</th><th className="py-2 pr-3">Eroare</th></tr>
                </thead>
                <tbody>
                  {insights.usageEvents.map((event) => {
                    const business = insights.businesses.find((item) => item.id === event.businessId);
                    return (
                      <tr key={event.id} className="border-t border-[rgb(var(--border))]">
                        <td className="py-2 pr-3">{new Date(event.createdAt).toLocaleString("ro-RO")}</td>
                        <td className="py-2 pr-3">{business?.name ?? "Fără business"}</td>
                        <td className="py-2 pr-3">{event.featureId}</td>
                        <td className="py-2 pr-3">{event.provider ?? "-"}</td>
                        <td className="py-2 pr-3">{event.model ?? "-"}</td>
                        <td className="py-2 pr-3">{event.status}</td>
                        <td className="py-2 pr-3">{event.promptTokens}</td>
                        <td className="py-2 pr-3">{event.completionTokens}</td>
                        <td className="py-2 pr-3">{formatMicros(event.estimatedCostMicros)}</td>
                        <td className="py-2 pr-3">{event.errorReason ?? "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <AdminEmptyState title="Nu există încă evenimente de utilizare" description="Metering-ul va apărea după aplicarea migrării și după primele operațiuni care folosesc provideri." />
          )}
        </AdminSection>
      </div>
    </main>
  );
}
