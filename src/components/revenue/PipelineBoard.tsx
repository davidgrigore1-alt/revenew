"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import patterns from "@/components/ui/OperationalPatterns.module.css";
import { CaseReadiness } from "@/components/ui/CaseReadiness";
import { Select } from "@/components/ui/Select";
import { ReportingCurrencyControl } from "@/components/ui/ReportingCurrencyControl";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { isOpenOpportunity, lifecycleForOpportunity } from "@/lib/opportunity-domain";
import { caseCountLabel, convertReportingAmount, summarizeReportingAmounts, type ReportingCurrency, type ReportingFxRate, type OriginalAmount } from "@/lib/reporting-currency";
import { updatePipelineStatus } from "@/lib/revenue-workspace/actions";
import type { Opportunity, OpportunityStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type PipelineColumn = {
  id: string;
  label: string;
  nextStatus: OpportunityStatus;
  totalValue: number;
  count: number;
  opportunities: Opportunity[];
};

function originalAmount(opportunity: Opportunity, won = false): OriginalAmount {
  return { value: won ? opportunity.actualOutcomeAmount : opportunity.estimatedValueHigh, currency: opportunity.currency ?? "RON" };
}

function Aggregate({ rows, currency, fx }: { rows: OriginalAmount[]; currency: ReportingCurrency; fx: ReportingFxRate | null }) {
  const summary = summarizeReportingAmounts(rows, currency, fx);
  return <span className="tabular-nums">
    {summary.total !== null ? formatCurrency(summary.total, currency) : summary.originals.length
      ? summary.originals.map(item => formatCurrency(item.value, item.currency)).join(" · ") : "Valoare neconfirmată"}
    {summary.excludedCount > 0 ? <span className="mt-1 block text-micro font-normal text-[rgb(var(--text-muted))]">{summary.excludedCount} valori neconfirmate / monede neconvertibile, excluse</span> : null}
  </span>;
}

function OpportunityCard({ opportunity, columnId, isPending, onStatusChange, currency, fx }: {
  opportunity: Opportunity;
  columnId: string;
  isPending: boolean;
  onStatusChange: (id: string, status: OpportunityStatus) => void;
  currency: ReportingCurrency;
  fx: ReportingFxRate | null;
}) {
  const nextAction = opportunity.actions
    .filter((action) => action.status === "pending")
    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"))[0];
  const company = opportunity.contact?.company;
  const isOpen = isOpenOpportunity(opportunity);
  const isWon = columnId === "won";
  const original = originalAmount(opportunity, isWon);
  const equivalent = fx && original.currency !== currency ? convertReportingAmount(original.value, original.currency, currency, fx) : null;
  const date = isOpen ? nextAction?.dueDate ?? opportunity.deadline : opportunity.outcomeDate;

  return (
    <article className="group min-w-0 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-[var(--card-padding)] shadow-card transition-colors hover:border-[rgb(var(--border-strong))]">
      <Link href={`/opportunities/${opportunity.id}`} title={opportunity.title} className="focus-ring line-clamp-2 rounded-button text-xs font-semibold leading-5 text-[rgb(var(--foreground))] group-hover:text-[rgb(var(--primary))]">
        {opportunity.title}
      </Link>
      {company && company !== opportunity.title ? <p className="mt-1 truncate text-metadata text-[rgb(var(--text-muted))]" title={company}>{company}</p> : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-card-title font-semibold leading-6 tabular-nums" title={isWon ? "Venit confirmat" : "Valoare estimată"}>
          <span className="sr-only">{isWon ? "Venit confirmat: " : "Valoare estimată: "}</span>
          {original.value != null && Number.isFinite(original.value) ? formatCurrency(original.value, original.currency) : "Neconfirmat"}
        </p>
        {isOpen ? <CaseReadiness compact owner={Boolean(opportunity.ownerProfileId)} action={Boolean(nextAction)} dated={Boolean(nextAction?.dueDate)}/> : null}
      </div>
      {equivalent !== null ? <p className="text-metadata tabular-nums text-[rgb(var(--text-muted))]" title="Echivalent analitic la cursul de referință ECB">≈ {formatCurrency(equivalent, currency)}</p> : null}
      {!isOpen ? <p className={`mt-1 text-metadata ${isWon ? "text-[rgb(var(--success-text))]" : "text-[rgb(var(--danger-text))]"}`}>{isWon ? "Venit confirmat" : lifecycleForOpportunity(opportunity) === "disqualified" ? "Descalificat · valoare estimată" : "Pierdut · valoare estimată"}</p> : null}
      <div className="mt-3 flex min-w-0 items-start justify-between gap-2 text-metadata leading-4 text-[rgb(var(--text-muted))]">
        <span className="min-w-0 truncate" title="Responsabil comercial">{opportunity.ownerName ?? (opportunity.ownerProfileId ? "Responsabil atribuit" : "Fără responsabil")}</span>
        <span className="shrink-0 text-right" title={isOpen ? nextAction?.dueDate ? "Termenul următorului pas" : "Termen comercial" : "Data rezultatului"}>{date ? formatDate(date) : isOpen ? "Fără termen" : "Dată neconfirmată"}</span>
      </div>
      {isOpen ? <>
        <div className="mt-3 flex items-start gap-2 border-t border-[rgb(var(--border))] pt-3 text-xs leading-5">
          <span aria-hidden="true" className="text-[rgb(var(--primary))]">→</span>
          <p className="line-clamp-2" title={nextAction?.title}><span className="sr-only">Următorul pas: </span>{nextAction?.title ?? "Stabilește următorul pas"}</p>
        </div>
        <div className="mt-3">
          <Select density="compact" className="text-metadata text-[rgb(var(--text-muted))]" aria-label={`Schimbă etapa pentru ${opportunity.title}`} disabled={isPending} value={opportunity.status} onChange={(event) => onStatusChange(opportunity.id, event.target.value as OpportunityStatus)}>
            {!["reviewed","contacted","follow_up_needed"].includes(opportunity.status) ? <option value={opportunity.status} disabled>Etapă curentă · {columnId === "lead" ? "Lead" : "Calificat"}</option> : null}
            <option value="reviewed">Lead verificat</option>
            <option value="contacted">Calificat/contactat</option>
            <option value="follow_up_needed">Propunere/follow-up</option>
          </Select>
        </div>
      </> : <Link href={`/opportunities/${opportunity.id}`} className="focus-ring mt-3 block border-t border-[rgb(var(--border))] pt-3 text-metadata text-[rgb(var(--text-muted))]">Vezi rezultatul →</Link>}
    </article>
  );
}

export function PipelineBoard({ columns, fx }: { columns: PipelineColumn[]; fx: ReportingFxRate | null }) {
  const router = useRouter();
  const [currency, setCurrency] = useState<ReportingCurrency>("RON");
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const active = columns.filter(column => !["won", "lost"].includes(column.id)).flatMap(column => column.opportunities);
  const won = columns.find(column => column.id === "won")?.opportunities ?? [];
  const originals = summarizeReportingAmounts(active.map(item => originalAmount(item)), currency, fx).originals;

  function changeStatus(opportunityId: string, status: OpportunityStatus, lossReason = "") {
    const formData = new FormData();
    formData.set("status", status);
    if (lossReason) formData.set("lossReason", lossReason);
    startTransition(async () => {
      const result = await updatePipelineStatus(opportunityId, formData);
      if (result.ok) {
        setNotice(result.unchanged ? "Statusul era deja actualizat." : "Statusul pipeline a fost actualizat.");
        setError("");
        router.refresh();
      } else {
        setError(result.error ?? "Statusul nu a putut fi actualizat.");
        setNotice("");
      }
    });
  }

  return (
    <section aria-labelledby="pipeline-work-title" className="min-w-0 overflow-hidden rounded-[1.1rem] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-subtle))] shadow-card">
      <header className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 id="pipeline-work-title" className="text-sm font-semibold">Pipeline comercial · vedere pe etape</h2>
            <p className="mt-1 text-metadata text-[rgb(var(--text-muted))]">{active.length} oportunități active · {active.filter(item => item.ownerProfileId).length} cu responsabil · {active.filter(item => item.actions.some(action => action.status === "pending" && action.dueDate)).length} cu pas și termen</p>
          </div>
          <ReportingCurrencyControl currency={currency} onChange={setCurrency} fx={fx}/>
        </div>
        <dl className="mt-4 flex flex-wrap items-start gap-x-10 gap-y-3">
          <div><dt className="text-metadata text-[rgb(var(--text-muted))]">Valoare estimată activă{!fx ? " · monede originale" : ""}</dt><dd className="mt-1 text-lg font-semibold"><Aggregate rows={active.map(item => originalAmount(item))} currency={currency} fx={fx}/></dd></div>
          <div><dt className="text-metadata text-[rgb(var(--text-muted))]">Venit confirmat{!fx ? " · monede originale" : ""}</dt><dd className="mt-1 text-lg font-semibold text-[rgb(var(--success-text))]"><Aggregate rows={won.map(item => originalAmount(item, true))} currency={currency} fx={fx}/></dd></div>
          <div className="ml-auto self-end text-right text-micro leading-5 text-[rgb(var(--text-muted))]"><p>Monede originale · cazuri active</p><p>{originals.map(item => `${item.currency}: ${caseCountLabel(item.count)}`).join(" / ")}</p></div>
        </dl>
      </header>
      {notice ? <div className="px-4 pt-3"><StatusNotice tone="success">{notice}</StatusNotice></div> : null}
      {error ? <div className="px-4 pt-3"><StatusNotice tone="warning">{error}</StatusNotice></div> : null}
      <div className="focus-ring overflow-x-auto p-4" role="region" aria-label="Pipeline pe etape" tabIndex={0}>
        <div className={patterns.board}>
          {columns.map((column, stageIndex) => (
            <section key={column.id} className={patterns.column}>
              <header className="min-h-[100px] border-b border-[rgb(var(--border))] px-3.5 py-3.5">
                <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold"><span className="mr-2 text-micro font-normal text-[rgb(var(--text-muted))]">{String(stageIndex+1).padStart(2,"0")}</span>{column.label}</h3><span aria-label={`${column.count} oportunități`} className="rounded-full bg-[rgb(var(--surface-muted))] px-1.5 py-0.5 text-micro tabular-nums">{column.count}</span></div>
                <p className="mt-2 text-xs font-medium text-[rgb(var(--text-secondary))]" title={column.id === "won" ? "Venit confirmat" : "Valoare estimată"}><Aggregate rows={column.opportunities.map(item => originalAmount(item, column.id === "won"))} currency={currency} fx={fx}/></p>
              </header>
              <div className={patterns.columnBody}>
                {column.opportunities.length ? column.opportunities.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} columnId={column.id} isPending={isPending} onStatusChange={changeStatus} currency={currency} fx={fx}/>) : <p className="px-2 py-8 text-center text-xs text-[rgb(var(--text-faint))]">Nicio înregistrare în această etapă.</p>}
              </div>
            </section>
          ))}
        </div>
      </div>
      <footer className="flex flex-wrap justify-between gap-2 border-t border-[rgb(var(--border))] px-5 py-3 text-micro leading-4 text-[rgb(var(--text-muted))]">
        <p>Conversia este utilizată doar pentru analiză. Valorile originale rămân neschimbate.</p>
        <p>Schimbări explicite și auditabile · derulează orizontal pentru toate etapele.</p>
      </footer>
    </section>
  );
}
