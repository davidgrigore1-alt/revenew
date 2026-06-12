import { redirect } from "next/navigation";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { PageShell } from "@/components/dashboard/PageShell";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";

function OnboardingErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-400/30 bg-red-950/30 p-5 text-sm leading-6 text-red-100">
      <p className="font-semibold text-red-100">Onboarding nu a putut fi încărcat.</p>
      <p className="mt-2 text-red-100/80">{message}</p>
    </div>
  );
}

export default async function OnboardingPage() {
  const pageContent = (children: React.ReactNode) => (
    <PageShell
      eyebrow="Onboarding"
      title="Configurează firma pentru MoneyHunter AI"
      description="Completează contextul comercial ca scorurile, documentele și oportunitățile să fie relevante pentru firma ta."
    >
      {children}
    </PageShell>
  );

  let authUser;
  let profileId = "";

  try {
    const current = await getCurrentProfile();
    authUser = current.authUser;
    profileId = current.profile?.id ?? "";
  } catch (error) {
    return pageContent(<OnboardingErrorCard message={error instanceof Error ? error.message : "A aparut o eroare necunoscuta."} />);
  }

  if (!authUser || !profileId) {
    redirect("/login");
  }

  let hasBusiness = false;

  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      throw new Error("Supabase nu este disponibil pe server.");
    }

    const { data: ownedBusiness, error: ownerError } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_profile_id", profileId)
      .limit(1)
      .maybeSingle();

    if (ownerError) {
      throw new Error(`Business lookup owner error: ${ownerError.message}`);
    }

    if (ownedBusiness) {
      hasBusiness = true;
    } else {
      const { data: membership, error: membershipError } = await supabase
        .from("business_members")
        .select("business_id")
        .eq("profile_id", profileId)
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        throw new Error(`Business membership lookup error: ${membershipError.message}`);
      }

      hasBusiness = Boolean(membership?.business_id);
    }
  } catch (error) {
    return pageContent(<OnboardingErrorCard message={error instanceof Error ? error.message : "A aparut o eroare necunoscuta."} />);
  }

  if (hasBusiness) {
    redirect("/dashboard");
  }

  return pageContent(
    <div className="grid gap-6">
      {!isSupabaseConfigured ? <DemoNotice /> : null}
      <OnboardingForm />
    </div>
  );
}
