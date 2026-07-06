import { ForbiddenState } from "@/components/authz/ForbiddenState";
import { AdminEmptyState, AdminHeader, AdminMetricCard, AdminRangeLinks, AdminSection, BusinessCostTable, MarginStatusBadge } from "@/components/admin/AdminUi";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { hasPermission } from "@/lib/authz/has-permission";
import { formatMicros, loadAdminInsights, resolveAdminDateRange } from "@/lib/admin/insights";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams
}: {
  searchParams?: { range?: string };
}) {
  const authorization = await getAuthorizationContext();
  const canAccessAdmin = hasPermission(authorization, "platform.admin.access");

  if (!canAccessAdmin) {
    return (
      <div className="px-4 py-8 sm:px-6 xl:px-8">
        <ForbiddenState
          title="Nu ai permisiunea necesară pentru această secțiune."
          description="Accesul este controlat de rolurile și permisiunile asociate contului tău."
        />
      </div>
    );
  }

  const range = resolveAdminDateRange(searchParams?.range);
  const insights = await loadAdminInsights(range);
  const failedRate = insights.totals.requestCount ? (insights.totals.failedRequestCount ?? 0) / insights.totals.requestCount : null;
  const marginRatio = insights.totals.configuredMonthlyValueMicros && insights.totals.providerCostMicros !== null
    ? insights.totals.providerCostMicros / insights.totals.configuredMonthlyValueMicros
    : null;

  return (
    <main className="px-4 py-8 sm:px-6 xl:px-8">
      <AdminHeader
        title="Control operațional"
        description="Venituri, costuri, utilizare și sănătatea platformei."
        rangeLabel={range.label}
        actions={<AdminRangeLinks active={range.key} />}
      />

      <div className="mt-6 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 text-sm text-[rgb(var(--muted-foreground))]">
        Rolurile platformei sunt administrate exclusiv la nivelul bazei de date.
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <AdminMetricCard label="Valoare lunară configurată" value={formatMicros(insights.totals.configuredMonthlyValueMicros)} detail="Nu este venit încasat. Se afișează doar când există o valoare contractuală configurată." />
        <AdminMetricCard label="Cost API" value={formatMicros(insights.totals.providerCostMicros)} detail={insights.usageAvailable ? "Cost provider estimat din evenimentele de utilizare." : "Metering indisponibil."} />
        <AdminMetricCard label="Contribuție după API" value={formatMicros(insights.totals.postApiContributionMicros)} detail="Valoare configurată minus cost API estimat." />
        <AdminMetricCard label="Marjă după cost API" value={insights.totals.postApiMargin === null ? "Indisponibil" : `${Math.round(insights.totals.postApiMargin * 100)}%`} detail="Nu include hosting, salarii, taxe sau comisioane." />
        <AdminMetricCard label="Firme active" value={`${insights.totals.activeBusinesses}`} detail="Firme citite din baza de date internă." />
        <AdminMetricCard label="Erori provider" value={insights.totals.failedRequestCount === null ? "Indisponibil" : `${insights.totals.failedRequestCount}`} detail={failedRate === null ? "Fără date de metering." : `Rată erori: ${Math.round(failedRate * 100)}%.`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <AdminSection title="Valoare, cost și contribuție" description="Trend simplificat pentru perioada selectată. Nu afișăm grafic financiar când lipsește valoarea contractuală sau metering-ul.">
          {insights.totals.configuredMonthlyValueMicros === null || insights.totals.providerCostMicros === null ? (
            <AdminEmptyState title="Date financiare insuficiente" description="Costurile vor apărea după activarea metering-ului. Valoarea lunară apare doar când există o sursă contractuală configurată, nu din presupuneri." />
          ) : (
            <div className="grid gap-3">
              <div className="h-3 rounded-full bg-[rgb(var(--muted))]">
                <div className="h-3 rounded-full bg-[rgb(var(--primary))]" style={{ width: `${Math.min(100, Math.round((marginRatio ?? 0) * 100))}%` }} />
              </div>
              <p className="text-sm text-[rgb(var(--muted-foreground))]">Cost API raportat la valoarea configurată: {marginRatio === null ? "indisponibil" : `${Math.round(marginRatio * 100)}%`}.</p>
            </div>
          )}
        </AdminSection>

        <AdminSection title="Distribuție marjă" description="Grupează firmele după raportul cost API / valoare plan.">
          <div className="grid gap-3">
            {(["healthy", "watch", "warning", "critical", "insufficient_data"] as const).map((status) => {
              const count = insights.businesses.filter((business) => business.marginStatus === status).length;
              return (
                <div key={status} className="flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] pb-3">
                  <MarginStatusBadge status={status} />
                  <span className="font-semibold">{count}</span>
                </div>
              );
            })}
          </div>
        </AdminSection>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <AdminSection title="Firme cu cel mai mare cost API" description="Ordonare după costul provider estimat în perioada selectată.">
          <BusinessCostTable businesses={insights.businesses} limit={8} />
        </AdminSection>

        <AdminSection title="Cost pe funcție" description="Funcțiile sunt chei interne stabile, mapate la etichete românești centralizat.">
          {insights.featureCosts.length ? (
            <div className="grid gap-3">
              {insights.featureCosts.slice(0, 8).map((feature) => (
                <div key={feature.featureId} className="border-b border-[rgb(var(--border))] pb-3">
                  <div className="flex justify-between gap-3">
                    <p className="font-semibold">{feature.label}</p>
                    <p>{formatMicros(feature.costMicros)}</p>
                  </div>
                  <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
                    {feature.requestCount} cereri · succes {feature.successRate === null ? "indisponibil" : `${Math.round(feature.successRate * 100)}%`} · cost mediu {formatMicros(feature.averageCostMicros)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <AdminEmptyState title="Nu există costuri pe funcții" description="Metering-ul va popula această secțiune după primele operațiuni provider-backed." />
          )}
        </AdminSection>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <AdminSection title="Avertismente operaționale" description="Alerte interne, fără a expune secrete sau conținut comercial brut.">
          {insights.alerts.length ? (
            <div className="grid gap-3">
              {insights.alerts.map((alert) => (
                <div key={`${alert.title}-${alert.detail}`} className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-4">
                  <p className="font-semibold">{alert.title}</p>
                  <p className="mt-1 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{alert.detail}</p>
                  <p className="mt-2 text-xs font-semibold text-[rgb(var(--primary))]">{alert.action}</p>
                </div>
              ))}
            </div>
          ) : (
            <AdminEmptyState title="Nu există avertismente" description="Nu au fost detectate costuri ridicate, erori majore sau consum anormal în perioada selectată." />
          )}
        </AdminSection>

        <AdminSection title="Erori provider recente" description="Agregare pe provider, model, funcție și business.">
          {insights.providerIssues.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.12em] text-[rgb(var(--muted-foreground))]">
                  <tr><th className="py-2 pr-3">Provider</th><th className="py-2 pr-3">Model</th><th className="py-2 pr-3">Business</th><th className="py-2 pr-3">Erori</th><th className="py-2 pr-3">Ultima</th></tr>
                </thead>
                <tbody>
                  {insights.providerIssues.slice(0, 10).map((issue) => (
                    <tr key={`${issue.provider}-${issue.model}-${issue.businessName}-${issue.errorCategory}`} className="border-t border-[rgb(var(--border))]">
                      <td className="py-2 pr-3">{issue.provider}</td>
                      <td className="py-2 pr-3">{issue.model}</td>
                      <td className="py-2 pr-3">{issue.businessName}</td>
                      <td className="py-2 pr-3">{issue.count}</td>
                      <td className="py-2 pr-3">{issue.lastOccurrence ? new Date(issue.lastOccurrence).toLocaleString("ro-RO") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <AdminEmptyState title="Nu există erori provider" description="Nu s-au găsit erori provider în perioada selectată sau metering-ul nu este disponibil." />
          )}
        </AdminSection>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <AdminSection title="Audit recent" description="Evenimente de rol platformă, scrise de triggerul bazei de date.">
          {insights.auditEvents.length ? (
            <div className="grid gap-3 text-sm">
              {insights.auditEvents.slice(0, 8).map((event) => (
                <div key={`${event.role}-${event.action}-${event.changedAt}`} className="flex justify-between gap-3 border-b border-[rgb(var(--border))] pb-3">
                  <span>{event.role} · {event.action}</span>
                  <span className="text-[rgb(var(--muted-foreground))]">{new Date(event.changedAt).toLocaleString("ro-RO")}</span>
                </div>
              ))}
            </div>
          ) : (
            <AdminEmptyState title="Audit indisponibil" description="Auditul apare după aplicarea migrației de roluri și primele schimbări de rol." />
          )}
        </AdminSection>

        <AdminSection title="Status sistem" description="Stări reale, fără a afișa valori de mediu sau chei.">
          <div className="grid gap-3">
            {insights.systemStatus.map((item) => (
              <div key={item.label} className="flex justify-between gap-4 border-b border-[rgb(var(--border))] pb-3">
                <div>
                  <p className="font-semibold">{item.label}</p>
                  <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">{item.detail}</p>
                </div>
                <span className="text-sm font-semibold">{item.status}</span>
              </div>
            ))}
          </div>
        </AdminSection>
      </div>
    </main>
  );
}
