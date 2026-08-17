export type BuyerDemoStep = {
  id: string;
  title: string;
  shortTitle: string;
  href: string;
  show: string;
  understanding: string;
  notice: string;
  buyerQuestion: string;
  safetyNote?: string;
};

export const buyerDemoSteps: BuyerDemoStep[] = [
  {
    id: "dashboard",
    title: "Control Center — prioritatea dimineții",
    shortTitle: "Control Center",
    href: "/dashboard",
    show: "Brief-ul executiv pentru proiectul Vector Industrial.",
    understanding: "Managementul vede ce contează acum și de ce, fără căutare manuală.",
    notice: "Termen depășit, responsabil neconfirmat și 76.000 RON valoare estimată, nu venit confirmat.",
    buyerQuestion: "Cum decideți astăzi ce caz trebuie verificat primul?",
    safetyNote: "Estimările rămân separate de venitul confirmat."
  },
  {
    id: "opportunity",
    title: "Oportunitate — povestea comercială verificabilă",
    shortTitle: "Oportunitate",
    href: "/opportunities/de300006-0000-4000-8000-000000000006",
    show: "Istoricul proiectului Vector, de la cerință și ofertă la clarificare și termen depășit.",
    understanding: "Brief-ul poate fi verificat în faptele, documentele și acțiunile obiectului comercial.",
    notice: "Faptele înregistrate sunt separate de interpretările ReveNew și fiecare dovadă rămâne accesibilă.",
    buyerQuestion: "Ce lipsește cel mai des: responsabilul, termenul sau următorul pas?",
    safetyNote: "Valoarea estimată nu este venit confirmat."
  },
  {
    id: "company",
    title: "Company 360 — memoria relației",
    shortTitle: "Company 360",
    href: "/crm/organizations/de100001-0000-4000-8000-000000000001",
    show: "Relația Meridian Logistics, cu două inițiative, două contacte, documente și activitate recentă.",
    understanding: "ReveNew reconstruiește contextul companiei fără a transforma pagina într-un flux generic de activitate.",
    notice: "Buclele deschise, contactul principal și dovezile recente conduc la următorul pas sigur.",
    buyerQuestion: "Cât timp pierde echipa reconstruind istoricul unei relații înainte de o decizie?"
  },
  {
    id: "intelligence",
    title: "Ask ReveNew și Descoperiri — ce ai putea rata",
    shortTitle: "Inteligență",
    href: "/ai",
    show: "Caută 76.000 și deschide cererea Atlas Fleet de 20.000 EUR identificată din sursă.",
    understanding: "Aceeași bază de date susține căutarea, prioritizarea și descoperirea proactivă.",
    notice: "Atlas este un semnal neasociat: ReveNew cere comparație și revizuire, nu creează automat o oportunitate.",
    buyerQuestion: "Ce cereri comerciale rămân astăzi în afara procesului urmărit?",
    safetyNote: "Nu există execuție externă automată."
  },
  {
    id: "inbox",
    title: "Inbox Comercial — semnal transformat în decizie",
    shortTitle: "Inbox",
    href: "/inbox?signal=de800001-0000-4000-8000-000000000001",
    show: "Sursa Atlas, valoarea explicită, informațiile lipsă și posibila potrivire existentă.",
    understanding: "Semnalul este calificat pe baza dovezii înainte de asociere sau creare.",
    notice: "Acțiunea sigură este revizuirea umană; mesajul nu este trimis și obiectul comercial nu este creat automat.",
    buyerQuestion: "Cine verifică astăzi dacă o cerere nouă dublează un proiect existent?",
    safetyNote: "Niciun mesaj nu este trimis automat."
  },
  {
    id: "approvals",
    title: "Aprobări — control uman",
    shortTitle: "Aprobări",
    href: "/approvals",
    show: "Recomandarea asociată proiectului Vector și informațiile care trebuie confirmate.",
    understanding: "Inteligența operațională pregătește contextul; aplicarea rămâne controlată.",
    notice: "Fără aprobarea persoanei autorizate nu se aplică și nu se trimite nimic.",
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
    notice: "Pipeline-ul estimat, valoarea expusă și venitul confirmat sunt concepte separate și au monede separate.",
    buyerQuestion: "Ați putea oferi 20–50 cazuri comerciale recente, inclusiv anonimizate?"
  },
  {
    id: "pilot",
    title: "Pilot și Proof-of-Value — validare controlată",
    shortTitle: "Pilot și dovadă",
    href: "/reports/enterprise-pilot-pack",
    show: "Cadrul de 14 zile și legătura către dovada valorii pentru decizia continuă, ajustează sau oprește.",
    understanding: "Pilotul testează claritatea operațională într-un cadru limitat, auditabil și măsurabil.",
    notice: "Starea inițială nu este prezentată ca rezultat istoric, iar venitul recuperat nu este garantat.",
    buyerQuestion: "Ce metrică ar fi credibilă: timp de reacție, cazuri clarificate sau venit confirmat?",
    safetyNote: "Nu se inventează ROI și nu se garantează recuperarea venitului."
  }
];

export function demoStepIndexForPath(pathname: string) {
  const exactIndex = buyerDemoSteps.findIndex((step) => step.href.split("?")[0] === pathname);
  if (exactIndex >= 0) return exactIndex;
  if (pathname.startsWith("/opportunities/")) return buyerDemoSteps.findIndex((step) => step.id === "opportunity");
  if (pathname.startsWith("/crm/organizations/")) return buyerDemoSteps.findIndex((step) => step.id === "company");
  return 0;
}

export function buyerDemoHref(href: string) {
  return `${href}${href.includes("?") ? "&" : "?"}demo=buyer`;
}

export const BUYER_DEMO_STORAGE_KEY = "revenew-demo-mode";
export const BUYER_DEMO_STARTED_EVENT = "revenew:buyer-demo-started";
