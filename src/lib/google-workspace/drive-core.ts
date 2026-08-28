import { createHash } from "crypto";
import Papa from "papaparse";

import { DRIVE_LIMITS, DRIVE_MIMES, type SourceSegment } from "./drive-types";
export * from "./drive-types";
export function hashText(text:string) { return createHash("sha256").update(text).digest("hex"); }
export function extractDriveText(raw:string, mime:string) {
 const normalized = raw.replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n").replace(/\u0000/g,"");
 if (normalized.length > DRIVE_LIMITS.characters) throw new Error("too_large");
 const segments:SourceSegment[] = [];
 const add = (text:string, start:number, end:number, csv:boolean) => {
  if (!text.trim()) return;
  if (text.length > DRIVE_LIMITS.segmentCharacters || segments.length >= DRIVE_LIMITS.segments) throw new Error("too_large");
  segments.push({ ordinal:segments.length,text,text_hash:hashText(text),location_type:csv?"csv_rows":"lines",
   location_label:csv ? `Prima foaie exportată · rândurile ${start}–${end}` : `Text exportat · liniile ${start}–${end}` });
 };
 const csv = mime === DRIVE_MIMES[1];
 let rows:string[];
 if (csv) {
  const parsed = Papa.parse<string[]>(normalized,{skipEmptyLines:false,preview:DRIVE_LIMITS.spreadsheetRows+1});
  if (parsed.errors.length || parsed.data.length > DRIVE_LIMITS.spreadsheetRows) throw new Error("too_large");
  if (parsed.data.some(row=>row.length>DRIVE_LIMITS.spreadsheetColumns) || parsed.data.reduce((n,row)=>n+row.length,0)>DRIVE_LIMITS.spreadsheetCells) throw new Error("too_large");
  // Values remain text: formulas, HTML and instructions are never evaluated.
  rows = parsed.data.map(row=>row.map(cell=>JSON.stringify(cell)).join(" | "));
 } else rows = normalized.split("\n");
 let pending:string[] = [], start=1, length=0;
 rows.forEach((row,index)=>{
  if (length + row.length + 1 > DRIVE_LIMITS.segmentCharacters && pending.length) {
   add(pending.join("\n"),start,index,csv); pending=[];start=index+1;length=0;
  }
  pending.push(row);length+=row.length+1;
 });
 add(pending.join("\n"),start,rows.length,csv);
 if (segments.reduce((n,s)=>n+s.text.length,0) > DRIVE_LIMITS.characters) throw new Error("too_large");
 return { segments, contentHash:hashText(normalized),
  note:csv?"Prima foaie exportată în CSV; maximum 500 rânduri, 40 coloane și 10.000 celule. Fără formule evaluate.":"Text simplu; pozițiile indică liniile exportului, nu pagini sau secțiuni originale.",
  contentTrust:"untrusted_external_data" as const };
}
export async function boundedBatch<T,R>(items:T[],run:(item:T)=>Promise<R>):Promise<PromiseSettledResult<R>[]> {
 const results:PromiseSettledResult<R>[] = new Array(items.length); let index=0;
 await Promise.all(Array.from({length:Math.min(DRIVE_LIMITS.concurrency,items.length)},async()=>{
  while(index<items.length) { const current=index++; try { results[current]={status:"fulfilled",value:await run(items[current])}; }
   catch(reason) {results[current]={status:"rejected",reason};} }
 }));
 return results;
}
