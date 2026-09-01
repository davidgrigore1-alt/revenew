import Link from "next/link";
import { redirect } from "next/navigation";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { Logo } from "@/components/ui/Logo";
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
    <main className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <header className="flex h-14 items-center justify-center border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))]"><Logo href="/" /></header>
      <section className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</section>
    </main>
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
    const supabase = await createSupabaseServerClient();
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
    const supabase = await createSupabaseServerClient();
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
      <aside className="sr-only" aria-label="Contractul configurării">
          <div><p className="text-label text-[rgb(var(--primary))]">Contractul configurării</p><h2 className="mt-2 text-lg font-semibold">Context suficient. Nimic inventat.</h2></div>
          <ol className="grid gap-4 text-sm leading-6">
            <li><span className="mr-2 font-semibold tabular-nums text-[rgb(var(--primary))]">01</span>Datele descriu activitatea reală.</li>
            <li><span className="mr-2 font-semibold tabular-nums text-[rgb(var(--primary))]">02</span>Poți reveni la configurare înainte de activare.</li>
            <li><span className="mr-2 font-semibold tabular-nums text-[rgb(var(--primary))]">03</span>Recomandările rămân sub control uman.</li>
          </ol>
          <p className="border-t border-[rgb(var(--border))] pt-4 text-xs leading-5 text-[rgb(var(--text-muted))]">ReveNew folosește acest context pentru prioritizare și documente. Nu declanșează acțiuni comerciale externe în numele tău.</p>
      </aside>
    </div>
  );
}
