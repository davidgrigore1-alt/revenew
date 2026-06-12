import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { PageShell } from "@/components/dashboard/PageShell";
import { OpportunitiesExplorer } from "@/components/opportunities/OpportunitiesExplorer";
import { Button } from "@/components/ui/Button";
import { getCurrentBusinessOrDemo, getOpportunitiesForCurrentBusiness } from "@/lib/supabase/data";
import { isSupabaseConfigured } from "@/lib/supabase/status";

export default async function OpportunitiesPage() {
  const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  const opportunities = await getOpportunitiesForCurrentBusiness();
  const firstOpportunityCta = isSupabaseConfigured && opportunities.length === 0;

  return (
    <PageShell
      eyebrow="Oportunități"
      title="Oportunități detectate"
      description={`Filtrează semnalele B2B, granturile, contractele si follow-up-urile care pot aduce venit pentru ${business?.name ?? "firma ta"}.`}
      actions={<Button href="/opportunities/analyze">{firstOpportunityCta ? "Analizeaza prima oportunitate" : "Analizeaza oportunitate noua"}</Button>}
    >
      <div className="grid gap-6">
        {!isSupabaseConfigured ? <DemoNotice /> : null}
        <OpportunitiesExplorer
          opportunities={opportunities}
          emptyTitle={isSupabaseConfigured ? "Nu ai oportunități reale încă." : undefined}
          emptyDescription={
            isSupabaseConfigured
              ? "Oportunitățile apar manual sau prin convertirea semnalelor din Inbox Comercial. Începe cu un lead pierdut, o cerere veche sau un follow-up ratat."
              : undefined
          }
          emptyCtaLabel={isSupabaseConfigured ? "Deschide Inbox Comercial" : undefined}
          emptyCtaHref={isSupabaseConfigured ? "/inbox" : undefined}
        />
      </div>
    </PageShell>
  );
}
