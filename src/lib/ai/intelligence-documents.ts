import "server-only";
import { discoverLocalDocumentVersions, getLocalDocument } from "@/lib/documents/local-documents";
import type { CopilotAnswer, CopilotEvidence, CopilotRequest } from "./copilot-types";
import { calculateRetainedRows, retainedRows, relevance, type Calculation } from "./intelligence-evidence";
import { getUniversalBusinessContext } from "./universal-business-context";

export type DocumentRetrieval = { evidence: CopilotEvidence[]; calculations: Calculation[]; checks: CopilotAnswer["checkedSources"]; limits: string[] };
export async function retrieveIntelligenceDocuments(request: CopilotRequest, now = new Date(), signal?: AbortSignal): Promise<DocumentRetrieval> {
  const result: DocumentRetrieval = {evidence:[],calculations:[],checks:[],limits:[]};
  // Explicit company/contact/opportunity scope cannot silently search unassociated files.
  try {
    let allowedOpportunities:string[]|undefined;
    const page=request.context;
    if(!page.documentSourceId&&(page.organizationId||page.contactId||page.opportunityId)){
      const universal=await getUniversalBusinessContext(page);
      allowedOpportunities=universal.summary.opportunities.filter(o=>(!page.organizationId||o.organizationId===page.organizationId)&&(!page.opportunityId||o.id===page.opportunityId)&&(!page.contactId||o.contacts?.some(link=>link.contact.id===page.contactId))).map(o=>o.id).slice(0,200);
      if(!allowedOpportunities.length)return result;
      result.limits.push("Documentele sunt limitate la asocierile explicite ale oportunităților vizibile.");
    }
    const discovery = request.context.documentSourceId && request.context.documentVersionId
      ? {versions:[{source_id:request.context.documentSourceId,id:request.context.documentVersionId}],partial:false}
      : await discoverLocalDocumentVersions(allowedOpportunities);
    if (discovery.partial) result.limits.push("Căutarea documentelor acoperă cel mult 40 de versiuni recente; fișiere mai vechi pot lipsi.");
    const candidates: Array<{evidence:CopilotEvidence;score:number}> = [];
    let found = 0, failed = 0;
    for (let offset=0; offset<discovery.versions.length; offset+=2) {
      if (signal?.aborted) throw new Error("analysis_cancelled");
      const loaded = await Promise.allSettled(discovery.versions.slice(offset,offset+2).map(async item => {
        const document = await getLocalDocument(item.source_id,item.id);
        if (!document || document.source.state!=="active" || document.version.state!=="ready") return;
        const version=document.version, rows=retainedRows(version,document.segments);
        found++;
        const partial=Boolean(version.workbook?.partial);
        const calculation=request.context.documentSourceId ? calculateRetainedRows(request.question,rows,partial,request.analysisIntent) : null;
        if(request.context.documentSourceId&&!calculation&&/suma|total|sum\b|top\s*\d/i.test(request.question))result.limits.push("Nu am putut valida operația sau filtrul pentru un calcul complet. Fragmentele nu sunt un total; precizează foaia, coloana și filtrul dorit.");
        if (calculation) result.calculations.push(calculation);
        const ranked=rows.map(row=>({row,score:relevance(request.question,`${version.original_filename} ${row.sheet} ${row.excerpt}`)})).sort((a,b)=>b.score-a.score||a.row.row-b.row.row);
        const selected=calculation?.operation==="top" ? ranked.filter(r=>calculation.ranked.some(item=>item.id===r.row.id)) : calculation?.operation==="missing" ? ranked.filter(r=>calculation.rows.includes(r.row.id)) : ranked;
        for (const {row,score} of selected.slice(0,12)) {
          if (!request.context.documentSourceId && !score) continue;
          candidates.push({score,evidence:{sourceId:row.id,recordId:version.source_id,label:`${version.original_filename} · ${row.sheet} · rând ${row.row}`,sourceType:"Document",fact:row.excerpt.slice(0,1000),route:`/documents/local/${version.source_id}/versions/${version.id}#structured-preview`,observedAt:version.finalized_at,providerId:"local_documents",claimType:"fact",provenance:{family:"local_documents",recordId:version.source_id,version:version.id,independenceKey:`content:${version.content_hash}`,classification:"source_declaration",retrievedAt:now.toISOString(),analyzedAt:now.toISOString(),modifiedAt:version.finalized_at,locator:{sheet:row.sheet,sheetIndex:row.sheetIndex,row:row.row},coverage:"retained_projection",partial:partial||rows.length>12}}});
        }
        if (calculation) {
          const fact=calculation.operation==="sum" ? calculation.totals.map(t=>`${t.amount} ${t.currency}`).join("; ") : calculation.operation==="top" ? calculation.ranked.map(r=>`${r.amount} ${r.currency}`).join("; ") : `${calculation.rows.length} rânduri`;
          candidates.push({score:1000,evidence:{sourceId:calculation.id,recordId:version.source_id,label:`Calcul din ${version.original_filename}`,sourceType:"Document",fact:`${calculation.definition}: ${fact || "niciun rezultat numeric acceptat"}. Excluse: ${calculation.exclusions}. ${partial?"Rezultat parțial al zonei extrase.":"Calcul în proiecția reținută."}`,route:`/documents/local/${version.source_id}/versions/${version.id}#structured-preview`,observedAt:version.finalized_at,claimType:"derived",providerId:"local_documents",provenance:{family:"local_documents",recordId:version.source_id,version:version.id,independenceKey:`content:${version.content_hash}`,classification:"computed_result",retrievedAt:now.toISOString(),analyzedAt:now.toISOString(),modifiedAt:version.finalized_at,locator:{},coverage:"retained_projection",partial}}});
        }
        if (partial) result.limits.push("Extracția workbookului este parțială. Rezultatele nu reprezintă întregul original.");
      }));
      failed += loaded.filter(r=>r.status==="rejected").length;
    }
    // Two excerpts per document first, then fill remaining budget. Avoid one file drowning out another.
    const ordered=candidates.sort((a,b)=>b.score-a.score), seen=new Map<string,number>();
    const diverse=ordered.filter(c=>{const key=c.evidence.recordId!;const count=seen.get(key)??0;seen.set(key,count+1);return count<2;});
    result.evidence=Array.from(new Map([...diverse,...ordered].map(c=>[c.evidence.sourceId,c.evidence])).values()).slice(0,16);
    result.checks.push({providerId:"local_documents",label:"Documente CSV / XLSX",state:failed?"unavailable":"available",checkedAt:now.toISOString(),detail:failed?"O parte din surse nu a putut fi citită; rezultatele independente sunt păstrate.":`${found} documente autorizate parcurse; maximum 16 fragmente în răspuns.`});
    if (!result.evidence.length) result.limits.push(request.context.documentSourceId?"Documentul sau versiunea nu este disponibilă în contextul autorizat.":"Nu am găsit fragmente relevante în documentele parcurse.");
  } catch {
    result.checks.push({providerId:"local_documents",label:"Documente CSV / XLSX",state:"unavailable",checkedAt:now.toISOString(),detail:"Sursele nu au putut fi verificate în contextul curent."});
  }
  return result;
}
