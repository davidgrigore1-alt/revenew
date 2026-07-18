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

  return (
    <article className="group min-w-0 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-4 transition-[border-color,box-shadow,transform] duration-fast hover:-translate-y-px hover:border-[rgb(var(--border-strong))] hover:shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={opportunity.status} />
        {!opportunity.ownerProfileId ? <span className="status-pill status-pill-warning">Fără responsabil</span> : null}
        {!hasPrimaryContact ? <span className="status-pill status-pill-neutral">Fără contact principal</span> : null}
      </div>
      <Link href={`/opportunities/${opportunity.id}`} className="focus-ring mt-3 block rounded-button text-sm font-semibold leading-6 text-[rgb(var(--foreground))] group-hover:text-[rgb(var(--primary))]">
        {opportunity.title}
      </Link>
      <dl className="mt-4 grid gap-2.5 text-xs">
        <div className="flex justify-between gap-3"><dt className="text-[rgb(var(--text-muted))]">Valoare</dt><dd className="text-right font-semibold text-[rgb(var(--foreground))]">{formatCurrency(columnId === "won" ? opportunity.actualOutcomeAmount ?? 0 : opportunity.estimatedValueHigh, opportunity.currency ?? "RON")}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-[rgb(var(--text-muted))]">Responsabil</dt><dd className="truncate text-right font-semibold text-[rgb(var(--foreground))]">{opportunity.ownerName ?? (opportunity.ownerProfileId ? "Atribuit" : "Neatribuit")}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-[rgb(var(--text-muted))]">Termen oportunitate</dt><dd className="text-right font-semibold text-[rgb(var(--foreground))]">{formatDate(opportunity.deadline)}</dd></div>
      </dl>
      <div className={`mt-4 rounded-lg border p-3 ${nextAction ? "border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]" : "border-dashed border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-bg))]"}`}>
        <p className="text-label text-[rgb(var(--text-faint))]">Următoarea acțiune</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-[rgb(var(--foreground))]">{nextAction?.title ?? "Acțiune neplanificată"}</p>
        {nextAction?.dueDate ? <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Scadentă {formatDate(nextAction.dueDate)}</p> : null}
      </div>
      <div className="mt-3">
        {isOpenOpportunity(opportunity) ? (
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
  const occupiedColumns = columns.filter((column) => column.count > 0);
  const emptyColumns = columns.filter((column) => column.count === 0);

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
    <section className="grid gap-4" aria-labelledby="pipeline-work-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-label text-[rgb(var(--primary))]">Execuție pe etape</p><h2 id="pipeline-work-title" className="mt-1 text-lg font-semibold">Oportunități în lucru</h2></div>
        <p className="text-xs text-[rgb(var(--text-muted))]">Schimbările de etapă rămân explicite și auditabile.</p>
      </div>
      {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}
      {error ? <StatusNotice tone="warning">{error}</StatusNotice> : null}
      <div className="grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {occupiedColumns.map((column) => (
          <section key={column.id} className="min-w-0 rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-card">
            <header className="flex items-start justify-between gap-3 border-b border-[rgb(var(--border))] pb-4">
              <div><h3 className="text-sm font-semibold">{column.label}</h3><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{column.count} oportunități</p></div>
              <p className="text-right text-xs font-semibold text-[rgb(var(--foreground))]">{formatCurrency(column.totalValue, "RON")}</p>
            </header>
            <div className="mt-4 grid gap-3">{column.opportunities.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} columnId={column.id} isPending={isPending} onStatusChange={changeStatus} />)}</div>
          </section>
        ))}
      </div>
      {emptyColumns.length ? (
        <div className="rounded-card border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4">
          <p className="text-label text-[rgb(var(--text-faint))]">Etape fără înregistrări</p>
          <div className="mt-3 flex flex-wrap gap-2">{emptyColumns.map((column) => <span key={column.id} className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-1.5 text-xs font-medium text-[rgb(var(--text-muted))]">{column.label}</span>)}</div>
        </div>
      ) : null}
    </section>
  );
}
