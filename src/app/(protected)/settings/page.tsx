import { DataCard } from "@/components/dashboard/DataCard";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { PageShell } from "@/components/dashboard/PageShell";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { isOpenAIConfigured } from "@/lib/openai/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";

export default async function SettingsPage() {
  const currentBusiness = await getCurrentBusinessForUser({ redirectIfMissing: true });
  const business = currentBusiness?.business;
  const currentProfile = isSupabaseConfigured ? await getCurrentProfile() : { authUser: null, profile: null };
  const openAIConnected = isOpenAIConfigured();
  const isDevelopmentMode = process.env.NODE_ENV === "development";
  let ownedBusinesses: Array<{ id: string; name: string; created_at: string | null }> = [];

  if (isSupabaseConfigured && currentProfile.profile?.id) {
    const supabase = createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("businesses")
        .select("id,name,created_at")
        .eq("owner_profile_id", currentProfile.profile.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Business duplicate warning load error: ${error.message}`);
      }

      ownedBusinesses = data ?? [];
    }
  }

  return (
    <PageShell
      eyebrow="Setari"
      title="Configurare workspace"
      description="Profilul businessului si starea integrarilor folosite in MVP."
    >
      <div className="grid gap-6">
        {!isSupabaseConfigured ? <DemoNotice /> : null}
        <div className="grid gap-6 xl:grid-cols-2">
          <DataCard title="Workspace">
            <dl className="grid gap-4 text-sm">
              {[
                ["Nume", business?.name ?? ""],
                ["Denumire legala", business?.legalName ?? ""],
                ["CUI", business?.cui ?? ""],
                ["Website", business?.website ?? ""],
                ["Industrie", business?.industry ?? ""],
                ["Oras/Judet", `${business?.city ?? ""}, ${business?.county ?? ""}`],
                ["Email notificari", business?.notificationEmail ?? ""]
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-white/10 pb-3">
                  <dt className="text-zinc-500">{label}</dt>
                  <dd className="text-right font-semibold text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </DataCard>

          <DataCard title="Integrari">
            <dl className="grid gap-3 text-sm">
              {[
                ["OpenAI key", openAIConnected ? "Configurată" : "Neconfigurată"],
                ["OpenAI usage", openAIConnected ? "Necesită credit API pentru generare reală" : "Cheia API nu este configurată"],
                ["Analysis mode", openAIConnected ? "AI configurat" : "Analiza locală"],
                ["Fallback local disponibil", "Da"],
                ["OpenAI explicatie", "OpenAI este folosit pentru analiza oportunitati si generare documente cand exista credit API. Cheia API ramane doar pe server."]
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-white/10 pb-3">
                  <dt className="text-zinc-500">{label}</dt>
                  <dd className="max-w-[260px] break-words text-right font-semibold text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </DataCard>
        </div>

        {isDevelopmentMode ? (
          <DataCard title="Mod dezvoltare / Debug">
            <dl className="grid gap-3 text-sm">
              {[
                ["Supabase", isSupabaseConfigured ? "Conectat" : "Neconectat"],
                ["Auth session", currentProfile.authUser ? "Da" : "Nu"],
                ["Auth user id", currentProfile.authUser?.id ?? "-"],
                ["Auth user email", currentProfile.authUser?.email ?? "-"],
                ["Profile id", currentProfile.profile?.id ?? "-"],
                ["Business source", currentBusiness?.source === "supabase" ? "Supabase" : "Demo"],
                ["Business activ", business?.name ?? "-"],
                ["Business id", business?.id ?? "-"],
                ["Servicii incarcate", String(currentBusiness?.servicesCount ?? business?.services.length ?? 0)],
                ["Tinte incarcate", String(currentBusiness?.targetsCount ?? 0)]
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-white/10 pb-3">
                  <dt className="text-zinc-500">{label}</dt>
                  <dd className="max-w-[320px] break-words text-right font-semibold text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </DataCard>
        ) : null}

        {isDevelopmentMode && isSupabaseConfigured ? (
          <DataCard
            title="Avertizare business duplicat"
            description="Verificare de dezvoltare pentru situatiile in care onboarding-ul a creat mai multe firme pentru acelasi profil."
          >
            <dl className="grid gap-3 text-sm">
              {[
                ["Profile id", currentProfile.profile?.id ?? "-"],
                ["Business activ", business?.id ?? "-"],
                ["Business-uri detinute", String(ownedBusinesses.length)],
                ["Creat la", ownedBusinesses.find((item) => item.id === business?.id)?.created_at ?? "-"],
                ["Nota", "Workspace switching va fi adaugat ulterior."]
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-white/10 pb-3">
                  <dt className="text-zinc-500">{label}</dt>
                  <dd className="max-w-[320px] break-words text-right font-semibold text-white">{value}</dd>
                </div>
              ))}
            </dl>
            {ownedBusinesses.length > 1 ? (
              <div className="mt-4 rounded-lg border border-gold-400/20 bg-gold-400/10 p-4 text-sm leading-6 text-gold-200">
                Exista mai multe business-uri pentru acelasi profil. Aplicatia foloseste cel mai recent business gasit prin owner_profile_id.
              </div>
            ) : null}
          </DataCard>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          <DataCard title="Servicii">
            <ul className="space-y-2 text-sm text-zinc-300">
              {(business?.services ?? []).map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
          </DataCard>
          <DataCard title="Industrii si tinte">
            <ul className="space-y-2 text-sm text-zinc-300">
              {[...(business?.targetIndustries ?? []), ...(business?.targetCustomers ?? [])].slice(0, 12).map((industry) => (
                <li key={industry}>{industry}</li>
              ))}
            </ul>
          </DataCard>
        </div>
      </div>
    </PageShell>
  );
}
