"use client";

import { CopilotConversation } from "@/components/intelligence/CopilotConversation";

export function AskReveNew({ initialQuestion = "", selectedRecordId }: { initialQuestion?: string; selectedRecordId?: string }) {
  return (
    <section className="mx-auto w-full max-w-5xl py-4 sm:py-8" aria-labelledby="ask-revenew-title">
      <div className="max-w-3xl">
        <h2 id="ask-revenew-title" className="mt-1.5 text-2xl font-semibold tracking-[-0.02em]">Ce vrei să verifici?</h2>
        <p className="mt-1.5 text-sm leading-6 text-[rgb(var(--text-secondary))]">O întrebare clară. Un răspuns susținut de dovezi.</p>
      </div>
      <CopilotConversation className="mt-5 w-full" lockedContext={{ pageType: "ai", ...(selectedRecordId ? { selectedRecordId } : {}) }} contextLabel={selectedRecordId ? "Întâlnirea selectată" : "Întregul spațiu de lucru"} initialQuestion={initialQuestion} autoFocus={Boolean(initialQuestion)} />
    </section>
  );
}
