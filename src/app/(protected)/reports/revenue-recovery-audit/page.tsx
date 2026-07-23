import Link from "next/link";
import { ArrowRightIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { PageShell } from "@/components/dashboard/PageShell";
import { PrintAuditButton } from "@/components/reports/PrintAuditButton";
import { Button } from "@/components/ui/Button";
import { getRevenueRecoveryAudit } from "@/lib/revenue-recovery-audit";
import { formatCurrency, formatDateTimeWithSeconds } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusTone = {
  critical: "inline-flex rounded-full border border-[rgb(var(--danger-border))] bg-[rgb(var(--danger-background))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--danger-text))]",
  attention: "inline-flex rounded-full border border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--warning-text))]",
  stable: "inline-flex rounded-full border border-[rgb(var(--success-border))] bg-[rgb(var(--success-background))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--success-text))]",
  incomplete: "inline-flex rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--text-muted))]"
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
    <section id={id} className="audit-section rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 sm:p-6">
      <p className="text-label text-[rgb(var(--primary))]">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-[rgb(var(--foreground))]">{title}</h2>
      {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--text-muted))]">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function RevenueRecoveryAuditPage() {
  const audit = await getRevenueRecoveryAudit();
  const countRows = [
    ["Decizii critice", audit.counts.criticalDecisions],
    ["Priorități care necesită atenție", audit.counts.attentionDecisions],
    ["Aprobări în așteptare", audit.counts.pendingApprovals],
    ["Follow-up-uri întârziate", audit.counts.overdueFollowUps],
    ["Fără acțiune următoare", audit.counts.missingNextActions],
    ["Fără responsabil", audit.counts.missingOwners],
    ["Fără contact principal", audit.counts.missingPrimaryContacts],
    ["Semnale prioritare nerezolvate", audit.counts.unresolvedSignals],
    ["Documente pregătite fără pas final", audit.counts.preparedWorkNotAdvanced],
    ["Oportunități active analizate", audit.counts.activeOpportunitiesConsidered]
  ] as const;

  return (
    <PageShell
      eyebrow="Audit operațional"
      title="Revenue Recovery Audit"
      description="Raport executiv tenant-scoped despre valoarea estimată expusă, buclele comerciale deschise și următoarele acțiuni sigure."
      breadcrumbs={[{ label: "Rapoarte", href: "/reports" }, { label: "Revenue Recovery Audit" }]}
      actions={<div className="flex flex-wrap gap-2 print:hidden"><Button href={audit.firstSafeActionHref} size="small">{audit.firstSafeActionLabel}</Button><PrintAuditButton /></div>}
    >
      <article className="revenue-recovery-audit space-y-5">
        <div className="hidden border-b border-[rgb(var(--border))] pb-5 print:block">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">ReveNew · Audit operațional</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[rgb(var(--foreground))]">Revenue Recovery Audit</h1>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--border))] pb-4 text-xs text-[rgb(var(--text-muted))]">
          <p><span className="font-semibold text-[rgb(var(--foreground))]">Workspace:</span> {audit.workspaceName}</p>
          <p><span className="font-semibold text-[rgb(var(--foreground))]">Generat:</span> {formatDateTimeWithSeconds(audit.generatedAt)}</p>
        </div>

        <Section id="rezumat-executiv" eyebrow="A · Rezumat executiv" title={audit.headline}>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div>
              <span className={statusTone[audit.status]}>{audit.statusLabel}</span>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[rgb(var(--text-secondary))]">{audit.summary}</p>
              <p className="mt-3 text-sm font-semibold text-[rgb(var(--foreground))]">Acțiune sigură: <Link className="focus-ring rounded-sm text-[rgb(var(--primary))] hover:underline" href={audit.firstSafeActionHref}>{audit.firstSafeActionLabel}</Link></p>
            </div>
            <div className="min-w-[220px] rounded-card border border-[rgb(var(--primary)/0.24)] bg-[rgb(var(--primary-muted))] p-4">
              <p className="text-label text-[rgb(var(--primary))]">Valoare estimată expusă</p>
              <div className="mt-2 space-y-1">
                {audit.estimatedExposedValueByCurrency.length > 0 ? audit.estimatedExposedValueByCurrency.map((entry) => (
                  <p key={entry.currency} className="text-lg font-semibold tabular-nums text-[rgb(var(--foreground))]">{formatCurrency(entry.value, entry.currency)}</p>
                )) : <p className="text-sm font-semibold text-[rgb(var(--foreground))]">Fără estimare susținută de date</p>}
              </div>
              <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">Estimările rămân separate pe monedă și nu reprezintă venit confirmat.</p>
            </div>
          </div>
        </Section>

        <Section id="expunere" eyebrow="B · Expunere" title="Unde se află riscul operațional" description="Numai cazuri derivate din oportunități, acțiuni, documente, aprobări și semnale accesibile workspace-ului curent.">
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-3">
            <p className="text-sm font-semibold text-[rgb(var(--foreground))]">Valoare estimată expusă:</p>
            {audit.estimatedExposedValueByCurrency.length > 0 ? audit.estimatedExposedValueByCurrency.map((entry) => <p key={entry.currency} className="text-sm font-semibold tabular-nums text-[rgb(var(--foreground))]">{formatCurrency(entry.value, entry.currency)}</p>) : <p className="text-sm text-[rgb(var(--text-muted))]">Date insuficiente</p>}
            <p className="text-xs text-[rgb(var(--text-muted))]">Valoare estimată, nu venit confirmat.</p>
          </div>
          <dl className="grid gap-px overflow-hidden rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--border))] sm:grid-cols-2 xl:grid-cols-5">
            {countRows.map(([label, value]) => (
              <div key={label} className="bg-[rgb(var(--surface-subtle))] p-4">
                <dt className="text-xs leading-5 text-[rgb(var(--text-muted))]">{label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-[rgb(var(--foreground))]">{value}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section id="prioritati" eyebrow="C · Priorități" title="Primele decizii care reduc expunerea" description="Maximum cinci priorități, ordonate determinist după severitate, termen, tip, valoare și recență.">
          {audit.priorities.length > 0 ? (
            <ol className="divide-y divide-[rgb(var(--border))] rounded-card border border-[rgb(var(--border))]">
              {audit.priorities.map((item, index) => (
                <li key={item.id} className="grid gap-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgb(var(--surface-muted))] text-xs font-semibold text-[rgb(var(--foreground))]">{index + 1}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-[rgb(var(--foreground))]">{item.title}</h3><span className={item.severity === "critical" ? statusTone.critical : item.severity === "attention" ? statusTone.attention : statusTone.incomplete}>{item.statusLabel}</span></div>
                    {item.relatedCompanyName || item.relatedOpportunityTitle ? <p className="mt-1 text-xs font-semibold text-[rgb(var(--foreground))]">{[item.relatedCompanyName, item.relatedOpportunityTitle].filter(Boolean).join(" · ")}</p> : null}
                    <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-muted))]">{item.reason}</p>
                    <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-secondary))]">{item.whyItMatters}</p>
                    {item.estimatedValue !== undefined && item.currency ? <p className="mt-2 text-sm font-semibold tabular-nums text-[rgb(var(--foreground))]">Valoare estimată: {formatCurrency(item.estimatedValue, item.currency)}</p> : null}
                    <p className="mt-2 text-xs text-[rgb(var(--text-faint))]">Bazat pe: {item.evidence.map((source) => source.label).join(" · ")}</p>
                  </div>
                  <Link href={item.actionHref} className="focus-ring inline-flex items-center gap-1 rounded-button text-sm font-semibold text-[rgb(var(--primary))] hover:underline">{item.actionLabel}<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className="rounded-card border border-dashed border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-subtle))] p-5">
              <p className="font-semibold text-[rgb(var(--foreground))]">Nu există o prioritate critică dovedită.</p>
              <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Raportul nu completează lipsa datelor cu scenarii sau valori artificiale.</p>
            </div>
          )}

          {audit.companyRisks.length > 0 ? <div className="mt-6"><h3 className="text-sm font-semibold text-[rgb(var(--foreground))]">Companii cu risc comercial prioritar</h3><div className="mt-3 grid gap-3 lg:grid-cols-3">{audit.companyRisks.map((item) => <div key={`${item.relatedCompanyId}:${item.id}`} className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4"><p className="font-semibold text-[rgb(var(--foreground))]">{item.relatedCompanyName}</p><p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">{item.title}</p><Link href={item.actionHref} className="focus-ring mt-3 inline-flex rounded-sm text-sm font-semibold text-[rgb(var(--primary))] hover:underline">{item.actionLabel}</Link></div>)}</div></div> : null}
        </Section>

        <Section id="lacune" eyebrow="D · Lacune operaționale" title="Buclele deschise care cer intervenție" description="Sunt afișate numai cele mai importante trei lacune cu impact asupra execuției comerciale.">
          {audit.operationalGaps.length > 0 ? <div className="grid gap-3 lg:grid-cols-3">{audit.operationalGaps.map((gap) => <div key={gap.type} className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4"><p className="text-2xl font-semibold tabular-nums text-[rgb(var(--foreground))]">{gap.count}</p><h3 className="mt-1 font-semibold text-[rgb(var(--foreground))]">{gap.label}</h3><p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">{gap.impact}</p><Link href={gap.actionHref} className="focus-ring mt-3 inline-flex rounded-sm text-sm font-semibold text-[rgb(var(--primary))] hover:underline">{gap.actionLabel}</Link></div>)}</div> : <p className="text-sm leading-6 text-[rgb(var(--text-muted))]">Nu există lacune operaționale prioritare dovedite în datele disponibile.</p>}
        </Section>

        <Section id="plan-7-zile" eyebrow="E · Plan pe 7 zile" title="Acțiuni controlate pentru reducerea expunerii" description="Plan determinist: nu execută acțiuni și nu înlocuiește aprobarea umană.">
          <ol className="grid gap-3 lg:grid-cols-3">{audit.sevenDayPlan.map((step) => <li key={step.period} className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4"><p className="text-label text-[rgb(var(--primary))]">{step.period}</p><p className="mt-2 font-semibold leading-6 text-[rgb(var(--foreground))]">{step.action}</p><dl className="mt-3 space-y-2 text-xs leading-5 text-[rgb(var(--text-muted))]"><div><dt className="font-semibold text-[rgb(var(--foreground))]">Responsabil</dt><dd>{step.owner}</dd></div><div><dt className="font-semibold text-[rgb(var(--foreground))]">Rezultat dorit</dt><dd>{step.desiredOutcome}</dd></div></dl><Link href={step.actionHref} className="focus-ring mt-3 inline-flex rounded-sm text-sm font-semibold text-[rgb(var(--primary))] hover:underline">{step.actionLabel}</Link></li>)}</ol>
        </Section>

        <Section id="dovezi" eyebrow="F · Dovezi și metodologie" title="De ce poate fi verificat raportul" description="Fiecare prioritate este legată de o sursă existentă și de ruta sa autorizată.">
          {audit.evidence.length > 0 ? <ul className="divide-y divide-[rgb(var(--border))] rounded-card border border-[rgb(var(--border))]">{audit.evidence.map((source) => <li key={`${source.sourceType}:${source.sourceId}:${source.href}`} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 gap-2"><CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" /><div><p className="text-sm font-semibold text-[rgb(var(--foreground))]">{source.label}</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{source.sourceTimestamp ? formatDateTimeWithSeconds(source.sourceTimestamp) : "Dată indisponibilă"} · {source.sourceType}</p></div></div><Link href={source.href} className="focus-ring rounded-sm text-sm font-semibold text-[rgb(var(--primary))] hover:underline">Deschide dovada</Link></li>)}</ul> : <p className="text-sm leading-6 text-[rgb(var(--text-muted))]">Nu există încă dovezi suficiente pentru priorități comerciale verificabile.</p>}
          <div className="mt-5 grid gap-3 text-sm leading-6 text-[rgb(var(--text-muted))] md:grid-cols-2 lg:grid-cols-3">
            <p><strong className="text-[rgb(var(--foreground))]">Surse.</strong> Analiza folosește numai datele workspace-ului disponibile utilizatorului autentificat.</p>
            <p><strong className="text-[rgb(var(--foreground))]">Valori.</strong> Valoarea estimată nu este venit confirmat, iar monedele diferite nu sunt agregate.</p>
            <p><strong className="text-[rgb(var(--foreground))]">Aprobare.</strong> Aprobarea umană rămâne obligatorie pentru pașii comerciali controlați.</p>
            <p><strong className="text-[rgb(var(--foreground))]">Comunicare.</strong> Nicio comunicare externă nu este trimisă automat de acest raport.</p>
            <p><strong className="text-[rgb(var(--foreground))]">Documente.</strong> Un document pregătit sau aprobat nu este considerat trimis fără dovadă.</p>
            <p><strong className="text-[rgb(var(--foreground))]">Rezultate.</strong> Rezultatele comerciale sunt declarate și confirmate de utilizatori.</p>
          </div>
        </Section>

        <Section id="nota" eyebrow="G · Notă de utilizare" title="Interpretare prudentă">
          <p className="max-w-4xl text-sm leading-7 text-[rgb(var(--text-secondary))]">Acest audit este un instrument operațional. Nu reprezintă o garanție financiară, predicție de venit sau confirmare contabilă. Valorile sunt estimări comerciale bazate pe datele existente în workspace. Acțiunile comerciale, aprobările și comunicările externe rămân sub control uman.</p>
        </Section>
      </article>
    </PageShell>
  );
}
