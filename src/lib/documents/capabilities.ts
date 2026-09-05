import type { SourceState } from "../google-workspace/drive-types";

export const internalCommercialTypes = ["offer_draft", "offer", "procurement_checklist", "checklist", "grant_summary"] as const;
/** Route only types supported by the protected detail loader; other work keeps its existing context. */
export function commercialDocumentHref(document:{id:string;type?:string;status:string},opportunityId:string) {
  return document.status!=="archived"&&(internalCommercialTypes as readonly string[]).includes(document.type??"")
    ? `/documents/${document.id}` : `/opportunities/${opportunityId}?tab=workflow#opportunity-documents`;
}

/** Presentation only. Permissions and provider access are enforced by existing server paths. */
export function documentCapabilities(input: {
  internal?: boolean; mime: string; state?: SourceState; hasText?: boolean;
  hasOriginal?: boolean; canVerify?: boolean;
}) {
  const textFormat = ["text/plain", "application/vnd.google-apps.document", "application/vnd.google-apps.spreadsheet"].includes(input.mime);
  const stored = input.internal || (textFormat && input.state === "synced" && input.hasText === true);
  const sheet = input.mime === "application/vnd.google-apps.spreadsheet";
  return {
    original: input.hasOriginal === true,
    preview: Boolean(stored),
    text: Boolean(stored),
    grid: Boolean(stored && sheet),
    evidence: Boolean(stored && !input.internal),
    verify: input.canVerify === true,
    importRecords: false, edit: false, export: false,
    coverage: input.internal ? "Conținut intern salvat" : sheet && stored ? "Prima foaie exportată · acoperire parțială" : stored ? "Text normalizat · fără paginarea originală" : "Conținut indisponibil",
  };
}

export function documentSourceState(state?: SourceState) {
  switch (state) {
    case "synced": return { label: "Text salvat", detail: "Copie extrasă la ultima sincronizare. Versiunea curentă din Drive nu a fost verificată acum." };
    case "metadata_only": return { label: "Doar metadate", detail: "Identitatea sursei este salvată. Conținutul nu este extras și nu poate susține o concluzie AI." };
    case "too_large": return { label: "Limită depășită", detail: "Sursa depășește limitele de extracție. Nu este afișat un conținut trunchiat." };
    case "unsupported": return { label: "Format fără extracție", detail: "Acest format nu are un parser aprobat. Deschide originalul pentru verificare." };
    case "access_revoked": return { label: "Acces de verificat", detail: "Ultima încercare nu a putut accesa fișierul. Verifică permisiunile în Google Drive." };
    case "unavailable": return { label: "Sursă indisponibilă", detail: "Sursa nu a fost disponibilă la ultima încercare. Nu presupunem că a fost ștearsă." };
    case "extraction_failed": return { label: "Extracție nereușită", detail: "Textul nu a putut fi extras în siguranță. Verifică originalul sau reîncearcă sincronizarea." };
    default: return { label: "Stare necunoscută", detail: "Nu există o verificare disponibilă pentru această sursă." };
  }
}

/** Decode our own bounded JSON-string cell representation, never a workbook or formula. */
export function decodeStoredSheet(text: string): string[][] | null {
  if (!text || text.length > 200_000) return null;
  const lines = text.split("\n");
  if (lines.length > 500) return null;
  let cells = 0;
  const rows: string[][] = [];
  for (const line of lines) {
    const row: string[] = [];
    let cursor = 0;
    while (cursor < line.length) {
      // JSON.parse handles escapes only after the token has been bounded and delimited.
      const match = /^"(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/.exec(line.slice(cursor));
      if (!match) return null;
      try { row.push(JSON.parse(match[0]) as string); } catch { return null; }
      if (row.length > 40 || ++cells > 10_000) return null;
      cursor += match[0].length;
      if (cursor === line.length) break;
      if (line.slice(cursor, cursor + 3) !== " | ") return null;
      cursor += 3;
      if (cursor === line.length) return null;
    }
    if (!row.length) return null;
    rows.push(row);
  }
  return rows;
}
