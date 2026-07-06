import Link from "next/link";
import { redirect } from "next/navigation";
import { AccessPlanJump } from "@/components/access/AccessPlanJump";
import { PreviewPlanSelector } from "@/components/access/PreviewPlanSelector";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { authPath } from "@/lib/auth/redirects";
import { getCurrentPaidAccessContext, getPaidAccessStatusLabel } from "@/lib/billing/paid-access";
import { previewPlans } from "@/lib/billing/plans";
import { formatDate } from "@/lib/utils";

const paidPlans = previewPlans.map((plan) => ({
  ...plan,
  description:
    plan.id === "audit"
      ? "Audit de 7 zile pentru identificarea oportunităților recuperabile. Accesul software se configurează după confirmarea plății și perioada agreată."
      : "Proces recurent de verificare, prioritizare, follow-up pregătit și raportare executivă."
}));

function reasonMessage(reason?: string) {
  if (reason === "expired") return "Planul tău a expirat.";
  if (reason === "payment_failed") return "Plata nu a fost finalizată. Poți încerca din nou.";
  if (reason === "trial_not_enabled") return "Accesul la dashboard necesită o plată confirmată.";
  if (reason === "cancelled") return "Planul nu mai este activ.";
  return "Nu am găsit încă o plată activă pentru acest cont.";
}

export default async function AccessPage({ searchParams }: { searchParams?: { reason?: string } }) {
  const context = await getCurrentPaidAccessContext({ redirectIfMissingBusiness: false });

  if (!context) {
    redirect("/onboarding");
  }

  const isPreviewMode = context.accessMode === "preview";
  const periodEnd = context.subscription?.currentPeriodEnd ? formatDate(context.subscription.currentPeriodEnd) : "Nu este setată";

  return (
    <main className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <header className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <Logo />
          <div className="flex items-center gap-3">
            <Link href="/billing" className="focus-ring rounded-lg px-3 py-2 text-sm font-semibold text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]">
              Cont
            </Link>
            <div className="hidden sm:block">
              <LogoutButton className="min-h-10" />
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">Acces platformă</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {isPreviewMode ? "Alege modul de testare ReveNew" : "Activează accesul ReveNew"}
          </h1>
          <p className="mt-4 text-base leading-7 text-[rgb(var(--muted-foreground))]">
            {isPreviewMode
              ? "ReveNew este momentan în modul de testare. Poți selecta gratuit oricare dintre planuri pentru a explora dashboardul și fluxurile aplicației."
              : "Contul tău este creat, dar accesul la platformă devine activ numai după confirmarea plății."}
          </p>
        </div>

        {isPreviewMode ? (
          <p className="mt-8 rounded-xl border border-[rgb(var(--primary)_/_0.25)] bg-[rgb(var(--primary)_/_0.08)] p-4 text-sm leading-6 text-[rgb(var(--foreground))]">
            Mod de testare - alegerea planului nu inițiază o plată și nu creează un abonament.
          </p>
        ) : null}

        <div className="mt-8 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted-foreground))]">Status acces</p>
              <p className="mt-2 font-semibold">{isPreviewMode ? "Mod de testare activ" : getPaidAccessStatusLabel(context.accessStatus)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted-foreground))]">Plan</p>
              <p className="mt-2 font-semibold">
                {isPreviewMode ? context.previewPlan?.title ?? "Niciun plan selectat" : context.subscription?.plan ?? "Fără plan activ"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted-foreground))]">{isPreviewMode ? "Acces" : "Expirare / reînnoire"}</p>
              <p className="mt-2 font-semibold">{isPreviewMode ? "Acces gratuit pentru testare" : periodEnd}</p>
            </div>
          </div>
          <p className="mt-5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--muted))] p-4 text-sm leading-6 text-[rgb(var(--muted-foreground))]">
            {isPreviewMode
              ? "Selectarea planului este o preferință de testare. Nu trimitem cereri de plată și nu creăm abonamente."
              : context.hasAccess
                ? "Plata a fost confirmată. Accesul ReveNew este activ."
                : reasonMessage(searchParams?.reason ?? context.reason)}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {isPreviewMode ? (
              <>
                <AccessPlanJump>{context.previewPlan ? "Schimbă planul" : "Alege un plan"}</AccessPlanJump>
                {context.previewPlan ? <Button href="/dashboard" variant="secondary">Intră în dashboard</Button> : null}
              </>
            ) : (
              <>
                {context.hasAccess ? <Button href="/dashboard">Intră în dashboard</Button> : <AccessPlanJump>Alege un plan</AccessPlanJump>}
                <Button href="/access?verify=1" variant="secondary">Verifică din nou statutul</Button>
                <Button href="/billing" variant="ghost">Vezi facturarea</Button>
              </>
            )}
          </div>
        </div>

        <section id="planuri" className="mt-8 scroll-mt-24">
          <h2 id="planuri-heading" tabIndex={-1} className="text-2xl font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))]">
            {isPreviewMode ? "Planuri disponibile pentru testare" : "Planuri ReveNew"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted-foreground))]">
            {isPreviewMode ? "Alege planul pe care vrei să îl testezi în dashboard." : "Alege oferta potrivită și continuă cu solicitarea comercială."}
          </p>
          <div className="mt-5">
            {isPreviewMode ? (
              <PreviewPlanSelector selectedPlanId={context.previewPlan?.id ?? null} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {paidPlans.map((plan) => (
                  <article key={plan.id} className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6">
                    <h3 className="text-xl font-semibold">{plan.title}</h3>
                    <p className="mt-4 text-3xl font-semibold">{plan.price}</p>
                    <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">{plan.billing}</p>
                    <p className="mt-4 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{plan.description}</p>
                    <Button href={authPath("/signup", "audit")} className="mt-6">Solicită auditul</Button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {!isPreviewMode ? (
          <p className="mt-8 text-sm leading-6 text-[rgb(var(--muted-foreground))]">
            Ai finalizat deja plata? Folosește verificarea manuală. Dacă plata a fost confirmată de furnizor, accesul devine disponibil după actualizarea server-side a abonamentului.
          </p>
        ) : null}
      </section>
    </main>
  );
}
