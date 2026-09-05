"use client";

import { CopilotConversation } from "@/components/intelligence/CopilotConversation";
import styles from "./CompanyBriefing.module.css";

export function CompanyContextualAsk({ organizationId, companyName, suggestions }: { organizationId: string; companyName: string; suggestions: string[] }) {
  return (
    <section id="company-ask" className={`${styles.ask} scroll-mt-24`} data-guide-anchor="company-ask" aria-labelledby="company-ask-title">
      <div className="border-b border-[rgb(var(--border))] pb-4">
        <h2 id="company-ask-title" className="text-section-title font-semibold">Întreabă despre {companyName}</h2>
        <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">Pornești de la această companie: oportunități, persoane, acțiuni și dovezi asociate. Poți schimba explicit aria în Workspace autorizat.</p>
        <p className="mt-2 text-xs text-[rgb(var(--text-muted))]">Răspunsul folosește sursele disponibile în aria selectată și păstrează vizibile informațiile lipsă.</p>
      </div>
      <CopilotConversation className="pt-5" lockedContext={{ pageType: "company", organizationId }} contextLabel={companyName} initialSuggestions={suggestions} />
    </section>
  );
}
