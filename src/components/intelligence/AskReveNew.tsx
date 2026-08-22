"use client";

import { CopilotConversation } from "@/components/intelligence/CopilotConversation";

export function AskReveNew() {
  return (
    <section className="mx-auto w-full max-w-4xl py-3 sm:py-6" aria-labelledby="ask-revenew-title">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--primary))]">Analiză comercială controlată</p>
        <h2 id="ask-revenew-title" className="mt-2 text-xl font-semibold tracking-[-0.02em]">Întreabă ReveNew</h2>
        <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Întreabă despre datele comerciale disponibile. Asistentul folosește surse autorizate, indică ce nu poate confirma și nu execută acțiuni.</p>
      </div>
      <CopilotConversation className="mt-4" lockedContext={{ pageType: "ai" }} />
    </section>
  );
}
