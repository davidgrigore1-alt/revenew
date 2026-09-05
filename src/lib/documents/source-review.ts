import { commercialImportFields, normalizeCommercialHeader, suggestedCommercialMapping, type CommercialImportFieldKey } from "@/lib/commercial-ingestion-fields";

export type SourceMapping = Partial<Record<CommercialImportFieldKey, number | null>>;

// Header aliases describe a proposal, never AI confidence or canonical record intent.
export function proposeSourceMapping(headers: string[]): SourceMapping {
  const proposal = suggestedCommercialMapping(headers);
  const counts = new Map<number, number>();
  for (const index of Object.values(proposal)) if (index !== null) counts.set(index, (counts.get(index) ?? 0) + 1);
  for (const key of Object.keys(proposal) as CommercialImportFieldKey[]) {
    const index = proposal[key];
    if (index !== null && counts.get(index) !== 1) proposal[key] = null;
  }
  return proposal;
}

export function sourceReviewGroups(headers: string[], mapping: SourceMapping, ignored: number[]) {
  const understood: number[] = [], review: number[] = [], omitted: number[] = [];
  headers.forEach((_, index) => {
    if (commercialImportFields.some(field => mapping[field.key] === index)) understood.push(index);
    else if (ignored.includes(index)) omitted.push(index);
    else review.push(index);
  });
  return { understood, review, ignored: omitted };
}

export function describeDataset(headers: string[]) {
  const names = new Set(headers.map(normalizeCommercialHeader));
  const has = (...aliases: string[]) => aliases.some(alias => names.has(alias));
  const company = has("company", "company name", "companie", "firma");
  const contact = has("contact", "contact name", "nume contact", "full name");
  const signal = has("titlu", "title", "subject", "subiect", "request summary");
  const opportunity = has("opportunity", "opportunity title", "oportunitate");
  if (opportunity) return { label: "Date despre oportunități", detail: "Antetul conține o referință explicită la oportunități. Destinația nu este aleasă automat." };
  if (signal) return { label: "Posibile semnale comerciale", detail: "Antetul conține un titlu sau un subiect. Verifică dacă fiecare rând descrie o situație comercială." };
  if (contact && has("email", "e mail", "phone", "telefon")) return { label: "Posibilă listă de contacte", detail: "Propunere bazată pe antetele de contact și comunicare, nu pe o interpretare AI." };
  if (company && has("website", "site", "industry", "industrie", "cui", "city", "oras")) return { label: "Posibilă listă de companii", detail: "Propunere bazată pe antetele de companie și profil. Nu creează companii în registru." };
  return { label: "Destinație neclară sau date mixte", detail: "Antetele nu identifică suficient de clar un tip de listă. Alege explicit scopul înainte de import." };
}

export const localSourceContract = { retained: false, intelligenceAvailable: false, mappingRequiredForPreview: false, excelSupported: false } as const;
