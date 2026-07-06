"use client";

import { useId, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { clsx } from "clsx";

export type FaqCategory = {
  title: string;
  items: Array<{
    question: string;
    answer: string;
  }>;
};

export function FaqAccordion({ categories }: { categories: FaqCategory[] }) {
  const baseId = useId();
  const [openKey, setOpenKey] = useState("Produs și control-0");

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {categories.map((category) => (
        <section key={category.title} aria-labelledby={`${baseId}-${category.title}`} className="min-w-0">
          <h3 id={`${baseId}-${category.title}`} className="text-base font-semibold text-[rgb(var(--foreground))]">
            {category.title}
          </h3>
          <div className="mt-4 grid gap-3">
            {category.items.map((item, index) => {
              const key = `${category.title}-${index}`;
              const open = openKey === key;
              const buttonId = `${baseId}-question-${key.replace(/\s+/g, "-")}`;
              const panelId = `${baseId}-answer-${key.replace(/\s+/g, "-")}`;

              return (
                <article key={item.question} className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))]">
                  <h4>
                    <button
                      id={buttonId}
                      type="button"
                      className="focus-ring flex min-h-[60px] w-full items-center justify-between gap-4 rounded-xl px-4 py-4 text-left text-sm font-semibold text-[rgb(var(--foreground))]"
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => setOpenKey(open ? "" : key)}
                    >
                      <span>{item.question}</span>
                      <ChevronDownIcon className={clsx("h-5 w-5 shrink-0 transition motion-reduce:transition-none", open && "rotate-180")} aria-hidden="true" />
                    </button>
                  </h4>
                  <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open} className="border-t border-[rgb(var(--border))] px-4 pb-4 pt-3">
                    <p className="text-sm leading-7 text-[rgb(var(--muted-foreground))]">{item.answer}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
