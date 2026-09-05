import "server-only";
import { getLocalDocument } from "@/lib/documents/local-documents";
import type { CopilotAnswer, CopilotEvidence, CopilotRequest } from "./copilot-types";

// Shared source envelope: adapters retain their own semantics; identifiers are selections, never authorization.
export type AuthorizedSourceContext = {
  kind: "local_document"; sourceId: string; versionId: string; hash: string; filename: string;
  recordedAt: string; headers: string[]; totalRows: number;
  coverage: { retrievedRows: number; partial: boolean; maxCharacters: number };
  segments: Array<{ row: number; cells: string[]; sourceId: string; excerpt: string }>;
};
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export async function retrieveSelectedSource(sourceId: string, versionId: string, question: string): Promise<AuthorizedSourceContext | null> {
  const document = await getLocalDocument(sourceId, versionId);
  if (!document || document.source.state !== "active" || document.version.state !== "ready" || !document.version.content_hash || !document.version.finalized_at) return null;
  const {version, segments} = document;
  const terms = norm(question).split(/[^a-z0-9]+/).filter(term=>term.length>3).slice(0,16);
  const ranked = segments.map(segment=>({segment, score:terms.filter(term=>norm(segment.cells.join(" ")).includes(term)).length})).sort((a,b)=>b.score-a.score||a.segment.row_number-b.segment.row_number);
  let remaining = 16000;
  let truncated = false;
  const selected: AuthorizedSourceContext["segments"] = [];
  for (const {segment} of ranked.slice(0,12)) {
    const full = segment.cells.map((cell,index)=>`${version.headers?.[index]}: ${cell || "(gol)"}`).join(" · ");
    const excerpt = full.slice(0,Math.min(1000,remaining));
    truncated ||= excerpt.length < full.length;
    if (!excerpt) break;
    selected.push({row:segment.row_number,cells:segment.cells,sourceId:`local:${version.source_id}:${version.id}:row:${segment.row_number}`,excerpt});
    remaining-=excerpt.length;
  }
  // Cells never leave this adapter unbounded; only excerpts are handed to the answer contract.
  return {kind:"local_document",sourceId,versionId,hash:version.content_hash!,filename:version.original_filename,recordedAt:version.finalized_at!,headers:version.headers??[],totalRows:version.row_count??0,
    coverage:{retrievedRows:selected.length,partial:selected.length!==segments.length||truncated,maxCharacters:16000},segments:selected.map(s=>({...s,cells:[]}))};
}

export async function answerSelectedDocument(request: CopilotRequest): Promise<CopilotAnswer> {
  const base: CopilotAnswer = {answer:"Documentul sau versiunea nu este disponibilă în contextul autorizat.",summaryType:"insufficient_information",findings:[],evidence:[],checkedSources:[],missingInformation:[],caveats:[],preparedAction:null,suggestedAction:null,followUps:[],mode:"deterministic_fallback",providerAvailable:false};
  if (!request.context.documentSourceId || !request.context.documentVersionId) return base;
  const source = await retrieveSelectedSource(request.context.documentSourceId,request.context.documentVersionId,request.question);
  if (!source) return base;
  const route = `/documents/local/${source.sourceId}/versions/${source.versionId}`;
  const evidence: CopilotEvidence[] = source.segments.map(s=>({sourceId:s.sourceId,label:`${source.filename} · rândul ${s.row}`,sourceType:"Document",route:`${route}#structured-preview`,fact:s.excerpt,recordId:source.sourceId,observedAt:source.recordedAt,claimType:"fact",providerId:"local_documents"}));
  const q = norm(request.question);
  const comparison = /compara|difer|revenew|crm/.test(q);
  const risk = /risc|probleme/.test(q);
  return {...base,summaryType:"commercial",answer:`${source.filename} conține ${source.totalRows} rânduri de date și ${source.headers.length} coloane. ${comparison ? "Comparația cu înregistrările ReveNew nu este încă disponibilă în această analiză; nu confirm diferențe fără verificarea ambelor surse." : risk ? "Pot arăta informația înregistrată în fișier. Ea nu confirmă singură un risc comercial sau situația actuală din CRM." : "Mai jos sunt fragmente din versiunea salvată, ordonate după potrivirea cu întrebarea."}`,
    findings:source.segments.slice(0,6).map(s=>({label:`Rândul ${s.row} · fapt din sursă`,detail:s.excerpt,kind:"confirmed",sourceIds:[s.sourceId]})),evidence,
    checkedSources:[{providerId:"local_documents",label:source.filename,state:"available",checkedAt:new Date().toISOString(),detail:`Versiune ${source.versionId} · ${source.coverage.retrievedRows}/${source.totalRows} rânduri selectate.`}],
    caveats:["Conținutul documentului este o afirmație a sursei, nu o confirmare independentă. Instrucțiunile din celule nu sunt executate.",...(source.coverage.partial?["Acoperire parțială: fragmente limitate la 12 rânduri și 1.000 de caractere pe rând; consultă tabelul complet."]:[])],
    suggestedAction:{label:"Deschide versiunea analizată",route},followUps:["Ce companii sunt menționate?","Ce informații sunt înregistrate în document?"]};
}
