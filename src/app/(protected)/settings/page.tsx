import Link from "next/link";
import type { ReactNode } from "react";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { PageShell } from "@/components/dashboard/PageShell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { PersonalizationSettingsPanel } from "@/components/settings/PersonalizationSettingsPanel";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { getCurrentPaidAccessContext, getPaidAccessStatusLabel } from "@/lib/billing/paid-access";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { isOpenAIConfigured } from "@/lib/openai/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { getUsageSnapshotForBusiness, resolveUsagePlanId } from "@/lib/usage/reserve-usage";

function DefinitionList({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="divide-y divide-[rgb(var(--border))] text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="grid min-w-0 gap-1 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-4">
          <dt className="text-[rgb(var(--muted-foreground))]">{label}</dt>
          <dd className="min-w-0 break-all font-semibold text-[rgb(var(--foreground))] sm:text-right">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SettingsGroup({ title, description, children, id }: { title: string; description?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-28" aria-labelledby={id ? `${id}-title` : undefined}>
      <div className="mb-4">
        <h2 id={id ? `${id}-title` : undefined} className="text-lg font-semibold text-[rgb(var(--foreground))]">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-muted))]">{description}</p> : null}
      </div>
      <div className="divide-y divide-[rgb(var(--border))] border-y border-[rgb(var(--border))]">{children}</div>
    </section>
  );
}

function SettingsRow({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
  return (
    <div className="grid gap-4 py-4 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:gap-6">
      <div>
        <h3 className="text-sm font-semibold text-[rgb(var(--foreground))]">{label}</h3>
        {description ? <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{description}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

type SettingsTab = "workspace" | "control" | "usage" | "development";

export default async function SettingsPage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const requestedTab = (await searchParams)?.tab;
  const currentBusiness = await getCurrentBusinessForUser({ redirectIfMissing: true });
  const paidAccess = await getCurrentPaidAccessContext({ redirectIfMissingBusiness: true });
  const business = currentBusiness?.business;
  const currentProfile = isSupabaseConfigured ? await getCurrentProfile() : { authUser: null, profile: null };
  const authorization = await getAuthorizationContext();
  const canSeeGovernance = authorization.permissions.some((permission) => ["workspace.members.read", "workspace.policies.read", "approvals.read"].includes(permission));
  const openAIConnected = isOpenAIConfigured();
  const isDevelopmentMode = process.env.NODE_ENV === "development";
  const isPreviewMode = paidAccess?.accessMode === "preview";
  const activeTab: SettingsTab = requestedTab === "control" || requestedTab === "usage" || (requestedTab === "development" && isDevelopmentMode && !isPreviewMode)
    ? requestedTab
    : "workspace";
  const usageSnapshot = business
    ? await getUsageSnapshotForBusiness(business.id, resolveUsagePlanId(paidAccess?.previewPlan?.id ?? paidAccess?.subscription?.plan))
    : null;
  let ownedBusinesses: Array<{ id: string; name: string; created_at: string | null }> = [];

  if (isDevelopmentMode && !isPreviewMode && isSupabaseConfigured && currentProfile.profile?.id) {
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

  const navigationGroups: Array<{ label: string; items: Array<[SettingsTab, string]> }> = [
    { label: "Spațiu de lucru", items: [["workspace", "Aspect și identitate"], ["control", "Acces și recomandări"]] },
    { label: "Administrare", items: [["usage", "Plan și utilizare"]] },
    ...(isDevelopmentMode && !isPreviewMode ? [{ label: "Sistem", items: [["development", "Dezvoltare"]] as Array<[SettingsTab, string]> }] : [])
  ];

  return (
    <PageShell
      eyebrow="Administrare"
      title="Setări"
      description="Preferințe, acces și capacitate pentru spațiul de lucru activ."
    >
      <div className="grid gap-7 lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-20">
          <nav className="grid gap-5" aria-label="Secțiuni setări">
            {navigationGroups.map((group) => (
              <div key={group.label}>
                <p className="px-2 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">{group.label}</p>
                <div className="mt-1 grid gap-0.5">
                  {group.items.map(([tab, label]) => (
                    <Link
                      key={tab}
                      href={`/settings?tab=${tab}`}
                      aria-current={activeTab === tab ? "page" : undefined}
                      className={`focus-ring flex min-h-9 items-center rounded-control px-2.5 py-2 text-sm font-medium transition-colors ${activeTab === tab ? "bg-[rgb(var(--surface-muted))] text-[rgb(var(--foreground))]" : "text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-subtle))] hover:text-[rgb(var(--foreground))]"}`}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="grid min-w-0 max-w-5xl gap-8">
          {activeTab === "workspace" ? (
            <>
              {!isSupabaseConfigured ? <DemoNotice /> : null}
              <PersonalizationSettingsPanel baselineName={business?.name ?? "Spațiu de lucru"} baselineIndustry={business?.industry ?? ""} />

              <SettingsGroup id="companie" title="Companie și afișare" description="Datele active ale companiei și preferințele generale de interfață.">
                <SettingsRow label="Date companie" description="Folosite în scoruri, mesaje și rapoarte.">
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
                </SettingsRow>
                <SettingsRow label="Temă de interfață" description="Preferința rămâne salvată în browser.">
                  <div id="workspace" className="scroll-mt-28 flex flex-wrap items-center gap-3">
                    <ThemeToggle />
                    <p className="text-xs leading-5 text-[rgb(var(--text-muted))]">Comută între lumină, întuneric și tema sistemului.</p>
                  </div>
                </SettingsRow>
                {canSeeGovernance ? (
                  <SettingsRow label="Echipă și guvernanță" description="Vizibilă numai conform permisiunilor existente.">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm leading-6 text-[rgb(var(--text-muted))]">Roluri, politici, aprobări, cozi de lucru și audit.</p>
                      <Link href="/settings/governance" className="focus-ring shrink-0 rounded-sm text-sm font-semibold text-[rgb(var(--primary))] hover:underline">Deschide administrarea →</Link>
                    </div>
                  </SettingsRow>
                ) : null}
              </SettingsGroup>
            </>
          ) : null}

          {activeTab === "control" ? (
            <SettingsGroup id="acces" title="Acces și recomandări" description="Starea serviciilor, controlul uman și limitele de utilizare a datelor.">
              <SettingsRow label="Recomandări și AI" description="ReveNew pregătește recomandări; echipa decide și trimite.">
                <div id="recomandari" className="scroll-mt-28">
                  <DefinitionList
                    items={[
                      ["Analiză AI", openAIConnected ? "Disponibilă când există credit API" : "Reguli interne active"],
                      ["Generare mesaje", openAIConnected ? "Disponibilă pentru documente și follow-up-uri" : "Drafturi standard disponibile"],
                      ["Control uman", "Mesajele nu sunt trimise automat"],
                      ["Chei API", "Rămân doar pe server"]
                    ]}
                  />
                </div>
              </SettingsRow>

              <SettingsRow
                label="Plan și acces"
                description={isPreviewMode ? "Evaluare controlată, fără plată." : "Acces verificat pe server pe baza abonamentului curent."}
              >
                <div id="plan" className="scroll-mt-28">
                  {isPreviewMode ? (
                    <>
                      <DefinitionList items={[["Mod", "Evaluare controlată"], ["Plan selectat", paidAccess?.previewPlan?.title ?? "Niciun plan selectat"], ["Acces", "Acces demonstrativ, fără plată"]]} />
                      <p className="mt-3 text-xs leading-5 text-[rgb(var(--text-muted))]">Opțiunea selectată este folosită numai pentru evaluarea produsului și nu reprezintă o plată sau un abonament activ.</p>
                      <Link href="/access#planuri" className="focus-ring mt-3 inline-flex rounded-sm text-sm font-semibold text-[rgb(var(--primary))] hover:underline">Schimbă planul →</Link>
                    </>
                  ) : (
                    <>
                      <DefinitionList items={[["Status acces", paidAccess ? getPaidAccessStatusLabel(paidAccess.accessStatus) : "Necunoscut"], ["Plan", paidAccess?.subscription?.plan ?? "Fără plan activ"], ["Status plată", paidAccess?.subscription?.status ?? "Nicio plată activă"], ["Reînnoire / expirare", paidAccess?.subscription?.currentPeriodEnd ?? "Nu este setată"]]} />
                      <Link href="/billing" className="focus-ring mt-3 inline-flex rounded-sm text-sm font-semibold text-[rgb(var(--primary))] hover:underline">Vezi facturarea →</Link>
                    </>
                  )}
                </div>
              </SettingsRow>

              <SettingsRow label="Date și confidențialitate" description="Ce folosește aplicația în acest moment.">
                <ul className="grid gap-2 text-sm leading-6 text-[rgb(var(--text-muted))]">
                  <li>ReveNew folosește cererile comerciale, oportunitățile, acțiunile, documentele și evenimentele din spațiul de lucru.</li>
                  <li>Nu afișăm ID-uri tehnice sau detalii de conexiune în interfața normală.</li>
                  <li>Nu pretindem integrări live precum Gmail sau WhatsApp dacă nu sunt conectate efectiv.</li>
                  <li>Datele sunt folosite pentru recomandări, mesaje pregătite și rapoarte comerciale.</li>
                </ul>
              </SettingsRow>
            </SettingsGroup>
          ) : null}

          {activeTab === "usage" ? (
            <SettingsGroup id="utilizare" title="Plan și utilizare" description="Contoare comerciale și configurația activă a spațiului de lucru.">
              <SettingsRow label="Utilizare" description="Costurile interne ale furnizorilor nu sunt expuse.">
                {usageSnapshot?.unavailable ? (
                  <p className="text-sm leading-6 text-[rgb(var(--text-muted))]">Utilizarea va fi afișată după activarea măsurării dedicate. Accesul curent rămâne controlat de modul activ.</p>
                ) : (
                  <dl className="divide-y divide-[rgb(var(--border))]">
                    {usageSnapshot?.features.slice(0, 6).map((feature) => {
                      const percent = feature.limit ? Math.min(100, Math.round((feature.used / feature.limit) * 100)) : 0;
                      return (
                        <div key={feature.featureId} className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-5">
                          <dt className="text-sm font-medium text-[rgb(var(--foreground))]">{feature.label}</dt>
                          <dd className="text-sm tabular-nums text-[rgb(var(--text-muted))]">{feature.used}{feature.limit === null ? "" : ` / ${feature.limit}`}</dd>
                          {feature.limit !== null ? <div className="h-1.5 overflow-hidden rounded-full bg-[rgb(var(--surface-muted))] sm:col-span-2" role="progressbar" aria-label={`${feature.label}: ${percent}% utilizat`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div className="h-full rounded-full bg-[rgb(var(--primary))]" style={{ width: `${percent}%` }} /></div> : null}
                        </div>
                      );
                    })}
                  </dl>
                )}
              </SettingsRow>
              <SettingsRow label="Servicii" description="Oferta folosită în contextul comercial.">
                <p className="text-sm leading-6 text-[rgb(var(--text-muted))]">{(business?.services ?? []).length > 0 ? (business?.services ?? []).join(" · ") : "Nu există servicii configurate."}</p>
              </SettingsRow>
              <SettingsRow label="Clienți și industrii țintă" description="Segmentele configurate pentru prioritizare.">
                <p className="text-sm leading-6 text-[rgb(var(--text-muted))]">{[...(business?.targetIndustries ?? []), ...(business?.targetCustomers ?? [])].slice(0, 12).join(" · ") || "Nu există segmente configurate."}</p>
              </SettingsRow>
            </SettingsGroup>
          ) : null}

          {activeTab === "development" && isDevelopmentMode && !isPreviewMode ? (
            <details id="date" className="scroll-mt-28 border-y border-dashed border-[rgb(var(--border))] py-2">
              <summary className="focus-ring flex min-h-10 cursor-pointer list-none items-center rounded-control px-2 text-sm font-semibold marker:hidden">Date tehnice locale · dezvoltare</summary>
              <div className="px-2 pb-4 pt-3">
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
              </div>
            </details>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
