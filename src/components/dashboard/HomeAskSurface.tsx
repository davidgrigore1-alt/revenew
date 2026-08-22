"use client";

import { CopilotConversation } from "@/components/intelligence/CopilotConversation";

const suggestions = ["Ce necesită atenție astăzi?", "Ce s-a schimbat de ieri?", "Ce oportunități nu au următor pas?", "Unde avem valoare expusă?"];

export function HomeAskSurface({ greeting }: { greeting: string }) {
  return (
    <section className="mx-auto w-full max-w-3xl pt-4 sm:pt-8" aria-labelledby="home-greeting">
      <div>
        <h1 id="home-greeting" className="text-2xl font-semibold tracking-[-0.03em] text-[rgb(var(--foreground))] sm:text-[1.75rem]">{greeting}</h1>
      </div>
      <div className="mt-5">
        <CopilotConversation lockedContext={{ pageType: "dashboard" }} initialSuggestions={suggestions} />
      </div>
    </section>
  );
}
