"use client";

import { CopilotConversation } from "@/components/intelligence/CopilotConversation";

const suggestions = [
  "Ce decizii cer atenție acum și de ce?",
  "Ce s-a schimbat comercial de la ultima verificare?",
  "Unde lipsește responsabilul sau următorul pas?",
  "Ce expunere are termenul cel mai apropiat?",
];

export function HomeAskSurface({ greeting }: { greeting: string }) {
  return (
    <section className="control-center-ask-surface mx-auto w-full max-w-5xl" aria-labelledby="home-greeting">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-metadata font-semibold uppercase tracking-[0.11em] text-[rgb(var(--primary))]">Analist comercial</p>
          <h2 id="home-greeting" className="mt-1 text-base font-semibold tracking-[-0.02em] text-[rgb(var(--foreground))]">{greeting}</h2>
        </div>
        <p className="max-w-xs text-right text-metadata leading-4 text-[rgb(var(--text-muted))]">Context autorizat · fără acțiune externă automată</p>
      </div>
      <div className="mt-3">
        <CopilotConversation lockedContext={{ pageType: "dashboard" }} contextLabel="Control Center" initialSuggestions={suggestions} />
      </div>
    </section>
  );
}
