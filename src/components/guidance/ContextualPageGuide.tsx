"use client";

import { usePathname } from "next/navigation";
import { ReveNewFlowMap } from "@/components/guidance/ReveNewFlowMap";
import { cn } from "@/lib/utils";

type Guidance = {
  title: string;
  points: [string, string];
  control: string;
  activeStep: number;
};

function guidanceForPath(pathname: string): Guidance | null {
  if (pathname === "/dashboard") return {
    title: "Începe cu decizia critică",
    points: ["Compară valoarea estimată, riscul expus și venitul confirmat.", "Prioritatea folosește termenul, dovada și impactul estimat."],
    control: "Următorul pas este revizuit de un om.",
    activeStep: 3
  };
  if (pathname === "/ai") return {
    title: "Cum citești inteligența operațională",
    points: ["Leagă recomandarea de dovada disponibilă.", "Verifică informațiile lipsă înaintea deciziei."],
    control: "AI-ul explică; echipa decide și execută.",
    activeStep: 2
  };
  if (pathname === "/inbox") return {
    title: "Transformă semnalul în decizie",
    points: ["Începe cu semnalul selectat și dovada sa.", "Verifică lipsurile și acțiunea sigură înainte de clasificare."],
    control: "Nimic nu este trimis automat.",
    activeStep: 0
  };
  if (pathname === "/today") return {
    title: "Lista de execuție, nu încă un dashboard",
    points: ["Începe cu ce este restant sau urgent.", "Fiecare card arată de ce contează acum și ce urmează."],
    control: "Finalizarea este confirmată de utilizator.",
    activeStep: 4
  };
  if (pathname === "/approvals") return {
    title: "Aprobarea rămâne la echipă",
    points: ["Verifică propunerea și dovada înainte de aplicare.", "Decizia rămâne urmărită și explicabilă."],
    control: "Nicio comunicare nu este trimisă automat.",
    activeStep: 3
  };
  if (pathname === "/recoverable") return {
    title: "Prioritizează buclele care pot pierde valoare",
    points: ["Începe cu lucrările restante, blocate sau neatribuite.", "Verifică valoarea estimată și dovada înaintea acțiunii."],
    control: "Estimarea nu reprezintă venit confirmat.",
    activeStep: 2
  };
  if (pathname.startsWith("/opportunities/")) return {
    title: "Ordinea deciziei",
    points: ["Valoare estimată → dovadă → responsabil → termen.", "Confirmă apoi următoarea acțiune sigură."],
    control: "Estimarea rămâne separată de venitul confirmat.",
    activeStep: 3
  };
  if (pathname.startsWith("/reports")) return {
    title: pathname === "/reports" ? "Raportare pentru decizie și pilot" : "Citește raportul ca dovadă, nu ca promisiune",
    points: ["Separă estimările de rezultatele confirmate.", "Folosește dovezile pentru audit, pilot și evaluarea valorii."],
    control: "Fără ROI garantat sau recuperare automată.",
    activeStep: 5
  };
  return null;
}

export function ContextualPageGuide({ showFlow = false, className }: { showFlow?: boolean; className?: string }) {
  const pathname = usePathname();
  const guidance = guidanceForPath(pathname);
  if (!guidance) return null;

  return (
    <aside aria-label="Ghid pentru această pagină" className={cn("rounded-card border border-[rgb(var(--gold-500)/0.28)] bg-[rgb(var(--gold-100)/0.14)] p-3.5 dark:bg-[rgb(var(--gold-700)/0.06)] sm:p-4", className)}>
      <div className="grid gap-3 xl:grid-cols-[minmax(12rem,0.72fr)_minmax(0,1.5fr)_minmax(13rem,0.62fr)] xl:items-center">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.11em] text-[rgb(var(--gold-700))] dark:text-[rgb(var(--gold-300))]">Începe aici · etapa {guidance.activeStep + 1}</p>
          <h2 className="mt-1 text-sm font-semibold text-[rgb(var(--foreground))]">{guidance.title}</h2>
        </div>
        <ul className="grid gap-1 text-xs leading-5 text-[rgb(var(--text-muted))] sm:grid-cols-2 sm:gap-4">
          {guidance.points.map((point) => <li key={point} className="flex gap-2"><span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--primary))]" aria-hidden="true" /><span>{point}</span></li>)}
        </ul>
        <p className="border-t border-[rgb(var(--border))] pt-2 text-xs font-semibold leading-5 text-[rgb(var(--foreground))] xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">{guidance.control}</p>
      </div>
      {showFlow ? <div className="mt-3 border-t border-[rgb(var(--border))] pt-3"><ReveNewFlowMap activeStep={guidance.activeStep} compact /></div> : null}
    </aside>
  );
}
