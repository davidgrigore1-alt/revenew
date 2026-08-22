"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDownIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ReveNewFlowMap } from "@/components/guidance/ReveNewFlowMap";
import { BUYER_DEMO_STARTED_EVENT, BUYER_DEMO_STORAGE_KEY } from "@/lib/buyer-demo";
import { dismissGuide, GUIDE_RESET_EVENT, isGuideDismissed } from "@/lib/guide-persistence";
import { cn } from "@/lib/utils";

type Guidance = {
  id: string;
  title: string;
  points: [string, string];
  control: string;
  activeStep: number;
};

function guidanceForPath(pathname: string): Guidance | null {
  if (pathname === "/dashboard") return {
    id: "dashboard-decision-order",
    title: "Începe cu decizia critică",
    points: ["Compară valoarea estimată, riscul expus și venitul confirmat.", "Prioritatea folosește termenul, dovada și impactul estimat."],
    control: "Următorul pas este revizuit de un om.",
    activeStep: 3
  };
  if (pathname === "/ai") return {
    id: "ai-reading-order",
    title: "Cum citești inteligența operațională",
    points: ["Leagă recomandarea de dovada disponibilă.", "Verifică informațiile lipsă înaintea deciziei."],
    control: "AI-ul explică; echipa decide și execută.",
    activeStep: 2
  };
  if (pathname === "/inbox") return {
    id: "inbox-signal-review",
    title: "Transformă semnalul în decizie",
    points: ["Începe cu semnalul selectat și dovada sa.", "Verifică lipsurile și acțiunea sigură înainte de clasificare."],
    control: "Nimic nu este trimis automat.",
    activeStep: 0
  };
  if (pathname === "/today") return {
    id: "today-execution-order",
    title: "Lista de execuție, nu încă un dashboard",
    points: ["Începe cu ce este restant sau urgent.", "Fiecare card arată de ce contează acum și ce urmează."],
    control: "Finalizarea este confirmată de utilizator.",
    activeStep: 4
  };
  if (pathname === "/approvals") return {
    id: "approvals-human-control",
    title: "Aprobarea rămâne la echipă",
    points: ["Verifică propunerea și dovada înainte de aplicare.", "Decizia rămâne urmărită și explicabilă."],
    control: "Nicio comunicare nu este trimisă automat.",
    activeStep: 3
  };
  if (pathname === "/recoverable") return {
    id: "recoverable-priority-order",
    title: "Prioritizează buclele care pot pierde valoare",
    points: ["Începe cu lucrările restante, blocate sau neatribuite.", "Verifică valoarea estimată și dovada înaintea acțiunii."],
    control: "Estimarea nu reprezintă venit confirmat.",
    activeStep: 2
  };
  if (pathname.startsWith("/opportunities/")) return {
    id: "opportunity-decision-order",
    title: "Ordinea deciziei",
    points: ["Valoare estimată → dovadă → responsabil → termen.", "Confirmă apoi următoarea acțiune sigură."],
    control: "Estimarea rămâne separată de venitul confirmat.",
    activeStep: 3
  };
  if (pathname.startsWith("/reports")) return {
    id: pathname === "/reports" ? "reports-decision-reading" : "report-evidence-reading",
    title: pathname === "/reports" ? "Raportare pentru decizie și pilot" : "Citește raportul ca dovadă, nu ca promisiune",
    points: ["Separă estimările de rezultatele confirmate.", "Folosește dovezile pentru audit, pilot și evaluarea valorii."],
    control: "Fără ROI garantat sau recuperare automată.",
    activeStep: 5
  };
  return null;
}

export function ContextualPageGuide({ showFlow = false, className }: { showFlow?: boolean; className?: string }) {
  const pathname = usePathname();
  const guidance = useMemo(() => guidanceForPath(pathname), [pathname]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!guidance) {
      setVisible(false);
      return;
    }
    const buyerDemoActive = new URLSearchParams(window.location.search).get("demo") === "buyer"
      || window.localStorage.getItem(BUYER_DEMO_STORAGE_KEY) === "buyer";
    if (buyerDemoActive) {
      setVisible(false);
      return;
    }
    setVisible(!isGuideDismissed(guidance.id));
    function resetCurrentGuide() {
      if (window.localStorage.getItem(BUYER_DEMO_STORAGE_KEY) === "buyer") return;
      setVisible(true);
    }
    function closeForBuyerDemo() {
      setVisible(false);
    }
    window.addEventListener(GUIDE_RESET_EVENT, resetCurrentGuide);
    window.addEventListener(BUYER_DEMO_STARTED_EVENT, closeForBuyerDemo);
    return () => {
      window.removeEventListener(GUIDE_RESET_EVENT, resetCurrentGuide);
      window.removeEventListener(BUYER_DEMO_STARTED_EVENT, closeForBuyerDemo);
    };
  }, [guidance]);

  if (!guidance || !visible) return null;
  const currentGuidance = guidance;

  function closeGuide() {
    dismissGuide(currentGuidance.id);
    setVisible(false);
  }

  return (
    <aside aria-label="Ghid pentru această pagină" className={cn("relative rounded-card border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-subtle))] pr-11 sm:pr-12", className)}>
      <button type="button" className="focus-ring absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-button text-[rgb(var(--text-muted))] transition-colors hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))] sm:right-3 sm:top-3" aria-label="Închide ghidul acestei pagini" onClick={closeGuide}><XMarkIcon className="h-4 w-4" aria-hidden="true" /></button>
      <details className="group" data-revenew-disclosure="page-guide">
        <summary className="focus-ring flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-card px-4 py-3 marker:hidden sm:px-5">
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-[rgb(var(--primary))]">Ghid de decizie</span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-[rgb(var(--foreground))]">{guidance.title}</span>
          </span>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-[rgb(var(--text-muted))] transition-transform duration-normal group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="grid gap-3 border-t border-[rgb(var(--border))] px-4 py-3 sm:px-5 2xl:grid-cols-[minmax(12rem,0.72fr)_minmax(0,1.5fr)_minmax(13rem,0.62fr)] 2xl:items-center">
          <p className="text-xs font-medium text-[rgb(var(--text-muted))]">Începe aici · etapa {guidance.activeStep + 1}</p>
          <ul className="grid gap-1 text-xs leading-5 text-[rgb(var(--text-muted))] sm:grid-cols-2 sm:gap-4">
            {guidance.points.map((point) => <li key={point} className="flex gap-2"><span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--primary))]" aria-hidden="true" /><span>{point}</span></li>)}
          </ul>
          <p className="border-t border-[rgb(var(--border))] pt-2 text-xs font-semibold leading-5 text-[rgb(var(--foreground))] 2xl:border-l 2xl:border-t-0 2xl:pl-4 2xl:pt-0">{guidance.control}</p>
          {showFlow ? <div className="border-t border-[rgb(var(--border))] pt-3 2xl:col-span-3"><ReveNewFlowMap activeStep={guidance.activeStep} compact /></div> : null}
        </div>
      </details>
    </aside>
  );
}
