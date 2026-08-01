"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { ReveNewFlowMap } from "@/components/guidance/ReveNewFlowMap";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "revenew.guided-product-understanding.v1";
const REPLAY_EVENT = "revenew:replay-product-guide";

const steps = [
  {
    eyebrow: "Orientare rapidă",
    title: "Ce face ReveNew",
    description: "ReveNew arată unde se blochează oportunități comerciale și ce decizie sigură poate fi luată pe baza dovezilor."
  },
  {
    eyebrow: "Fluxul de lucru",
    title: "De la semnal la rezultat verificabil",
    description: "Fiecare etapă păstrează legătura dintre contextul inițial, decizia echipei și rezultatul care poate fi auditat."
  },
  {
    eyebrow: "Inteligență operațională",
    title: "AI-ul structurează și explică. Nu execută.",
    description: "Recomandările pornesc din dovezile disponibile, arată informațiile lipsă și nu trimit mesaje automat."
  },
  {
    eyebrow: "Prima verificare",
    title: "Începe cu decizia critică",
    description: "Deschide Control Center, verifică semnalul prioritar, dovada, responsabilul și următoarea acțiune sigură."
  },
  {
    eyebrow: "Validare controlată",
    title: "Auditul și pilotul verifică valoarea, nu o promit",
    description: "Un prim audit poate folosi 20–50 de cazuri recente, inclusiv date anonimizate. Estimările rămân separate de venitul confirmat."
  }
] as const;

function persistGuideState(state: "completed" | "dismissed" | "later") {
  window.localStorage.setItem(STORAGE_KEY, state);
}

export function GuideReplayButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={cn("focus-ring inline-flex min-h-10 items-center rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-xs font-semibold text-[rgb(var(--text-muted))] transition-colors hover:border-[rgb(var(--border-strong))] hover:text-[rgb(var(--foreground))]", className)}
      onClick={() => window.dispatchEvent(new Event(REPLAY_EVENT))}
    >
      Ghid rapid
    </button>
  );
}

export function GuidedProductTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!window.localStorage.getItem(STORAGE_KEY)) setOpen(true);

    function replayGuide() {
      setStep(0);
      setOpen(true);
    }

    window.addEventListener(REPLAY_EVENT, replayGuide);
    return () => window.removeEventListener(REPLAY_EVENT, replayGuide);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        persistGuideState("later");
        setOpen(false);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
      if (focusable.length === 0) return;
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

  function closeWith(state: "completed" | "dismissed" | "later") {
    persistGuideState(state);
    setOpen(false);
  }

  if (!open) return null;
  const current = steps[step];
  const lastStep = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[90] grid items-end bg-black/70 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-5" role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guided-product-tour-title"
        aria-describedby="guided-product-tour-description"
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-panel border border-[rgb(var(--gold-500)/0.35)] bg-[rgb(var(--surface-elevated))] shadow-modal sm:max-w-3xl sm:rounded-panel"
      >
        <div className="flex items-center justify-between gap-4 border-b border-[rgb(var(--border))] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--gold-700))] dark:text-[rgb(var(--gold-300))]">ReveNew</span>
            <span className="text-xs tabular-nums text-[rgb(var(--text-faint))]">{step + 1} / {steps.length}</span>
          </div>
          <button ref={closeRef} type="button" className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-button text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))]" aria-label="Închide ghidul" onClick={() => closeWith("later")}>
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">{current.eyebrow}</p>
          <h2 id="guided-product-tour-title" className="mt-2 max-w-2xl font-display text-2xl font-semibold tracking-tight text-[rgb(var(--foreground))] sm:text-3xl">{current.title}</h2>
          <p id="guided-product-tour-description" className="mt-3 max-w-2xl text-sm leading-6 text-[rgb(var(--text-muted))] sm:text-base">{current.description}</p>

          {step === 1 ? <div className="mt-5"><ReveNewFlowMap activeStep={0} compact /></div> : null}
          {step === 2 ? (
            <div className="mt-5 grid gap-px overflow-hidden rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--border))] sm:grid-cols-3">
              {["Dovada rămâne vizibilă", "Lipsurile sunt declarate", "Decizia aparține echipei"].map((item) => <p key={item} className="bg-[rgb(var(--surface-subtle))] px-4 py-3 text-sm font-medium text-[rgb(var(--foreground))]">{item}</p>)}
            </div>
          ) : null}

          <div className="mt-6 flex items-center gap-1.5" aria-label={`Pasul ${step + 1} din ${steps.length}`}>
            {steps.map((item, index) => <span key={item.title} className={`h-1.5 rounded-full transition-[width,background-color] ${index === step ? "w-8 bg-[rgb(var(--primary))]" : "w-3 bg-[rgb(var(--border-strong))]"}`} aria-hidden="true" />)}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3 text-xs">
            <button type="button" className="focus-ring min-h-10 rounded-button px-1 font-semibold text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))]" onClick={() => closeWith("dismissed")}>Sari peste</button>
            <button type="button" className="focus-ring min-h-10 rounded-button px-1 font-semibold text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))]" onClick={() => closeWith("later")}>Revizuiește mai târziu</button>
          </div>
          <div className="flex flex-col-reverse gap-2 min-[420px]:flex-row min-[420px]:justify-end">
            {step > 0 ? <Button variant="secondary" onClick={() => setStep((value) => value - 1)}><ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />Înapoi</Button> : null}
            {lastStep ? (
              <Button href="/dashboard" onClick={() => closeWith("completed")}>Începe în Dashboard<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>
            ) : (
              <Button onClick={() => setStep((value) => value + 1)}>{step === 0 ? "Începe turul" : "Continuă"}<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
