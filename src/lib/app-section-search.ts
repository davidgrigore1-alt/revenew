export type AppSectionSearchResult = {
  id: string;
  group: "Secțiuni";
  title: string;
  context: string;
  href: string;
  aliases: string[];
  keywords: string[];
};

export function normalizeSectionQuery(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ro-RO")
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const appSectionIndex: AppSectionSearchResult[] = [
  { id: "companies", group: "Secțiuni", title: "Companii", context: "Secțiune · Relații comerciale", href: "/companies", aliases: ["companii", "firme", "societăți", "clienți"], keywords: ["companie", "firmă", "societate", "client", "organizații"] },
  { id: "contacts", group: "Secțiuni", title: "Contacte", context: "Secțiune · Persoane și decidenți", href: "/contacts", aliases: ["contacte", "persoane", "decidenți", "clienți"], keywords: ["contact", "persoană", "decident", "client"] },
  { id: "opportunities", group: "Secțiuni", title: "Oportunități", context: "Secțiune · Execuție comercială", href: "/opportunities", aliases: ["oportunități", "oportunitate", "oferte", "cazuri"], keywords: ["ofertă", "caz", "pipeline"] },
  { id: "intelligence", group: "Secțiuni", title: "Inteligență operațională", context: "Secțiune · Recomandări și dovezi", href: "/ai", aliases: ["inteligență", "recomandări", "dovezi", "analiză"], keywords: ["recomandare", "dovadă", "ai", "risc"] },
  { id: "audit", group: "Secțiuni", title: "Audit de recuperare venituri", context: "Raport · Audit controlat", href: "/reports/revenue-recovery-audit", aliases: ["audit", "audit venituri", "audit controlat", "începe audit", "revenue recovery audit"], keywords: ["raport", "recuperare", "dovezi", "date anonimizate"] },
  { id: "pilot", group: "Secțiuni", title: "Propunere pilot ReveNew", context: "Raport · Pilot controlat", href: "/reports/enterprise-pilot-pack", aliases: ["pilot", "pilot pack", "propunere pilot"], keywords: ["14 zile", "validare", "criterii"] },
  { id: "proof", group: "Secțiuni", title: "Dovadă de valoare pilot", context: "Raport · Decizie continuă, ajustează sau oprește", href: "/reports/pilot-proof-of-value", aliases: ["dovadă de valoare", "proof of value", "rezultat pilot"], keywords: ["pilot", "validare", "rezultat"] },
  { id: "feedback", group: "Secțiuni", title: "Concluzii după demo", context: "Secțiune · Feedback și următorul pas", href: "/demo/feedback", aliases: ["feedback", "feedback demo", "concluzii demo"], keywords: ["fit", "obiecții", "următor pas"] },
  { id: "demo", group: "Secțiuni", title: "Demo controlat", context: "Secțiune · Traseu de prezentare", href: "/demo", aliases: ["demo", "demonstrație", "prezentare"], keywords: ["traseu", "controlat", "prezentare"] },
  { id: "settings-appearance", group: "Secțiuni", title: "Aspect și culoare accent", context: "Setări · Personalizare vizuală", href: "/settings#aspect", aliases: ["culoare", "temă", "tema", "accent", "personalizare", "aspect"], keywords: ["preset", "champagne gold", "executive blue", "emerald", "copper", "burgundy", "violet", "graphite"] },
  { id: "settings-identity", group: "Secțiuni", title: "Identitate spațiu de lucru", context: "Setări · Afișare locală", href: "/settings#identitate", aliases: ["branding", "identitate", "logo", "inițiale", "moneda", "monedă", "valută", "limbă", "workspace name", "nume firmă"], keywords: ["industrie", "ron", "eur", "nume afișat", "preferință"] },
  { id: "settings", group: "Secțiuni", title: "Setări", context: "Secțiune · Configurare disponibilă", href: "/settings", aliases: ["setări", "configurare", "preferințe"], keywords: ["cont", "companie", "acces"] },
  { id: "help", group: "Secțiuni", title: "Ajutor", context: "Secțiune · Orientare în produs", href: "/help", aliases: ["ajutor", "ghid", "orientare"], keywords: ["cum funcționează", "suport", "asistent"] },
  { id: "inbox", group: "Secțiuni", title: "Inbox Comercial", context: "Secțiune · Semnale de verificat", href: "/inbox", aliases: ["inbox", "semnale", "mesaje comerciale"], keywords: ["semnal", "cerere", "revizuire"] },
  { id: "reports", group: "Secțiuni", title: "Rapoarte", context: "Secțiune · Indicatori și livrabile", href: "/reports", aliases: ["rapoarte", "raportare", "indicatori"], keywords: ["management", "pipeline", "venit"] },
  { id: "today", group: "Secțiuni", title: "Activitatea mea", context: "Secțiune · Acțiuni și termene", href: "/today", aliases: ["activitate", "activitatea mea", "astăzi", "sarcini"], keywords: ["acțiune", "termen", "amânare"] },
  { id: "approvals", group: "Secțiuni", title: "Aprobări", context: "Secțiune · Decizii umane", href: "/approvals", aliases: ["aprobări", "aprobare", "decizii"], keywords: ["uman", "confirmare", "revizuire"] },
  { id: "recoverable", group: "Secțiuni", title: "Recuperare venituri", context: "Secțiune · Bucle comerciale deschise", href: "/recoverable", aliases: ["recuperare", "venituri recuperabile", "coada de recuperare"], keywords: ["restant", "blocat", "risc"] },
  { id: "dashboard", group: "Secțiuni", title: "Control Center", context: "Secțiune · Deciziile de astăzi", href: "/dashboard", aliases: ["dashboard", "control center", "acasă"], keywords: ["priorități", "decizie critică", "rezumat"] }
];

function scoreSection(entry: AppSectionSearchResult, query: string) {
  const normalizedTitle = normalizeSectionQuery(entry.title);
  const aliases = entry.aliases.map(normalizeSectionQuery);
  const keywords = entry.keywords.map(normalizeSectionQuery);
  const words = query.split(" ").filter(Boolean);
  let score = 0;

  if (normalizedTitle === query) score += 110;
  if (aliases.includes(query)) score += 100;
  if (normalizedTitle.startsWith(query)) score += 45;
  for (const alias of aliases) {
    if (alias.startsWith(query) || query.startsWith(alias)) score += 38;
    else if (` ${alias} `.includes(` ${query} `)) score += 28;
  }
  for (const term of [normalizedTitle, ...aliases, ...keywords]) {
    const termWords = term.split(" ");
    for (const word of words) {
      if (word.length >= 3 && termWords.some((candidate) => candidate === word || candidate.startsWith(word) || word.startsWith(candidate))) score += 8;
    }
  }
  return score;
}

export function searchAppSections(rawQuery: string, limit = 6) {
  const query = normalizeSectionQuery(rawQuery);
  if (query.length < 2) return [];

  return appSectionIndex
    .map((entry, index) => ({ entry, index, score: scoreSection(entry, query) }))
    .filter(({ score }) => score >= 8)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, limit)
    .map(({ entry }) => entry);
}
