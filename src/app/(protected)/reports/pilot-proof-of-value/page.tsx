import Link from "next/link";
import { ArrowRightIcon, CheckCircleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { PageShell } from "@/components/dashboard/PageShell";
import { PrintProofOfValueButton } from "@/components/reports/PrintProofOfValueButton";
import { Button } from "@/components/ui/Button";
import { getPilotProofOfValue } from "@/lib/pilot-proof-of-value";
import { formatCurrency, formatDateTimeWithSeconds } from "@/lib/utils";

export const dynamic = "force-dynamic";

const recommendationTone = {
  continue: "border-[rgb(var(--success-border))] bg-[rgb(var(--success-background))] text-[rgb(var(--success-text))]",
  adjust: "border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] text-[rgb(var(--warning-text))]",
  stop: "border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-muted))] text-[rgb(var(--text-secondary))]"
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
    <section id={id} className="proof-section rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 sm:p-6">
      <p className="text-label text-[rgb(var(--primary))]">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-[rgb(var(--foreground))]">{title}</h2>
      {description ? <p className="mt-2 max-w-4xl text-sm leading-6 text-[rgb(var(--text-muted))]">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ValueList({
  entries,
  empty
}: {
  entries: Array<{ currency: string; value: number }>;
  empty: string;
}) {
  return entries.length > 0 ? (
    <div className="mt-2 space-y-1">
      {entries.map((entry) => (
        <p key={entry.currency} className="text-lg font-semibold tabular-nums text-[rgb(var(--foreground))]">
          {formatCurrency(entry.value, entry.currency)}
        </p>
      ))}
    </div>
  ) : <p className="mt-2 text-sm font-semibold text-[rgb(var(--foreground))]">{empty}</p>;
}

export default async function PilotProofOfValuePage() {
  const proof = await getPilotProofOfValue();
  const baseline = [
    ["Oportunități blocate", proof.startingBaseline.blockedOpportunities],
    ["Fără responsabil", proof.startingBaseline.missingOwners],
    ["Fără acțiune următoare", proof.startingBaseline.missingNextActions],
    ["Follow-up-uri întârziate", proof.startingBaseline.overdueFollowUps],
    ["Aprobări în așteptare", proof.startingBaseline.pendingApprovals],
    ["Semnale nerezolvate", proof.startingBaseline.unresolvedSignals]
  ] as const;

  return (
    <PageShell
      eyebrow="Concluzie după pilot"
      title="Dovadă de valoare pilot"
      description="Concluzie operațională bazată pe datele existente, cu separarea strictă dintre progres, estimări și rezultate declarate."
      breadcrumbs={[{ label: "Rapoarte", href: "/reports" }, { label: "Dovadă de valoare pilot" }]}
      actions={
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button href={proof.firstSafeActionHref} size="small">{proof.firstSafeActionLabel}</Button>
          <Button href="/reports/enterprise-pilot-pack" variant="secondary" size="small">Vezi propunerea pilot</Button>
          <PrintProofOfValueButton />
        </div>
      }
    >
      <article data-guide-anchor="reports-audit-summary" className="pilot-proof-of-value space-y-5">
        <div className="hidden border-b border-[rgb(var(--border))] pb-5 print:block">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">ReveNew · Concluzie după pilot</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[rgb(var(--foreground))]">Dovadă de valoare pilot</h1>
          <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">Dovadă operațională, fără promisiune de rezultat financiar.</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--border))] pb-4 text-xs text-[rgb(var(--text-muted))]">
          <p><span className="font-semibold text-[rgb(var(--foreground))]">Spațiu de lucru:</span> {proof.workspaceName}</p>
          <p><span className="font-semibold text-[rgb(var(--foreground))]">Data concluziei:</span> {formatDateTimeWithSeconds(proof.generatedAt)}</p>
        </div>

        <Section id="concluzie" eyebrow="A · Concluzie executivă" title="Continuă / ajustează / oprește" description="Recomandarea folosește numai progresul înregistrat, buclele încă deschise și dovezile accesibile.">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
            <div>
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${recommendationTone[proof.recommendation]}`}>
                {proof.recommendationLabel}
              </span>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[rgb(var(--text-secondary))]">{proof.executiveConclusion}</p>
              <ul className="mt-4 space-y-2">
                {proof.recommendationBasis.map((basis) => (
                  <li key={basis} className="flex gap-2 text-sm leading-6 text-[rgb(var(--text-muted))]">
                    <CheckCircleIcon className="mt-1 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />
                    {basis}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-card border border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] p-4">
              <p className="text-label text-[rgb(var(--warning-text))]">Limită de interpretare</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[rgb(var(--foreground))]">{proof.baselineNote}</p>
              <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">Fără un snapshot persistent la începutul pilotului, raportul nu atribuie schimbarea ReveNew.</p>
            </div>
          </div>
        </Section>

        <Section id="valori" eyebrow="B · Valori și rezultate" title="Estimarea nu este venit confirmat" description="Monedele rămân separate. Nicio valoare estimată nu este prezentată ca rezultat financiar sau contabil.">
          <div className="grid gap-px overflow-hidden rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--border))] md:grid-cols-3">
            <div className="bg-[rgb(var(--surface-subtle))] p-4">
              <p className="text-sm font-semibold text-[rgb(var(--foreground))]">Valoare estimată în pipeline</p>
              <ValueList entries={proof.estimatedPipelineValueByCurrency} empty="Fără valoare estimată" />
              <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">Toate oportunitățile active; nu este venit confirmat.</p>
            </div>
            <div className="bg-[rgb(var(--surface-subtle))] p-4">
              <p className="text-sm font-semibold text-[rgb(var(--foreground))]">Valoare estimată expusă</p>
              <ValueList entries={proof.estimatedExposedValueByCurrency} empty="Fără expunere susținută de date" />
              <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">Deduplicată pe oportunitate; nu este recuperare garantată.</p>
            </div>
            <div className="bg-[rgb(var(--surface-subtle))] p-4">
              <p className="text-sm font-semibold text-[rgb(var(--foreground))]">Venit confirmat prin rezultat declarat</p>
              <ValueList entries={proof.confirmedRevenueByCurrency} empty="Niciun venit confirmat" />
              <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{proof.confirmedOutcomeCount} rezultate declarate de utilizatori · nu reprezintă venit contabil.</p>
            </div>
          </div>
        </Section>

        <Section id="baseline" eyebrow="C · Linie de bază" title="Ce este vizibil în starea curentă" description="Numerele descriu situația disponibilă acum. Nu sunt diferențe față de începutul pilotului.">
          <dl className="grid gap-px overflow-hidden rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--border))] sm:grid-cols-2 lg:grid-cols-3">
            {baseline.map(([label, value]) => (
              <div key={label} className="bg-[rgb(var(--surface-subtle))] p-4">
                <dt className="text-xs font-semibold text-[rgb(var(--text-muted))]">{label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-[rgb(var(--foreground))]">{value}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section id="progres" eyebrow="D · Semnale de progres" title="Ce poate fi demonstrat din datele existente" description="Acestea sunt totaluri observabile, nu afirmații că pilotul a produs schimbarea.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {proof.progressSignals.map((signal) => (
              <div key={signal.id} className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4">
                <p className="text-2xl font-semibold tabular-nums text-[rgb(var(--foreground))]">{signal.count}</p>
                <h3 className="mt-1 text-sm font-semibold text-[rgb(var(--foreground))]">{signal.label}</h3>
                <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{signal.interpretation}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="blocaje" eyebrow="E · Blocaje rămase" title="Ce împiedică încă progresul" description="Prioritățile rămân acționabile și legate de dovezi; raportul nu execută acțiuni în numele echipei.">
          {proof.remainingBlockers.length > 0 ? (
            <ol className="divide-y divide-[rgb(var(--border))] rounded-card border border-[rgb(var(--border))]">
              {proof.remainingBlockers.map((blocker, index) => (
                <li key={blocker.id} className="grid gap-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgb(var(--surface-muted))] text-xs font-semibold text-[rgb(var(--foreground))]">{index + 1}</span>
                  <div>
                    <h3 className="font-semibold text-[rgb(var(--foreground))]">{blocker.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-muted))]">{blocker.reason}</p>
                    <p className="mt-2 text-xs text-[rgb(var(--text-faint))]">Bazat pe: {blocker.evidence.map((source) => source.label).join(" · ") || "dovadă neclară"}</p>
                  </div>
                  <Link href={blocker.actionHref} className="focus-ring inline-flex items-center gap-1 rounded-sm text-sm font-semibold text-[rgb(var(--primary))] hover:underline">
                    {blocker.actionLabel}<ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm leading-6 text-[rgb(var(--text-muted))]">Nu există blocaje prioritare dovedite în starea curentă.</p>}
          <div className="mt-4 grid gap-3 text-sm text-[rgb(var(--text-muted))] sm:grid-cols-2 lg:grid-cols-4">
            <p><strong className="text-[rgb(var(--foreground))]">{proof.remainingBlockerCounts.missingPrimaryContacts}</strong> fără contact principal</p>
            <p><strong className="text-[rgb(var(--foreground))]">{proof.remainingBlockerCounts.preparedWorkNotAdvanced}</strong> documente fără pas final</p>
            <p><strong className="text-[rgb(var(--foreground))]">{proof.remainingBlockerCounts.opportunitiesWithoutConfirmedOutcome}</strong> oportunități active fără rezultat confirmat</p>
            <p><strong className="text-[rgb(var(--foreground))]">{proof.remainingBlockerCounts.prioritiesWithoutEvidence}</strong> priorități fără dovadă clară</p>
          </div>
        </Section>

        <Section id="dovezi" eyebrow="F · Dovezi" title="Pe ce se bazează concluzia" description="Referințe compacte către oportunități, acțiuni, documente, semnale și rezultate deja autorizate.">
          {proof.evidence.length > 0 ? (
            <ul className="divide-y divide-[rgb(var(--border))] rounded-card border border-[rgb(var(--border))]">
              {proof.evidence.map((item) => (
                <li key={`${item.id}:${item.href}`} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 gap-2">
                    <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold text-[rgb(var(--foreground))]">{item.label}</p>
                      <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{item.context}{item.occurredAt ? ` · ${formatDateTimeWithSeconds(item.occurredAt)}` : ""}</p>
                    </div>
                  </div>
                  <Link href={item.href} className="focus-ring rounded-sm text-sm font-semibold text-[rgb(var(--primary))] hover:underline">Deschide dovada</Link>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm leading-6 text-[rgb(var(--text-muted))]">Nu există încă dovezi suficiente pentru o concluzie comercială.</p>}
        </Section>

        <Section id="cadenta" eyebrow="G · Cadență operațională lunară" title="De ce rămâne ReveNew util după pilot" description="Abonamentul este justificat numai dacă această rutină produce vizibilitate operațională recurentă pentru echipă.">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.65fr)]">
            <ol className="grid gap-2 sm:grid-cols-2">
              {proof.monthlyCadence.map((step, index) => (
                <li key={step} className="flex gap-3 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-3 text-sm leading-6 text-[rgb(var(--text-muted))]">
                  <span className="font-semibold text-[rgb(var(--primary))]">{index + 1}.</span>{step}
                </li>
              ))}
            </ol>
            <div className="rounded-card border border-[rgb(var(--primary)/0.24)] bg-[rgb(var(--primary-muted))] p-4">
              <p className="text-label text-[rgb(var(--primary))]">Închidere comercială</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[rgb(var(--foreground))]">{proof.commercialClose}</p>
              <Button href={proof.firstSafeActionHref} size="small" className="mt-4 print:hidden">{proof.firstSafeActionLabel}</Button>
            </div>
          </div>
        </Section>

        <Section id="nota" eyebrow="H · Notă de utilizare" title="Interpretare prudentă">
          <p className="max-w-4xl text-sm leading-7 text-[rgb(var(--text-secondary))]">{proof.disclaimer}</p>
        </Section>
      </article>
    </PageShell>
  );
}
