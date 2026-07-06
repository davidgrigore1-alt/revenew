import { ForbiddenState } from "@/components/authz/ForbiddenState";
import { AdminEmptyState, AdminHeader, AdminRangeLinks, AdminSection } from "@/components/admin/AdminUi";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { hasPermission } from "@/lib/authz/has-permission";
import { loadAdminInsights, resolveAdminDateRange } from "@/lib/admin/insights";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({ searchParams }: { searchParams?: { range?: string } }) {
  const authorization = await getAuthorizationContext();
  if (!hasPermission(authorization, "platform.audit.read")) {
    return <div className="px-4 py-8 sm:px-6 xl:px-8"><ForbiddenState /></div>;
  }

  const range = resolveAdminDateRange(searchParams?.range);
  const insights = await loadAdminInsights(range);

  return (
    <main className="px-4 py-8 sm:px-6 xl:px-8">
      <AdminHeader title="Audit" description="Evenimente interne de securitate și roluri platformă. Fără secrete, token-uri sau conținut comercial brut." rangeLabel={range.label} actions={<AdminRangeLinks active={range.key} />} />
      <div className="mt-6">
        <AdminSection title="Audit roluri platformă" description="Istoric scris de triggerul bazei de date, nu de browser.">
          {insights.auditEvents.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.12em] text-[rgb(var(--muted-foreground))]">
                  <tr><th className="py-2 pr-3">Timp</th><th className="py-2 pr-3">Rol</th><th className="py-2 pr-3">Acțiune</th><th className="py-2 pr-3">Actor DB</th></tr>
                </thead>
                <tbody>
                  {insights.auditEvents.map((event) => (
                    <tr key={`${event.role}-${event.action}-${event.changedAt}`} className="border-t border-[rgb(var(--border))]">
                      <td className="py-2 pr-3">{new Date(event.changedAt).toLocaleString("ro-RO")}</td>
                      <td className="py-2 pr-3">{event.role}</td>
                      <td className="py-2 pr-3">{event.action}</td>
                      <td className="py-2 pr-3">{event.actor ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <AdminEmptyState title="Audit indisponibil" description="Tabela de audit apare după migrarea rolurilor. Nu fabricăm evenimente de audit." />
          )}
        </AdminSection>
      </div>
    </main>
  );
}
