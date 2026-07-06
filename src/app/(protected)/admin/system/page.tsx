import { ForbiddenState } from "@/components/authz/ForbiddenState";
import { AdminHeader, AdminSection } from "@/components/admin/AdminUi";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { hasPermission } from "@/lib/authz/has-permission";
import { loadAdminInsights, resolveAdminDateRange } from "@/lib/admin/insights";

export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  const authorization = await getAuthorizationContext();
  if (!hasPermission(authorization, "platform.system_health.read")) {
    return <div className="px-4 py-8 sm:px-6 xl:px-8"><ForbiddenState /></div>;
  }

  const insights = await loadAdminInsights(resolveAdminDateRange("30d"));

  return (
    <main className="px-4 py-8 sm:px-6 xl:px-8">
      <AdminHeader title="Sistem" description="Status tehnic și operațional, afișat ca stare verificabilă sau configurare neverificată. Nu sunt expuse secrete." />
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <AdminSection title="Status platformă">
          <div className="grid gap-3">
            {insights.systemStatus.map((item) => (
              <div key={item.label} className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-4">
                <div className="flex justify-between gap-4">
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-sm font-semibold">{item.status}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{item.detail}</p>
              </div>
            ))}
          </div>
        </AdminSection>

        <AdminSection title="Readiness migrare">
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-[rgb(var(--border))] pb-3"><span>Platform roles</span><span>{authorization.platformRoles.length ? "Active" : "Fără roluri active"}</span></div>
            <div className="flex justify-between gap-4 border-b border-[rgb(var(--border))] pb-3"><span>Usage metering</span><span>{insights.usageAvailable ? "Operațional" : "Date insuficiente"}</span></div>
            <div className="flex justify-between gap-4 border-b border-[rgb(var(--border))] pb-3"><span>Audit roluri</span><span>{insights.auditAvailable ? "Operațional" : "Date insuficiente"}</span></div>
            <div className="flex justify-between gap-4 border-b border-[rgb(var(--border))] pb-3"><span>Roluri administrate</span><span>Exclusiv în baza de date</span></div>
          </div>
        </AdminSection>
      </div>
    </main>
  );
}
