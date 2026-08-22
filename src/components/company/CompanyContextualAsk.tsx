"use client";

import { CopilotConversation } from "@/components/intelligence/CopilotConversation";

export function CompanyContextualAsk({ organizationId, companyName, suggestions }: { organizationId: string; companyName: string; suggestions: string[] }) {
  return (
    <section id="company-ask" className="scroll-mt-24" data-guide-anchor="company-ask" aria-labelledby="company-ask-title">
      <div className="border-b border-[rgb(var(--border))] pb-4">
        <h2 id="company-ask-title" className="text-section-title font-semibold">Întreabă despre {companyName}</h2>
        <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">Răspuns limitat la datele autorizate ale acestei relații.</p>
      </div>
      <CopilotConversation className="pt-5" lockedContext={{ pageType: "company", organizationId }} initialSuggestions={suggestions} />
    </section>
  );
}
