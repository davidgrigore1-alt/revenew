import Papa from "papaparse";

export const SOURCE_INTAKE_LIMITS = {
  maxTextLength: 60_000,
  maxCandidateTextLength: 6_000,
  maxCandidates: 1_000
} as const;

export type CommercialIntakeSource = "manual" | "email" | "whatsapp" | "phone" | "other" | "csv_import";

export type SourceIntakeRow = Record<string, string>;

export type CsvIntakeParseResult = {
  ok: boolean;
  headers: string[];
  rows: string[][];
  error?: string;
};

const sourceAliases: Record<string, CommercialIntakeSource> = {
  manual: "manual",
  nota: "manual",
  note: "manual",
  email: "email",
  mail: "email",
  whatsapp: "whatsapp",
  apel: "phone",
  telefon: "phone",
  call: "phone",
  phone: "phone",
  csv: "csv_import",
  other: "other",
  alta: "other"
};

const fieldAliases: Record<string, string> = {
  titlu: "title",
  title: "title",
  subiect: "title",
  subject: "title",
  companie: "company",
  firma: "company",
  company: "company",
  contact: "contact",
  persoana: "contact",
  email: "email",
  telefon: "phone",
  phone: "phone",
  valoare: "estimated_value",
  value: "estimated_value",
  moneda: "currency",
  currency: "currency",
  termen: "due_date",
  deadline: "due_date",
  due_date: "due_date",
  sursa: "source_type",
  source: "source_type",
  referinta: "source_reference",
  reference: "source_reference",
  context: "context",
  mesaj: "context",
  message: "context",
  nota: "context",
  notes: "context"
};

function fold(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("ro-RO").trim();
}

function safeText(value: string, max: number = SOURCE_INTAKE_LIMITS.maxCandidateTextLength) {
  return value.normalize("NFKC").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").trim().slice(0, max);
}

function normalizeSource(value: string, fallback: CommercialIntakeSource) {
  return sourceAliases[fold(value)] ?? fallback;
}

function parseCandidate(block: string, fallbackSource: CommercialIntakeSource): SourceIntakeRow {
  const row: SourceIntakeRow = { source_type: fallbackSource };
  const contextLines: string[] = [];
  const lines = block.split(/\r?\n/).map((line) => safeText(line, 1_000)).filter(Boolean);

  for (const line of lines) {
    const match = /^([^:]{2,32}):\s*(.*)$/.exec(line);
    const key = match ? fieldAliases[fold(match[1])] : undefined;
    if (!match || !key) {
      contextLines.push(line);
      continue;
    }
    if (key === "source_type") row.source_type = normalizeSource(match[2], fallbackSource);
    else if (key === "context") contextLines.push(match[2]);
    else row[key] = safeText(match[2], key === "title" || key === "company" || key === "contact" ? 240 : 500);
  }

  if (!row.title && contextLines.length) row.title = contextLines.shift()?.slice(0, 240) ?? "";
  row.context = safeText(contextLines.join("\n"));
  return row;
}

export function createSingleIntakeRow(input: {
  title: string;
  sourceType: CommercialIntakeSource;
  rawText: string;
  company?: string;
  contact?: string;
  estimatedValue?: string;
  currency?: string;
  dueDate?: string;
  sourceReference?: string;
}): SourceIntakeRow {
  return {
    title: safeText(input.title, 240),
    source_type: input.sourceType,
    context: safeText(input.rawText),
    company: safeText(input.company ?? "", 240),
    contact: safeText(input.contact ?? "", 240),
    estimated_value: safeText(input.estimatedValue ?? "", 40),
    currency: safeText(input.currency ?? "RON", 3),
    due_date: safeText(input.dueDate ?? "", 40),
    source_reference: safeText(input.sourceReference ?? "", 500)
  };
}

export function parseBulkCommercialText(text: string, fallbackSource: CommercialIntakeSource) {
  const normalized = text.normalize("NFKC").replace(/\r\n/g, "\n");
  if (!normalized.trim()) return { ok: false as const, rows: [], error: "Adaugă textul sursă înainte de previzualizare." };
  if (normalized.length > SOURCE_INTAKE_LIMITS.maxTextLength) {
    return { ok: false as const, rows: [], error: "Textul depășește limita de 60.000 de caractere." };
  }
  const blocks = normalized.split(/\n\s*(?:---+|===+)\s*\n|\n\s*\n+/g).map((block) => block.trim()).filter(Boolean);
  if (blocks.length > SOURCE_INTAKE_LIMITS.maxCandidates) {
    return { ok: false as const, rows: [], error: "Importul poate conține cel mult 1.000 de semnale candidate." };
  }
  return { ok: true as const, rows: blocks.map((block) => parseCandidate(block, fallbackSource)) };
}

export function parseCommercialCsvText(text: string, maxLength: number = SOURCE_INTAKE_LIMITS.maxTextLength): CsvIntakeParseResult {
  if (!text.trim()) return { ok: false, headers: [], rows: [], error: "Adaugă text CSV înainte de previzualizare." };
  if (text.length > maxLength) {
    return { ok: false, headers: [], rows: [], error: maxLength === SOURCE_INTAKE_LIMITS.maxTextLength ? "Textul CSV depășește limita de 60.000 de caractere." : "Fișierul CSV depășește limita permisă." };
  }
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
  if (parsed.errors.length) return { ok: false, headers: [], rows: [], error: "CSV-ul nu poate fi citit. Verifică delimitatorul și codarea UTF-8." };
  const [headers = [], ...rows] = parsed.data;
  if (!headers.length || !rows.length) return { ok: false, headers: [], rows: [], error: "CSV-ul trebuie să conțină antet și cel puțin un rând." };
  if (headers.length > 30) return { ok: false, headers: [], rows: [], error: "CSV-ul poate avea cel mult 30 de coloane." };
  if (rows.length > SOURCE_INTAKE_LIMITS.maxCandidates) return { ok: false, headers: [], rows: [], error: "Importul este limitat la 1.000 de rânduri." };
  return {
    ok: true,
    headers: headers.map((value) => safeText(String(value), 80)),
    rows: rows.map((row) => row.slice(0, 30).map((value) => safeText(String(value))))
  };
}
