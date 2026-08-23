"use client";

import { useState } from "react";
import { ArrowUpRightIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { Reveal } from "@/components/marketing/Reveal";
import { Button } from "@/components/ui/Button";
import { commercialPricingPlans } from "@/lib/billing/plans";

export function MarketingPricingGrid() {
  const [annual, setAnnual] = useState(true);

  return (
    <>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-y border-[rgb(var(--border))] py-4">
        <div>
          <p className="text-sm font-semibold">Facturare {annual ? "anuală" : "lunară"}</p>
          <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Planurile anuale economisesc 20% față de plata lunară.</p>
        </div>
        <div className="inline-flex rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-1" role="group" aria-label="Perioadă de facturare">
          <button type="button" onClick={() => setAnnual(false)} aria-pressed={!annual} className={`focus-ring min-h-9 rounded-control px-4 text-sm font-semibold ${!annual ? "bg-[rgb(var(--surface))] shadow-sm" : "text-[rgb(var(--text-muted))]"}`}>Lunar</button>
          <button type="button" onClick={() => setAnnual(true)} aria-pressed={annual} className={`focus-ring min-h-9 rounded-control px-4 text-sm font-semibold ${annual ? "bg-[rgb(var(--surface))] shadow-sm" : "text-[rgb(var(--text-muted))]"}`}>Anual <span className="ml-1 text-[rgb(var(--primary))]">−20%</span></button>
        </div>
      </div>

      <div className="marketing-pricing-grid mt-6 grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
        {commercialPricingPlans.map((plan, index) => {
          const featured = plan.title === "Growth";
          const custom = plan.monthlyPrice === null;
          const price = annual ? plan.annualPrice : plan.monthlyPrice;
          return (
            <Reveal key={plan.title} delay={index * 70}>
              <article className={`marketing-card-lift marketing-pricing-card relative flex h-full overflow-hidden rounded-[1.05rem] border p-5 ${featured ? "marketing-pricing-card-featured border-[rgb(var(--primary)/0.62)]" : "border-[rgb(var(--border-strong))]"}`}>
                {featured ? <span className="absolute right-4 top-4 rounded-full border border-[rgb(var(--primary)/0.42)] bg-[rgb(var(--brand-50))] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[rgb(var(--primary-strong))]">Recomandat</span> : null}
                <div className="flex w-full flex-col">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[rgb(var(--primary))]">{plan.label}</p>
                  <h3 className="mt-4 text-2xl font-semibold tracking-[-0.025em]">{plan.title}</h3>
                  <div className="mt-5 border-y border-[rgb(var(--border))] py-4">
                    <p className="text-3xl font-semibold tracking-[-0.035em]">{custom ? "Personalizat" : `${price} EUR`}</p>
                    <p className="mt-1.5 text-xs leading-5 text-[rgb(var(--muted-foreground))]">{custom ? "ofertă după evaluarea cerințelor" : `per utilizator / lună, facturat ${annual ? "anual" : "lunar"}`}</p>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{plan.description}</p>
                  <ul className="mt-5 grid gap-2.5 text-sm text-[rgb(var(--text-secondary))]">
                    {plan.items.map((item) => <li key={item} className="flex gap-2.5"><CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />{item}</li>)}
                  </ul>
                  <div className="mt-auto pt-6"><Button href="/signup?intent=select_plan" variant={featured ? "primary" : "secondary"} className="group w-full">{plan.cta}<ArrowUpRightIcon className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" /></Button></div>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
      <p className="mt-5 max-w-4xl text-sm leading-6 text-[rgb(var(--text-muted))]">Activarea este asistată comercial. Nu oferim trial self-serve și nu promitem utilizare AI nelimitată; capacitatea și integrarea se confirmă în funcție de plan și implementare.</p>
    </>
  );
}
