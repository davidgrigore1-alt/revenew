"use client";

import Link from "next/link";
import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowRightIcon, BookOpenIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import type { CopilotAnswer, CopilotConversationTurn, CopilotPageContext } from "@/lib/ai/copilot-types";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type ConversationItem = { id: string; question: string; answer: CopilotAnswer };

function contextForPath(pathname: string, lockedContext?: Partial<CopilotPageContext>): CopilotPageContext {
  const companyMatch = pathname.match(/^\/crm\/organizations\/([0-9a-z-]+)/i);
  const opportunityMatch = pathname.match(/^\/opportunities\/([0-9a-z-]+)/i);
  const pageType = lockedContext?.pageType ?? (companyMatch ? "company" : opportunityMatch ? "opportunity" : pathname === "/dashboard" ? "dashboard" : pathname === "/ai" ? "ai" : "other");
  return {
    route: pathname,
    pageType,
    ...(lockedContext?.organizationId ?? companyMatch?.[1] ? { organizationId: lockedContext?.organizationId ?? companyMatch?.[1] } : {}),
    ...(lockedContext?.opportunityId ?? opportunityMatch?.[1] ? { opportunityId: lockedContext?.opportunityId ?? opportunityMatch?.[1] } : {})
  };
}

function suggestionsFor(context: CopilotPageContext) {
  if (context.pageType === "company") return ["Rezumă relația cu această companie.", "Ce a rămas nerezolvat?", "Ce oportunități sunt active?"];
  if (context.pageType === "opportunity") return ["Rezumă-mi situația înainte de follow-up.", "Ce lipsește?", "Care este următorul pas sigur?"];
  if (context.pageType === "dashboard") return ["Ce s-a schimbat astăzi?", "De ce este prioritatea principală importantă?", "Ce necesită decizie umană?"];
  return ["Care sunt cele mai importante trei probleme?", "Ce oportunități nu au următor pas?", "Explică această pagină."];
}

export function CopilotConversation({ className, lockedContext, autoFocus = false, initialSuggestions }: { className?: string; lockedContext?: Partial<CopilotPageContext>; autoFocus?: boolean; initialSuggestions?: string[] }) {
  const pathname = usePathname();
  const inputId = useId();
  const context = useMemo(() => contextForPath(pathname, lockedContext), [lockedContext, pathname]);
  const suggestions = initialSuggestions ?? suggestionsFor(context);
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [autoFocus]);

  async function ask(value: string) {
    const normalized = value.trim();
    if (normalized.length < 2 || loading) return;
    setQuestion(normalized);
    setLoading(true);
    setError("");
    const history: CopilotConversationTurn[] = conversation.slice(-4).flatMap((item) => [{ role: "user" as const, content: item.question }, { role: "assistant" as const, content: item.answer.answer }]);
    try {
      const response = await fetch("/api/ai/copilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: normalized, context, history }) });
      const payload = await response.json() as CopilotAnswer | { error?: string };
      if (!response.ok || !("answer" in payload)) throw new Error("error" in payload ? payload.error : "Nu am putut genera răspunsul AI acum.");
      setConversation((current) => [...current, { id: `${Date.now()}-${current.length}`, question: normalized, answer: payload }].slice(-8));
      setQuestion("");
    } catch (requestError) {
      setError(requestError instanceof Error && requestError.message ? requestError.message : "Nu am putut genera răspunsul AI acum.");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <div className={cn("grid min-h-0 gap-3", className)}>
      <form onSubmit={submit} className="grid gap-2 rounded-panel border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-elevated))] p-2.5">
        <label htmlFor={inputId} className="sr-only">Întrebarea ta</label>
        <textarea ref={inputRef} data-copilot-input id={inputId} aria-describedby={`${inputId}-trust`} aria-keyshortcuts="Enter" value={question} onChange={(event) => setQuestion(event.target.value.slice(0, 3000))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void ask(question); } }} rows={3} maxLength={3000} placeholder="Întreabă ReveNew…" className="focus-ring min-h-24 w-full resize-none rounded-control border-0 bg-transparent px-2 py-2 text-sm leading-5 outline-none placeholder:text-[rgb(var(--text-faint))]" />
        <div className="flex items-center justify-between gap-3"><p id={`${inputId}-trust`} className="flex items-start gap-1.5 text-[0.6875rem] leading-4 text-[rgb(var(--text-muted))]"><ShieldCheckIcon className="mt-px h-3.5 w-3.5 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />Doar informații autorizate. Decizia și orice acțiune rămân la utilizator.</p><Button type="submit" size="small" loading={loading} disabled={question.trim().length < 2}>Verifică</Button></div>
      </form>

      <div className="grid gap-5" aria-live="polite" aria-busy={loading}>
        {conversation.length === 0 ? (
          <section aria-labelledby="copilot-suggestions-title">
            <h3 id="copilot-suggestions-title" className="sr-only">Întrebări utile aici</h3>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 3).map((suggestion) => <button key={suggestion} type="button" disabled={loading} className="focus-ring min-h-8 rounded-control border border-[rgb(var(--border))] bg-transparent px-3 py-1.5 text-left text-xs font-medium text-[rgb(var(--text-muted))] transition-colors hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-subtle))] hover:text-[rgb(var(--foreground))] disabled:cursor-not-allowed disabled:opacity-60" onClick={() => void ask(suggestion)}>{suggestion}</button>)}
            </div>
          </section>
        ) : conversation.map((item) => (
          <article key={item.id} className="border-b border-[rgb(var(--border))] pb-5 last:border-0" aria-labelledby={`${item.id}-answer`}>
            <p className="rounded-control bg-[rgb(var(--surface-subtle))] px-3 py-2 text-sm font-medium text-[rgb(var(--text-secondary))]">{item.question}</p>
            <div className="mt-4">
              <p id={`${item.id}-answer`} className="text-[0.95rem] leading-6 text-[rgb(var(--foreground))]">{item.answer.answer}</p>
              {item.answer.evidence.length > 0 ? (
                <section className="mt-4 border-t border-[rgb(var(--border))] pt-3" aria-label={`Dovezi, ${item.answer.evidence.length}`}>
                  <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]"><BookOpenIcon className="h-4 w-4" aria-hidden="true" />Dovezi · {item.answer.evidence.length}</h4>
                  <div className="mt-2 divide-y divide-[rgb(var(--border))]">
                    {item.answer.evidence.map((evidence) => {
                      const content = <><span className="font-semibold text-[rgb(var(--foreground))]">{evidence.label}</span><span className="text-xs text-[rgb(var(--text-muted))]">{evidence.sourceType} · {evidence.fact}</span></>;
                      return evidence.route ? <Link key={evidence.sourceId} href={evidence.route} className="focus-ring flex min-h-11 flex-col justify-center gap-0.5 rounded-button px-1 py-2 hover:text-[rgb(var(--primary))]">{content}</Link> : <div key={evidence.sourceId} className="flex min-h-11 flex-col justify-center gap-0.5 py-2">{content}</div>;
                    })}
                  </div>
                </section>
              ) : null}
              {item.answer.missingInformation.length > 0 ? <section className="mt-4 border-l-2 border-[rgb(var(--warning-border))] pl-3"><h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--warning-text))]">Ce nu pot confirma</h4><ul className="mt-1 grid gap-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{item.answer.missingInformation.map((missing) => <li key={missing}>— {missing}</li>)}</ul></section> : null}
              {item.answer.caveats.length > 0 ? <p className="mt-3 text-xs leading-5 text-[rgb(var(--text-muted))]">{item.answer.caveats.join(" ")}</p> : null}
              {item.answer.suggestedAction ? <div className="mt-4"><Button href={item.answer.suggestedAction.route} size="small">{item.answer.suggestedAction.label}<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button></div> : null}
              {item.answer.followUps.length > 0 ? <div className="mt-4 flex flex-wrap gap-2">{item.answer.followUps.map((followUp) => <button key={followUp} type="button" disabled={loading} className="focus-ring rounded-button border border-[rgb(var(--border))] px-3 py-2 text-left text-xs font-medium text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))] disabled:cursor-not-allowed disabled:opacity-60" onClick={() => void ask(followUp)}>{followUp}</button>)}</div> : null}
            </div>
          </article>
        ))}
        {loading ? <p className="flex items-center gap-2 text-sm text-[rgb(var(--text-muted))]" role="status"><span className="h-2 w-2 animate-pulse rounded-full bg-[rgb(var(--primary))] motion-reduce:animate-none" aria-hidden="true" />Verific informațiile disponibile...</p> : null}
        {error ? <div className="rounded-control border border-[rgb(var(--danger-border))] bg-[rgb(var(--danger-background))] p-3" role="alert"><p className="text-sm text-[rgb(var(--danger-text))]">{error}</p><button type="button" className="focus-ring mt-2 rounded-button text-xs font-semibold underline" onClick={() => void ask(question)}>Reîncearcă</button></div> : null}
      </div>
    </div>
  );
}
