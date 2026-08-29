"use client";

import { CopilotConversation } from "@/components/intelligence/CopilotConversation";

export function AskReveNew({ initialQuestion = "", selectedRecordId }: { initialQuestion?: string; selectedRecordId?: string }) {
  return (
    <section className="mx-auto w-full max-w-5xl py-3 sm:py-6" aria-labelledby="ask-revenew-title">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--intelligence-strong))] dark:text-[rgb(var(--intelligence))]">Analiză comercială controlată</p>
        <h2 id="ask-revenew-title" className="mt-2 text-xl font-semibold tracking-[-0.02em]">Întreabă ReveNew</h2>
        <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Înțelege ce contează, verifică dovezile și pregătește următorul pas. Aplicarea rămâne o decizie explicită a ta.</p>
      </div>
      <CopilotConversation className="mt-5 w-full" lockedContext={{ pageType: "ai", ...(selectedRecordId ? { selectedRecordId } : {}) }} contextLabel={selectedRecordId ? "Întâlnirea selectată" : "Întregul spațiu de lucru"} initialQuestion={initialQuestion} autoFocus={Boolean(initialQuestion)} />
    </section>
  );
}
