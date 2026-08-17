import { assessOpportunityAttention } from "@/lib/opportunity-attention";
import { isOpenOpportunity } from "@/lib/opportunity-domain";
import type { Opportunity } from "@/lib/types";
import { getDomainStatePresentation } from "@/lib/ui/domain-state-presentation";

export type CommercialSearchIntentKind =
  | "entity_search"
  | "company_context"
  | "active_opportunities"
  | "missing_owner"
  | "missing_next_action"
  | "overdue_next_action"
  | "inactivity"
  | "amount"
  | "attention";

export type CommercialSearchEntityType = "company" | "contact" | "opportunity" | "action" | "document";

export type CommercialSearchIntent = {
  rawQuery: string;
  normalizedQuery: string;
  kind: CommercialSearchIntentKind;
  entityTypes: CommercialSearchEntityType[];
  entityQuery?: string;
  inactivityDays?: number;
  amount?: { operator: "exact" | "gte"; value: number; currency?: string };
};

export type CommercialSearchEvidence = {
  label: string;
  source: "companie" | "contact" | "oportunitate" | "acțiune" | "document" | "activitate";
  timestamp?: string;
};

export type CommercialSearchRecord = {
  id: string;
  entityType: CommercialSearchEntityType;
  title: string;
  context: string;
  href: string;
  searchableText: string;
  status?: string;
  amount?: number;
  currency?: string;
  companyName?: string;
  relatedCompanyId?: string;
  updatedAt?: string;
  evidence?: CommercialSearchEvidence[];
};

export type CommercialSearchResult = {
  id: string;
  entityType: CommercialSearchEntityType;
  group: "Companii" | "Contacte" | "Oportunități" | "Activități" | "Documente";
  title: string;
  context: string;
  href: string;
  reason: string;
  status?: string;
  amount?: number;
  currency?: string;
  companyName?: string;
  evidence: CommercialSearchEvidence[];
  missingInformation: string[];
};

export type CommercialSearchResponse = {
  ok: boolean;
  intent: CommercialSearchIntent;
  summary: string;
  results: CommercialSearchResult[];
  total: number;
  insufficientData: boolean;
  suggestions: string[];
  error?: string;
};

export const suggestedCommercialQueries = [
  "Oportunități fără următor pas",
  "Follow-up-uri restante",
  "Oportunități fără responsabil",
  "Ce necesită atenție?"
] as const;

const groupForEntity: Record<CommercialSearchEntityType, CommercialSearchResult["group"]> = {
  company: "Companii",
  contact: "Contacte",
  opportunity: "Oportunități",
  action: "Activități",
  document: "Documente"
};

const dateFormatter = new Intl.DateTimeFormat("ro-RO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Bucharest"
});

const moneyFormatter = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 2 });

export function normalizeCommercialQuery(value: string) {
  return value
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ro-RO")
    .replace(/[^a-z0-9\s.,/@+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAmountValue(value: string) {
  const compact = value.replace(/\s/g, "");
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(compact)) return Number(compact.replace(/[.,]/g, ""));
  const normalized = compact.includes(",") && !compact.includes(".") ? compact.replace(",", ".") : compact.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function looksLikeCalendarDate(value: string) {
  return /^(?:\d{1,2}[./-]){2}\d{2,4}$/.test(value) || /^\d{4}-\d{1,2}-\d{1,2}$/.test(value);
}

function amountCandidateFor(query: string) {
  const amountLanguage = /\b(valoare|oferta|oferte|oportunitate|oportunitati|proiect|proiecte|peste|minim|cel putin|mai (?:mare|mari)|ron|eur|usd)\b/.test(query);
  const bareAmount = /^(?:\d{4,8}|\d{1,3}(?:[.]\d{3})+|\d{1,3}(?:\s\d{3})+)(?:\s+(?:ron|eur|usd))?$/.test(query);
  if (!amountLanguage && !bareAmount) return null;
  if (/\b(?:zile?|saptamani?|luni?|ani?|telefon|tel|id|cod)\b/.test(query)) return null;

  const match = query.match(/\b\d[\d\s.,]*\b/);
  if (!match) return null;
  const token = match[0].trim();
  const digits = token.replace(/\D/g, "");
  if (looksLikeCalendarDate(token) || digits.length >= 9) return null;
  const value = parseAmountValue(token);
  if (!value || value < 1_000) return null;
  if (!amountLanguage && /^\d{4}$/.test(token) && value >= 1_900 && value <= 2_100) return null;
  return value;
}

function entityTypesFor(query: string): CommercialSearchEntityType[] {
  const types: CommercialSearchEntityType[] = [];
  if (/\b(companie|companii|firma|firme|client|clienti|organizatie|organizatii)\b/.test(query)) types.push("company");
  if (/\b(contact|contacte|persoana|persoane|decident|decidenti)\b/.test(query)) types.push("contact");
  if (/\b(oportunitate|oportunitati|oferta|oferte|proiect|proiecte|deal|dealuri)\b/.test(query)) types.push("opportunity");
  if (/\b(follow-up|follow up|actiune|actiuni|activitate|activitati|pas|raspuns)\b/.test(query)) types.push("action");
  if (/\b(document|documente|draft|oferta pregatita)\b/.test(query)) types.push("document");
  return types.length > 0 ? Array.from(new Set(types)) : ["company", "contact", "opportunity", "action", "document"];
}

function companyQueryFor(query: string) {
  return query
    .replace(/^ce\s+(?:stim|stii)\s+(?:noi\s+)?despre\s+/, "")
    .replace(/^arata-mi\s+(?:firma|compania|clientul)\s+/, "")
    .replace(/^(?:firma|compania|clientul)\s+/, "")
    .trim();
}

export function parseCommercialSearchIntent(rawValue: string): CommercialSearchIntent {
  const rawQuery = rawValue.normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, 160);
  const normalizedQuery = normalizeCommercialQuery(rawQuery);
  const entityTypes = entityTypesFor(normalizedQuery);
  const companyContext = /^ce\s+(?:stim|stii)\s+(?:noi\s+)?despre\b/.test(normalizedQuery);
  const inactivityMatch = /(?:fara|nu (?:au|a fost))\s+(?:activitate|contact|raspuns|sa fie atins\w*|sa fie contactat\w*)[^0-9]{0,24}(\d{1,3})\s*(?:de\s*)?zile?/.exec(normalizedQuery)
    ?? /^(\d{1,3})\s*(?:de\s*)?zile?$/.exec(normalizedQuery);
  const amountValue = amountCandidateFor(normalizedQuery);
  const currency = normalizedQuery.match(/\b(RON|EUR|USD)\b/i)?.[1]?.toUpperCase();

  let kind: CommercialSearchIntentKind = "entity_search";
  if (companyContext) kind = "company_context";
  else if (/\b(?:fara responsabil|fara owner|neasignat\w*|neatribuit\w*)\b/.test(normalizedQuery)) kind = "missing_owner";
  else if (/\bfara\s+(?:(?:un|o)\s+)?(?:(?:urmatorul|urmatoarea|urmator)\s+)?(?:pas|actiune)(?:\s+urmatoare)?\b/.test(normalizedQuery)) kind = "missing_next_action";
  else if (/\b(restant\w*|intarziat\w*)\b/.test(normalizedQuery) && /\b(follow-up|follow up|actiune|actiuni|pas|termene?)\b/.test(normalizedQuery)) kind = "overdue_next_action";
  else if (inactivityMatch) kind = "inactivity";
  else if (amountValue) kind = "amount";
  else if (/\b(oportunitate|oportunitati|oferta|oferte|proiect|proiecte)\b/.test(normalizedQuery) && /\b(active|deschise|in lucru)\b/.test(normalizedQuery)) kind = "active_opportunities";
  else if (/\b(blocat\w*|risc|critic\w*|atentie|prioritar\w*)\b/.test(normalizedQuery)) kind = "attention";

  return {
    rawQuery,
    normalizedQuery,
    kind,
    entityTypes,
    ...(kind === "entity_search" || kind === "company_context" ? { entityQuery: kind === "company_context" ? companyQueryFor(normalizedQuery) : normalizedQuery } : {}),
    ...(kind === "inactivity" ? { inactivityDays: Math.min(Math.max(Number(inactivityMatch?.[1] ?? 14), 1), 365) } : {}),
    ...(kind === "amount" && amountValue ? { amount: { operator: /\b(peste|minim|cel putin|mai (?:mare|mari))\b/.test(normalizedQuery) ? "gte" : "exact", value: amountValue, ...(currency ? { currency } : {}) } } : {})
  };
}

function validDate(value?: string | null) {
  return value && !Number.isNaN(Date.parse(value)) ? value : null;
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value)).replace("sept.", "sept");
}

function formatAmount(value: number, currency: string) {
  return `${moneyFormatter.format(value)} ${currency}`;
}

function opportunityCompany(opportunity: Opportunity) {
  const primary = opportunity.contacts?.find((item) => item.isPrimary) ?? opportunity.contacts?.[0];
  return primary?.contact.organization?.name ?? opportunity.contact?.company ?? undefined;
}

function missingInformation(opportunity: Opportunity, hasNextAction: boolean) {
  const missing: string[] = [];
  if (!opportunity.ownerProfileId) missing.push("Responsabil neconfirmat");
  if (!hasNextAction) missing.push("Următor pas neconfirmat");
  if (!opportunity.contacts?.some((item) => item.isPrimary)) missing.push("Contact principal neconfirmat");
  if (!opportunity.deadline) missing.push("Termen comercial neconfirmat");
  return missing;
}

function resultForOpportunity(
  opportunity: Opportunity,
  reason: string,
  evidence: CommercialSearchEvidence[],
  hasNextAction: boolean
): CommercialSearchResult {
  const currency = opportunity.currency ?? "RON";
  const amount = Number(opportunity.estimatedValueHigh ?? 0);
  const companyName = opportunityCompany(opportunity);
  const amountContext = amount > 0 ? `${formatAmount(amount, currency)} · valoare estimată, neconfirmată` : "Valoare neconfirmată";
  return {
    id: opportunity.id,
    entityType: "opportunity",
    group: "Oportunități",
    title: opportunity.title,
    context: [companyName, `Etapă: ${getDomainStatePresentation("opportunityStatus", opportunity.status).label}`, amountContext].filter(Boolean).join(" · "),
    href: `/opportunities/${opportunity.id}`,
    reason,
    status: opportunity.status,
    ...(amount > 0 ? { amount, currency } : {}),
    ...(companyName ? { companyName } : {}),
    evidence,
    missingInformation: missingInformation(opportunity, hasNextAction)
  };
}

function evidenceForActivity(value: string): CommercialSearchEvidence {
  return { label: `Ultima activitate comercială înregistrată: ${formatDate(value)}`, source: "activitate", timestamp: value };
}

function recordResults(intent: CommercialSearchIntent, records: CommercialSearchRecord[], limit: number): CommercialSearchResult[] {
  const query = intent.entityQuery ?? intent.normalizedQuery;
  const words = query.split(" ").filter((word) => word.length >= 2);
  const matchedCompanyIds = new Set(
    records
      .filter((record) => record.entityType === "company" && normalizeCommercialQuery(`${record.title} ${record.searchableText}`).includes(query))
      .map((record) => record.relatedCompanyId ?? record.id)
  );
  const ranked = records
    .filter((record) => intent.entityTypes.includes(record.entityType) || intent.kind === "company_context")
    .map((record, index) => {
      const searchable = normalizeCommercialQuery(`${record.title} ${record.searchableText} ${record.companyName ?? ""}`);
      const exact = normalizeCommercialQuery(record.title) === query ? 100 : 0;
      const phrase = searchable.includes(query) ? 60 : 0;
      const wordScore = words.filter((word) => searchable.includes(word)).length * 8;
      const relatedCompany = intent.kind === "company_context" && record.relatedCompanyId && matchedCompanyIds.has(record.relatedCompanyId) ? 50 : 0;
      return { record, index, score: exact + phrase + wordScore + relatedCompany };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || String(right.record.updatedAt ?? "").localeCompare(String(left.record.updatedAt ?? "")) || left.index - right.index)
    .slice(0, limit)
    .map(({ record }) => {
      const related = intent.kind === "company_context";
      const missing: string[] = [];
      if (related && record.entityType === "company") {
        const companyId = record.relatedCompanyId ?? record.id;
        if (!records.some((item) => item.entityType === "contact" && item.relatedCompanyId === companyId)) missing.push("Nu există contact asociat în datele disponibile");
        if (!records.some((item) => item.entityType === "opportunity" && item.relatedCompanyId === companyId)) missing.push("Nu există oportunitate asociată în datele disponibile");
      }
      return {
        id: record.id,
        entityType: record.entityType,
        group: groupForEntity[record.entityType],
        title: record.title,
        context: record.context,
        href: record.href,
        reason: related ? "Informația este asociată companiei căutate." : "Denumirea sau contextul înregistrat corespunde căutării.",
        ...(record.status ? { status: record.status } : {}),
        ...(record.amount && record.currency ? { amount: record.amount, currency: record.currency } : {}),
        ...(record.companyName ? { companyName: record.companyName } : {}),
        evidence: record.evidence ?? [{ label: record.context, source: record.entityType === "company" ? "companie" : record.entityType === "contact" ? "contact" : record.entityType === "opportunity" ? "oportunitate" : record.entityType === "action" ? "acțiune" : "document", ...(record.updatedAt ? { timestamp: record.updatedAt } : {}) }],
        missingInformation: missing
      } satisfies CommercialSearchResult;
    });
  return ranked;
}

function responseSummary(kind: CommercialSearchIntentKind, count: number, query: string) {
  if (count === 0) return "Nu am suficiente date pentru a răspunde sigur. Încearcă numele companiei sau verifică oportunitățile disponibile.";
  const label: Record<CommercialSearchIntentKind, string> = {
    entity_search: `${count} rezultate accesibile corespund căutării „${query}”.`,
    company_context: `${count} informații comerciale sunt disponibile pentru compania căutată.`,
    active_opportunities: count === 1 ? "1 oportunitate activă este disponibilă în spațiul de lucru." : `${count} oportunități active sunt disponibile în spațiul de lucru.`,
    missing_owner: count === 1 ? "1 oportunitate nu are un responsabil confirmat." : `${count} oportunități nu au un responsabil confirmat.`,
    missing_next_action: count === 1 ? "1 oportunitate nu are un următor pas confirmat." : `${count} oportunități nu au un următor pas confirmat.`,
    overdue_next_action: count === 1 ? "1 oportunitate are un follow-up restant." : `${count} oportunități au un follow-up restant.`,
    inactivity: count === 1 ? "1 oportunitate nu are activitate comercială recentă înregistrată." : `${count} oportunități nu au activitate comercială recentă înregistrată.`,
    amount: count === 1 ? "1 oportunitate corespunde valorii estimate căutate." : `${count} oportunități corespund valorii estimate căutate.`,
    attention: count === 1 ? "1 oportunitate necesită verificare pe baza regulilor operaționale existente." : `${count} oportunități necesită verificare pe baza regulilor operaționale existente.`
  };
  return label[kind];
}

export function executeCommercialSearch(
  intent: CommercialSearchIntent,
  input: { opportunities?: Opportunity[]; records?: CommercialSearchRecord[] },
  options: { now?: Date; limit?: number } = {}
): CommercialSearchResponse {
  const now = options.now ?? new Date();
  const limit = Math.max(1, Math.min(options.limit ?? 20, 20));
  if (intent.kind === "entity_search" || intent.kind === "company_context") {
    const results = recordResults(intent, input.records ?? [], limit);
    return {
      ok: true,
      intent,
      summary: responseSummary(intent.kind, results.length, intent.entityQuery ?? intent.rawQuery),
      results,
      total: results.length,
      insufficientData: results.length === 0,
      suggestions: [...suggestedCommercialQueries]
    };
  }

  const candidates = (input.opportunities ?? [])
    .filter(isOpenOpportunity)
    .map((opportunity) => ({ opportunity, assessment: assessOpportunityAttention(opportunity, { now, staleAfterDays: intent.inactivityDays }) }));
  let unknownActivityCount = 0;
  const matched = candidates.filter(({ opportunity, assessment }) => {
    if (intent.kind === "active_opportunities") return true;
    if (intent.kind === "missing_owner") return !opportunity.ownerProfileId;
    if (intent.kind === "missing_next_action") return !assessment.primaryNextAction;
    if (intent.kind === "overdue_next_action") return Boolean(assessment.primaryNextAction?.dueDate && Date.parse(assessment.primaryNextAction.dueDate) < now.getTime());
    if (intent.kind === "inactivity") {
      if (!assessment.lastMeaningfulActivityAt) { unknownActivityCount += 1; return false; }
      return now.getTime() - Date.parse(assessment.lastMeaningfulActivityAt) >= (intent.inactivityDays ?? 14) * 86_400_000;
    }
    if (intent.kind === "amount" && intent.amount) {
      const value = Number(opportunity.estimatedValueHigh ?? 0);
      const currencyMatches = !intent.amount.currency || (opportunity.currency ?? "RON") === intent.amount.currency;
      return currencyMatches && (intent.amount.operator === "gte" ? value >= intent.amount.value : value === intent.amount.value);
    }
    if (intent.kind === "attention") return assessment.state === "at_risk" || assessment.state === "needs_attention" || assessment.state === "blocked";
    return false;
  });

  matched.sort((left, right) => {
    const leftDue = left.assessment.primaryNextAction?.dueDate ?? "9999";
    const rightDue = right.assessment.primaryNextAction?.dueDate ?? "9999";
    if (intent.kind === "overdue_next_action" && leftDue !== rightDue) return leftDue.localeCompare(rightDue);
    return Number(right.opportunity.estimatedValueHigh ?? 0) - Number(left.opportunity.estimatedValueHigh ?? 0)
      || String(right.opportunity.updatedAt ?? "").localeCompare(String(left.opportunity.updatedAt ?? ""));
  });

  const results = matched.slice(0, limit).map(({ opportunity, assessment }) => {
    const nextAction = assessment.primaryNextAction;
    if (intent.kind === "missing_owner") {
      return resultForOpportunity(opportunity, "Nu există un responsabil confirmat pentru oportunitate.", [{ label: "Responsabil: neconfirmat", source: "oportunitate", ...(opportunity.updatedAt ? { timestamp: opportunity.updatedAt } : {}) }], Boolean(nextAction));
    }
    if (intent.kind === "missing_next_action") {
      return resultForOpportunity(opportunity, "Nu există un următor pas comercial confirmat.", [{ label: "Următor pas: neconfirmat", source: "acțiune", ...(opportunity.updatedAt ? { timestamp: opportunity.updatedAt } : {}) }], false);
    }
    if (intent.kind === "overdue_next_action" && nextAction?.dueDate) {
      return resultForOpportunity(opportunity, `Acțiunea „${nextAction.title}” a depășit termenul înregistrat.`, [{ label: `Termenul acțiunii: ${formatDate(nextAction.dueDate)}`, source: "acțiune", timestamp: nextAction.dueDate }], true);
    }
    if (intent.kind === "inactivity" && assessment.lastMeaningfulActivityAt) {
      const days = Math.floor((now.getTime() - Date.parse(assessment.lastMeaningfulActivityAt)) / 86_400_000);
      return resultForOpportunity(opportunity, `Nu există activitate comercială înregistrată de ${days} de zile.`, [evidenceForActivity(assessment.lastMeaningfulActivityAt)], Boolean(nextAction));
    }
    if (intent.kind === "amount") {
      const currency = opportunity.currency ?? "RON";
      return resultForOpportunity(opportunity, "Valoarea estimată înregistrată corespunde criteriului căutat.", [{ label: `Valoare estimată: ${formatAmount(opportunity.estimatedValueHigh, currency)} · nu este venit confirmat`, source: "oportunitate", ...(opportunity.updatedAt ? { timestamp: opportunity.updatedAt } : {}) }], Boolean(nextAction));
    }
    if (intent.kind === "attention") {
      const reasons = assessment.reasons.slice(0, 3).map((item) => item.label);
      return resultForOpportunity(opportunity, reasons.length > 0 ? reasons.join(" · ") : "Necesită verificare operațională.", assessment.lastMeaningfulActivityAt ? [evidenceForActivity(assessment.lastMeaningfulActivityAt)] : [{ label: "Date operaționale incomplete", source: "oportunitate" }], Boolean(nextAction));
    }
    return resultForOpportunity(opportunity, "Oportunitatea este deschisă în spațiul de lucru curent.", [{ label: `Status înregistrat: ${opportunity.status}`, source: "oportunitate", ...(opportunity.updatedAt ? { timestamp: opportunity.updatedAt } : {}) }], Boolean(nextAction));
  });

  return {
    ok: true,
    intent,
    summary: responseSummary(intent.kind, matched.length, intent.rawQuery),
    results,
    total: matched.length,
    insufficientData: results.length === 0 && (intent.kind === "inactivity" ? unknownActivityCount > 0 : true),
    suggestions: [...suggestedCommercialQueries]
  };
}
