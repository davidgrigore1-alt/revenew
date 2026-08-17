"use client";

import { CopilotConversation } from "@/components/intelligence/CopilotConversation";

export function CompanyContextualAsk({ organizationId, companyName, suggestions }: { organizationId: string; companyName: string; suggestions: string[] }) {
  return (
    <section id="company-ask" className="scroll-mt-24 rounded-panel border border-[rgb(var(--primary)/0.24)] bg-[rgb(var(--surface))] p-4 shadow-card sm:p-5" aria-labelledby="company-ask-title" data-guide-anchor="company-ask">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">Analiză în relația comercială</p>
        <h2 id="company-ask-title" className="mt-1 text-xl font-semibold tracking-[-0.02em]">Întreabă despre {companyName}</h2>
        <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Răspunsul rămâne limitat la informațiile autorizate ale acestei companii și separă faptele de ceea ce nu poate fi confirmat.</p>
      </div>
      <CopilotConversation className="mt-5" lockedContext={{ pageType: "company", organizationId }} initialSuggestions={suggestions} />
    </section>
  );
}
