import { DataCard } from "@/components/dashboard/DataCard";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PageShell } from "@/components/dashboard/PageShell";
import { getCurrentProfile } from "@/lib/auth/profile";
import { opportunities } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/supabase/status";

export default async function AdminPage() {
  let isAdmin = !isSupabaseConfigured;

  if (isSupabaseConfigured) {
    const { profile } = await getCurrentProfile();
    isAdmin = profile?.role === "platform_admin";
  }

  return (
    <PageShell
      eyebrow="Admin"
      title="Control operațional"
      description="Zonă simplă pentru administrare, audit și status sistem."
    >
      <div className="grid gap-6">
        {!isSupabaseConfigured ? <DemoNotice /> : null}
        {!isAdmin ? (
          <DataCard title="Acces restricționat" description="Doar utilizatorii cu rol platform_admin pot vedea panoul admin." />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Users" value="1" detail="Utilizator demo" />
              <MetricCard label="Businesses" value="1" detail="Business activ" />
              <MetricCard label="Opportunities" value={`${opportunities.length}`} detail="Oportunități disponibile" tone="mint" />
              <MetricCard label="Audit logs" value="0" detail="Placeholder" />
              <MetricCard label="System" value="OK" detail="UI și persistence active" tone="gold" />
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              {["Users placeholder", "Businesses placeholder", "Opportunities placeholder", "Audit logs placeholder"].map((title) => (
                <DataCard key={title} title={title} description="Această zonă va primi tabele administrative reale într-o etapă ulterioară.">
                  <div className="rounded-lg border border-dashed border-white/15 bg-ink-900/60 p-5 text-sm text-zinc-400">
                    Pregătit pentru tabel administrativ.
                  </div>
                </DataCard>
              ))}
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
