import { ForbiddenState } from "@/components/authz/ForbiddenState";
import { AdminHeader, AdminRangeLinks, AdminSection, BusinessCostTable } from "@/components/admin/AdminUi";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { hasPermission } from "@/lib/authz/has-permission";
import { loadAdminInsights, resolveAdminDateRange } from "@/lib/admin/insights";

export const dynamic = "force-dynamic";

export default async function AdminBusinessesPage({ searchParams }: { searchParams?: { range?: string } }) {
  const authorization = await getAuthorizationContext();
  if (!hasPermission(authorization, "platform.businesses.read_all")) {
    return <div className="px-4 py-8 sm:px-6 xl:px-8"><ForbiddenState /></div>;
  }

  const range = resolveAdminDateRange(searchParams?.range);
  const insights = await loadAdminInsights(range);

  return (
    <main className="px-4 py-8 sm:px-6 xl:px-8">
      <AdminHeader
        title="Firme"
        description="Analiză business-by-business pentru valoare configurată, cost API, consum și avertismente operaționale."
        rangeLabel={range.label}
        actions={<AdminRangeLinks active={range.key} />}
      />
      <div className="mt-6">
        <AdminSection title="Toate firmele" description="Tabel intern, sortat implicit după cost API estimat. Exporturile trebuie să rămână sanitizate.">
          <BusinessCostTable businesses={insights.businesses} />
        </AdminSection>
      </div>
    </main>
  );
}
