import { notFound } from "next/navigation";
import { DataCard } from "@/components/dashboard/DataCard";
import { PageShell } from "@/components/dashboard/PageShell";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";

export default async function SupabaseDebugPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const supabase = createSupabaseServerClient();
  let authUserId = "";
  let authUserEmail = "";
  let profileId = "";
  let profileError = "";
  let businessId = "";
  let businessSource = "";
  let tableChecks: Array<[string, string]> = [];

  try {
    const { authUser, profile } = isSupabaseConfigured ? await getCurrentProfile() : { authUser: null, profile: null };
    authUserId = authUser?.id ?? "";
    authUserEmail = authUser?.email ?? "";
    profileId = profile?.id ?? "";
  } catch (error) {
    profileError = error instanceof Error ? error.message : "Profilul nu a putut fi citit.";
  }

  try {
    const currentBusiness = await getCurrentBusinessForUser({ redirectIfMissing: false });
    businessId = currentBusiness?.business.id ?? "";
    businessSource = currentBusiness?.source ?? "";
  } catch (error) {
    businessSource = error instanceof Error ? error.message : "Business lookup failed";
  }

  if (supabase) {
    const tables = ["profiles", "businesses", "business_members", "business_services", "business_targets", "opportunities"];
    tableChecks = await Promise.all(
      tables.map(async (table) => {
        const { error } = await supabase.from(table).select("*").limit(1);
        return [table, error ? error.message : "select ok"] as [string, string];
      })
    );
  }

  return (
    <PageShell eyebrow="Debug" title="Supabase diagnostics" description="Rută disponibilă doar în development pentru audit auth/profile/business.">
      <div className="grid gap-6">
        <DataCard title="Status sesiune">
          <dl className="grid gap-3 text-sm">
            {[
              ["Supabase env", isSupabaseConfigured ? "Conectat" : "Neconectat"],
              ["Auth user id", authUserId || "-"],
              ["Auth user email", authUserEmail || "-"],
              ["Profile id", profileId || "-"],
              ["Business source", businessSource || "-"],
              ["Business id", businessId || "-"],
              ["Profile error", profileError || "-"]
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-white/10 pb-3">
                <dt className="text-zinc-500">{label}</dt>
                <dd className="max-w-xl break-words text-right font-semibold text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </DataCard>
        <DataCard title="Core table select checks">
          <dl className="grid gap-3 text-sm">
            {tableChecks.map(([table, status]) => (
              <div key={table} className="flex justify-between gap-4 border-b border-white/10 pb-3">
                <dt className="text-zinc-500">{table}</dt>
                <dd className="max-w-xl break-words text-right font-semibold text-white">{status}</dd>
              </div>
            ))}
          </dl>
        </DataCard>
      </div>
    </PageShell>
  );
}
