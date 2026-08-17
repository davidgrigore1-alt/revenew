"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowPathIcon, QuestionMarkCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CopilotConversation } from "@/components/intelligence/CopilotConversation";
import { BUYER_DEMO_STORAGE_KEY, buyerDemoSteps, demoStepIndexForPath } from "@/lib/buyer-demo";
import { resetDismissedGuides } from "@/lib/guide-persistence";
import { cn } from "@/lib/utils";

const OPEN_ASSISTANT_EVENT = "revenew:open-contextual-assistant";
const REPLAY_TOUR_EVENT = "revenew:replay-product-guide";
const ASSISTANT_TRANSITION_MS = 160;

export function AssistantButton({ className }: { className?: string }) {
  return (
    <button type="button" className={cn("focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-button border border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--surface))] px-2.5 text-xs font-semibold text-[rgb(var(--foreground))] shadow-sm transition-colors hover:border-[rgb(var(--primary)/0.5)] hover:bg-[rgb(var(--primary-muted))] sm:px-3", className)} onClick={() => window.dispatchEvent(new Event(OPEN_ASSISTANT_EVENT))} aria-label="Deschide Asistent ReveNew">
      <QuestionMarkCircleIcon className="h-4 w-4 text-[rgb(var(--primary))]" aria-hidden="true" />
      <span className="hidden sm:inline">Asistent</span>
    </button>
  );
}

export function ContextualAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [notice, setNotice] = useState("");
  const [buyerDemoActive, setBuyerDemoActive] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const demoStep = buyerDemoActive ? buyerDemoSteps[demoStepIndexForPath(pathname)] : null;

  function closeAssistant() {
    setVisible(false);
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      returnFocusRef.current?.focus();
      closeTimerRef.current = null;
    }, ASSISTANT_TRANSITION_MS);
  }

  useEffect(() => {
    function openAssistant() {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
      if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setBuyerDemoActive(window.localStorage.getItem(BUYER_DEMO_STORAGE_KEY) === "buyer" || new URLSearchParams(window.location.search).get("demo") === "buyer");
      setOpen(true);
      setVisible(false);
      setNotice("");
      animationFrameRef.current = window.requestAnimationFrame(() => setVisible(true));
    }
    window.addEventListener(OPEN_ASSISTANT_EVENT, openAssistant);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, openAssistant);
  }, []);

  useEffect(() => () => {
    if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { closeAssistant(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", handleKeyDown); };
  }, [open]);

  function replayTour() {
    closeAssistant();
    window.dispatchEvent(new Event(REPLAY_TOUR_EVENT));
  }

  function resetGuides() {
    const count = resetDismissedGuides();
    setNotice(count > 0 ? "Ghidurile închise pot fi afișate din nou." : "Nu există ghiduri închise în acest browser.");
  }

  if (!open) return notice ? <p className="fixed bottom-20 right-4 z-[90] max-w-[calc(100vw-2rem)] rounded-control border border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--surface-elevated))] px-4 py-3 text-sm leading-5 text-[rgb(var(--foreground))] shadow-modal sm:bottom-6 sm:right-6 sm:max-w-sm" role="status">{notice}</p> : null;

  return (
    <div className="fixed inset-0 z-[85]" role="presentation" data-state={visible ? "open" : "closed"}>
      <button type="button" className={cn("absolute inset-0 bg-black/50 transition-opacity duration-[160ms] ease-out motion-reduce:transition-none", visible ? "opacity-100" : "opacity-0")} aria-label="Închide Asistent ReveNew" onClick={closeAssistant} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="contextual-assistant-title" aria-describedby="contextual-assistant-description" className={cn("absolute inset-x-0 bottom-0 flex h-[94dvh] max-h-[94dvh] flex-col overflow-hidden rounded-t-panel border border-[rgb(var(--primary)/0.26)] bg-[rgb(var(--surface-elevated))] shadow-modal transition-[transform,opacity] duration-[160ms] ease-out will-change-transform motion-reduce:transform-none motion-reduce:transition-none sm:inset-y-0 sm:left-auto sm:h-auto sm:w-[min(31rem,calc(100vw-2rem))] sm:max-h-none sm:rounded-none sm:rounded-l-panel", visible ? "translate-y-0 opacity-100 sm:translate-x-0" : "translate-y-full opacity-0 sm:translate-x-full sm:translate-y-0") }>
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-4 sm:p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">Inteligență comercială controlată</p>
            <h2 id="contextual-assistant-title" className="mt-1 text-xl font-semibold">Asistent ReveNew</h2>
            <p id="contextual-assistant-description" className="mt-1 text-sm leading-5 text-[rgb(var(--text-muted))]">Răspunde pe baza informațiilor autorizate din ReveNew.</p>
          </div>
          <button type="button" className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-button text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]" aria-label="Închide Asistent ReveNew" onClick={closeAssistant}><XMarkIcon className="h-5 w-5" aria-hidden="true" /></button>
        </header>

        <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {demoStep ? <section className="mb-4 rounded-control border border-[rgb(var(--gold-500)/0.28)] bg-[rgb(var(--gold-500)/0.07)] p-3" aria-labelledby="assistant-demo-step"><p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--gold-700))] dark:text-[rgb(var(--gold-300))]">Prezentare activă · {demoStep.shortTitle}</p><h3 id="assistant-demo-step" className="mt-1 text-sm font-semibold">Ce urmărești în acest pas</h3><p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{demoStep.notice}</p></section> : null}
          <CopilotConversation autoFocus />
          {notice ? <p className="mt-4 rounded-control bg-[rgb(var(--surface-subtle))] p-3 text-xs leading-5 text-[rgb(var(--text-muted))]" role="status">{notice}</p> : null}
        </div>

        <footer className="shrink-0 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-3 sm:px-5">
          <details className="group"><summary className="focus-ring inline-flex min-h-9 cursor-pointer list-none items-center rounded-button text-xs font-semibold text-[rgb(var(--text-muted))] marker:hidden">Opțiuni ghid <span className="ml-2 text-[rgb(var(--primary))] group-open:hidden">+</span><span className="ml-2 hidden text-[rgb(var(--primary))] group-open:inline">−</span></summary><div className="mt-2 grid gap-2 sm:grid-cols-2"><Button variant="secondary" size="small" onClick={replayTour}><ArrowPathIcon className="h-4 w-4" aria-hidden="true" />Revezi turul introductiv</Button><Button variant="ghost" size="small" onClick={resetGuides}>Resetează ghidurile închise</Button></div></details>
        </footer>
      </div>
    </div>
  );
}
