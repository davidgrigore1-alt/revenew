import { createHash } from "node:crypto";
import { DOCUMENT_CSV_LIMITS, parseDocumentCsv } from "./csv";
import type { WorkbookProjection } from "./workbook-types";

export const LOCAL_DOCUMENT_BUCKET = "commercial-document-originals";
export const LOCAL_DOCUMENT_PARSER = "csv-utf8-v1";
export class LocalDocumentError extends Error {
  constructor(public code: string, message: string, public retained = false) { super(message); }
}
export function inspectLocalDocument(bytes: Uint8Array, filename: string, mime: string) {
  if (!/\.csv$/i.test(filename) || filename.length > 240 || /[\x00-\x1f/\\]/.test(filename) || !["", "text/csv", "application/csv", "application/vnd.ms-excel"].includes(mime)) {
    throw new LocalDocumentError("format", "Formatul nu este încă disponibil pentru încărcare locală. Alege un fișier CSV; originalul nu a fost salvat.");
  }
  if (!bytes.length || bytes.length > DOCUMENT_CSV_LIMITS.bytes) throw new LocalDocumentError("size", "Fișierul trebuie să aibă cel mult 2 MB. Originalul nu a fost salvat.");
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { throw new LocalDocumentError("encoding", "Fișierul nu este UTF-8. Salvează o copie CSV UTF-8 și reîncearcă. Originalul nu a fost salvat."); }
  try {
    const csv = parseDocumentCsv(text);
    return { csv, hash: createHash("sha256").update(bytes).digest("hex"), size: bytes.length };
  } catch (error) {
    throw new LocalDocumentError("parse", `${error instanceof Error ? error.message : "CSV-ul nu poate fi citit."} Originalul nu a fost salvat.`);
  }
}

export type LocalDocumentVersion = {
  workbook?: WorkbookProjection | null;
  id: string; source_id: string; business_id: string; uploader_profile_id: string; original_filename: string;
  object_key: string; format: string; mime_type: string; state: string; byte_size: number | null; content_hash: string | null;
  parser_version: string | null; headers: string[] | null; row_count: number | null; column_count: number | null;
  created_at: string; finalized_at: string | null; failure_code: string | null;
};
export type LocalDocumentSource = { id: string; business_id: string; opportunity_id: string | null; state: string; created_at: string };
export type LocalDocumentSegment = { row_number: number; cells: string[] };
export function localDocumentState(state: string) {
  return ({ reserved: "Încărcare nefinalizată", verifying: "Verificare în curs", ready: "Disponibil", parse_failed: "Conținut indisponibil", unavailable: "Necesită reîncercare", deletion_pending: "Ștergere în așteptare", deleted: "Șters" } as Record<string,string>)[state] ?? "Indisponibil";
}
