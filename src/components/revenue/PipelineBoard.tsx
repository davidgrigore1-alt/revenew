"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Select } from "@/components/ui/Select";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { isOpenOpportunity } from "@/lib/opportunity-domain";
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

function OpportunityCard({ opportunity, columnId, isPending, onStatusChange }: {
  opportunity: Opportunity;
  columnId: string;
  isPending: boolean;
  onStatusChange: (id: string, status: OpportunityStatus) => void;
}) {
  const nextAction = opportunity.actions
    .filter((action) => action.status === "pending")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const hasPrimaryContact = opportunity.contacts?.some((contact) => contact.isPrimary);
  const isOpen = isOpenOpportunity(opportunity);
  const isWon = columnId === "won";

  return (
    <article className="group min-w-0 rounded-control border border-[rgb(var(--border-strong)/0.72)] bg-[rgb(var(--surface))] p-2.5 transition-colors duration-fast hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-elevated))]">
      <Link href={`/opportunities/${opportunity.id}`} className="focus-ring block rounded-button text-sm font-semibold leading-5 text-[rgb(var(--foreground))] group-hover:text-[rgb(var(--primary))]">
        {opportunity.title}
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={opportunity.status} />
        {!opportunity.ownerProfileId ? <span className="status-pill status-pill-warning">Fără responsabil</span> : null}
        {!hasPrimaryContact ? <span className="status-pill status-pill-neutral">Fără contact principal</span> : null}
      </div>
      <dl className="mt-2.5 grid gap-1.5 text-xs">
        <div className="flex justify-between gap-3"><dt className="text-[rgb(var(--text-muted))]">{isWon ? "Venit confirmat" : "Valoare estimată"}</dt><dd className="text-right font-semibold tabular-nums text-[rgb(var(--foreground))]">{formatCurrency(isWon ? opportunity.actualOutcomeAmount ?? 0 : opportunity.estimatedValueHigh, opportunity.currency ?? "RON")}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-[rgb(var(--text-muted))]">Responsabil</dt><dd className="truncate text-right font-semibold text-[rgb(var(--foreground))]">{opportunity.ownerName ?? (opportunity.ownerProfileId ? "Atribuit" : "Neatribuit")}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-[rgb(var(--text-muted))]">Termen oportunitate</dt><dd className="text-right font-semibold text-[rgb(var(--foreground))]">{formatDate(opportunity.deadline)}</dd></div>
      </dl>
      {isOpen ? <div className={`mt-2.5 border-l-2 bg-[rgb(var(--surface-subtle))] p-2 ${nextAction ? "border-[rgb(var(--border-strong))]" : "border-[rgb(var(--warning-border))]"}`}>
          <p className={`text-[0.6875rem] font-medium ${nextAction ? "text-[rgb(var(--text-faint))]" : "text-[rgb(var(--warning-text))]"}`}>Următoarea acțiune</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-[rgb(var(--foreground))]">{nextAction?.title ?? "Acțiune neplanificată"}</p>
          {nextAction?.dueDate ? <p className="mt-1 text-[0.6875rem] text-[rgb(var(--text-muted))]">Scadentă {formatDate(nextAction.dueDate)}</p> : null}
        </div> : null}
      <div className="mt-2.5">
        {isOpen ? (
          <Select aria-label={`Schimbă etapa pentru ${opportunity.title}`} disabled={isPending} value={opportunity.status} onChange={(event) => onStatusChange(opportunity.id, event.target.value as OpportunityStatus)}>
            <option value="reviewed">Lead verificat</option>
            <option value="contacted">Calificat/contactat</option>
            <option value="follow_up_needed">Propunere/follow-up</option>
          </Select>
        ) : <p className="text-xs leading-5 text-[rgb(var(--text-muted))]">Rezultatul este înregistrat. Corecțiile se fac din detaliul oportunității.</p>}
      </div>
    </article>
  );
}

export function PipelineBoard({ columns }: { columns: PipelineColumn[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

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
    <section className="grid gap-3" aria-labelledby="pipeline-work-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 id="pipeline-work-title" className="text-sm font-semibold">Etape comerciale</h2><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Schimbările rămân explicite și auditabile.</p></div>
        <p className="text-xs text-[rgb(var(--text-muted))]">Derulează orizontal pentru toate etapele.</p>
      </div>
      {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}
      {error ? <StatusNotice tone="warning">{error}</StatusNotice> : null}
      <div className="focus-ring -mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" role="region" aria-label="Pipeline pe etape" tabIndex={0}>
        <div className="flex min-w-max items-start gap-2 2xl:min-w-0">
          {columns.map((column) => (
            <section key={column.id} className="w-[252px] min-w-[252px] border border-[rgb(var(--border))] border-t-2 border-t-[rgb(var(--border-strong))] bg-[rgb(var(--background-soft))] 2xl:min-w-0 2xl:flex-1">
              <header className="flex min-h-12 items-center justify-between gap-3 border-b border-[rgb(var(--border-strong)/0.68)] bg-[rgb(var(--surface-subtle))] px-2.5">
                <div><h3 className="text-xs font-semibold">{column.label}</h3><p className="mt-0.5 text-[0.6875rem] text-[rgb(var(--text-muted))]">{column.count} oportunități</p></div>
                <p className="text-right text-xs font-semibold tabular-nums" title={column.id === "won" ? "Venit confirmat în RON" : "Valoare estimată în RON"}>{formatCurrency(column.totalValue, "RON")}</p>
              </header>
              <div className="grid gap-1.5 p-1.5">
                {column.opportunities.length ? column.opportunities.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} columnId={column.id} isPending={isPending} onStatusChange={changeStatus} />) : <p className="px-2 py-8 text-center text-xs text-[rgb(var(--text-faint))]">Nicio înregistrare în această etapă.</p>}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
