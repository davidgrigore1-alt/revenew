import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { PageShell } from "@/components/dashboard/PageShell";
import { AnalyzeOpportunityForm } from "@/components/opportunities/AnalyzeOpportunityForm";
import { getCurrentBusinessOrDemo } from "@/lib/supabase/data";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { isOpenAIConfigured } from "@/lib/openai/client";

export default async function AnalyzeOpportunityPage() {
  const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });

  return (
    <PageShell
      eyebrow="Analiza manuala"
      title="Analizeaza o oportunitate noua"
      description="Introdu un semnal comercial, valideaza analiza si salveaza oportunitatea in workspace."
    >
      <div className="grid gap-6">
        {!isSupabaseConfigured ? <DemoNotice /> : null}
        {business ? <AnalyzeOpportunityForm business={business} openAIConfigured={isOpenAIConfigured()} /> : null}
      </div>
    </PageShell>
  );
}
