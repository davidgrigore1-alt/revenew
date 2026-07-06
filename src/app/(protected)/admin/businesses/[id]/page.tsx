import { notFound } from "next/navigation";
import { ForbiddenState } from "@/components/authz/ForbiddenState";
import { AdminEmptyState, AdminHeader, AdminMetricCard, AdminRangeLinks, AdminSection, MarginStatusBadge, RatioBar } from "@/components/admin/AdminUi";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { hasPermission } from "@/lib/authz/has-permission";
import { formatMicros, loadAdminInsights, resolveAdminDateRange } from "@/lib/admin/insights";

export const dynamic = "force-dynamic";

export default async function AdminBusinessDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { range?: string };
}) {
  const authorization = await getAuthorizationContext();
  if (!hasPermission(authorization, "platform.businesses.read_all")) {
    return <div className="px-4 py-8 sm:px-6 xl:px-8"><ForbiddenState /></div>;
  }

  const range = resolveAdminDateRange(searchParams?.range);
  const insights = await loadAdminInsights(range);
  const business = insights.businesses.find((item) => item.id === params.id);
  if (!business) notFound();

  const events = insights.usageEvents.filter((event) => event.businessId === business.id);
  const featureCosts = insights.featureCosts.filter((feature) => events.some((event) => event.featureId === feature.featureId));
  const modelCosts = insights.modelCosts.filter((model) => events.some((event) => (event.provider ?? "necunoscut") === model.provider && (event.model ?? "necunoscut") === model.model));
  const contribution = business.configuredMonthlyValueMicros !== null && business.providerCostMicros !== null
    ? business.configuredMonthlyValueMicros - business.providerCostMicros
    : null;
  const margin = business.configuredMonthlyValueMicros && contribution !== null ? contribution / business.configuredMonthlyValueMicros : null;

  return (
    <main className="px-4 py-8 sm:px-6 xl:px-8">
      <AdminHeader
        title={business.name}
        description="Drill-down intern pentru costuri, utilizare, marjă după API și sănătate operațională."
        rangeLabel={range.label}
        actions={<AdminRangeLinks active={range.key} />}
      />

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard label="Valoare lunară" value={formatMicros(business.configuredMonthlyValueMicros)} detail="Apare doar când există valoare contractuală configurată." />
        <AdminMetricCard label="Cost API" value={formatMicros(business.providerCostMicros)} detail="Cost provider estimat pentru perioada selectată." />
        <AdminMetricCard label="Contribuție după API" value={formatMicros(contribution)} detail="Valoare configurată minus cost API." />
        <AdminMetricCard label="Marjă după cost API" value={margin === null ? "Indisponibil" : `${Math.round(margin * 100)}%`} detail="Nu este profit total." />
        <AdminMetricCard label="Cereri" value={business.requestCount === null ? "Indisponibil" : `${business.requestCount}`} detail={`${business.failedRequestCount ?? 0} erori provider.`} status={business.marginStatus} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <AdminSection title="Context business">
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-[rgb(var(--border))] pb-3"><dt>Legal</dt><dd>{business.legalName ?? "Indisponibil"}</dd></div>
            <div className="flex justify-between gap-4 border-b border-[rgb(var(--border))] pb-3"><dt>Owner</dt><dd>{business.ownerEmail ?? "Indisponibil"}</dd></div>
            <div className="flex justify-between gap-4 border-b border-[rgb(var(--border))] pb-3"><dt>Plan</dt><dd>{business.planId ?? "Fără plan confirmat"}</dd></div>
            <div className="flex justify-between gap-4 border-b border-[rgb(var(--border))] pb-3"><dt>Status acces</dt><dd>{business.accessStatus}</dd></div>
            <div className="flex justify-between gap-4 border-b border-[rgb(var(--border))] pb-3"><dt>Status marjă</dt><dd><MarginStatusBadge status={business.marginStatus} /></dd></div>
          </dl>
        </AdminSection>

        <AdminSection title="Plan și consum">
          <div className="grid gap-4">
            <RatioBar value={business.configuredMonthlyValueMicros && business.providerCostMicros !== null ? business.providerCostMicros / business.configuredMonthlyValueMicros : null} label="Cost API / valoare configurată" />
            <RatioBar value={business.requestCount && business.failedRequestCount !== null ? business.failedRequestCount / business.requestCount : null} label="Rată erori provider" />
            <p className="text-sm leading-6 text-[rgb(var(--muted-foreground))]">Forecast simplificat: disponibil după ce există costuri și o perioadă suficientă de utilizare. Nu este model predictiv AI.</p>
          </div>
        </AdminSection>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <AdminSection title="Cost pe funcție">
          {featureCosts.length ? (
            <div className="grid gap-3">
              {featureCosts.map((feature) => (
                <div key={feature.featureId} className="flex justify-between gap-4 border-b border-[rgb(var(--border))] pb-3 text-sm">
                  <span>{feature.label}</span>
                  <span>{feature.requestCount} cereri · {formatMicros(feature.costMicros)}</span>
                </div>
              ))}
            </div>
          ) : <AdminEmptyState title="Fără utilizare pe funcții" description="Nu există evenimente de utilizare pentru perioada selectată." />}
        </AdminSection>

        <AdminSection title="Cost pe provider și model">
          {modelCosts.length ? (
            <div className="grid gap-3">
              {modelCosts.map((model) => (
                <div key={`${model.provider}-${model.model}`} className="flex justify-between gap-4 border-b border-[rgb(var(--border))] pb-3 text-sm">
                  <span>{model.provider} · {model.model}</span>
                  <span>{model.requestCount} cereri · {formatMicros(model.costMicros)}</span>
                </div>
              ))}
            </div>
          ) : <AdminEmptyState title="Fără costuri pe model" description="Modelele apar după primele operațiuni provider-backed metered." />}
        </AdminSection>
      </div>

      <div className="mt-6">
        <AdminSection title="Evenimente recente">
          {events.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.12em] text-[rgb(var(--muted-foreground))]">
                  <tr><th className="py-2 pr-3">Timp</th><th className="py-2 pr-3">Funcție</th><th className="py-2 pr-3">Provider</th><th className="py-2 pr-3">Model</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Cost</th></tr>
                </thead>
                <tbody>
                  {events.slice(0, 50).map((event) => (
                    <tr key={event.id} className="border-t border-[rgb(var(--border))]">
                      <td className="py-2 pr-3">{new Date(event.createdAt).toLocaleString("ro-RO")}</td>
                      <td className="py-2 pr-3">{event.featureId}</td>
                      <td className="py-2 pr-3">{event.provider ?? "-"}</td>
                      <td className="py-2 pr-3">{event.model ?? "-"}</td>
                      <td className="py-2 pr-3">{event.status}</td>
                      <td className="py-2 pr-3">{formatMicros(event.estimatedCostMicros)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <AdminEmptyState title="Nu există evenimente recente" description="Evenimentele apar după activarea metering-ului și primele cereri provider-backed." />}
        </AdminSection>
      </div>
    </main>
  );
}
