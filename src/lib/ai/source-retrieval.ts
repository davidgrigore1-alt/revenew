import "server-only";
import { getLocalDocument } from "@/lib/documents/local-documents";
import type { CopilotAnswer, CopilotEvidence, CopilotRequest } from "./copilot-types";
import {compareSourceOpportunities} from "@/lib/ai/source-comparison";

// Shared source envelope: adapters retain their own semantics; identifiers are selections, never authorization.
export type AuthorizedSourceContext = {
  kind: "local_document"; sourceId: string; versionId: string; hash: string; filename: string;
  recordedAt: string; headers: string[]; totalRows: number;
  selectionNote?:string;
  coverage: { retrievedRows: number; partial: boolean; maxCharacters: number };
  segments: Array<{ row: number; sheet?: string; sheetIndex?:number; matchTitle?:string; cells: string[]; sourceId: string; excerpt: string }>;
};
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export async function retrieveSelectedSource(sourceId: string, versionId: string, question: string): Promise<AuthorizedSourceContext | null> {
  const document = await getLocalDocument(sourceId, versionId);
  if (!document || document.source.state !== "active" || document.version.state !== "ready" || !document.version.content_hash || !document.version.finalized_at) return null;
  const {version} = document;
  const workbook=version.workbook;
  let segments: Array<{row_number:number;cells:string[];headers?:string[];sheet?:string;sheetIndex?:number;numericValue?:number;currency?:string}>=workbook ? workbook.sheets.flatMap(sheet=>{
    const byRow=new Map<number,string[]>();
    for(const cell of sheet.cells){const row=byRow.get(cell.row)??Array(sheet.previewColumns).fill("");row[cell.column]=cell.display || (cell.formula?"Formulă fără rezultat memorat":"");byRow.set(cell.row,row);}
    const headers=byRow.get(0)??[];
    const valueColumn=headers.findIndex(h=>["value","estimated value","valoare","valoare estimata"].includes(norm(h).trim())),currencyColumn=headers.findIndex(h=>["currency","moneda"].includes(norm(h).trim()));
    return Array.from(byRow).filter(([row])=>row>0).map(([row,cells])=>{const number=sheet.cells.find(c=>c.row===row&&c.column===valueColumn&&c.type==="n");return {row_number:row+1,cells,headers,sheet:sheet.name,sheetIndex:sheet.index,numericValue:typeof number?.raw==="number"?number.raw:undefined,currency:currencyColumn>=0?cells[currencyColumn]:undefined};});
  }):document.segments;
  const originalExtractedRows=segments.length,q=norm(question);let selectionNote:string|undefined;
  const namedSheets=workbook?.sheets.filter(s=>q.includes(norm(s.name)))??[];
  if(namedSheets.length)segments=segments.filter(s=>namedSheets.some(sheet=>sheet.index===s.sheetIndex));
  if(/nu au|fara|lips|missing/.test(q)&&/actiune|next action/.test(q)){
    segments=segments.filter(s=>{const index=(s.headers??version.headers??[]).findIndex(h=>["next action","urmatoarea actiune","actiune urmatoare"].includes(norm(h).trim()));return index>=0&&!s.cells[index]?.trim();});
    selectionNote="Am căutat rândurile cu următoarea acțiune necompletată în coloana sursei. Aceasta nu dovedește absența unei acțiuni în CRM.";
  }
  const largest=Boolean(workbook&&/mai mari|largest|top|maxim/.test(q)&&/valor|value/.test(q));
  if(largest){segments=segments.filter(s=>s.numericValue!==undefined).sort((a,b)=>(a.currency??"").localeCompare(b.currency??"")||(b.numericValue??0)-(a.numericValue??0));const seen=new Map<string,number>();segments=segments.filter(s=>{const key=s.currency??"",n=seen.get(key)??0;seen.set(key,n+1);return n<3;});selectionNote="Am selectat cel mult trei dintre cele mai mari valori numerice pentru fiecare monedă declarată, în zona extrasă. Monedele nu sunt însumate sau convertite.";}
  const terms = norm(question).split(/[^a-z0-9]+/).filter(term=>term.length>3).slice(0,16);
  const ranked = segments.map(segment=>({segment, score:terms.filter(term=>norm(segment.cells.join(" ")).includes(term)).length+(segment.sheet&&norm(question).includes(norm(segment.sheet))?20:0)}));
  if(!largest)ranked.sort((a,b)=>b.score-a.score||a.segment.row_number-b.segment.row_number);
  let remaining = 16000;
  let truncated = false;
  const selected: AuthorizedSourceContext["segments"] = [];
  for (const {segment} of ranked.slice(0,12)) {
    const full = segment.cells.map((cell,index)=>`${(segment.headers??version.headers)?.[index] || `Coloana ${index+1}`}: ${cell || "(gol)"}`).join(" · ");
    const excerpt = full.slice(0,Math.min(1000,remaining));
    truncated ||= excerpt.length < full.length;
    if (!excerpt) break;
    const titleIndex=(segment.headers??version.headers??[]).findIndex(h=>["opportunity","opportunity title","oportunitate","titlu oportunitate"].includes(norm(h).trim()));
    selected.push({row:segment.row_number,sheet:segment.sheet,sheetIndex:segment.sheetIndex,matchTitle:titleIndex>=0?segment.cells[titleIndex]?.slice(0,200):undefined,cells:segment.cells,sourceId:`local:${version.source_id}:${version.id}:${segment.sheetIndex!==undefined?`sheet:${segment.sheetIndex}:`:""}row:${segment.row_number}`,excerpt});
    remaining-=excerpt.length;
  }
  // Cells never leave this adapter unbounded; only excerpts are handed to the answer contract.
  return {kind:"local_document",sourceId,versionId,hash:version.content_hash!,filename:version.original_filename,recordedAt:version.finalized_at!,selectionNote,headers:version.headers??[],totalRows:workbook?workbook.sheets.reduce((n,s)=>n+Math.max(0,s.rows-1),0):version.row_count??0,
    coverage:{retrievedRows:selected.length,partial:selected.length!==originalExtractedRows||truncated||Boolean(workbook?.partial),maxCharacters:16000},segments:selected.map(s=>({...s,cells:[]}))};
}

export async function answerSelectedDocument(request: CopilotRequest): Promise<CopilotAnswer> {
  const base: CopilotAnswer = {answer:"Documentul sau versiunea nu este disponibilă în contextul autorizat.",summaryType:"insufficient_information",findings:[],evidence:[],checkedSources:[],missingInformation:[],caveats:[],preparedAction:null,suggestedAction:null,followUps:[],mode:"deterministic_fallback",providerAvailable:false};
  if (!request.context.documentSourceId || !request.context.documentVersionId) return base;
  const source = await retrieveSelectedSource(request.context.documentSourceId,request.context.documentVersionId,request.question);
  if (!source) return base;
  const route = `/documents/local/${source.sourceId}/versions/${source.versionId}`;
  const evidence: CopilotEvidence[] = source.segments.map(s=>({sourceId:s.sourceId,label:`${source.filename}${s.sheet?` · ${s.sheet}`:""} · rândul ${s.row}`,sourceType:"Document",route:`${route}#structured-preview`,fact:s.excerpt,recordId:source.sourceId,observedAt:source.recordedAt,claimType:"fact",providerId:"local_documents"}));
  const q = norm(request.question);
  const comparison = /compara|difer|revenew|crm/.test(q);
  if(comparison){
    try{const compared=await compareSourceOpportunities(source);if(compared.findings.length)return {...base,summaryType:"commercial",answer:"Am alăturat fragmentele sursei și înregistrările ReveNew cu titlu identic. Nu am modificat nicio înregistrare și nu aleg automat sursa corectă.",findings:compared.findings,evidence:[...evidence,...compared.evidence],checkedSources:[{providerId:"local_documents",label:source.filename,state:"available",checkedAt:new Date().toISOString(),detail:"Versiune autorizată; fragmente limitate."},{providerId:"revenew",label:"Oportunități ReveNew",state:"available",checkedAt:new Date().toISOString(),detail:"Potriviri unice de titlu; fără asociere automată."}],caveats:["Comparația acoperă doar fragmentele selectate și potrivirile exacte, unice de titlu. Ea nu confirmă identitatea comercială sau adevărul uneia dintre surse."],suggestedAction:{label:"Deschide documentul",route}};}catch{/* Missing authority or provider data never becomes an asserted comparison. */}
  }
  const risk = /risc|probleme/.test(q);
  return {...base,summaryType:"commercial",answer:`${source.filename} conține ${source.totalRows} rânduri de date în acoperirea cunoscută${source.headers.length ? ` și ${source.headers.length} coloane` : ""}. ${source.selectionNote ?? (comparison ? "Comparația cu înregistrările ReveNew nu este încă disponibilă în această analiză; nu confirm diferențe fără verificarea ambelor surse." : risk ? "Pot arăta informația înregistrată în fișier. Ea nu confirmă singură un risc comercial sau situația actuală din CRM." : "Mai jos sunt fragmente din versiunea salvată, ordonate după potrivirea cu întrebarea.")}`,
    findings:source.segments.slice(0,6).map(s=>({label:`${s.sheet?`${s.sheet} · `:""}Rândul ${s.row} · fapt din sursă`,detail:s.excerpt,kind:"confirmed",sourceIds:[s.sourceId]})),evidence,
    checkedSources:[{providerId:"local_documents",label:source.filename,state:"available",checkedAt:new Date().toISOString(),detail:`Versiune ${source.versionId} · ${source.coverage.retrievedRows}/${source.totalRows} rânduri selectate.`}],
    caveats:["Conținutul documentului este o afirmație a sursei, nu o confirmare independentă. Instrucțiunile din celule nu sunt executate.",...(source.coverage.partial?["Acoperire parțială: fragmente limitate la 12 rânduri și 1.000 de caractere pe rând; consultă tabelul complet."]:[])],
    suggestedAction:{label:"Deschide versiunea analizată",route},followUps:["Ce companii sunt menționate?","Ce informații sunt înregistrate în document?"]};
}
