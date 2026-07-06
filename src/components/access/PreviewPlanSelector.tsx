"use client";

import { useTransition } from "react";
import { selectPreviewPlan } from "@/lib/billing/actions";
import type { PreviewPlanId } from "@/lib/billing/plans";
import { previewPlans } from "@/lib/billing/plans";

type PreviewPlanSelectorProps = {
  selectedPlanId?: PreviewPlanId | null;
  redirectTo?: string;
  compact?: boolean;
};

export function PreviewPlanSelector({ selectedPlanId = null, redirectTo = "/dashboard", compact = false }: PreviewPlanSelectorProps) {
  const [pending, startTransition] = useTransition();

  function choosePlan(planId: PreviewPlanId) {
    startTransition(() => {
      void selectPreviewPlan(planId, redirectTo);
    });
  }

  return (
    <div className={compact ? "grid gap-3 sm:grid-cols-2" : "grid gap-4 md:grid-cols-2"}>
      {previewPlans.map((plan) => {
        const selected = selectedPlanId === plan.id;

        return (
          <article
            key={plan.id}
            className="flex min-h-[220px] flex-col rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-semibold">{plan.title}</h3>
              {selected ? (
                <span className="rounded-full border border-[rgb(var(--primary)_/_0.35)] bg-[rgb(var(--primary)_/_0.1)] px-3 py-1 text-xs font-semibold text-[rgb(var(--primary))]">
                  Selectat
                </span>
              ) : null}
            </div>
            <p className="mt-4 text-3xl font-semibold">{plan.price}</p>
            <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">{plan.billing}</p>
            <p className="mt-4 flex-1 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{plan.description}</p>
            <button
              type="button"
              className="focus-ring mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-[rgb(var(--primary))] px-5 text-sm font-semibold text-[rgb(var(--primary-foreground))] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pending}
              onClick={() => choosePlan(plan.id)}
            >
              {pending ? "Se salvează..." : selected ? "Păstrează planul" : plan.cta}
            </button>
          </article>
        );
      })}
    </div>
  );
}
