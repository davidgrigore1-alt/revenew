export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const DRIVE_LIMITS = Object.freeze({ batch: 10, concurrency: 2, downloadBytes: 5 * 1024 * 1024,
 exportBytes: 1024 * 1024, characters: 200000, segments: 128, segmentCharacters: 8000,
 spreadsheetRows: 500, spreadsheetColumns: 40, spreadsheetCells: 10000, spreadsheetSheets: 1,
 requestBytes: 16000, metadataBytes: 16000, timeoutMs: 15000 });
export const DRIVE_MIMES = ["application/vnd.google-apps.document", "application/vnd.google-apps.spreadsheet", "application/pdf", "text/plain"] as const;
export const documentKinds = { offer: "Ofertă", contract: "Contract", brief: "Brief", specification: "Specificație", other: "Altul" } as const;
export type DocumentKind = keyof typeof documentKinds;
export type SourceState = "synced" | "metadata_only" | "too_large" | "unsupported" | "access_revoked" | "unavailable" | "extraction_failed" | "removed";
export const sourceStateLabels: Record<SourceState,string> = { synced:"Sincronizat", metadata_only:"Doar metadate", too_large:"Prea mare",
 unsupported:"Format neacceptat", access_revoked:"Acces retras", unavailable:"Indisponibil", extraction_failed:"Extragere nereușită", removed:"Eliminat" };
export type SourceSegment = { ordinal:number; text:string; text_hash:string; location_type:"lines"|"csv_rows"; location_label:string };
export type DriveSelection = { fileId:string; resourceKey?:string; opportunityId:string; kind:DocumentKind };
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function driveId(value: unknown): value is string { return typeof value === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(value); }
export function parseSelections(value: unknown): DriveSelection[] {
 if (!Array.isArray(value) || !value.length || value.length > DRIVE_LIMITS.batch) throw new Error("invalid_selection");
 const result = new Map<string,DriveSelection>();
 for (const input of value) {
  if (!input || typeof input !== "object" || !driveId(input.fileId) || !uuidPattern.test(input.opportunityId ?? "")
   || !Object.hasOwn(documentKinds,input.kind) || (input.resourceKey !== undefined && !driveId(input.resourceKey))) throw new Error("invalid_selection");
  const item = { fileId:input.fileId, resourceKey:input.resourceKey, opportunityId:input.opportunityId, kind:input.kind } as DriveSelection;
  const prior = result.get(item.fileId);
  if (prior && (prior.opportunityId !== item.opportunityId || prior.kind !== item.kind)) throw new Error("ambiguous_context");
  result.set(item.fileId,item);
 }
 return Array.from(result.values());
}
export function pickerScopeIsSafe(scope?:string) {
 const scopes = Array.from(new Set((scope ?? "").split(/\s+/).filter(Boolean)));
 return scopes.length === 1 && scopes[0] === DRIVE_SCOPE;
}
