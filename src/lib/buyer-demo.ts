export type BuyerDemoStep = {
  id: string;
  title: string;
  shortTitle: string;
  href: string;
  show: string;
  understanding: string;
  buyerQuestion: string;
  safetyNote?: string;
};

export const buyerDemoSteps: BuyerDemoStep[] = [
  {
    id: "problem",
    title: "Începe cu problema comercială",
    shortTitle: "Problema",
    href: "/demo",
    show: "Explică unde se pierd oportunitățile între semnal, responsabil, termen și decizie.",
    understanding: "ReveNew face vizibile blocajele comerciale care altfel cer căutare manuală.",
    buyerQuestion: "Unde se blochează cel mai des oportunitățile în echipa voastră?"
  },
  {
    id: "dashboard",
    title: "Control Center — ce este în risc",
    shortTitle: "Control Center",
    href: "/dashboard",
    show: "Arată decizia critică, valoarea estimată expusă și prima acțiune sigură.",
    understanding: "Managementul vede ce contează acum fără să caute prin înregistrări.",
    buyerQuestion: "Cum decideți astăzi ce caz trebuie verificat primul?",
    safetyNote: "Estimările rămân separate de venitul confirmat."
  },
  {
    id: "intelligence",
    title: "Inteligență operațională — recomandare explicată",
    shortTitle: "Inteligență",
    href: "/ai",
    show: "Deschide recomandarea și urmărește situația, dovada, lipsurile și consecința inacțiunii.",
    understanding: "ReveNew structurează și explică; echipa verifică și decide.",
    buyerQuestion: "Ați acționa mai sigur dacă vedeți dovada și informațiile lipsă?",
    safetyNote: "Nu există execuție externă automată."
  },
  {
    id: "inbox",
    title: "Inbox Comercial — semnal transformat în decizie",
    shortTitle: "Inbox",
    href: "/inbox",
    show: "Arată semnalul selectat, dovada, informația lipsă și clasificarea recomandată.",
    understanding: "Un semnal comercial devine o decizie verificabilă, nu o notificare uitată.",
    buyerQuestion: "Câte cereri sau follow-up-uri se pierd între inbox, CRM și oameni?",
    safetyNote: "Niciun mesaj nu este trimis automat."
  },
  {
    id: "opportunity",
    title: "Oportunitate — valoare, dovadă și responsabil",
    shortTitle: "Oportunitate",
    href: "/opportunities/de300006-0000-4000-8000-000000000006",
    show: "Leagă valoarea estimată de dovadă, responsabil, termen și următoarea acțiune.",
    understanding: "Prioritatea este explicată, iar blocajul conduce la un pas concret.",
    buyerQuestion: "Ce lipsește cel mai des: responsabilul, termenul sau următorul pas?",
    safetyNote: "Valoarea estimată nu este venit confirmat."
  },
  {
    id: "today",
    title: "Activitatea mea — execuție sigură",
    shortTitle: "Azi",
    href: "/today",
    show: "Arată de ce contează acțiunea acum, termenul înregistrat și CTA-ul precis.",
    understanding: "Lista zilnică organizează execuția; nu este încă un tablou de indicatori.",
    buyerQuestion: "Cine decide zilnic ce trebuie urmărit prima dată?"
  },
  {
    id: "approvals",
    title: "Aprobări — control uman",
    shortTitle: "Aprobări",
    href: "/approvals",
    show: "Arată ce a fost pregătit, dovada și decizia pe care trebuie să o ia o persoană.",
    understanding: "Inteligența operațională pregătește contextul; aplicarea rămâne controlată.",
    buyerQuestion: "Ce acțiuni trebuie aprobate înainte să fie executate?",
    safetyNote: "Fără aprobare nu se aplică și nu se trimite nimic."
  },
  {
    id: "audit",
    title: "Audit — constatări comerciale",
    shortTitle: "Audit",
    href: "/reports/revenue-recovery-audit",
    show: "Prezintă blocajele, dovezile și valoarea estimată expusă, deduplicată pe oportunitate.",
    understanding: "Auditul oferă o bază prudentă pentru decizie, fără promisiuni financiare.",
    buyerQuestion: "Ați putea oferi 20–50 cazuri comerciale recente, inclusiv anonimizate?"
  },
  {
    id: "pilot",
    title: "Pilot Pack — validare controlată",
    shortTitle: "Pilot",
    href: "/reports/enterprise-pilot-pack",
    show: "Explică ce se validează în 14 zile, cine participă și ce înseamnă succesul.",
    understanding: "Pilotul testează claritatea operațională într-un cadru limitat și auditabil.",
    buyerQuestion: "Ce rezultat ar face un pilot valoros pentru voi?"
  },
  {
    id: "proof",
    title: "Proof-of-Value — măsurare credibilă",
    shortTitle: "Proof-of-Value",
    href: "/reports/pilot-proof-of-value",
    show: "Separă starea inițială, valorile estimate și rezultatele confirmate.",
    understanding: "Decizia continuă, ajustează sau oprește pilotul se bazează pe dovezi.",
    buyerQuestion: "Ce metrică ar fi credibilă: timp de reacție, cazuri clarificate sau venit confirmat?",
    safetyNote: "Nu se inventează ROI și nu se garantează recuperarea venitului."
  }
];

export function demoStepIndexForPath(pathname: string) {
  const exactIndex = buyerDemoSteps.findIndex((step) => step.href === pathname);
  if (exactIndex >= 0) return exactIndex;
  if (pathname.startsWith("/opportunities/")) return buyerDemoSteps.findIndex((step) => step.id === "opportunity");
  return 0;
}

export function buyerDemoHref(href: string) {
  return `${href}${href.includes("?") ? "&" : "?"}demo=buyer`;
}
