"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { updatePipelineStatus } from "@/lib/revenue-workspace/actions";
import { isOpenOpportunity } from "@/lib/opportunity-domain";
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
    <div className="grid gap-4">
      {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}
      {error ? <StatusNotice tone="warning">{error}</StatusNotice> : null}
      <div className="grid gap-4 xl:grid-cols-5">
        {columns.map((column) => (
          <section key={column.id} className="min-w-0 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-[rgb(var(--foreground))]">{column.label}</h2>
                <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
                  {column.count} oportunități · {formatCurrency(column.totalValue, "RON")}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {column.opportunities.length > 0 ? (
                column.opportunities.map((opportunity) => (
                  <article key={opportunity.id} className="min-w-0 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={opportunity.status} />
                      {!opportunity.contacts?.some((contact) => contact.isPrimary) ? (
                        <span className="rounded border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-xs font-semibold text-amber-300">Fără contact</span>
                      ) : null}
                      {!opportunity.actions.some((action) => action.status === "pending" && action.dueDate) ? (
                        <span className="rounded border border-sky-400/25 bg-sky-400/10 px-2 py-1 text-xs font-semibold text-sky-300">Fără next step</span>
                      ) : null}
                    </div>
                    <a href={`/opportunities/${opportunity.id}`} className="mt-3 block break-words text-sm font-semibold leading-6 text-[rgb(var(--foreground))] hover:text-[rgb(var(--primary))]">
                      {opportunity.title}
                    </a>
                    <dl className="mt-3 grid gap-2 text-xs text-[rgb(var(--muted-foreground))]">
                      <div className="flex justify-between gap-3">
                        <dt>Valoare</dt>
                        <dd className="font-semibold text-[rgb(var(--foreground))]">
                          {formatCurrency(
                            column.id === "won" ? opportunity.actualOutcomeAmount ?? 0 : opportunity.estimatedValueHigh,
                            opportunity.currency ?? "RON"
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt>Termen</dt>
                        <dd className="font-semibold text-[rgb(var(--foreground))]">{formatDate(opportunity.deadline)}</dd>
                      </div>
                    </dl>
                    <div className="mt-3 grid gap-2">
                      {isOpenOpportunity(opportunity) ? <select
                        disabled={isPending}
                        defaultValue={opportunity.status}
                        onChange={(event) => changeStatus(opportunity.id, event.target.value as OpportunityStatus)}
                        className="h-10 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 text-xs font-semibold text-[rgb(var(--foreground))]"
                      >
                        <option value="reviewed">Lead verificat</option>
                        <option value="contacted">Calificat/contactat</option>
                        <option value="follow_up_needed">Propunere/follow-up</option>
                      </select> : (
                        <p className="rounded-lg border border-[rgb(var(--border))] px-3 py-2 text-xs text-[rgb(var(--muted-foreground))]">
                          Rezultatul este înregistrat. Corecțiile se fac din detaliul oportunității.
                        </p>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <p className="rounded-lg bg-[rgb(var(--surface-elevated))] px-3 py-4 text-sm text-[rgb(var(--muted-foreground))]">Nu există oportunități în această etapă.</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
