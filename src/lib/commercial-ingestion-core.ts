import { createHash } from "node:crypto";

export type CommercialMappedRow = Record<string, string>;

export type NormalizedCommercialImportRow = {
  row_number: number;
  row_fingerprint: string;
  source_label: string;
  source_type: "manual" | "email" | "phone" | "whatsapp" | "csv_import" | "other";
  title: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  estimated_value: string;
  currency: string;
  last_interaction_at: string;
  requested_date: string;
  context: string;
  status_label: string;
  owner_label: string;
  owner_profile_id: string;
  source_reference: string;
  probable_signal_match: boolean;
  probable_company_match: boolean;
  probable_contact_match: boolean;
  probable_opportunity_match: boolean;
};

export type CommercialImportRowIssue = {
  row_number: number;
  row_fingerprint: string | null;
  status: "rejected" | "duplicate_file";
  error_code: string;
  error_message: string;
  probable_company_match?: boolean;
  probable_contact_match?: boolean;
  probable_opportunity_match?: boolean;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const currencies = new Set(["RON", "EUR", "USD", "GBP", "CHF"]);
const sourceTypes = new Set(["manual", "email", "phone", "whatsapp", "csv_import", "other"]);
const sourceAliases: Record<string, NormalizedCommercialImportRow["source_type"]> = {
  manual: "manual", nota: "manual", email: "email", mail: "email", phone: "phone", telefon: "phone", apel: "phone",
  whatsapp: "whatsapp", csv: "csv_import", csv_import: "csv_import", other: "other", alta: "other"
};

function safeSpreadsheetText(value: string) {
  const text = value.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

export function normalizeCommercialValue(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("ro-RO")
    .replace(/\s+/g, " ").trim();
}

function clean(value: unknown, max: number) {
  return safeSpreadsheetText(String(value ?? "")).slice(0, max);
}

function normalizeDate(value: string) {
  if (!value) return "";
  const trimmed = value.trim();
  const ro = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(trimmed);
  const candidate = ro ? `${ro[3]}-${ro[2].padStart(2, "0")}-${ro[1].padStart(2, "0")}` : trimmed.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate) || Number.isNaN(Date.parse(`${candidate}T00:00:00Z`))) return "";
  return `${candidate}T00:00:00.000Z`;
}

function normalizeSource(value: string) {
  const normalized = normalizeCommercialValue(value).replace(/\s+/g, "_");
  return sourceAliases[normalized] ?? (sourceTypes.has(normalized) ? normalized as NormalizedCommercialImportRow["source_type"] : "csv_import");
}

function normalizeMoney(value: string) {
  if (!value.trim()) return "";
  const compact = value.replace(/\s/g, "").replace(/(?<=\d)[.](?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(compact)) return null;
  const numeric = Number(compact);
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 1_000_000_000_000 ? String(numeric) : null;
}

export function commercialRowFingerprint(row: Omit<NormalizedCommercialImportRow, "row_number" | "row_fingerprint">) {
  const identity = {
    source: normalizeCommercialValue(row.source_label),
    sourceType: row.source_type,
    title: normalizeCommercialValue(row.title),
    company: normalizeCommercialValue(row.company),
    contact: normalizeCommercialValue(row.contact),
    email: row.email.toLocaleLowerCase("ro-RO"),
    phone: row.phone.replace(/[^+\d]/g, ""),
    value: row.estimated_value,
    currency: row.currency,
    interaction: row.last_interaction_at.slice(0, 10),
    requestedDate: row.requested_date.slice(0, 10),
    context: normalizeCommercialValue(row.context),
    reference: normalizeCommercialValue(row.source_reference)
  };
  return createHash("sha256").update(JSON.stringify(identity)).digest("hex");
}

export function batchFingerprint(fileName: string, rows: Array<{ row_fingerprint: string }>) {
  return createHash("sha256").update(JSON.stringify({
    file: normalizeCommercialValue(fileName.replace(/[^a-zA-Z0-9._ -]/g, "")),
    rows: rows.map((row) => row.row_fingerprint).sort()
  })).digest("hex");
}

export function selectConfirmedCommercialRows<T extends { row_fingerprint: string; exact_duplicate: boolean }>(accepted: T[], selectedFingerprints: string[]) {
  const selected = new Set(selectedFingerprints);
  const selectedRows = accepted.filter((row) => !row.exact_duplicate && selected.has(row.row_fingerprint));
  const exactDuplicates = accepted.filter((row) => row.exact_duplicate);
  const notSelected = accepted.filter((row) => !row.exact_duplicate && !selected.has(row.row_fingerprint)).length;
  return { selectedRows, exactDuplicates, notSelected, confirmedRows: [...selectedRows, ...exactDuplicates] };
}

export function validateCommercialImportRows(rawRows: CommercialMappedRow[]) {
  const accepted: NormalizedCommercialImportRow[] = [];
  const rejected: CommercialImportRowIssue[] = [];
  const seen = new Set<string>();

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2;
    const title = clean(raw.title, 240);
    const email = clean(raw.email, 320).toLocaleLowerCase("ro-RO");
    const phone = clean(raw.phone, 80);
    const money = normalizeMoney(String(raw.estimated_value ?? ""));
    const dateInput = clean(raw.last_interaction, 40);
    const date = normalizeDate(dateInput);
    const dueDateInput = clean(raw.due_date, 40);
    const dueDate = normalizeDate(dueDateInput);
    const currency = clean(raw.currency, 3).toUpperCase() || "RON";
    let error: { code: string; message: string } | null = null;
    if (!title) error = { code: "missing_title", message: "Titlul semnalului este obligatoriu." };
    else if (email && !emailPattern.test(email)) error = { code: "invalid_email", message: "Adresa de email nu este validă." };
    else if (phone && (phone.replace(/\D/g, "").length < 7 || phone.replace(/\D/g, "").length > 15)) error = { code: "invalid_phone", message: "Telefonul trebuie să conțină între 7 și 15 cifre." };
    else if (money === null) error = { code: "invalid_value", message: "Valoarea estimată trebuie să fie un număr pozitiv valid." };
    else if (!currencies.has(currency)) error = { code: "invalid_currency", message: "Moneda acceptată este RON, EUR, USD, GBP sau CHF." };
    else if (dateInput && !date) error = { code: "invalid_date", message: "Data ultimei interacțiuni nu este validă." };
    else if (dueDateInput && !dueDate) error = { code: "invalid_due_date", message: "Termenul comercial nu este valid. Folosește formatul ZZ.LL.AAAA sau AAAA-LL-ZZ." };

    const sourceInput = clean(raw.source_type || raw.source, 120);
    const base = {
      source_label: clean(raw.source, 120) || (sourceInput ? `Import controlat · ${sourceInput}` : "Import controlat"),
      source_type: normalizeSource(sourceInput),
      title,
      company: clean(raw.company, 240),
      contact: clean(raw.contact, 240),
      email,
      phone,
      estimated_value: money ?? "",
      currency,
      last_interaction_at: date,
      requested_date: dueDate,
      context: clean(raw.context, 6000),
      status_label: clean(raw.status, 500),
      owner_label: clean(raw.owner, 240),
      owner_profile_id: "",
      source_reference: clean(raw.source_reference, 500),
      probable_signal_match: false,
      probable_company_match: false,
      probable_contact_match: false,
      probable_opportunity_match: false
    };
    const fingerprint = commercialRowFingerprint(base);
    if (error) {
      rejected.push({ row_number: rowNumber, row_fingerprint: fingerprint, status: "rejected", error_code: error.code, error_message: error.message });
    } else if (seen.has(fingerprint)) {
      rejected.push({ row_number: rowNumber, row_fingerprint: fingerprint, status: "duplicate_file", error_code: "duplicate_file", error_message: "Rând identic repetat în același fișier." });
    } else {
      seen.add(fingerprint);
      accepted.push({ row_number: rowNumber, row_fingerprint: fingerprint, ...base });
    }
  });
  return { accepted, rejected };
}
