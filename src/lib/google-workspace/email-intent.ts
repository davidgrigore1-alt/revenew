export type EmailDirectionFilter = "inbound" | "outbound";
export type EmailRelevanceFilter = "linked" | "unlinked";

export type EmailQueryIntent = {
  limit: number;
  sender: string | null;
  direction: EmailDirectionFilter | null;
  from: string | null;
  to: string | null;
  relevance: EmailRelevanceFilter | null;
};

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const numberWords: Record<string, number> = {
  unu: 1, una: 1, doua: 2, trei: 3, patru: 4, cinci: 5, sase: 6, sapte: 7, opt: 8
};

function requestedLimit(value: string) {
  const digit = value.match(/\b([1-8])\b/)?.[1];
  if (digit) return Number(digit);
  for (const [word, count] of Object.entries(numberWords)) if (new RegExp("\\b" + word + "\\b").test(value)) return count;
  return 5;
}

function senderTerm(question: string, value: string) {
  const email = question.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (email) return email.toLowerCase();
  const match = value.match(/(?:\bde la\b|\bfrom\b)\s+([a-z0-9][a-z0-9 ._@+-]{0,70}?)(?=\s+(?:din|in|pe|care|cu|si|și|ultim|recent|azi|astazi|ieri|saptamana|luna)\b|[?.!,]|$)/);
  return match?.[1]?.trim().replace(/\s+/g, " ") || null;
}

export function parseEmailQueryIntent(question: string, now = new Date()): EmailQueryIntent {
  const value = normalized(question);
  const direction = /\b(?:trimise|trimis|sent|outbound)\b/.test(value) ? "outbound"
    : /\b(?:primite|primit|received|inbound|mi-a scris)\b/.test(value) ? "inbound" : null;
  const relevance = /\b(?:fara context crm|nelegate|nelegat)\b/.test(value) ? "unlinked"
    : /\b(?:relevante|important|urgent|context crm|oportunitat)\b/.test(value) ? "linked" : null;
  let from: string | null = null;
  let to: string | null = null;
  const start = new Date(now);
  if (/\b(?:azi|astazi|today)\b/.test(value)) {
    start.setHours(0, 0, 0, 0); from = start.toISOString();
  } else if (/\b(?:ieri|yesterday)\b/.test(value)) {
    start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0); from = start.toISOString();
    const end = new Date(start); end.setDate(end.getDate() + 1); to = end.toISOString();
  } else if (/\b(?:saptamana aceasta|this week)\b/.test(value)) {
    const day = (start.getDay() + 6) % 7; start.setDate(start.getDate() - day); start.setHours(0, 0, 0, 0); from = start.toISOString();
  } else if (/\b(?:ultimele 30 de zile|last 30 days|luna aceasta)\b/.test(value)) {
    start.setDate(start.getDate() - 30); from = start.toISOString();
  }
  return { limit: requestedLimit(value), sender: senderTerm(question, value), direction, from, to, relevance };
}

export function normalizedIdentity(value: string | null | undefined) {
  return normalized(value ?? "").replace(/[^a-z0-9@.-]+/g, " ").trim().replace(/\s+/g, " ");
}

export function senderMatchesExact(senderEmail: string | null, senderName: string | null, requested: string) {
  const term = normalizedIdentity(requested);
  const email = normalizedIdentity(senderEmail);
  const name = normalizedIdentity(senderName);
  if (!term) return true;
  if (term.includes("@")) return email === term;
  if (name === term) return true;
  const domain = email.split("@")[1] ?? "";
  if (domain === term || domain === term + ".com" || domain === term + ".ro") return true;
  return domain.split(".").some((label) => label === term);
}
