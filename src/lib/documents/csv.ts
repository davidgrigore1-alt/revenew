import Papa from "papaparse";
import type { CommercialImportFieldKey } from "../commercial-ingestion-fields";

export const DOCUMENT_CSV_LIMITS = { bytes: 2 * 1024 * 1024, rows: 1000, columns: 30, cell: 6000, requestBytes: 512 * 1024 } as const;
export type DocumentCsv = { headers:string[]; rows:string[][]; delimiter:string };

export function parseDocumentCsv(text:string):DocumentCsv {
  if(new TextEncoder().encode(text).length>DOCUMENT_CSV_LIMITS.bytes) throw new Error("Fișierul depășește 2 MB. Împarte-l înainte de import.");
  if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)||/^PK\u0003\u0004|^%PDF-|^\{\\rtf/.test(text)) throw new Error("Conținutul nu este un CSV text valid. Fișierele binare nu sunt acceptate.");
  const parsed=Papa.parse<string[]>(text.replace(/^\uFEFF/,""),{header:false,dynamicTyping:false,skipEmptyLines:false,preview:DOCUMENT_CSV_LIMITS.rows+2});
  // Papa emits one empty record for a final line terminator; all actual blank rows remain.
  const data=parsed.data;
  if(/(?:\r\n|\n|\r)$/.test(text)&&data.at(-1)?.length===1&&data.at(-1)?.[0]==="")data.pop();
  if(parsed.meta.truncated||data.length>DOCUMENT_CSV_LIMITS.rows+1) throw new Error("Limita este de 1.000 de rânduri de date. Niciun rând nu a fost trunchiat pentru import.");
  if(parsed.errors.some(error=>error.code!=="UndetectableDelimiter")) throw new Error("CSV-ul conține ghilimele sau delimitări invalide. Corectează fișierul înainte de import.");
  if(data.length<2) throw new Error("Include un antet și cel puțin un rând de date.");
  const headers=data[0];
  if(headers.length>DOCUMENT_CSV_LIMITS.columns||headers.some(header=>!header.trim()||header.length>80)) throw new Error("Antetul trebuie să aibă cel mult 30 de coloane, cu nume de 1–80 de caractere.");
  if(new Set(headers.map(header=>header.trim().toLocaleLowerCase("ro-RO"))).size!==headers.length) throw new Error("Numele coloanelor sunt duplicate. Redenumește-le pentru o mapare neambiguă.");
  const rows=data.slice(1);
  if(rows.some(row=>row.length!==headers.length)) throw new Error("Unele rânduri au un număr diferit de coloane. Verifică separatorul și celulele goale.");
  if(rows.some(row=>row.some(cell=>cell.length>DOCUMENT_CSV_LIMITS.cell))) throw new Error("O celulă depășește 6.000 de caractere. Conținutul nu a fost trunchiat.");
  return {headers,rows,delimiter:parsed.meta.delimiter};
}

export function mapDocumentCsv(csv:DocumentCsv,mapping:Partial<Record<CommercialImportFieldKey,number|null>>) {
  if(mapping.title===null||mapping.title===undefined) throw new Error("Mapează coloana pentru titlul semnalului.");
  const entries=Object.entries(mapping).filter((entry):entry is [CommercialImportFieldKey,number]=>entry[1]!==null&&entry[1]!==undefined);
  if(entries.some(([,index])=>!Number.isInteger(index)||index<0||index>=csv.headers.length))throw new Error("Maparea nu mai corespunde fișierului curent.");
  if(new Set(entries.map(([,index])=>index)).size!==entries.length)throw new Error("O coloană poate fi mapată o singură dată. Elimină maparea duplicată.");
  const rows=csv.rows.map(row=>Object.fromEntries(entries.map(([key,index])=>[key,row[index]])));
  if(new TextEncoder().encode(JSON.stringify(rows)).length>DOCUMENT_CSV_LIMITS.requestBytes)throw new Error("Datele mapate depășesc limita de 512 KB pentru validare. Împarte importul în fișiere mai mici.");
  return rows;
}
