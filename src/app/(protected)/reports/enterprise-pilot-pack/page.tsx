import Link from "next/link";
import { ArrowRightIcon, CheckCircleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { PageShell } from "@/components/dashboard/PageShell";
import { PrintPilotPackButton } from "@/components/reports/PrintPilotPackButton";
import { Button } from "@/components/ui/Button";
import { getEnterprisePilotPack } from "@/lib/enterprise-pilot-pack";
import { formatCurrency, formatDateTimeWithSeconds } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusTone = {
  critical: "inline-flex rounded-full border border-[rgb(var(--danger-border))] bg-[rgb(var(--danger-background))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--danger-text))]",
  attention: "inline-flex rounded-full border border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--warning-text))]",
  stable: "inline-flex rounded-full border border-[rgb(var(--success-border))] bg-[rgb(var(--success-background))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--success-text))]",
  incomplete: "inline-flex rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--text-muted))]"
} as const;

const evidenceTypeLabels = {
  opportunity: "Oportunitate",
  opportunity_action: "Acțiune comercială",
  opportunity_document: "Document comercial",
  commercial_signal: "Semnal comercial",
  approval: "Aprobare"
} as const;

function Section({
  id,
  eyebrow,
  title,
  description,
  children
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="pilot-section rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 sm:p-6">
      <p className="text-label text-[rgb(var(--primary))]">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-[rgb(var(--foreground))]">{title}</h2>
      {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--text-muted))]">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function EnterprisePilotPackPage() {
  const pack = await getEnterprisePilotPack();

  return (
    <PageShell
      eyebrow="Validare comercială"
      title={pack.executiveTitle}
      description={pack.executiveSubtitle}
      breadcrumbs={[{ label: "Rapoarte", href: "/reports" }, { label: "Propunere pilot ReveNew" }]}
      actions={
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button href={pack.firstSafeActionHref} size="small">{pack.firstSafeActionLabel}</Button>
          <Button href={pack.auditHref} variant="secondary" size="small">Deschide auditul</Button>
          <PrintPilotPackButton />
        </div>
      }
    >
      <article className="enterprise-pilot-pack space-y-5">
        <div className="hidden border-b border-[rgb(var(--border))] pb-5 print:block">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">ReveNew · Propunere de validare</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[rgb(var(--foreground))]">{pack.executiveTitle}</h1>
          <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">{pack.executiveSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--border))] pb-4 text-xs text-[rgb(var(--text-muted))]">
          <p><span className="font-semibold text-[rgb(var(--foreground))]">Spațiu de lucru:</span> {pack.workspaceName}</p>
          <p><span className="font-semibold text-[rgb(var(--foreground))]">Data propunerii:</span> {formatDateTimeWithSeconds(pack.generatedAt)}</p>
        </div>

        <Section id="rezumat" eyebrow="A · Rezumat executiv" title="O validare controlată, în 14 zile">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.38fr)]">
            <div>
              <span className={statusTone[pack.status]}>{pack.statusLabel}</span>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[rgb(var(--text-secondary))]">{pack.executiveSummary}</p>
              <p className="mt-3 text-sm font-semibold text-[rgb(var(--foreground))]">Obiectiv: <span className="font-normal text-[rgb(var(--text-secondary))]">{pack.pilotObjective}</span></p>
              <p className="mt-3 text-sm font-semibold text-[rgb(var(--foreground))]">
                Prima acțiune sigură, sub control uman:{" "}
                <Link className="focus-ring rounded-sm text-[rgb(var(--primary))] hover:underline" href={pack.firstSafeActionHref}>
                  {pack.firstSafeActionLabel}
                </Link>
              </p>
            </div>
            <div className="rounded-card border border-[rgb(var(--primary)/0.24)] bg-[rgb(var(--primary-muted))] p-4">
              <p className="text-label text-[rgb(var(--primary))]">Valoare estimată expusă</p>
              <div className="mt-2 space-y-1">
                {pack.estimatedExposedValueByCurrency.length > 0 ? pack.estimatedExposedValueByCurrency.map((entry) => (
                  <p key={entry.currency} className="text-lg font-semibold tabular-nums text-[rgb(var(--foreground))]">{formatCurrency(entry.value, entry.currency)}</p>
                )) : <p className="text-sm font-semibold text-[rgb(var(--foreground))]">Fără estimare susținută de date</p>}
              </div>
              <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">Fiecare oportunitate este numărată o singură dată în total, chiar dacă are mai multe blocaje. Monedele rămân separate. Valoare estimată, nu venit confirmat; pilotul nu garantează recuperarea ei.</p>
            </div>
          </div>
        </Section>

        <Section id="de-ce-acum" eyebrow="B · De ce acum" title={pack.primaryCommercialProblem.title} description="Problema principală este selectată din prioritățile deja susținute de dovezi în audit.">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)]">
            <div className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4">
              <p className="text-sm leading-6 text-[rgb(var(--text-secondary))]">{pack.primaryCommercialProblem.reason}</p>
              <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-muted))]"><strong className="text-[rgb(var(--foreground))]">Impact operațional:</strong> {pack.primaryCommercialProblem.whyItMatters}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[rgb(var(--foreground))]">Riscuri prioritare</h3>
              {pack.topBusinessRisks.length > 0 ? <ul className="mt-2 space-y-2">{pack.topBusinessRisks.map((risk) => <li key={risk.id} className="text-sm leading-6 text-[rgb(var(--text-muted))]">— {risk.title}</li>)}</ul> : <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Nu există alte riscuri prioritare dovedite în datele disponibile.</p>}
            </div>
          </div>
        </Section>

        <Section id="domeniu" eyebrow="C · Domeniul pilotului" title="Ce va fi validat" description="Domeniul este limitat la cazurile și lacunele operaționale deja observabile; nu adaugă scenarii sau promisiuni de rezultat.">
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-[rgb(var(--foreground))]">Activități incluse</h3>
              <ul className="mt-3 space-y-2">{pack.implementationScope.map((item) => <li key={item} className="flex gap-2 text-sm leading-6 text-[rgb(var(--text-muted))]"><CheckCircleIcon className="mt-1 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />{item}</li>)}</ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[rgb(var(--foreground))]">Cazuri pentru demonstrarea valorii</h3>
              {pack.proofOfValuePriorities.length > 0 ? <ol className="mt-3 space-y-3">{pack.proofOfValuePriorities.map((item, index) => <li key={item.id} className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-3"><p className="text-sm font-semibold text-[rgb(var(--foreground))]">{index + 1}. {item.title}</p><p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Bazat pe: {item.evidence.map((source) => source.label).join(" · ")}</p></li>)}</ol> : <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-muted))]">Cazurile vor putea fi selectate după completarea setului minim de date.</p>}
            </div>
          </div>
        </Section>

        <Section id="plan" eyebrow="D · Plan de implementare" title="Plan pe 14 zile" description="Fiecare etapă are un rezultat observabil și rămâne sub controlul echipei clientului.">
          <ol className="grid gap-3 lg:grid-cols-3">
            {pack.fourteenDayPlan.map((phase) => (
              <li key={phase.period} className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4">
                <p className="text-label text-[rgb(var(--primary))]">{phase.period}</p>
                <h3 className="mt-2 font-semibold text-[rgb(var(--foreground))]">{phase.objective}</h3>
                <ul className="mt-3 space-y-2">{phase.actions.map((action) => <li key={action} className="text-sm leading-6 text-[rgb(var(--text-muted))]">— {action}</li>)}</ul>
                <p className="mt-4 border-t border-[rgb(var(--border))] pt-3 text-xs leading-5 text-[rgb(var(--text-secondary))]"><strong>Rezultat urmărit:</strong> {phase.expectedResult}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="criterii" eyebrow="E · Criterii de succes" title="Cum va fi evaluat pilotul" description="Criterii operaționale și verificabile; nu presupun venit recuperat, ROI sau o probabilitate de succes.">
          <div className="grid gap-3 lg:grid-cols-2">
            {pack.successCriteria.map((criterion) => (
              <div key={criterion.id} className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4">
                <h3 className="font-semibold text-[rgb(var(--foreground))]">{criterion.label}</h3>
                <dl className="mt-3 space-y-2 text-xs leading-5 text-[rgb(var(--text-muted))]">
                  <div><dt className="font-semibold text-[rgb(var(--foreground))]">Situație inițială</dt><dd>{criterion.currentState}</dd></div>
                  <div><dt className="font-semibold text-[rgb(var(--foreground))]">Ținta pilotului</dt><dd>{criterion.pilotTarget}</dd></div>
                  <div><dt className="font-semibold text-[rgb(var(--foreground))]">Măsurare</dt><dd>{criterion.measurement}</dd></div>
                </dl>
              </div>
            ))}
          </div>
        </Section>

        <Section id="comitet" eyebrow="F · Comitetul de cumpărare" title="Ce trebuie să poată verifica fiecare rol">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {pack.buyerCommitteeNotes.map((stakeholder) => <div key={stakeholder.role} className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4"><h3 className="font-semibold text-[rgb(var(--foreground))]">{stakeholder.role}</h3><p className="mt-2 text-xs font-semibold text-[rgb(var(--primary))]">{stakeholder.focus}</p><p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{stakeholder.note}</p></div>)}
          </div>
        </Section>

        <Section id="date-necesare" eyebrow="G · Date necesare" title="Ce trebuie furnizat de client" description="Numai informațiile necesare pentru un pilot verificabil; elementele opționale sunt marcate distinct.">
          <ul className="divide-y divide-[rgb(var(--border))] rounded-card border border-[rgb(var(--border))]">
            {pack.requiredClientInputs.map((input) => <li key={input.label} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,0.65fr)_auto_minmax(0,1fr)] sm:items-start"><p className="text-sm font-semibold text-[rgb(var(--foreground))]">{input.label}</p><span className="w-fit rounded-full border border-[rgb(var(--border))] px-2 py-0.5 text-[0.6875rem] font-semibold text-[rgb(var(--text-muted))]">{input.availability}</span><p className="text-sm leading-6 text-[rgb(var(--text-muted))]">{input.purpose}</p></li>)}
          </ul>
        </Section>

        <Section id="dupa-pilot" eyebrow="H · După pilot" title="Decizia de continuare rămâne controlată" description="La finalul celor 14 zile, conducerea alege direcția pe baza criteriilor și dovezilor observate, nu pe baza unei promisiuni comerciale.">
          <div className="grid gap-3 lg:grid-cols-3">
            {pack.continuationDecisions.map((decision) => (
              <div key={decision.title} className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4">
                <h3 className="font-semibold text-[rgb(var(--foreground))]">{decision.title}</h3>
                <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]"><strong className="text-[rgb(var(--foreground))]">Când:</strong> {decision.when}</p>
                <p className="mt-3 border-t border-[rgb(var(--border))] pt-3 text-xs leading-5 text-[rgb(var(--text-secondary))]"><strong>Pas următor:</strong> {decision.nextStep}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="dovezi" eyebrow="I · Dovezi și metodologie" title="Cum poate fi verificată propunerea" description="Propunerea reutilizează auditul operațional curent și păstrează legătura cu sursele autorizate.">
          {pack.evidence.length > 0 ? <ul className="divide-y divide-[rgb(var(--border))] rounded-card border border-[rgb(var(--border))]">{pack.evidence.slice(0, 8).map((source) => <li key={`${source.sourceType}:${source.sourceId}:${source.href}`} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 gap-2"><CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" /><div><p className="text-sm font-semibold text-[rgb(var(--foreground))]">{source.label}</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{source.sourceTimestamp ? formatDateTimeWithSeconds(source.sourceTimestamp) : "Dată indisponibilă"} · {evidenceTypeLabels[source.sourceType]}</p></div></div><Link href={source.href} className="focus-ring inline-flex items-center gap-1 rounded-sm text-sm font-semibold text-[rgb(var(--primary))] hover:underline">Deschide dovada<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link></li>)}</ul> : <p className="text-sm leading-6 text-[rgb(var(--text-muted))]">Nu există încă dovezi suficiente pentru priorități comerciale verificabile.</p>}
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{pack.safetyNotes.map((note) => <p key={note} className="flex gap-2 text-sm leading-6 text-[rgb(var(--text-muted))]"><ShieldCheckIcon className="mt-1 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />{note}</p>)}</div>
          <Link href={pack.auditHref} className="focus-ring mt-5 inline-flex items-center gap-1 rounded-sm text-sm font-semibold text-[rgb(var(--primary))] hover:underline">Consultă auditul de recuperare venituri<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>
        </Section>

        <Section id="nota" eyebrow="J · Notă de utilizare" title="Interpretare prudentă">
          <p className="max-w-4xl text-sm leading-7 text-[rgb(var(--text-secondary))]">{pack.disclaimer}</p>
        </Section>
      </article>
    </PageShell>
  );
}
