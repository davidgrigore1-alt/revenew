import Link from "next/link";

type DistributionItem = { label: string; count: number; value: string };
type AgendaItem = { label: string; value: number; href: string; tone?: "warning" | "danger" | "neutral" };

type ExecutiveSummaryVisualProps = {
  pipelineValue: string;
  activeCount: number;
  urgentCount: number;
  wonCount: number;
  lostCount: number;
  documentsGenerated: number;
  documentsAwaitingReview: number;
  documentsApprovedNotSent: number;
  distribution: DistributionItem[];
  agenda: AgendaItem[];
  summary: string;
};

export function ExecutiveSummaryVisual(props: ExecutiveSummaryVisualProps) {
  const outcomesTotal = props.wonCount + props.lostCount;
  const wonShare = outcomesTotal ? Math.round((props.wonCount / outcomesTotal) * 100) : 0;
  const distributionTotal = Math.max(1, props.distribution.reduce((sum, item) => sum + item.count, 0));
  const documentTotal = Math.max(1, props.documentsGenerated + props.documentsAwaitingReview + props.documentsApprovedNotSent);
  const reviewShare = Math.round((props.documentsAwaitingReview / documentTotal) * 100);
  const approvedShare = Math.round((props.documentsApprovedNotSent / documentTotal) * 100);

  return (
    <section className="overflow-hidden rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-card" aria-labelledby="executive-visual-title">
      <div className="grid xl:grid-cols-[1.08fr_0.92fr]">
        <div className="p-5 sm:p-7 xl:border-r xl:border-[rgb(var(--border))]">
          <p className="text-label text-[rgb(var(--primary))]">Revizuire managerială</p>
          <h2 id="executive-visual-title" className="mt-3 max-w-2xl text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
            Valoarea, blocajele și deciziile următoare — într-o singură imagine.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[rgb(var(--text-muted))]">{props.summary}</p>

          <div className="mt-7 grid gap-px overflow-hidden rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--border))] sm:grid-cols-3">
            <div className="bg-[rgb(var(--surface-subtle))] p-4"><p className="text-label text-[rgb(var(--text-faint))]">Valoare estimată în pipeline · RON</p><p className="mt-2 text-xl font-semibold">{props.pipelineValue}</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Toate oportunitățile active · nu este venit confirmat</p></div>
            <div className="bg-[rgb(var(--surface-subtle))] p-4"><p className="text-label text-[rgb(var(--text-faint))]">Oportunități active</p><p className="mt-2 text-xl font-semibold">{props.activeCount}</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">În execuție comercială</p></div>
            <div className="bg-[rgb(var(--surface-subtle))] p-4"><p className="text-label text-[rgb(var(--text-faint))]">Acțiuni urgente</p><p className={`mt-2 text-xl font-semibold ${props.urgentCount ? "text-[rgb(var(--warning-text))]" : "text-[rgb(var(--success-text))]"}`}>{props.urgentCount}</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Necesită verificare</p></div>
          </div>

          <div className="mt-7">
            <div className="flex items-center justify-between gap-4"><h3 className="text-sm font-semibold">Agenda de management</h3><span className="text-xs text-[rgb(var(--text-muted))]">acțiuni reale</span></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {props.agenda.map((item) => (
                <Link key={item.label} href={item.href} className="focus-ring group flex min-h-12 items-center justify-between gap-4 rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-3 transition-colors hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-muted))]">
                  <span className="text-sm font-medium text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--foreground))]">{item.label}</span>
                  <span className={`text-sm font-semibold ${item.tone === "danger" ? "text-[rgb(var(--danger-text))]" : item.tone === "warning" ? "text-[rgb(var(--warning-text))]" : "text-[rgb(var(--foreground))]"}`}>{item.value}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="grid content-start gap-5 bg-[rgb(var(--surface-subtle))] p-5 sm:p-7">
          <div className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">
            <div className="flex items-center justify-between gap-4"><h3 className="text-sm font-semibold">Distribuția pipeline-ului</h3><span className="text-xs text-[rgb(var(--text-muted))]">volum și valoare</span></div>
            <div className="mt-5 grid gap-3">
              {props.distribution.map((item) => {
                const share = Math.round((item.count / distributionTotal) * 100);
                return <div key={item.label} className="grid grid-cols-[minmax(5rem,0.7fr)_1.7fr_auto] items-center gap-3 text-xs"><span className="truncate font-medium text-[rgb(var(--text-muted))]">{item.label}</span><span className="h-1.5 overflow-hidden rounded-full bg-[rgb(var(--surface-muted))]"><span className="block h-full rounded-full bg-[rgb(var(--primary))]" style={{ width: `${share}%` }} /></span><span className="text-right font-semibold">{item.count} · {item.value}</span></div>;
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <div className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">
              <div className="flex items-center justify-between gap-4"><h3 className="text-sm font-semibold">Rezultate confirmate</h3><span className="text-xs text-[rgb(var(--text-muted))]">{outcomesTotal} total</span></div>
              <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-[rgb(var(--surface-muted))]" role="img" aria-label={`${props.wonCount} câștigate și ${props.lostCount} pierdute`}><span className="bg-[rgb(var(--success-text))]" style={{ width: `${wonShare}%` }} /><span className="bg-[rgb(var(--danger-text))]" style={{ width: `${100 - wonShare}%` }} /></div>
              <div className="mt-4 flex justify-between gap-4 text-xs"><span><strong className="text-[rgb(var(--success-text))]">{props.wonCount}</strong> câștigate</span><span><strong className="text-[rgb(var(--danger-text))]">{props.lostCount}</strong> pierdute</span></div>
            </div>
            <div className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">
              <div className="flex items-center justify-between gap-4"><h3 className="text-sm font-semibold">Control documente</h3><span className="text-xs text-[rgb(var(--text-muted))]">{props.documentsGenerated} total</span></div>
              <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-[rgb(var(--surface-muted))]" role="img" aria-label={`${props.documentsAwaitingReview} de revizuit și ${props.documentsApprovedNotSent} aprobate, netrimise`}><span className="bg-[rgb(var(--warning-text))]" style={{ width: `${reviewShare}%` }} /><span className="bg-[rgb(var(--primary))]" style={{ width: `${approvedShare}%` }} /></div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs"><span>{props.documentsAwaitingReview} de revizuit</span><span>{props.documentsApprovedNotSent} aprobate · netrimise</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
