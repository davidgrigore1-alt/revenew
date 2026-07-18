import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRightIcon,
  CheckBadgeIcon,
  CircleStackIcon,
  ClipboardDocumentCheckIcon,
  EyeIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";
import { AccessPlanJump } from "@/components/access/AccessPlanJump";
import { PricingCard } from "@/components/access/PricingCard";
import { PreviewPlanSelector } from "@/components/access/PreviewPlanSelector";
import { TrustItem } from "@/components/access/TrustItem";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { authPath } from "@/lib/auth/redirects";
import { getCurrentPaidAccessContext, getPaidAccessStatusLabel } from "@/lib/billing/paid-access";
import { previewPlans } from "@/lib/billing/plans";
import { formatDate } from "@/lib/utils";

const paidPlans = previewPlans.map((plan) => {
  const audit = plan.id === "audit";
  return {
    ...plan,
    eyebrow: audit ? "Punct de pornire" : "Operare continuă",
    audience: audit ? "echipe care vor o evaluare structurată înainte de implementare" : "companii care vor disciplină comercială și vizibilitate recurente",
    description: audit
      ? "Audit de 7 zile pentru identificarea oportunităților recuperabile și a blocajelor de follow-up."
      : "Proces recurent de verificare, prioritizare, follow-up pregătit și raportare pentru management.",
    items: audit
      ? ["maparea oportunităților și a valorii urmărite", "revizuirea ownership-ului și a follow-up-ului", "recomandări și pași următori documentați"]
      : ["monitorizare și prioritizare recurente", "follow-up pregătit cu control uman", "raportare operațională și executivă"]
  };
});

function reasonMessage(reason?: string) {
  if (reason === "expired") return "Perioada planului s-a încheiat. Poți verifica statutul sau continua procesul comercial pentru reactivare.";
  if (reason === "payment_failed") return "Confirmarea plății nu este disponibilă încă. Verifică din nou statutul sau consultă zona de facturare.";
  if (reason === "trial_not_enabled") return "Accesul operațional necesită un plan confirmat. Contul și workspace-ul rămân păstrate.";
  if (reason === "cancelled") return "Planul nu mai este activ. Datele contului rămân păstrate conform politicilor existente.";
  return "Contul este creat, iar activarea funcțiilor comerciale necesită confirmarea unui plan sau a implementării.";
}

export default async function AccessPage({ searchParams }: { searchParams?: { reason?: string } }) {
  const context = await getCurrentPaidAccessContext({ redirectIfMissingBusiness: false });

  if (!context) redirect("/onboarding");

  const isPreviewMode = context.accessMode === "preview";
  const periodEnd = context.subscription?.currentPeriodEnd ? formatDate(context.subscription.currentPeriodEnd) : "Nu este stabilită";
  const statusLabel = isPreviewMode ? "Mod de testare activ" : getPaidAccessStatusLabel(context.accessStatus);
  const planLabel = isPreviewMode ? context.previewPlan?.title ?? "Niciun plan selectat" : context.subscription?.plan ?? "Fără plan activ";
  const accessLabel = isPreviewMode ? "Acces local de testare" : context.hasAccess ? "Acces comercial activ" : "Confirmare comercială necesară";

  return (
    <main className="account-light-theme min-h-screen overflow-hidden bg-[#f7f8f6] text-[#0b0f0d]">
      <header className="sticky top-0 z-40 border-b border-[#dde3dd] bg-[rgba(247,248,246,0.92)] backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Logo />
          <div className="flex items-center gap-1 sm:gap-3">
            <Link href="/billing" className="focus-ring inline-flex min-h-10 items-center rounded-button px-3 text-sm font-semibold text-[#3f4a45] transition-colors duration-fast hover:bg-[#f0f2ef] hover:text-[#0b0f0d]">Cont<span className="hidden sm:inline"> și facturare</span></Link>
            <div className="hidden sm:block"><LogoutButton className="min-h-10 px-3 py-2" /></div>
          </div>
        </div>
      </header>

      <section className="relative border-b border-[#dde3dd]">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_80%_18%,rgba(18,185,129,0.10),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f7f8f6_100%)]" />
        <div className="relative mx-auto grid max-w-[1200px] gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)] lg:items-center lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">Activare comercială controlată</Badge>
              {isPreviewMode ? <Badge tone="info">Mediu local de testare</Badge> : null}
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl lg:text-[3.5rem]">
              Contul este pregătit. Activează modul de lucru potrivit.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#3f4a45] sm:text-lg">
              Contul și workspace-ul ReveNew sunt create. Accesul operațional devine disponibil după confirmarea planului sau a implementării comerciale, fără să schimbe controlul uman asupra deciziilor.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <AccessPlanJump>{context.previewPlan ? "Compară opțiunile" : "Alege un plan"}</AccessPlanJump>
              {context.hasAccess ? <Button href="/dashboard" variant="secondary">Intră în Control Center</Button> : <Button href="/access?verify=1" variant="secondary">Verifică statutul</Button>}
            </div>
            <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-[#6b756f]">
              <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#087354]" aria-hidden="true" />
              Activarea nu introduce acțiuni comerciale autonome. Drafturile, aprobările și livrările rămân stări distincte și auditabile.
            </p>
          </div>

          <section aria-labelledby="access-status-heading" className="rounded-[1.25rem] border border-[#c8d1c8] bg-white p-5 shadow-[0_28px_80px_rgba(15,23,42,0.10)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#087354]">Stare cont</p>
                <h2 id="access-status-heading" className="mt-2 text-xl font-semibold tracking-[-0.02em]">Acces explicat, fără blocaje tehnice</h2>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eefdf7] text-[#087354]"><CheckBadgeIcon className="h-5 w-5" aria-hidden="true" /></span>
            </div>
            <dl className="mt-6 divide-y divide-[#dde3dd] border-y border-[#dde3dd]">
              <div className="grid gap-1 py-4 sm:grid-cols-[120px_1fr]"><dt className="text-sm text-[#6b756f]">Workspace</dt><dd className="font-semibold">{context.currentBusiness.business.name}</dd></div>
              <div className="grid gap-1 py-4 sm:grid-cols-[120px_1fr]"><dt className="text-sm text-[#6b756f]">Status acces</dt><dd className="font-semibold">{statusLabel}</dd></div>
              <div className="grid gap-1 py-4 sm:grid-cols-[120px_1fr]"><dt className="text-sm text-[#6b756f]">Plan</dt><dd className="font-semibold">{planLabel}</dd></div>
              <div className="grid gap-1 py-4 sm:grid-cols-[120px_1fr]"><dt className="text-sm text-[#6b756f]">Activare</dt><dd className="font-semibold">{isPreviewMode ? accessLabel : periodEnd}</dd></div>
            </dl>
            <p className="mt-5 rounded-card border border-[#b9e7cc] bg-[#eaf8f0] p-4 text-sm leading-6 text-[#0f6b3e]">
              {isPreviewMode
                ? "Alegerea planului este o preferință locală de testare. Nu inițiază plăți și nu creează abonamente."
                : context.hasAccess
                  ? "Planul a fost confirmat server-side, iar accesul ReveNew este activ."
                  : reasonMessage(searchParams?.reason ?? context.reason)}
            </p>
          </section>
        </div>
      </section>

      <section id="planuri" className="scroll-mt-24 border-b border-[#dde3dd] bg-[#f2f4f1]">
        <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#087354]">Opțiuni comerciale</p>
            <h2 id="planuri-heading" tabIndex={-1} className="mt-3 text-3xl font-semibold tracking-[-0.035em] outline-none sm:text-4xl">Alege nivelul de intervenție potrivit</h2>
            <p className="mt-4 text-base leading-7 text-[#3f4a45]">Prețurile sunt exprimate în EUR. Nicio opțiune nu promite rezultate garantate; valoarea este urmărită și confirmată separat de estimări.</p>
          </div>

          <div className="mt-9">
            {isPreviewMode ? (
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2"><PreviewPlanSelector selectedPlanId={context.previewPlan?.id ?? null} /></div>
                <PricingCard
                  eyebrow="Implementare asistată"
                  title="Implementare personalizată"
                  price="Ofertă"
                  billing="în funcție de complexitate"
                  description="Pentru procese comerciale cu date distribuite, reguli speciale sau mai mulți stakeholderi."
                  audience="echipe cu fluxuri complexe și cerințe de integrare aprobate"
                  items={["analiză de proces și arhitectură", "configurarea fluxurilor necesare", "plan de implementare și instruire"]}
                  action={<p className="rounded-button border border-[#dde3dd] bg-[#f7f8f6] px-4 py-3 text-center text-sm font-semibold text-[#3f4a45]">Disponibilă prin confirmare comercială</p>}
                />
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                {paidPlans.map((plan) => (
                  <PricingCard
                    key={plan.id}
                    eyebrow={plan.eyebrow}
                    title={plan.title}
                    price={plan.price}
                    billing={plan.billing}
                    description={plan.description}
                    audience={plan.audience}
                    items={plan.items}
                    featured={plan.id === "managed"}
                    action={<Button href={authPath("/signup", "audit")} className="w-full">Solicită activarea</Button>}
                  />
                ))}
                <PricingCard
                  eyebrow="Implementare asistată"
                  title="Implementare personalizată"
                  price="Ofertă"
                  billing="în funcție de complexitate"
                  description="Configurare pentru fluxuri comerciale complexe, date distribuite sau cerințe enterprise."
                  audience="echipe cu integrare și guvernanță specifice"
                  items={["analiză de proces și arhitectură", "configurarea fluxurilor aprobate", "instruire și plan de operare"]}
                  action={<p className="rounded-button border border-[#dde3dd] bg-[#f7f8f6] px-4 py-3 text-center text-sm font-semibold text-[#3f4a45]">Consultanță prin procesul comercial existent</p>}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#087354]">După confirmare</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">Un proces controlat, nu un simplu checkout</h2>
              <p className="mt-4 text-base leading-7 text-[#3f4a45]">Activarea stabilește accesul comercial. Datele, ownership-ul și pașii următori rămân în workspace-ul companiei și sunt operate de utilizatori autorizați.</p>
            </div>
            <ol className="grid gap-4 sm:grid-cols-3">
              {[
                ["01", "Confirmare", "Planul sau implementarea este confirmată prin fluxul existent."],
                ["02", "Configurare", "Workspace-ul este pregătit pentru datele și procesul comercial al echipei."],
                ["03", "Control operațional", "Echipa prioritizează oportunitățile, ownership-ul și follow-up-ul din Control Center."]
              ].map(([number, title, description]) => (
                <li key={number} className="rounded-panel border border-[#dde3dd] bg-[#fafaf8] p-5">
                  <span className="text-xs font-semibold text-[#087354]">{number}</span>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#6b756f]">{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="border-y border-[#dde3dd] bg-[#f7f8f6]">
        <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <TrustItem icon={<EyeIcon className="h-5 w-5" aria-hidden="true" />} title="Control uman" description="Acțiunile comerciale critice rămân aprobate de utilizator." />
            <TrustItem icon={<CircleStackIcon className="h-5 w-5" aria-hidden="true" />} title="Workspace izolat" description="Datele sunt încărcate în contextul companiei autorizate." />
            <TrustItem icon={<ClipboardDocumentCheckIcon className="h-5 w-5" aria-hidden="true" />} title="Auditabilitate" description="Schimbările și rezultatele pot fi urmărite în workflow." />
            <TrustItem icon={<UserGroupIcon className="h-5 w-5" aria-hidden="true" />} title="Ownership clar" description="Responsabilitatea și următorul pas rămân vizibile." />
            <TrustItem icon={<LockClosedIcon className="h-5 w-5" aria-hidden="true" />} title="Security by design" description="Nu sunt expuse chei privilegiate sau stări interne sensibile." />
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[0.7fr_1.3fr] lg:px-8 lg:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#087354]">Întrebări utile</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">Claritate înainte de activare</h2>
          </div>
          <div className="divide-y divide-[#dde3dd] border-y border-[#dde3dd]">
            {[
              ["De ce este accesul controlat?", "ReveNew gestionează date și acțiuni comerciale sensibile. Confirmarea accesului păstrează separarea dintre cont, workspace și dreptul de utilizare al funcțiilor operaționale."],
              ["Ce se întâmplă după confirmarea planului?", "Statutul este verificat server-side. După confirmare, utilizatorul poate continua în Control Center conform permisiunilor și contextului workspace-ului existent."],
              ["Pot solicita implementare personalizată?", "Da. Opțiunea este prezentată separat deoarece nu este un plan selectabil automat și necesită definirea procesului, datelor și cerințelor de integrare."],
              ["Ce date sunt necesare pentru configurare?", "Doar datele comerciale relevante pentru oportunități, ownership, contacte, valori și următorii pași. Evităm colectarea informațiilor care nu sunt necesare procesului."]
            ].map(([question, answer]) => (
              <details key={question} className="group">
                <summary className="focus-ring flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-control py-4 font-semibold marker:hidden">
                  <span>{question}</span><span aria-hidden="true" className="text-xl font-normal text-[#087354] transition-transform duration-fast group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-3xl pb-5 pr-8 text-sm leading-6 text-[#6b756f]">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#dde3dd] bg-[#063326] text-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7beac4]">Următorul pas</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">Activează accesul fără să pierzi controlul asupra procesului.</h2>
            <p className="mt-3 text-sm leading-6 text-[#c9d2ca]">Alege opțiunea potrivită, verifică statutul sau consultă starea contului. Datele și permisiunile existente rămân neschimbate.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <AccessPlanJump>Alege planul</AccessPlanJump>
            <Button href="/billing" variant="secondary">Vezi starea contului <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>
          </div>
        </div>
      </section>
    </main>
  );
}
