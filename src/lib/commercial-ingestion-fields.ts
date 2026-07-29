export const COMMERCIAL_IMPORT_LIMITS = {
  maxFileBytes: 2 * 1024 * 1024,
  maxRows: 1000,
  maxColumns: 30,
  previewRows: 8,
  displayedErrors: 20
} as const;

export type CommercialImportFieldKey =
  | "source"
  | "source_type"
  | "title"
  | "company"
  | "contact"
  | "email"
  | "phone"
  | "estimated_value"
  | "currency"
  | "due_date"
  | "last_interaction"
  | "context"
  | "status"
  | "owner"
  | "source_reference";

export type CommercialImportField = {
  key: CommercialImportFieldKey;
  label: string;
  required?: boolean;
  aliases: string[];
};

export const commercialImportFields: CommercialImportField[] = [
  { key: "source", label: "Sursă originală", aliases: ["source", "sursa", "eticheta sursa", "source label", "request_source"] },
  { key: "source_type", label: "Tip sursă", aliases: ["source type", "source_type", "tip sursa", "tip sursă"] },
  { key: "title", label: "Titlu semnal", required: true, aliases: ["title", "titlu", "subject", "subiect", "opportunity", "oportunitate", "opportunity_title"] },
  { key: "company", label: "Companie", aliases: ["companie", "firma", "firmă", "client", "company", "organization", "organizatie", "company_name"] },
  { key: "contact", label: "Persoană de contact", aliases: ["contact", "persoana", "persoană", "nume contact", "contact name", "full name", "contact_name"] },
  { key: "email", label: "Email", aliases: ["email", "e-mail", "mail", "contact_email"] },
  { key: "phone", label: "Telefon", aliases: ["telefon", "phone", "mobile", "mobil"] },
  { key: "estimated_value", label: "Valoare estimată", aliases: ["valoare", "valoare estimata", "valoare estimată", "estimated value", "estimated_value", "amount", "value"] },
  { key: "currency", label: "Monedă", aliases: ["currency", "moneda", "monedă"] },
  { key: "due_date", label: "Termen comercial", aliases: ["due date", "due_date", "deadline", "termen", "data termen", "scadenta", "scadență", "next_action_due_date"] },
  { key: "last_interaction", label: "Ultima interacțiune", aliases: ["ultima interactiune", "ultima interacțiune", "last interaction", "last contact", "last reply", "last_action_date"] },
  { key: "context", label: "Text sursă / context", aliases: ["context", "raw text", "raw_text", "message", "mesaj", "notes", "observatii", "observații", "descriere", "description", "request_summary"] },
  { key: "status", label: "Status original", aliases: ["status", "stare", "stage", "etapa", "etapă", "current_status"] },
  { key: "owner", label: "Responsabil", aliases: ["owner", "responsabil", "assigned to", "sales rep", "responsible_person"] },
  { key: "source_reference", label: "Referință sursă", aliases: ["source reference", "source_reference", "referinta", "referință", "id extern", "external id"] }
];

export function normalizeCommercialHeader(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("ro-RO")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

export function suggestedCommercialMapping(headers: string[]) {
  return Object.fromEntries(commercialImportFields.map((field) => {
    const aliases = new Set(field.aliases.map(normalizeCommercialHeader));
    const matches = headers.reduce<number[]>((items, header, index) => {
      if (aliases.has(normalizeCommercialHeader(header))) items.push(index);
      return items;
    }, []);
    return [field.key, matches.length === 1 ? matches[0] : null];
  })) as Record<CommercialImportFieldKey, number | null>;
}

export function safeSpreadsheetText(value: string) {
  const text = value.normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

