import Link from "next/link";
import { ArrowRightIcon, CheckCircleIcon, ExclamationCircleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { PageShell } from "@/components/dashboard/PageShell";
import { DataCard } from "@/components/dashboard/DataCard";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { getCrmWorkspaceForCurrentBusiness } from "@/lib/revenue-workspace";
import { getOpportunitiesForCurrentBusiness } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

export default async function ActivationPage({ searchParams }: { searchParams: { mode?: string } }) {
  const [current, crm, opportunities] = await Promise.all([getCurrentBusinessForUser({ redirectIfMissing: true }), getCrmWorkspaceForCurrentBusiness(), getOpportunitiesForCurrentBusiness()]);
  const organizations = crm.ready ? crm.organizations : [];
  const contacts = crm.ready ? crm.contacts : [];
  const hasOwnerState = opportunities.some((item) => Boolean(item.ownerProfileId));
  const hasActionState = opportunities.some((item) => item.actions.some((action) => action.status === "pending"));
  const reviewed = opportunities.some((item) => item.status !== "new");
  const steps = [
    { label: "Workspace configurat", complete: Boolean(current?.business.name), href: "/settings", action: "Verifică profilul" },
    { label: "Context client verificat", complete: organizations.length > 0 || contacts.length > 0, href: "/companies", action: "Adaugă companie" },
    { label: "Prima oportunitate", complete: opportunities.length > 0, href: "/opportunities/analyze", action: "Creează oportunitate" },
    { label: "Owner și next action stabilite", complete: hasOwnerState && hasActionState, href: opportunities[0] ? `/opportunities/${opportunities[0].id}` : "/opportunities", action: hasOwnerState ? "Programează acțiunea" : "Stabilește responsabilul" },
    { label: "Oportunitate revizuită", complete: reviewed, href: opportunities[0] ? `/opportunities/${opportunities[0].id}` : "/dashboard", action: "Revizuiește rezultatul" }
  ];
  const completed = steps.filter((step) => step.complete).length;
  const nextStep = steps.find((step) => !step.complete) ?? { label: "Fluxul de lucru este activ", complete: true, href: "/dashboard", action: "Deschide Control Center" };
  const firstOpportunity = opportunities[0];

  return <PageShell eyebrow="Activare" title="Transformă primele date într-o acțiune comercială clară" description="Adaugă sau importă contextul unei oportunități. ReveNew îl organizează pentru revizuire — fără mesaje trimise automat.">
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.65fr)]">
      <div className="grid content-start gap-6">
        <section className="overflow-hidden rounded-panel border border-[rgb(var(--primary)/0.32)] bg-[linear-gradient(135deg,rgb(var(--surface-elevated)),rgb(var(--primary)/0.08))] p-6 shadow-card sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">Următorul pas recomandat</p>
          <h2 className="mt-3 max-w-2xl font-display text-2xl font-semibold tracking-tight sm:text-3xl">{nextStep.label}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[rgb(var(--text-muted))]">Completează acest reper pentru ca următoarea oportunitate să aibă context, responsabilitate și un pas următor verificabil.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={nextStep.href} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-button bg-[rgb(var(--primary))] px-5 text-sm font-semibold text-[rgb(var(--primary-foreground))] transition hover:bg-[rgb(var(--primary-hover))]">{nextStep.action}<ArrowRightIcon className="size-4" aria-hidden="true" /></Link>
            {searchParams.mode !== "import" ? <Link href="/opportunities/import" className="focus-ring inline-flex min-h-11 items-center rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-5 text-sm font-semibold hover:border-[rgb(var(--border-strong))]">Importă un CSV</Link> : null}
          </div>
        </section>

        {searchParams.mode === "import" ? <section className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5"><h2 className="font-semibold">Importul controlat este pregătit</h2><p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Încarcă datele, verifică maparea și previzualizarea, apoi confirmă explicit importul.</p><Link href="/opportunities/import" className="focus-ring mt-4 inline-flex min-h-10 items-center rounded-button bg-[rgb(var(--primary))] px-4 text-sm font-semibold text-[rgb(var(--primary-foreground))]">Deschide importul CSV</Link></section> : null}

        {firstOpportunity ? <DataCard title="Prima oportunitate este vizibilă" description="Un exemplu real din spațiul tău de lucru, gata pentru continuare."><div className="flex flex-col gap-3 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{firstOpportunity.title}</p><p className="mt-1 text-sm text-[rgb(var(--text-muted))]">Verifică responsabilul, următoarea acțiune și termenul.</p></div><Link href={`/opportunities/${firstOpportunity.id}`} className="focus-ring inline-flex min-h-10 shrink-0 items-center text-sm font-semibold text-[rgb(var(--primary))]">Continuă oportunitatea <ArrowRightIcon className="ml-2 size-4" /></Link></div></DataCard> : <DataCard title="Ce vei obține" description="După primul import sau prima creare manuală."><div className="grid gap-3 sm:grid-cols-3">{["Prioritate explicată", "Responsabil vizibil", "Următor pas cu termen"].map((item) => <div key={item} className="rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4 text-sm font-medium">{item}</div>)}</div></DataCard>}
      </div>

      <aside className="grid content-start gap-4 rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-card">
        <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">Progres de activare</p><p className="mt-2 text-2xl font-semibold">{completed}/{steps.length}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--surface-muted))]" aria-label={`${completed} din ${steps.length} repere completate`}><div className="h-full bg-[rgb(var(--primary))]" style={{ width: `${Math.round((completed / steps.length) * 100)}%` }} /></div></div>
        <ol className="grid gap-1">{steps.map((step) => <li key={step.label}><Link href={step.href} className="focus-ring flex min-h-11 items-center gap-3 rounded-control px-2 text-sm transition hover:bg-[rgb(var(--surface-subtle))]"><span className="shrink-0">{step.complete ? <CheckCircleIcon className="size-5 text-[rgb(var(--success-text))]" aria-label="Completat" /> : <ExclamationCircleIcon className="size-5 text-[rgb(var(--warning-text))]" aria-label="Necesită atenție" />}</span><span className={step.complete ? "text-[rgb(var(--text-muted))]" : "font-medium"}>{step.label}</span></Link></li>)}</ol>
        <div className="border-t border-[rgb(var(--border))] pt-4"><div className="flex items-center gap-2 font-semibold"><ShieldCheckIcon className="size-5 text-[rgb(var(--primary))]" />Controlul rămâne la echipă</div><p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">ReveNew recomandă și organizează. Nicio acțiune externă nu este trimisă fără o decizie umană.</p></div>
      </aside>
    </div>
  </PageShell>;
}
