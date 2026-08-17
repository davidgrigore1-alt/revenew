"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  QuestionMarkCircleIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BUYER_DEMO_STORAGE_KEY, buyerDemoSteps, demoStepIndexForPath } from "@/lib/buyer-demo";
import { findContextualHelp, getScreenExplanation, suggestedHelpQuestions, type ContextualHelpEntry, type ContextualHelpResult } from "@/lib/contextual-help";
import { resetDismissedGuides } from "@/lib/guide-persistence";
import { highlightGuideAnchor } from "@/lib/guide-navigation";
import { cn } from "@/lib/utils";

const OPEN_ASSISTANT_EVENT = "revenew:open-contextual-assistant";
const REPLAY_TOUR_EVENT = "revenew:replay-product-guide";
const ASSISTANT_TRANSITION_MS = 160;

const routeLabels: Record<string, string> = {
  "/dashboard": "Control Center",
  "/ai": "Inteligență operațională",
  "/inbox": "Inbox Comercial",
  "/today": "Activitatea mea",
  "/approvals": "Aprobări",
  "/recoverable": "Recuperare venituri",
  "/pipeline": "Pipeline",
  "/companies": "Companii",
  "/crm/organizations": "Company 360",
  "/contacts": "Contacte",
  "/outreach": "Documente",
  "/opportunities": "Oportunități",
  "/reports": "Rapoarte",
  "/reports/revenue-recovery-audit": "Audit de recuperare venituri",
  "/reports/enterprise-pilot-pack": "Propunere pilot",
  "/reports/pilot-proof-of-value": "Dovada valorii",
  "/audit/start": "Începe audit controlat",
  "/demo": "Demo controlat",
  "/demo/feedback": "Concluzii după demo",
  "/help": "Ajutor",
  "/settings": "Setări",
  "/access": "Acces"
};

function routeMatches(route: string, pathname: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function AssistantButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={cn("focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-button border border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--surface))] px-2.5 text-xs font-semibold text-[rgb(var(--foreground))] shadow-sm transition-colors hover:border-[rgb(var(--primary)/0.5)] hover:bg-[rgb(var(--primary-muted))] sm:px-3", className)}
      onClick={() => window.dispatchEvent(new Event(OPEN_ASSISTANT_EVENT))}
      aria-label="Deschide Asistent ReveNew"
    >
      <QuestionMarkCircleIcon className="h-4 w-4 text-[rgb(var(--primary))]" aria-hidden="true" />
      <span className="hidden sm:inline">Asistent</span>
    </button>
  );
}

export function ContextualAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<ContextualHelpResult | null>(null);
  const [notice, setNotice] = useState("");
  const [buyerDemoActive, setBuyerDemoActive] = useState(false);
  const [pendingAnchor, setPendingAnchor] = useState<{ anchor: string; destination: string } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const suggestions = useMemo(() => suggestedHelpQuestions(pathname), [pathname]);
  const demoStep = buyerDemoActive ? buyerDemoSteps[demoStepIndexForPath(pathname)] : null;

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
    window.setTimeout(() => inputRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeAssistant();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!pendingAnchor || pathname !== pendingAnchor.destination) return;
    const timer = window.setTimeout(() => {
      const found = highlightGuideAnchor(pendingAnchor.anchor);
      setNotice(found ? "Zona relevantă este evidențiată temporar." : "Pagina este deschisă. Zona nu este disponibilă în starea curentă; urmează pașii din răspuns.");
      setPendingAnchor(null);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [pathname, pendingAnchor]);

  useEffect(() => {
    if (!notice || open) return;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice, open]);

  function closeAssistant() {
    setVisible(false);
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      returnFocusRef.current?.focus();
      closeTimerRef.current = null;
    }, ASSISTANT_TRANSITION_MS);
  }

  function answer(value: string) {
    setQuestion(value);
    setResult(findContextualHelp(value, pathname));
    setNotice("");
  }

  function explainCurrentScreen() {
    setResult(getScreenExplanation(pathname));
    setNotice("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    answer(question);
  }

  function destinationFor(entry: ContextualHelpEntry) {
    return entry.routes.find((route) => routeMatches(route, pathname)) ? pathname : entry.routes[0];
  }

  function navigate(entry: ContextualHelpEntry, highlight = false) {
    const destination = destinationFor(entry);
    if (highlight && entry.anchor) setPendingAnchor({ anchor: entry.anchor, destination });
    if (destination === pathname && highlight && entry.anchor) {
      const found = highlightGuideAnchor(entry.anchor);
      setNotice(found ? "Zona relevantă este evidențiată temporar." : "Zona nu este disponibilă în starea curentă; urmează pașii din răspuns.");
      setPendingAnchor(null);
    } else {
      router.push(destination);
    }
    closeAssistant();
  }

  function replayTour() {
    closeAssistant();
    window.dispatchEvent(new Event(REPLAY_TOUR_EVENT));
  }

  function resetGuides() {
    const count = resetDismissedGuides();
    setNotice(count > 0 ? "Ghidurile închise pot fi afișate din nou." : "Nu există ghiduri închise în acest browser.");
  }

  if (!open) return notice ? <p className="fixed bottom-20 right-4 z-[90] max-w-[calc(100vw-2rem)] rounded-control border border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--surface-elevated))] px-4 py-3 text-sm leading-5 text-[rgb(var(--foreground))] shadow-modal sm:bottom-6 sm:right-6 sm:max-w-sm" role="status">{notice}</p> : null;
  const entry = result?.entry ?? null;

  return (
    <div className="fixed inset-0 z-[85]" role="presentation" data-state={visible ? "open" : "closed"}>
      <button type="button" className={cn("absolute inset-0 bg-black/50 transition-opacity duration-[160ms] ease-out motion-reduce:transition-none", visible ? "opacity-100" : "opacity-0")} aria-label="Închide Asistent ReveNew" onClick={closeAssistant} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contextual-assistant-title"
        aria-describedby="contextual-assistant-description"
        className={cn(
          "app-scrollbar absolute inset-x-0 bottom-0 flex max-h-[94dvh] flex-col overflow-y-auto rounded-t-panel border border-[rgb(var(--primary)/0.32)] bg-[rgb(var(--surface-elevated))] shadow-modal transition-[transform,opacity] duration-[160ms] ease-out will-change-transform motion-reduce:transform-none motion-reduce:transition-none sm:inset-y-0 sm:left-auto sm:w-[min(31rem,calc(100vw-2rem))] sm:max-h-none sm:rounded-none sm:rounded-l-panel",
          visible ? "translate-y-0 opacity-100 sm:translate-x-0" : "translate-y-full opacity-0 sm:translate-x-full sm:translate-y-0"
        )}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated)/0.98)] p-4 sm:p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">Orientare în produs</p>
            <h2 id="contextual-assistant-title" className="mt-1 text-xl font-semibold">Asistent ReveNew</h2>
            <p id="contextual-assistant-description" className="mt-1 text-sm leading-5 text-[rgb(var(--text-muted))]">Ghid intern pentru folosirea produsului.</p>
          </div>
          <button type="button" className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-button text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]" aria-label="Închide Asistent ReveNew" onClick={closeAssistant}><XMarkIcon className="h-5 w-5" aria-hidden="true" /></button>
        </header>

        <div className="grid gap-5 p-4 sm:p-5">
          {demoStep ? (
            <section className="rounded-control border border-[rgb(var(--gold-500)/0.28)] bg-[rgb(var(--gold-500)/0.07)] p-3" aria-labelledby="assistant-demo-step">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--gold-700))] dark:text-[rgb(var(--gold-300))]">Prezentare activă · {demoStep.shortTitle}</p>
              <h3 id="assistant-demo-step" className="mt-1 text-sm font-semibold">Ce urmărești în acest pas</h3>
              <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{demoStep.notice}</p>
            </section>
          ) : null}

          <form onSubmit={submit} className="grid gap-2">
            <label htmlFor="contextual-assistant-question" className="text-sm font-semibold">Întrebarea ta</label>
            <div className="flex gap-2">
              <Input ref={inputRef} id="contextual-assistant-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Întreabă cum folosești ReveNew…" autoComplete="off" />
              <Button type="submit" size="icon" aria-label="Caută răspuns sigur"><MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" /></Button>
            </div>
            <p className="text-xs leading-5 text-[rgb(var(--text-muted))]">Răspunde pe baza ghidului intern. Dacă nu are un răspuns sigur, indică ce lipsește.</p>
          </form>

          <button type="button" className="focus-ring flex min-h-11 items-center justify-between gap-3 rounded-control border border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--primary-muted))] px-3 py-2 text-left text-sm font-semibold text-[rgb(var(--foreground))] hover:border-[rgb(var(--primary)/0.5)]" onClick={explainCurrentScreen}><span>Explică această pagină</span><ArrowRightIcon className="h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" /></button>

          {!result ? (
            <section aria-labelledby="assistant-suggestions-title">
              <h3 id="assistant-suggestions-title" className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Întrebări utile aici</h3>
              <div className="mt-2 grid gap-2">{suggestions.map((suggestion) => <button key={suggestion} type="button" className="focus-ring min-h-11 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-3 py-2 text-left text-sm font-medium transition-colors hover:border-[rgb(var(--primary)/0.45)] hover:bg-[rgb(var(--primary-muted))]" onClick={() => answer(suggestion)}>{suggestion}</button>)}</div>
            </section>
          ) : entry ? (
            <section className="overflow-hidden rounded-panel border border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--surface))]" aria-live="polite">
              <div className="border-b border-[rgb(var(--border))] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--primary))]">{result.mode === "clarify" ? "Orientare contextuală" : "Răspuns sigur din ghid"}</p>
                <h3 className="mt-2 text-lg font-semibold">{entry.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{entry.shortAnswer}</p>
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">{result.mode === "clarify" ? "Orientare pe pagină" : "Pași concreți"}</p>
                <ol className="mt-3 grid gap-2.5">{entry.steps.map((step, index) => <li key={step} className="flex gap-3 text-sm leading-5"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[rgb(var(--primary)/0.32)] bg-[rgb(var(--primary-muted))] text-xs font-semibold text-[rgb(var(--primary))]">{index + 1}</span><span className="pt-0.5">{step}</span></li>)}</ol>
                {entry.safetyNote ? <p className="mt-4 rounded-control bg-[rgb(var(--surface-subtle))] p-3 text-xs leading-5 text-[rgb(var(--text-muted))]"><strong className="text-[rgb(var(--foreground))]">Limită de control:</strong> {entry.safetyNote}</p> : null}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {destinationFor(entry) === pathname ? <span className="inline-flex min-h-9 items-center rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-3 text-xs font-semibold text-[rgb(var(--text-muted))]">Ești deja aici</span> : <Button onClick={() => navigate(entry)} size="small">{entry.primaryActionLabel ?? "Deschide pagina"}<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>}
                  {entry.anchor ? <Button onClick={() => navigate(entry, true)} variant="secondary" size="small"><MapPinIcon className="h-4 w-4" aria-hidden="true" />{destinationFor(entry) === pathname ? entry.currentActionLabel ?? "Arată zona relevantă" : "Arată-mi zona"}</Button> : null}
                </div>
                <details className="group mt-4 border-t border-[rgb(var(--border))] pt-3"><summary className="focus-ring inline-flex min-h-9 cursor-pointer list-none items-center rounded-button text-xs font-semibold text-[rgb(var(--text-muted))] marker:hidden">Destinații relevante <span className="ml-2 text-[rgb(var(--primary))] group-open:hidden">+</span><span className="ml-2 hidden text-[rgb(var(--primary))] group-open:inline">−</span></summary><div className="mt-2 flex flex-wrap gap-2">{entry.routes.map((route) => <button key={route} type="button" className="focus-ring rounded-button text-xs font-semibold text-[rgb(var(--primary))] hover:underline" onClick={() => { router.push(route); closeAssistant(); }}>{routeLabels[route] ?? route}</button>)}</div></details>
              </div>
            </section>
          ) : (
            <section className="rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4" aria-live="polite">
              <h3 className="font-semibold">Nu am găsit încă un răspuns sigur în ghidul produsului.</h3>
              <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Reformulează întrebarea sau alege una dintre opțiunile apropiate. Asistentul nu completează răspunsul prin presupuneri.</p>
              <div className="mt-3 grid gap-2">{result.suggestions.map((suggestion) => <button key={suggestion} type="button" className="focus-ring min-h-10 rounded-control border border-[rgb(var(--border))] px-3 py-2 text-left text-sm font-medium hover:bg-[rgb(var(--surface-muted))]" onClick={() => answer(suggestion)}>{suggestion}</button>)}</div>
              <div className="mt-4 flex flex-wrap gap-2"><Button href="/help" variant="secondary" size="small" onClick={closeAssistant}>Deschide Ajutor</Button><Button href="/dashboard" variant="ghost" size="small" onClick={closeAssistant}>Mergi la Control Center</Button></div>
            </section>
          )}

          {result ? <div className="flex flex-wrap gap-2">{result.suggestions.map((suggestion) => <button key={suggestion} type="button" className="focus-ring rounded-button border border-[rgb(var(--border))] px-3 py-2 text-left text-xs font-medium text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))]" onClick={() => answer(suggestion)}>{suggestion}</button>)}</div> : null}
          {notice ? <p className="rounded-control bg-[rgb(var(--surface-subtle))] p-3 text-xs leading-5 text-[rgb(var(--text-muted))]" role="status">{notice}</p> : null}
        </div>

        <footer className="mt-auto border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-3 sm:px-5">
          {buyerDemoActive ? <p className="text-xs leading-5 text-[rgb(var(--text-muted))]">Traseul cumpărătorului rămâne ghidul principal. Turul introductiv este suspendat până la oprirea prezentării.</p> : <details className="group"><summary className="focus-ring inline-flex min-h-9 cursor-pointer list-none items-center rounded-button text-xs font-semibold text-[rgb(var(--text-muted))] marker:hidden">Opțiuni ghid <span className="ml-2 text-[rgb(var(--primary))] group-open:hidden">+</span><span className="ml-2 hidden text-[rgb(var(--primary))] group-open:inline">−</span></summary><div className="mt-2 grid gap-2 sm:grid-cols-2"><Button variant="secondary" size="small" onClick={replayTour}><ArrowPathIcon className="h-4 w-4" aria-hidden="true" />Revezi turul introductiv</Button><Button variant="ghost" size="small" onClick={resetGuides}>Resetează ghidurile închise</Button></div></details>}
        </footer>
      </div>
    </div>
  );
}
