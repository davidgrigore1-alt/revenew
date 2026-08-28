export const MULTI_RECORD_MAX_SELECTION = 25;
export const MULTI_RECORD_MAX_RESULTS = 100;

export type MultiRecordExecutionState =
  | "healthy" | "needs_attention" | "overdue" | "waiting_for_client" | "waiting_internal"
  | "approval_required" | "owner_missing" | "next_action_missing" | "blocked" | "prepared"
  | "ready_for_review" | "resolved";
export type MultiRecordSeverity = "critical" | "attention" | "informative";
export type MultiRecordFilter = {
  minEstimatedValue?: number;
  maxEstimatedValue?: number;
  currency?: string;
  stages?: string[];
  owner?: "missing" | "assigned";
  executionStates?: MultiRecordExecutionState[];
  minimumResponseAgeDays?: number;
  waitingState?: "waiting_for_client" | "waiting_internal" | "not_waiting";
  nextActionState?: "missing" | "overdue" | "present";
  severities?: MultiRecordSeverity[];
};
export type MultiRecordSort = { field: "estimated_value" | "response_age" | "updated_at" | "severity"; direction: "asc" | "desc" };
export type MultiRecordCandidate = {
  id: string; title: string; company: string | null; estimatedValue: number | null; currency: string; stage: string;
  ownerProfileId: string | null; ownerName: string | null; executionState: MultiRecordExecutionState; executionReason: string;
  severity: MultiRecordSeverity; lastInboundAt: string | null; lastOutboundAt: string | null; nextMeetingAt: string | null; responseAgeDays: number | null;
  nextActionState: "missing" | "overdue" | "present"; updatedAt: string | null; route: string;
};
export type MultiRecordInterpretation = {
  matched: boolean; state: "ready" | "clarification" | "unsupported"; filters: MultiRecordFilter; sort: MultiRecordSort;
  clarification: string | null; unsupportedReason: string | null;
};
function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function amountFrom(value: string) {
  const match = value.match(/(?:peste|mai mult de|cel putin|minim|sub|mai putin de|maxim)\s+([\d .,'’]+)\s*(k|milioane?|milion)?/);
  if (!match) return null;
  const base = Number(match[1].replace(/[ .,'’]/g, ""));
  if (!Number.isFinite(base)) return null;
  return base * (match[2]?.startsWith("k") ? 1_000 : match[2]?.startsWith("mil") ? 1_000_000 : 1);
}
export function isMultiRecordQuery(question: string) {
  const value = normalize(question);
  return /oportunitat|deal-uri|pipeline/.test(value) && /(peste|sub|fara|restant|asteapta|nu au primit raspuns|owner|responsabil|stadi|etap|sever|priorit|primele|top|toate)/.test(value);
}
export function interpretMultiRecordQuery(question: string): MultiRecordInterpretation {
  const value = normalize(question); const matched = isMultiRecordQuery(question); const filters: MultiRecordFilter = {};
  const amount = amountFrom(value); const currency = value.match(/\b(ron|eur|usd)\b/)?.[1]?.toUpperCase();
  const responseDays = value.match(/(?:fara raspuns|nu au primit raspuns|asteapta raspuns)[^\d]{0,20}(\d{1,3})\s*(?:zile|zi)/)?.[1];
  if (amount != null) { if (/\b(?:sub|mai putin de|maxim)\b/.test(value)) filters.maxEstimatedValue = amount; else filters.minEstimatedValue = amount; }
  if (currency) filters.currency = currency;
  if (/fara (?:owner|responsabil)|owner lipsa|responsabil lipsa/.test(value)) filters.owner = "missing";
  else if (/cu (?:owner|responsabil)|responsabil atribuit/.test(value)) filters.owner = "assigned";
  if (/fara (?:urmatoarea )?(?:actiune|pas)/.test(value)) filters.nextActionState = "missing";
  else if (/(?:actiune|pas|follow.?up).*(?:restant|depasit)/.test(value)) filters.nextActionState = "overdue";
  if (/asteapta client|waiting for client/.test(value)) filters.waitingState = "waiting_for_client";
  if (/asteapta intern|waiting internal/.test(value)) filters.waitingState = "waiting_internal";
  if (/blocat/.test(value)) filters.executionStates = ["blocked"];
  else if (/aprobare/.test(value)) filters.executionStates = ["approval_required"];
  else if (/restant|depasit/.test(value) && !filters.nextActionState) filters.executionStates = ["overdue"];
  if (/critic/.test(value)) filters.severities = ["critical"];
  if (responseDays) filters.minimumResponseAgeDays = Math.min(365, Math.max(1, Number(responseDays)));
  const stage = value.match(/(?:stadiul|etapa|in)\s+(lead|calificat|propunere|negociere)/)?.[1]; if (stage) filters.stages = [stage];
  const sort: MultiRecordSort = /vech|raspuns/.test(value) ? { field: "response_age", direction: "desc" } : { field: "estimated_value", direction: "desc" };
  if (!matched) return { matched: false, state: "unsupported", filters, sort, clarification: null, unsupportedReason: "Cererea nu este o selecție multi-record." };
  if (amount != null && !currency) return { matched, state: "clarification", filters, sort, clarification: "În ce monedă trebuie aplicat pragul valoric: RON, EUR sau USD?", unsupportedReason: null };
  return { matched, state: "ready", filters, sort, clarification: null, unsupportedReason: null };
}
const severityRank: Record<MultiRecordSeverity, number> = { critical: 3, attention: 2, informative: 1 };
export function filterAndSortMultiRecordCandidates(candidates: MultiRecordCandidate[], filters: MultiRecordFilter, sort: MultiRecordSort) {
  const filtered = candidates.filter((item) => {
    if (item.executionState === "resolved" && !filters.executionStates?.includes("resolved")) return false;
    if (filters.currency && item.currency !== filters.currency) return false;
    if (filters.minEstimatedValue != null && (item.estimatedValue ?? 0) <= filters.minEstimatedValue) return false;
    if (filters.maxEstimatedValue != null && (item.estimatedValue ?? Number.POSITIVE_INFINITY) >= filters.maxEstimatedValue) return false;
    if (filters.stages?.length && !filters.stages.includes(normalize(item.stage))) return false;
    if (filters.owner === "missing" && item.ownerProfileId) return false; if (filters.owner === "assigned" && !item.ownerProfileId) return false;
    if (filters.executionStates?.length && !filters.executionStates.includes(item.executionState)) return false;
    if (filters.minimumResponseAgeDays != null && (item.responseAgeDays == null || item.responseAgeDays < filters.minimumResponseAgeDays)) return false;
    if (filters.waitingState === "not_waiting" && item.executionState.startsWith("waiting_")) return false;
    if (filters.waitingState && filters.waitingState !== "not_waiting" && item.executionState !== filters.waitingState) return false;
    if (filters.nextActionState && item.nextActionState !== filters.nextActionState) return false;
    if (filters.severities?.length && !filters.severities.includes(item.severity)) return false;
    return true;
  });
  return filtered.sort((left, right) => {
    const lv = sort.field === "estimated_value" ? left.estimatedValue ?? -1 : sort.field === "response_age" ? left.responseAgeDays ?? -1 : sort.field === "severity" ? severityRank[left.severity] : Date.parse(left.updatedAt ?? "1970-01-01");
    const rv = sort.field === "estimated_value" ? right.estimatedValue ?? -1 : sort.field === "response_age" ? right.responseAgeDays ?? -1 : sort.field === "severity" ? severityRank[right.severity] : Date.parse(right.updatedAt ?? "1970-01-01");
    const comparison = Number(lv) - Number(rv);
    return (sort.direction === "desc" ? -comparison : comparison) || String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? "")) || left.id.localeCompare(right.id);
  }).slice(0, MULTI_RECORD_MAX_RESULTS);
}
export function totalsByCurrency(records: MultiRecordCandidate[]) {
  const totals = new Map<string, number>(); for (const record of records) if (record.estimatedValue != null) totals.set(record.currency, (totals.get(record.currency) ?? 0) + record.estimatedValue);
  return Array.from(totals, ([currency, estimatedValue]) => ({ currency, estimatedValue })).sort((a, b) => a.currency.localeCompare(b.currency));
}
export function isMultiRecordSelectionReference(question: string) {
  const value = normalize(question);
  return /(?:primele|primii|first)\s+\d{1,3}|\btoate\b|selectia curenta|cele selectate|doar cele|fara (?:owner|responsabil)|(?:actiuni|follow.?up).*(?:restant|depasit)|(?:elimina|scoate)\s+/.test(value);
}
export function selectionFromFollowUp(question: string, records: MultiRecordCandidate[], currentlySelected: string[]) {
  const value = normalize(question);
  let source = records;
  const currentSet = new Set(currentlySelected);
  if (/selectia curenta|cele selectate/.test(value)) source = records.filter((record) => currentSet.has(record.id));
  if (/doar cele.*\b(ron|eur|usd)\b/.test(value)) { const currency = value.match(/doar cele.*\b(ron|eur|usd)\b/)?.[1]?.toUpperCase(); source = records.filter((record) => record.currency === currency); }
  if (/doar cele.*fara (?:owner|responsabil)|fara (?:owner|responsabil)/.test(value)) source = source.filter((record) => !record.ownerProfileId);
  if (/doar cele.*(?:restant|depasit)|(?:actiuni|follow.?up).*(?:restant|depasit)/.test(value)) source = source.filter((record) => record.nextActionState === "overdue" || record.executionState === "overdue");
  const remove = value.match(/(?:elimina|scoate)\s+(.+?)(?:\.|$)/)?.[1]?.trim();
  if (remove) source = source.filter((record) => !normalize(`${record.title} ${record.company ?? ""}`).includes(remove));
  const count = value.match(/(?:primele|primii|first)\s+(\d{1,3})/)?.[1];
  return source.slice(0, count ? Math.max(0, Number(count)) : source.length).map((record) => record.id);
}
export function multiRecordStaleReason(snapshot: MultiRecordCandidate, current: MultiRecordCandidate | null) {
  if (!current) return "Înregistrarea nu mai este disponibilă sau autorizată.";
  if (current.executionState === "resolved") return "Oportunitatea este închisă.";
  if (snapshot.updatedAt && current.updatedAt !== snapshot.updatedAt) return "Oportunitatea s-a schimbat după selecție.";
  if (snapshot.ownerProfileId !== current.ownerProfileId) return "Responsabilitatea s-a schimbat după selecție.";
  if (snapshot.executionState !== current.executionState || snapshot.nextActionState !== current.nextActionState) return "Starea comercială s-a schimbat după selecție.";
  if (current.lastInboundAt && (!snapshot.lastInboundAt || current.lastInboundAt > snapshot.lastInboundAt)) return "A sosit un răspuns după selecție.";
  if (snapshot.nextMeetingAt !== current.nextMeetingAt) return "Calendarul comercial s-a schimbat după selecție.";
  return null;
}
export type MultiRecordBatchAction = "prepare_email" | "create_internal_task" | "assign_review" | "create_notification" | "prepare_next_action_update";
export function classifyMultiRecordBatchAction(question: string): MultiRecordBatchAction | null {
  const value = normalize(question);
  if (/pregat.*(?:follow.?up|email|mesaj|raspuns)/.test(value)) return "prepare_email";
  if (/(?:creeaza|creaza|pregateste).*(?:task|sarcin)/.test(value)) return "create_internal_task";
  if (/(?:atribuie|pregateste).*(?:review|revizuire)/.test(value)) return "assign_review";
  if (/notifica|notificare/.test(value)) return "create_notification";
  if (/pregat.*(?:urmatoarea actiune|pasul urmator)/.test(value)) return "prepare_next_action_update";
  return null;
}
