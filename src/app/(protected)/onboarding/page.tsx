import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { PageShell } from "@/components/dashboard/PageShell";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { isSupabaseConfigured } from "@/lib/supabase/status";

export default function OnboardingPage() {
  return (
    <PageShell
      eyebrow="Onboarding"
      title="Configureaza firma pentru MoneyHunter AI"
      description="Completeaza contextul comercial ca scorurile, documentele si oportunitatile sa fie relevante pentru firma ta."
    >
      <div className="grid gap-6">
        {!isSupabaseConfigured ? <DemoNotice /> : null}
        <OnboardingForm />
      </div>
    </PageShell>
  );
}
