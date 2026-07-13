import Link from "next/link";
import { redirect } from "next/navigation";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { PageShell } from "@/components/dashboard/PageShell";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getPostBusinessDestination } from "@/lib/billing/paid-access";
import { emptyOnboardingDraft, type OnboardingDraft } from "@/lib/onboarding/draft";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";

export const dynamic = "force-dynamic";

function OnboardingErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-400/30 bg-red-950/30 p-5 text-sm leading-6 text-red-100">
      <p className="font-semibold text-red-100">Onboarding nu a putut fi încărcat.</p>
      <p className="mt-2 text-red-100/80">{message}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link href="/onboarding" className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg bg-red-100 px-4 text-sm font-semibold text-red-950 transition hover:bg-white">
          Reîncearcă
        </Link>
        <Link href="/login" className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200/30 px-4 text-sm font-semibold text-red-100 transition hover:bg-red-200/10">
          Înapoi la autentificare
        </Link>
      </div>
    </div>
  );
}

export default async function OnboardingPage() {
  const pageContent = (children: React.ReactNode) => (
    <PageShell
      eyebrow="Onboarding"
      title="Configurează firma pentru ReveNew"
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
    console.error("Onboarding profile initialization failed", error);
    return pageContent(<OnboardingErrorCard message="Nu am putut pregăti profilul contului. Încearcă din nou." />);
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
      console.error("Onboarding owner business lookup failed", { code: ownerError.code });
      throw new Error("business_lookup_failed");
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
        console.error("Onboarding membership business lookup failed", { code: membershipError.code });
        throw new Error("business_lookup_failed");
      }

      hasBusiness = Boolean(membership?.business_id);
    }
  } catch (error) {
    console.error("Onboarding business lookup failed", error);
    return pageContent(<OnboardingErrorCard message="Nu am putut verifica încă starea firmei. Reîncearcă în câteva secunde." />);
  }

  if (hasBusiness) {
    redirect(await getPostBusinessDestination());
  }

  type SavedDraft = { current_step: number; entry_mode: "manual" | "import"; draft: Partial<OnboardingDraft> };
  let savedDraft: SavedDraft | null = null;
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = supabase ? await supabase.from("onboarding_drafts").select("current_step,entry_mode,draft").eq("profile_id", profileId).maybeSingle() : { data: null, error: null };
    if (error) console.warn("onboarding_draft_load_failed", { code: error.code });
    if (data) savedDraft = data as unknown as SavedDraft;
  } catch {
    // A missing draft must never block first-time setup.
  }

  const restoredDraft: OnboardingDraft = {
    ...emptyOnboardingDraft,
    ...(savedDraft?.draft ?? {}),
    leadSources: Array.isArray(savedDraft?.draft?.leadSources) ? savedDraft.draft.leadSources.filter((item: unknown): item is string => typeof item === "string") : []
  };

  return pageContent(
    <div className="grid gap-6">
      {!isSupabaseConfigured ? <DemoNotice /> : null}
      <OnboardingForm initialDraft={restoredDraft} initialStep={savedDraft?.current_step ?? 0} initialEntryMode={savedDraft?.entry_mode ?? "manual"} resumed={Boolean(savedDraft)} />
    </div>
  );
}
