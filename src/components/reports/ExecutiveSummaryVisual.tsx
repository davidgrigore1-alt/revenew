import { DataSummaryStrip } from "@/components/ui/DataSummaryStrip";

type ExecutiveSummaryVisualProps = {
  pipelineValue: string;
  activeCount: number;
  urgentCount: number;
  wonCount: number;
  lostCount: number;
  documentsGenerated: number;
  documentsAwaitingReview: number;
  documentsApprovedNotSent: number;
  summary: string;
};

export function ExecutiveSummaryVisual(props: ExecutiveSummaryVisualProps) {
  const outcomesTotal = props.wonCount + props.lostCount;
  const wonShare = outcomesTotal ? Math.round((props.wonCount / outcomesTotal) * 100) : 0;
  const documentTotal = Math.max(1, props.documentsGenerated + props.documentsAwaitingReview + props.documentsApprovedNotSent);
  const reviewShare = Math.round((props.documentsAwaitingReview / documentTotal) * 100);
  const approvedShare = Math.round((props.documentsApprovedNotSent / documentTotal) * 100);
  const remainingShare = Math.max(0, 100 - reviewShare - approvedShare);

  return (
    <section className="overflow-hidden rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-card" aria-labelledby="executive-visual-title">
      <div className="grid gap-8 p-5 sm:p-7 xl:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.15em] text-[rgb(var(--primary))]">Imagine executivă</p>
          <h2 id="executive-visual-title" className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Unde este valoarea și unde trebuie intervenit.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[rgb(var(--text-muted))]">{props.summary}</p>
          <div className="mt-6">
            <DataSummaryStrip
              label="Indicatori executivi principali"
              items={[
                { label: "Pipeline estimat · RON", value: props.pipelineValue, note: "Moneda rămâne separată.", tone: "brand" },
                { label: "Active", value: props.activeCount, note: "Oportunități deschise.", tone: "neutral" },
                { label: "Acțiuni urgente", value: props.urgentCount, note: "Necesită verificare.", tone: props.urgentCount ? "warning" : "success" },
                { label: "Documente", value: props.documentsGenerated, note: "În workflow-ul curent.", tone: "neutral" }
              ]}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-5">
            <div className="flex items-center justify-between gap-4"><h3 className="text-sm font-semibold">Rezultate înregistrate</h3><span className="text-xs text-[rgb(var(--text-muted))]">{outcomesTotal} total</span></div>
            <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-[rgb(var(--surface-muted))]" role="img" aria-label={`${props.wonCount} câștigate și ${props.lostCount} pierdute`}>
              <span className="bg-[rgb(var(--success-text))]" style={{ width: `${wonShare}%` }} />
              <span className="bg-[rgb(var(--danger-text))]" style={{ width: `${100 - wonShare}%` }} />
            </div>
            <div className="mt-4 flex justify-between gap-4 text-xs"><span><strong className="text-[rgb(var(--success-text))]">{props.wonCount}</strong> câștigate</span><span><strong className="text-[rgb(var(--danger-text))]">{props.lostCount}</strong> pierdute</span></div>
          </div>
          <div className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-5">
            <div className="flex items-center justify-between gap-4"><h3 className="text-sm font-semibold">Flux documente</h3><span className="text-xs text-[rgb(var(--text-muted))]">control uman</span></div>
            <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-[rgb(var(--surface-muted))]" role="img" aria-label={`${props.documentsAwaitingReview} de revizuit și ${props.documentsApprovedNotSent} aprobate, netrimise`}>
              <span className="bg-[rgb(var(--warning-text))]" style={{ width: `${reviewShare}%` }} />
              <span className="bg-[rgb(var(--primary))]" style={{ width: `${approvedShare}%` }} />
              <span className="bg-[rgb(var(--text-faint))]" style={{ width: `${remainingShare}%` }} />
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs"><span>{props.documentsAwaitingReview} de revizuit</span><span>{props.documentsApprovedNotSent} aprobate · netrimise</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
