import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageShell } from "@/components/dashboard/PageShell";
import { LeadsExplorer } from "@/components/leads/LeadsExplorer";
import { Button } from "@/components/ui/Button";
import { leads as demoLeads } from "@/lib/mock-data";
import { getCurrentBusinessOrDemo } from "@/lib/supabase/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import type { LeadContact } from "@/lib/types";

export default async function LeadsPage() {
  let leads: LeadContact[] = isSupabaseConfigured ? [] : demoLeads;

  if (isSupabaseConfigured) {
    const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
    const supabase = createSupabaseServerClient();
    if (business && supabase) {
      const { data, error } = await supabase.from("lead_contacts").select("*").eq("business_id", business.id).order("created_at", { ascending: false });
      if (error) {
        throw new Error(`Lead load error: ${error.message}`);
      }

      leads = (data ?? []).map(
        (lead): LeadContact => ({
          id: lead.id,
          companyName: lead.company_name,
          industry: lead.industry ?? "",
          city: lead.city ?? "",
          contactName: lead.contact_name ?? "Contact neconfirmat",
          email: lead.email ?? undefined,
          phone: lead.phone ?? undefined,
          leadScore: Number(lead.lead_score ?? 0),
          estimatedBudget: Number(lead.estimated_budget ?? 0),
          needSignal: lead.need_signal ?? "",
          recommendedAngle: lead.recommended_angle ?? "",
          status: "new"
        })
      );
    }
  }

  return (
    <PageShell
      eyebrow="Lead-uri"
      title="Lead-uri B2B prioritizate"
      description="Companii și contacte care pot deveni oportunități comerciale. Lead sources reale vor fi conectate într-o etapă următoare."
    >
      <div className="grid gap-6">
        {!isSupabaseConfigured ? <DemoNotice /> : null}
        {isSupabaseConfigured && leads.length === 0 ? (
          <div className="grid gap-3">
            <EmptyState title="Nu există lead-uri reale încă" description="Lead-urile reale vor apărea aici după import CSV, oportunități analizate sau contacte salvate." />
            <div className="flex flex-wrap gap-2">
              <Button href="/opportunities/analyze">Analizeaza oportunitate</Button>
              <span className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-zinc-500">
                Import CSV - in curand
              </span>
            </div>
          </div>
        ) : (
          <LeadsExplorer leads={leads} />
        )}
      </div>
    </PageShell>
  );
}
