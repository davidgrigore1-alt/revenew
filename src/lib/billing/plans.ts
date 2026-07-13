export const previewPlans = [
  {
    id: "audit",
    title: "Revenue Recovery Audit",
    price: "490 EUR",
    billing: "plată unică",
    description: "Audit de 7 zile pentru identificarea oportunităților comerciale care merită reluate.",
    cta: "Continuă cu Audit"
  },
  {
    id: "managed",
    title: "ReveNew Managed",
    price: "690 EUR",
    billing: "pe lună",
    description: "Proces recurent de verificare, prioritizare, follow-up și raportare comercială.",
    cta: "Continuă cu ReveNew Managed"
  }
] as const;

export type PreviewPlanId = (typeof previewPlans)[number]["id"];

const previewPlanIds = new Set<string>(previewPlans.map((plan) => plan.id));

export function isPreviewPlanId(value: unknown): value is PreviewPlanId {
  return typeof value === "string" && previewPlanIds.has(value);
}

export function getPreviewPlanById(value: string | null | undefined) {
  return previewPlans.find((plan) => plan.id === value) ?? null;
}

export const commercialPricingPlans = [
  {
    label: "PUNCT DE PORNIRE",
    title: "Revenue Recovery Audit",
    price: "490 EUR",
    billing: "plată unică",
    description: "Evaluare structurată inițială a oportunităților comerciale blocate. Nu garantează venit recuperat.",
    items: [
      "analiza semnalelor comerciale disponibile",
      "identificarea cererilor fără răspuns",
      "identificarea ofertelor fără follow-up",
      "prioritizarea oportunităților",
      "estimarea valorii comerciale",
      "pregătirea mesajelor și scripturilor",
      "raport executiv",
      "recomandarea următorilor pași"
    ],
    cta: "Solicită auditul"
  },
  {
    label: "OPERARE CONTINUĂ",
    title: "ReveNew Managed",
    price: "690 EUR",
    billing: "pe lună",
    description: "Proces recurent pentru firme care vor verificare, prioritizare și urmărire comercială continuă.",
    items: [
      "tot ce conține auditul inițial",
      "revizuirea recurentă a semnalelor",
      "prioritizare periodică",
      "follow-up-uri pregătite",
      "actualizarea statusurilor și rezultatelor",
      "raport lunar",
      "suport operațional",
      "ajustarea procesului pe baza rezultatelor"
    ],
    cta: "Programează o discuție"
  },
  {
    label: "LA CERERE",
    title: "Custom Implementation",
    price: "Preț personalizat",
    billing: "în funcție de volum și complexitate",
    description: "Ofertă separată pentru integrări aprobate, migrare, fluxuri, instruire și cerințe enterprise.",
    items: [
      "analiză de proces",
      "configurarea fluxurilor necesare",
      "importuri sau integrări aprobate",
      "reguli de prioritizare",
      "raportare pentru echipă",
      "plan de implementare",
      "suport adaptat proiectului"
    ],
    cta: "Discută opțiunile"
  }
] as const;
