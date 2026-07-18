"use client";

import { useTransition } from "react";
import { PricingCard } from "@/components/access/PricingCard";
import { Button } from "@/components/ui/Button";
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
        const audit = plan.id === "audit";

        return (
          <PricingCard
            key={plan.id}
            eyebrow={audit ? "Punct de pornire" : "Operare continuă"}
            title={plan.title}
            price={plan.price}
            billing={plan.billing}
            description={plan.description}
            audience={audit ? "echipe care vor o evaluare structurată înainte de implementare" : "companii care vor urmărire, prioritizare și raportare recurente"}
            items={audit
              ? ["maparea oportunităților existente", "revizuirea follow-up-ului și ownership-ului", "priorități și pași următori documentați"]
              : ["monitorizare operațională recurentă", "prioritizare și follow-up controlat", "raportare pentru management"]}
            selected={selected}
            featured={!audit}
            action={(
              <Button type="button" className="w-full" variant={selected ? "secondary" : "primary"} loading={pending} onClick={() => choosePlan(plan.id)}>
                {pending ? "Se salvează..." : selected ? "Păstrează planul" : plan.cta}
              </Button>
            )}
          />
        );
      })}
    </div>
  );
}
