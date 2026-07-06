import Link from "next/link";
import { DataCard } from "@/components/dashboard/DataCard";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { PageShell } from "@/components/dashboard/PageShell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getCurrentPaidAccessContext, getPaidAccessStatusLabel } from "@/lib/billing/paid-access";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { isOpenAIConfigured } from "@/lib/openai/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { getUsageSnapshotForBusiness, resolveUsagePlanId } from "@/lib/usage/reserve-usage";

function DefinitionList({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid gap-4 text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 border-b border-[rgb(var(--border))] pb-3">
          <dt className="text-[rgb(var(--muted-foreground))]">{label}</dt>
          <dd className="max-w-[320px] break-words text-right font-semibold text-[rgb(var(--foreground))]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function SettingsPage() {
  const currentBusiness = await getCurrentBusinessForUser({ redirectIfMissing: true });
  const paidAccess = await getCurrentPaidAccessContext({ redirectIfMissingBusiness: true });
  const business = currentBusiness?.business;
  const currentProfile = isSupabaseConfigured ? await getCurrentProfile() : { authUser: null, profile: null };
  const openAIConnected = isOpenAIConfigured();
  const isDevelopmentMode = process.env.NODE_ENV === "development";
  const isPreviewMode = paidAccess?.accessMode === "preview";
  const usageSnapshot = business
    ? await getUsageSnapshotForBusiness(business.id, resolveUsagePlanId(paidAccess?.previewPlan?.id ?? paidAccess?.subscription?.plan))
    : null;
  let ownedBusinesses: Array<{ id: string; name: string; created_at: string | null }> = [];

  if (isDevelopmentMode && isSupabaseConfigured && currentProfile.profile?.id) {
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
      eyebrow="Setări"
      title="Configurare workspace"
      description="Setări pentru companie, temă, recomandări și datele folosite în ReveNew."
    >
      <div className="grid gap-6">
        {!isSupabaseConfigured ? <DemoNotice /> : null}
        <div className="grid gap-6 xl:grid-cols-2">
          <DataCard title="Companie" description="Informațiile folosite în scoruri, mesaje și rapoarte.">
            <DefinitionList
              items={[
                ["Nume", business?.name ?? ""],
                ["Denumire legală", business?.legalName ?? ""],
                ["CUI", business?.cui ?? ""],
                ["Website", business?.website ?? ""],
                ["Industrie", business?.industry ?? ""],
                ["Oraș / județ", `${business?.city ?? ""}, ${business?.county ?? ""}`],
                ["Email notificări", business?.notificationEmail ?? ""]
              ]}
            />
          </DataCard>

          <DataCard title="Temă" description="Alege modul de afișare. Preferința rămâne salvată în browser.">
            <div className="flex flex-wrap items-center gap-3">
              <ThemeToggle />
              <p className="text-sm leading-6 text-[rgb(var(--muted-foreground))]">Butonul alternează între lumină, întuneric și tema sistemului.</p>
            </div>
          </DataCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <DataCard title="Recomandări și AI" description="ReveNew pregătește recomandări. Echipa ta păstrează controlul deciziilor și trimiterilor.">
            <DefinitionList
              items={[
                ["Analiză AI", openAIConnected ? "Disponibilă când există credit API" : "Fallback local activ"],
                ["Generare mesaje", openAIConnected ? "Disponibilă pentru documente și follow-up-uri" : "Drafturi standard disponibile"],
                ["Control uman", "Mesajele nu sunt trimise automat"],
                ["Chei API", "Rămân doar pe server"]
              ]}
            />
          </DataCard>

          <DataCard
            title="Plan și acces"
            description={isPreviewMode ? "Accesul este permis în modul de testare după selectarea unui plan demonstrativ." : "Accesul la dashboard este verificat pe server pe baza abonamentului curent."}
          >
            {isPreviewMode ? (
              <>
                <DefinitionList
                  items={[
                    ["Mod", "Mod de testare"],
                    ["Plan selectat", paidAccess?.previewPlan?.title ?? "Niciun plan selectat"],
                    ["Acces", "Acces gratuit pentru testarea produsului"]
                  ]}
                />
                <p className="mt-5 text-sm leading-6 text-[rgb(var(--muted-foreground))]">
                  Planul selectat este folosit doar pentru testarea produsului și nu reprezintă o plată sau un abonament activ.
                </p>
                <div className="mt-5">
                  <Link href="/access#planuri" className="focus-ring inline-flex min-h-10 items-center rounded-lg border border-[rgb(var(--border))] px-4 text-sm font-semibold text-[rgb(var(--foreground))] hover:bg-[rgb(var(--muted))]">
                    Schimbă planul
                  </Link>
                </div>
              </>
            ) : (
              <>
                <DefinitionList
                  items={[
                    ["Status acces", paidAccess ? getPaidAccessStatusLabel(paidAccess.accessStatus) : "Necunoscut"],
                    ["Plan", paidAccess?.subscription?.plan ?? "Fără plan activ"],
                    ["Status plată", paidAccess?.subscription?.status ?? "Nicio plată activă"],
                    ["Reînnoire / expirare", paidAccess?.subscription?.currentPeriodEnd ?? "Nu este setată"]
                  ]}
                />
                <div className="mt-5">
                  <Link href="/billing" className="focus-ring inline-flex min-h-10 items-center rounded-lg border border-[rgb(var(--border))] px-4 text-sm font-semibold text-[rgb(var(--foreground))] hover:bg-[rgb(var(--muted))]">
                    Vezi facturarea
                  </Link>
                </div>
              </>
            )}
          </DataCard>

          <DataCard title="Date și confidențialitate" description="Claritate despre ce folosește aplicația în acest moment.">
            <ul className="grid gap-3 text-sm leading-6 text-[rgb(var(--muted-foreground))]">
              <li>ReveNew folosește cererile comerciale, oportunitățile, acțiunile, documentele și evenimentele din workspace.</li>
              <li>Nu afișăm ID-uri tehnice sau detalii de conexiune în interfața normală.</li>
              <li>Nu pretindem integrări live precum Gmail sau WhatsApp dacă nu sunt conectate efectiv.</li>
              <li>Datele sunt folosite pentru recomandări, mesaje pregătite și rapoarte comerciale.</li>
            </ul>
          </DataCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <DataCard title="Plan și utilizare" description="Contoare orientate pe operațiuni comerciale, fără expunerea costurilor interne de provider.">
            {usageSnapshot?.unavailable ? (
              <p className="text-sm leading-6 text-[rgb(var(--muted-foreground))]">Utilizarea va fi afișată după aplicarea migrației de metering. Accesul curent rămâne controlat de modul activ.</p>
            ) : (
              <div className="grid gap-4">
                {usageSnapshot?.features.slice(0, 6).map((feature) => {
                  const percent = feature.limit ? Math.min(100, Math.round((feature.used / feature.limit) * 100)) : 0;
                  return (
                    <div key={feature.featureId}>
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="font-medium text-[rgb(var(--foreground))]">{feature.label}</span>
                        <span className="text-[rgb(var(--muted-foreground))]">{feature.used}{feature.limit === null ? "" : ` / ${feature.limit}`}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-[rgb(var(--muted))]" aria-hidden="true">
                        <div className="h-2 rounded-full bg-[rgb(var(--primary))]" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DataCard>

          <DataCard title="Servicii">
            <ul className="space-y-2 text-sm text-[rgb(var(--muted-foreground))]">
              {(business?.services ?? []).length > 0 ? (business?.services ?? []).map((service) => <li key={service}>{service}</li>) : <li>Nu există servicii configurate.</li>}
            </ul>
          </DataCard>
          <DataCard title="Clienți și industrii țintă">
            <ul className="space-y-2 text-sm text-[rgb(var(--muted-foreground))]">
              {[...(business?.targetIndustries ?? []), ...(business?.targetCustomers ?? [])].slice(0, 12).map((industry) => (
                <li key={industry}>{industry}</li>
              ))}
            </ul>
          </DataCard>
        </div>

        {isDevelopmentMode ? (
          <DataCard title="Mod dezvoltare / Debug">
            <DefinitionList
              items={[
                ["Supabase", isSupabaseConfigured ? "Conectat" : "Neconectat"],
                ["Auth session", currentProfile.authUser ? "Da" : "Nu"],
                ["Auth user id", currentProfile.authUser?.id ?? "-"],
                ["Auth user email", currentProfile.authUser?.email ?? "-"],
                ["Profile id", currentProfile.profile?.id ?? "-"],
                ["Business source", currentBusiness?.source === "supabase" ? "Supabase" : "Demo"],
                ["Business activ", business?.name ?? "-"],
                ["Business id", business?.id ?? "-"],
                ["Servicii încărcate", String(currentBusiness?.servicesCount ?? business?.services.length ?? 0)],
                ["Ținte încărcate", String(currentBusiness?.targetsCount ?? 0)],
                ["Business-uri deținute", String(ownedBusinesses.length)]
              ]}
            />
          </DataCard>
        ) : null}
      </div>
    </PageShell>
  );
}
