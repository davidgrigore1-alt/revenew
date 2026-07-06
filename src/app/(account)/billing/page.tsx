import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { getCurrentPaidAccessContext, getPaidAccessStatusLabel } from "@/lib/billing/paid-access";
import { formatDate } from "@/lib/utils";

export default async function BillingPage() {
  const context = await getCurrentPaidAccessContext({ redirectIfMissingBusiness: false });

  if (!context) {
    redirect("/onboarding");
  }

  const isPreviewMode = context.accessMode === "preview";

  return (
    <main className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <header className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <div className="mx-auto flex max-w-[960px] items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <Logo />
          <LogoutButton className="min-h-10" />
        </div>
      </header>

      <section className="mx-auto max-w-[960px] px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">{isPreviewMode ? "Plan și acces" : "Plan și facturare"}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{isPreviewMode ? "Acces de testare ReveNew" : "Facturare ReveNew"}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[rgb(var(--muted-foreground))]">
          {isPreviewMode
            ? "Planul selectat este o preferință de testare. Nu reprezintă o plată și nu creează un abonament."
            : "Statutul este citit de pe server. Nu folosim URL-uri de succes sau date din browser ca dovadă de plată."}
        </p>

        <div className="mt-8 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6">
          <dl className="grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted-foreground))]">Business</dt>
              <dd className="mt-1 font-semibold">{context.currentBusiness.business.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted-foreground))]">Status acces</dt>
              <dd className="mt-1 font-semibold">{isPreviewMode ? "Mod de testare" : getPaidAccessStatusLabel(context.accessStatus)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted-foreground))]">Plan</dt>
              <dd className="mt-1 font-semibold">{isPreviewMode ? context.previewPlan?.title ?? "Niciun plan selectat" : context.subscription?.plan ?? "Fără plan activ"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted-foreground))]">{isPreviewMode ? "Acces" : "Reînnoire / expirare"}</dt>
              <dd className="mt-1 font-semibold">{isPreviewMode ? "Acces gratuit pentru testare" : context.subscription?.currentPeriodEnd ? formatDate(context.subscription.currentPeriodEnd) : "Nu este setată"}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {context.hasAccess ? <Button href="/dashboard">Intră în dashboard</Button> : <Button href="/access">Activează accesul</Button>}
            <Button href={isPreviewMode ? "/access#planuri" : "/#preturi"} variant="secondary">
              {isPreviewMode ? "Schimbă planul" : "Vezi opțiunile"}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
