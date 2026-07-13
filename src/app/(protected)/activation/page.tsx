import Link from "next/link";
import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
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
  const hasOwnerState = opportunities.some((item) => item.ownerProfileId) || opportunities.length > 0;
  const hasActionState = opportunities.some((item) => item.actions.some((action) => action.status === "pending")) || opportunities.length > 0;
  const reviewed = opportunities.some((item) => item.status !== "new");
  const steps = [
    { label: "Workspace configurat", complete: Boolean(current?.business.name), href: "/settings", action: "Verifică profilul" },
    { label: "Prima companie reală", complete: organizations.length > 0, href: "/companies", action: "Adaugă companie" },
    { label: "Contact sau lipsă vizibilă", complete: contacts.length > 0 || opportunities.length > 0, href: "/contacts", action: "Adaugă contact" },
    { label: "Prima oportunitate", complete: opportunities.length > 0, href: "/opportunities/analyze", action: "Creează oportunitate" },
    { label: "Responsabilitate clară", complete: hasOwnerState, href: opportunities[0] ? `/opportunities/${opportunities[0].id}` : "/opportunities", action: "Stabilește responsabilul" },
    { label: "Următoarea acțiune", complete: hasActionState, href: opportunities[0] ? `/opportunities/${opportunities[0].id}` : "/today", action: "Programează acțiunea" },
    { label: "Oportunitate revizuită", complete: reviewed, href: opportunities[0] ? `/opportunities/${opportunities[0].id}` : "/dashboard", action: "Revizuiește rezultatul" }
  ];
  const completed = steps.filter((step) => step.complete).length;

  return <PageShell eyebrow="Activare" title="Transformă datele în prima acțiune comercială" description="ReveNew devine util când o oportunitate reală are context, responsabilitate și un pas următor vizibil.">
    <div className="grid gap-6">
      <DataCard title={`${completed} din ${steps.length} repere completate`} description={`Workspace: ${current?.business.name ?? "neconfigurat"}`}>
        <div className="h-2 overflow-hidden rounded-full bg-[rgb(var(--muted))]" aria-label={`${completed} din ${steps.length} repere completate`}><div className="h-full bg-[rgb(var(--primary))]" style={{ width: `${Math.round((completed / steps.length) * 100)}%` }} /></div>
      </DataCard>
      {searchParams.mode === "import" ? <div className="rounded-xl border border-[rgb(var(--primary)_/_0.35)] bg-[rgb(var(--primary)_/_0.08)] p-5"><h2 className="font-semibold">Workspace-ul este pregătit pentru import</h2><p className="mt-2 text-sm text-[rgb(var(--muted-foreground))]">Importă controlat companiile, apoi contactele și oportunitățile. Fiecare fișier are mapare și previzualizare înainte de confirmare.</p><Link href="/opportunities/import" className="focus-ring mt-4 inline-flex h-10 items-center rounded-lg bg-[rgb(var(--primary))] px-4 text-sm font-semibold text-[rgb(var(--primary-foreground))]">Deschide importul CSV</Link></div> : null}
      <div className="grid gap-3">{steps.map((step) => <article key={step.label} className="flex flex-col gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 sm:flex-row sm:items-center"><span className="shrink-0">{step.complete ? <CheckCircleIcon className="h-6 w-6 text-emerald-400" aria-label="Completat" /> : <ExclamationCircleIcon className="h-6 w-6 text-amber-300" aria-label="Necesită atenție" />}</span><div className="min-w-0 flex-1"><h2 className="font-semibold">{step.label}</h2><p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">{step.complete ? "Date reale disponibile în workspace." : "Acest context ajută echipa să prioritizeze și să execute fără presupuneri."}</p></div><Link href={step.href} className="focus-ring inline-flex h-10 items-center justify-center rounded-lg border border-[rgb(var(--border))] px-3 text-sm font-semibold">{step.complete ? "Deschide" : step.action}</Link></article>)}</div>
      <aside className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-5"><h2 className="font-semibold">Control și roluri</h2><p className="mt-2 text-sm leading-6 text-[rgb(var(--muted-foreground))]">Administratorii workspace-ului gestionează membrii și setările. Membrii autorizați pot lucra oportunități și acțiuni. Conținutul generat rămâne sub control uman, iar administrarea platformei este separată.</p></aside>
      <div className="flex flex-wrap gap-3"><Link href="/dashboard" className="focus-ring inline-flex h-11 items-center rounded-lg bg-[rgb(var(--primary))] px-5 text-sm font-semibold text-[rgb(var(--primary-foreground))]">Deschide Control Center</Link><Link href="/help" className="focus-ring inline-flex h-11 items-center rounded-lg border border-[rgb(var(--border))] px-5 text-sm font-semibold">Vezi ghidul</Link></div>
    </div>
  </PageShell>;
}
