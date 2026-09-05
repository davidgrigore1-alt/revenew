import type { CopilotEvidence } from "./copilot-types";
import type { LocalDocumentSegment, LocalDocumentVersion } from "@/lib/documents/local-document-core";
import { sumImpactMoney } from "@/lib/revenue-impact";

export const INTELLIGENCE_CONTRACT = "operational-intelligence/1";
export type EvidenceFamily = "companies" | "contacts" | "opportunities" | "documents" | "local_documents" | "drive" | "gmail" | "calendar" | "activities" | "inbox" | "approvals" | "prepared" | "workflows" | "reports" | "apps";
export type EvidenceEnvelope = {
  family: EvidenceFamily;
  recordId: string;
  version: string | null;
  independenceKey: string;
  classification: "source_declaration" | "canonical_record" | "computed_result" | "inference";
  retrievedAt: string;
  analyzedAt: string;
  modifiedAt: string | null;
  locator: { sheet?: string; sheetIndex?: number; row?: number; range?: string };
  coverage: "retained_projection" | "bounded_records";
  partial: boolean;
  visibility?: { businessId: string; actorProfileId: string; privateOwnerProfileId?: string };
  associations?: Array<{ family: "opportunities"; id: string; basis: "explicit_relation" }>;
};
export type StructuredRow = { id: string; sheet: string; sheetIndex?: number; row: number; headers: string[]; values: Array<string | number | boolean | null>; unavailableColumns?: number[]; excerpt: string };
export type Calculation = { id: string; operation: "sum" | "top" | "missing" | "count"; definition: string; rows: string[]; exclusions: number; partial: boolean; totals: Array<{currency: string; amount: string}>; ranked: Array<{id: string; amount: string; currency: string}> };
export const normalizeIntelligenceText = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const stopwords = new Set(["care", "sunt", "este", "despre", "pentru", "document", "fisier", "arata", "gaseste", "what", "where", "this", "from"]);
export function relevance(question: string, text: string) {
  const content = normalizeIntelligenceText(text);
  return Array.from(new Set(normalizeIntelligenceText(question).split(/[^a-z0-9-]+/).filter(t => t.length >= 3 && !stopwords.has(t)))).slice(0, 24).reduce((score, term) => score + Number(content.includes(term)), 0);
}
export function retainedRows(version: LocalDocumentVersion, segments: LocalDocumentSegment[]): StructuredRow[] {
  const prefix = `local:${version.source_id}:${version.id}`;
  if (!version.workbook) return segments.map(segment => ({id: `${prefix}:row:${segment.row_number}`, sheet: "CSV", row: segment.row_number, headers: version.headers ?? [], values: segment.cells, excerpt: segment.cells.map((v,i) => `${version.headers?.[i] ?? i+1}: ${v === null || v === undefined || v === "" ? "(gol)" : v}`).join(" · ")}));
  return version.workbook.sheets.flatMap(sheet => {
    const rows = new Map<number, Array<string | number | boolean | null>>();
    const unavailable = new Map<number, number[]>();
    for (const cell of sheet.cells) {
      const values = rows.get(cell.row) ?? Array(sheet.previewColumns).fill(null);
      values[cell.column] = cell.truncated || (cell.formula && !cell.cached) ? null : cell.raw;
      if(cell.truncated || (cell.formula && !cell.cached))unavailable.set(cell.row,[...(unavailable.get(cell.row)??[]),cell.column]);
      rows.set(cell.row, values);
    }
    const headers = (rows.get(0) ?? []).map(v => String(v ?? ""));
    return Array.from(rows).filter(([index]) => index > 0).map(([index, values]) => ({id: `${prefix}:sheet:${sheet.index}:row:${index+1}`, sheet: sheet.name, sheetIndex: sheet.index, row: index+1, headers, values, unavailableColumns:unavailable.get(index)??[], excerpt: values.map((v,i) => `${headers[i] || i+1}: ${v === null ? unavailable.get(index)?.includes(i)?"(rezultat indisponibil)":"(gol)" : v}`).join(" · ")}));
  });
}
const aliases = {
  value: ["value", "estimated value", "valoare", "valoare estimata", "amount", "suma"],
  currency: ["currency", "moneda"],
  next: ["next action", "next step", "urmatoarea actiune", "actiune urmatoare", "urmatorul pas"],
  city: ["city", "oras", "localitate"]
};
function column(row: StructuredRow, key: keyof typeof aliases) { return row.headers.findIndex(h => aliases[key].includes(normalizeIntelligenceText(h).trim())); }
export function calculateRetainedRows(question: string, input: StructuredRow[], partial: boolean): Calculation | null {
  const q = normalizeIntelligenceText(question);
  const operation: Calculation["operation"] | null = /suma|total|sum\b/.test(q) ? "sum" : /top\s*\d*|mai mari|largest/.test(q) ? "top" : /fara|missing|necomplet|nu au/.test(q) && /actiune|action|pas/.test(q) ? "missing" : /cate randuri|numar.*rand|count.*row/.test(q) ? "count" : null;
  if (!operation) return null;
  const namedSheets = Array.from(new Set(input.map(r => r.sheet))).filter(name => q.includes(normalizeIntelligenceText(name)));
  let rows = input.filter(r => !namedSheets.length || namedSheets.includes(r.sheet));
  // A filter must resolve an actual column and value; names are not entity associations.
  if (/doar|numai|only/.test(q)) {
    const cities = Array.from(new Set(rows.map(r => String(r.values[column(r,"city")] ?? "")))).filter(city => city && q.includes(normalizeIntelligenceText(city)));
    if (!cities.length) return null;
    if (cities.length) rows = rows.filter(r => cities.includes(String(r.values[column(r,"city")] ?? "")));
  }
  const operationLabel={sum:"Sumă",top:"Clasament pe monede",missing:"Rânduri fără următor pas",count:"Număr de rânduri"}[operation];
  const base = { id: `calculation:${operation}:${rows[0]?.id ?? "empty"}`, operation, definition: `${operationLabel} · ${namedSheets.join(", ") || "foile reținute"} · fără conversie valutară; fără executarea formulelor`, partial, exclusions: 0, totals: [] as Calculation["totals"], ranked: [] as Calculation["ranked"] };
  if (operation === "missing") return {...base, exclusions:rows.filter(r=>column(r,"next")<0||r.unavailableColumns?.includes(column(r,"next"))).length, rows: rows.filter(r => column(r,"next") >= 0 && !r.unavailableColumns?.includes(column(r,"next")) && (r.values[column(r,"next")] === null || String(r.values[column(r,"next")] ?? "").trim() === "")).map(r => r.id)};
  if (operation === "count") return {...base, rows: rows.map(r => r.id)};
  const accepted = rows.flatMap(r => {
    const amount = r.values[column(r,"value")], currency = r.values[column(r,"currency")];
    // Deliberately use the existing exact nonnegative money contract. Ambiguous formatted strings are excluded.
    if ((typeof amount !== "number" && typeof amount !== "string") || !/^\d{1,10}(?:\.\d{1,2})?$/.test(String(amount)) || typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) return [];
    return [{id:r.id, amount:String(amount), currency}];
  });
  const n = Math.min(20, Math.max(1, Number(q.match(/top\s*(\d+)/)?.[1] ?? 5)));
  const ranked = [...accepted].sort((a,b) => a.currency.localeCompare(b.currency) || Number(b.amount)-Number(a.amount));
  const counts = new Map<string,number>();
  return {...base, exclusions:rows.length-accepted.length, rows:accepted.map(r=>r.id), totals:sumImpactMoney(accepted), ranked:operation === "top" ? ranked.filter(r => {const count=counts.get(r.currency)??0;counts.set(r.currency,count+1);return count<n;}) : []};
}
export function uniqueEvidenceSources(evidence: CopilotEvidence[]) {
  return new Set(evidence.map(e => e.provenance?.independenceKey ?? `${e.sourceType}:${e.recordId ?? e.sourceId.replace(/:row:.*$/, "")}`)).size;
}

/** Legacy domain adapters supply observed records, not immutable revisions. */
export function attachIntelligenceProvenance(item:CopilotEvidence,businessId:string,actorProfileId:string,now:string):CopilotEvidence {
  const families:Partial<Record<CopilotEvidence["sourceType"],EvidenceFamily>>={Companie:"companies",Contact:"contacts",Oportunitate:"opportunities",Acțiune:"activities","Istoric comercial":"activities","Semnal comercial":"inbox",Aprobare:"approvals",Email:"gmail",Calendar:"calendar","Eveniment calendar":"calendar",Document:"documents","Brief executiv":"reports"};
  const family=item.provenance?.family??families[item.sourceType]??"apps";
  const privateSource=["gmail","calendar","drive"].includes(family);
  const recordId=item.recordId??item.sourceId;
  return {...item,provenance:{...(item.provenance??{
    family,recordId,version:null,independenceKey:`${family}:${recordId}`,
    classification:item.claimType==="derived"?"inference":privateSource||family==="documents"?"source_declaration":"canonical_record",
    retrievedAt:now,analyzedAt:now,modifiedAt:null,locator:{},coverage:"bounded_records",partial:true
  }),visibility:{businessId,actorProfileId,...(privateSource?{privateOwnerProfileId:actorProfileId}:{})}}};
}
