import { ArrowRightIcon, CheckCircleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { PageShell } from "@/components/dashboard/PageShell";
import { Button } from "@/components/ui/Button";
import { requirePermission } from "@/lib/authz/require-permission";
import { buyerDemoHref, buyerDemoSteps } from "@/lib/buyer-demo";

const closingPrinciples = [
  "Primul audit nu necesită acces complet la inbox.",
  "Datele comerciale pot fi anonimizate înainte de analiză.",
  "Nicio comunicare externă nu este trimisă automat.",
  "Valoarea estimată nu este venit confirmat.",
  "Decizia umană rămâne obligatorie pentru orice pas cu impact comercial."
];

export default async function DemoPage() {
  await requirePermission("platform.internal_tools.access");

  return (
    <PageShell
      eyebrow="Prezentare controlată"
      title="Demo controlat ReveNew"
      description="Un traseu de 7–10 minute de la blocaj comercial și dovadă la acțiune sigură, aprobare umană și validare prin audit și pilot."
      actions={<Button href={buyerDemoHref("/dashboard")}>Începe demo-ul<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>}
    >
      <div className="grid gap-6">
        <section className="overflow-hidden rounded-panel border border-[rgb(var(--gold-500)/0.3)] bg-[linear-gradient(145deg,rgb(var(--surface)),rgb(var(--surface-subtle)))] shadow-card" aria-labelledby="buyer-demo-framing">
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] lg:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[rgb(var(--gold-700))] dark:text-[rgb(var(--gold-300))]">Problema de urmărit</p>
              <h2 id="buyer-demo-framing" className="mt-3 max-w-3xl text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Venitul se blochează între semnal, responsabil, termen și decizie.</h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[rgb(var(--text-secondary))]">ReveNew identifică buclele comerciale deschise, le leagă de dovezi și indică următorul pas sigur. Prezentarea urmărește aceeași lume comercială de la risc și istoric la semnal neasociat, decizie umană, audit și pilot.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button href={buyerDemoHref("/dashboard")}>Începe cu decizia critică<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>
                <Button href="#route" variant="secondary">Vezi traseul complet</Button>
              </div>
            </div>
            <aside className="rounded-card border border-[rgb(var(--gold-500)/0.24)] bg-[rgb(var(--gold-500)/0.07)] p-5" aria-label="Mesajul central al prezentării">
              <ShieldCheckIcon className="h-5 w-5 text-[rgb(var(--primary))]" aria-hidden="true" />
              <h3 className="mt-3 font-semibold">Ce trebuie să înțeleagă un cumpărător</h3>
              <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Inteligența operațională structurează și explică. Nu trimite automat, nu garantează venit și nu înlocuiește aprobarea umană.</p>
              <p className="mt-4 border-t border-[rgb(var(--border))] pt-4 text-xs leading-5 text-[rgb(var(--text-muted))]">Întrebare de deschidere: unde se pierd astăzi oportunitățile între sisteme și oameni?</p>
            </aside>
          </div>
          <div className="grid grid-cols-5 gap-px border-t border-[rgb(var(--border))] bg-[rgb(var(--border))] sm:grid-cols-10" aria-label="Progresul traseului demo">
            {buyerDemoSteps.map((step, index) => <div key={step.id} className={`min-w-0 bg-[rgb(var(--surface))] px-2 py-3 text-center ${index === 0 ? "text-[rgb(var(--primary))]" : "text-[rgb(var(--text-faint))]"}`}><span className="block text-xs font-semibold tabular-nums">{String(index + 1).padStart(2, "0")}</span><span className="mt-1 hidden truncate text-[0.625rem] font-medium lg:block">{step.shortTitle}</span></div>)}
          </div>
        </section>

        <section id="route" aria-labelledby="buyer-demo-route">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[rgb(var(--primary))]">Traseu de prezentare</p>
            <h2 id="buyer-demo-route" className="mt-2 text-xl font-semibold tracking-[-0.025em]">Opt pași, o singură lume comercială</h2>
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Arată numai informația care susține decizia. Întrebarea fiecărui pas mută discuția de la produs la procesul real al cumpărătorului.</p>
          </div>
          <ol className="mt-5 grid gap-4 xl:grid-cols-2">
            {buyerDemoSteps.map((step, index) => (
              <li key={step.id} className={`flex min-w-0 flex-col rounded-panel border p-4 shadow-card sm:p-5 ${index === 0 ? "border-[rgb(var(--gold-500)/0.42)] bg-[rgb(var(--gold-500)/0.06)]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface))]"}`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgb(var(--gold-500)/0.32)] bg-[rgb(var(--gold-500)/0.1)] text-sm font-semibold text-[rgb(var(--gold-700))] dark:text-[rgb(var(--gold-300))]">{index + 1}</span>
                  <div className="min-w-0"><p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Ce arăți</p><h3 className="mt-1 text-base font-semibold tracking-[-0.01em]">{step.title}</h3><p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{step.show}</p></div>
                </div>
                <div className="mt-4 grid gap-3 border-t border-[rgb(var(--border))] pt-4 sm:grid-cols-2">
                  <div><p className="text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-[rgb(var(--text-faint))]">De ce contează</p><p className="mt-1 text-sm leading-5 text-[rgb(var(--text-muted))]">{step.understanding}</p></div>
                  <div><p className="text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-[rgb(var(--text-faint))]">Ce observi</p><p className="mt-1 text-sm leading-5 text-[rgb(var(--text-muted))]">{step.notice}</p></div>
                </div>
                <p className="mt-3 text-xs leading-5 text-[rgb(var(--text-muted))]"><strong className="text-[rgb(var(--foreground))]">Întreabă cumpărătorul:</strong> {step.buyerQuestion}</p>
                {step.safetyNote ? <p className="mt-3 text-xs leading-5 text-[rgb(var(--text-muted))]"><strong className="text-[rgb(var(--foreground))]">Limită de control:</strong> {step.safetyNote}</p> : null}
                <div className="mt-auto pt-4"><Button href={buyerDemoHref(step.href)} variant={index === 0 ? "secondary" : "ghost"} size="small">{index === 0 ? "Deschide Control Center" : `Deschide ${step.shortTitle}`}<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button></div>
              </li>
            ))}
          </ol>
        </section>

        <section id="next-step" className="rounded-panel border border-[rgb(var(--gold-500)/0.34)] bg-[rgb(var(--surface))] p-5 shadow-card sm:p-6 lg:p-8" aria-labelledby="controlled-audit-title">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[rgb(var(--primary))]">Încheiere recomandată</p>
              <h2 id="controlled-audit-title" className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Următorul pas: audit controlat pe 20–50 cazuri comerciale recente.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--text-secondary))]">Auditul verifică dacă ReveNew poate reduce timpul de căutare, clarifica buclele deschise și prioritiza acțiunile fără acces inutil la date și fără promisiuni de venit.</p>
              <p className="mt-3 text-sm font-semibold text-[rgb(var(--foreground))]">După demo, pregătește auditul controlat pe 20–50 cazuri.</p>
              <div className="mt-5 flex flex-wrap gap-2"><Button href="/audit/start">Începe audit controlat<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button><Button href="/reports/enterprise-pilot-pack" variant="secondary">Deschide Pilot Pack</Button><Button href="/demo/feedback" variant="ghost">Notează feedbackul după demo</Button></div>
            </div>
            <ul className="grid gap-3 rounded-card bg-[rgb(var(--surface-subtle))] p-4 text-sm leading-6 text-[rgb(var(--text-muted))] sm:p-5">
              {closingPrinciples.map((item) => <li key={item} className="flex gap-2"><CheckCircleIcon className="mt-1 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />{item}</li>)}
            </ul>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
