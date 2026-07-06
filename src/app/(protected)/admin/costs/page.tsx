import { ForbiddenState } from "@/components/authz/ForbiddenState";
import { AdminEmptyState, AdminHeader, AdminMetricCard, AdminRangeLinks, AdminSection, BusinessCostTable } from "@/components/admin/AdminUi";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { hasPermission } from "@/lib/authz/has-permission";
import { formatMicros, loadAdminInsights, resolveAdminDateRange } from "@/lib/admin/insights";
import { usagePlanCatalog } from "@/lib/usage/plan-catalog";

export const dynamic = "force-dynamic";

export default async function AdminCostsPage({ searchParams }: { searchParams?: { range?: string } }) {
  const authorization = await getAuthorizationContext();
  if (!hasPermission(authorization, "platform.usage.read_all")) {
    return <div className="px-4 py-8 sm:px-6 xl:px-8"><ForbiddenState /></div>;
  }

  const range = resolveAdminDateRange(searchParams?.range);
  const insights = await loadAdminInsights(range);

  return (
    <main className="min-w-0 px-4 py-8 sm:px-6 xl:px-8">
      <AdminHeader title="Costuri" description="Structură de cost provider, modele, funcții, planuri și forecast simplificat." rangeLabel={range.label} actions={<AdminRangeLinks active={range.key} />} />

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Cost API" value={formatMicros(insights.totals.providerCostMicros)} detail="Cost estimat din evenimentele metered." />
        <AdminMetricCard label="Cost rezervat" value={formatMicros(insights.totals.reservedCostMicros)} detail="Cost așteptat pentru rezervări neconfirmate." />
        <AdminMetricCard label="Forecast simplificat" value={formatMicros(insights.totals.forecastCostMicros)} detail="Disponibil doar după minimum trei evenimente reale." />
        <AdminMetricCard label="Contribuție după API" value={formatMicros(insights.totals.postApiContributionMicros)} detail="Nu este profit total." />
        <AdminMetricCard label="Marjă după cost API" value={insights.totals.postApiMargin === null ? "Indisponibil" : `${Math.round(insights.totals.postApiMargin * 100)}%`} detail="Disponibilă doar cu valoare plan configurată." />
      </div>

      {!insights.usageAvailable ? (
        <div className="mt-6">
          <AdminEmptyState
            title="Datele de cost nu sunt încă disponibile în acest mediu"
            description="Schema de usage metering nu este disponibilă sau nu poate fi citită. Costurile rămân indisponibile până la aplicarea manuală a SQL-ului de usage."
          />
        </div>
      ) : null}

      <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-2">
        <AdminSection title="Cost pe firmă">
          <BusinessCostTable businesses={insights.businesses} limit={10} />
        </AdminSection>

        <AdminSection title="Cost pe model">
          {insights.modelCosts.length ? (
            <div className="grid gap-3">
              {insights.modelCosts.map((model) => (
                <div key={`${model.provider}-${model.model}`} className="flex flex-wrap justify-between gap-4 border-b border-[rgb(var(--border))] pb-3 text-sm">
                  <span className="break-words">{model.provider} · {model.model}</span>
                  <span>{model.requestCount} cereri · {model.totalUnits.toLocaleString("ro-RO")} unități · {formatMicros(model.costMicros)}</span>
                </div>
              ))}
            </div>
          ) : <AdminEmptyState title="Fără costuri pe model" description="Modelele apar după primele evenimente provider-backed." />}
        </AdminSection>
      </div>

      <div className="mt-6">
        <AdminSection title="Planuri și bugete interne" description="Bugete interne pentru cost provider. Nu sunt venituri încasate. Nu sunt afișate clienților.">
          <div className="app-scrollbar max-w-full overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-[rgb(var(--muted-foreground))]">
                <tr><th className="py-2 pr-3">Plan</th><th className="py-2 pr-3">Firme</th><th className="py-2 pr-3">Buget API intern</th><th className="py-2 pr-3">Cost API</th><th className="py-2 pr-3">Utilizare buget</th></tr>
              </thead>
              <tbody>
                {Object.values(usagePlanCatalog).map((plan) => {
                  const planBusinesses = insights.businesses.filter((business) => business.planId === plan.id);
                  const cost = planBusinesses.some((business) => business.providerCostMicros !== null)
                    ? planBusinesses.reduce((sum, business) => sum + (business.providerCostMicros ?? 0), 0)
                    : null;
                  const budget = plan.internalMonthlyBudgetMicros * planBusinesses.length;
                  return (
                    <tr key={plan.id} className="border-t border-[rgb(var(--border))]">
                      <td className="py-2 pr-3">{plan.label}</td>
                      <td className="py-2 pr-3">{planBusinesses.length}</td>
                      <td className="py-2 pr-3">{formatMicros(budget || null)}</td>
                      <td className="py-2 pr-3">{formatMicros(cost)}</td>
                      <td className="py-2 pr-3">{cost === null || !budget ? "Indisponibil" : `${Math.round((cost / budget) * 100)}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdminSection>
      </div>
    </main>
  );
}
