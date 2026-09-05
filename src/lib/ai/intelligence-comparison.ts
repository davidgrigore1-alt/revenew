import "server-only";
import { getLocalDocument } from "@/lib/documents/local-documents";
import { getUniversalBusinessContext } from "./universal-business-context";
import { requirePermission } from "@/lib/authz/require-permission";
import { classifyComparison, comparisonLabels, type ComparisonField, type ComparisonObservation, type IntelligenceComparison, type IdentityCandidate } from "./intelligence-comparison-core";
import { retainedRows, relevance, normalizeIntelligenceText } from "./intelligence-evidence";
import type { CopilotEvidence, CopilotRequest } from "./copilot-types";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function retrieveIntelligenceComparison(request:CopilotRequest) {
  const result:{comparisons:IntelligenceComparison[];candidates:IdentityCandidate[];evidence:CopilotEvidence[];rowId?:string;limits:string[]}={comparisons:[],candidates:[],evidence:[],limits:[]};
  const page=request.context;
  if(!page.documentSourceId||!page.documentVersionId||page.documentComparisonScope!=="workspace")return result;
  await requirePermission("opportunities.read");
  const [document,universal]=await Promise.all([getLocalDocument(page.documentSourceId,page.documentVersionId),getUniversalBusinessContext(page)]);
  if(!document||document.source.state!=="active"||document.version.state!=="ready")throw new Error("analysis_source_changed");
  const rows=retainedRows(document.version,document.segments);
  const ranked=rows.map(row=>({row,score:relevance(request.analysisIntent?.query??request.question,`${row.sheet} ${row.excerpt}`)})).sort((a,b)=>b.score-a.score);
  const row=request.analysisIntent?.comparisonRowId?rows.find(r=>r.id===request.analysisIntent?.comparisonRowId):ranked[0]?.row;
  if(!row)return result;
  if(!request.analysisIntent?.comparisonRowId&&ranked.length>1&&ranked[0].score===ranked[1].score){result.limits.push("Precizează foaia sau identificatorul rândului pe care vrei să îl compari; nu aleg automat între rânduri la fel de relevante.");return result;}
  result.rowId=row.id;
  const read=(names:string[])=>{const i=row.headers.findIndex(h=>names.includes(normalizeIntelligenceText(h).trim()));return i<0||row.values[i]===null||row.unavailableColumns?.includes(i)?null:String(row.values[i]).trim();};
  const declaredId=read(["opportunity id","id oportunitate","canonical opportunity id"]);
  const title=read(["opportunity","opportunity title","oportunitate","titlu oportunitate"]);
  const available=universal.summary.opportunities.filter(o=>(!page.organizationId||o.organizationId===page.organizationId)&&(!page.contactId||o.contacts?.some(c=>c.contact.id===page.contactId))&&(!page.opportunityId||o.id===page.opportunityId));
  const explicitId=declaredId&&uuid.test(declaredId)?declaredId:document.source.opportunity_id;
  const selectedId=request.analysisIntent?.selectedCandidateId;
  const identityId=explicitId??selectedId;
  const matches=identityId?available.filter(o=>o.id===identityId):available.filter(o=>title&&normalizeIntelligenceText(o.title)===normalizeIntelligenceText(title));
  if(identityId&&matches.length!==1)throw new Error("analysis_candidate_unavailable");
  const documentEvidence:CopilotEvidence={sourceId:row.id,label:`${document.version.original_filename} · ${row.sheet} · rând ${row.row}`,fact:row.excerpt,sourceType:"Document",recordId:document.source.id,observedAt:document.version.finalized_at,route:`/documents/local/${document.source.id}/versions/${document.version.id}#structured-preview`,providerId:"local_documents",provenance:{family:"local_documents",recordId:document.source.id,version:document.version.id,independenceKey:`content:${document.version.content_hash}`,classification:"source_declaration",retrievedAt:new Date().toISOString(),analyzedAt:new Date().toISOString(),modifiedAt:document.version.finalized_at,locator:{sheet:row.sheet,row:row.row},coverage:"retained_projection",partial:Boolean(document.version.workbook?.partial)}};
  result.evidence.push(documentEvidence);
  if(!identityId){
    result.candidates=matches.slice(0,8).map(o=>({id:o.id,label:o.title,detail:`${o.estimatedValueHigh} ${o.currency??"RON"} · ${o.status}`,sourceId:`opportunity:${o.id}`}));
    result.evidence.push(...matches.slice(0,8).map(o=>({sourceId:`opportunity:${o.id}`,recordId:o.id,label:o.title,sourceType:"Oportunitate" as const,fact:`Candidat pentru revizuire: ${o.title}; valoare estimată ${o.estimatedValueHigh} ${o.currency??"RON"}; stare ${o.status}. Identitatea nu este încă aleasă.`,route:`/opportunities/${o.id}`,observedAt:o.updatedAt,providerId:"revenew"})));
    result.limits.push(matches.length>8?"Lista de candidați este limitată la 8; precizează un identificator pentru restul.":matches.length?"Coincidența titlului oferă candidați, nu dovada identității. Alege explicit înregistrarea.":"Nu există o potrivire suficientă în înregistrările autorizate; precizează un identificator canonic.");
    return result;
  }
  const canonical=matches[0];
  const canonicalId=`opportunity:${canonical.id}`;
  const basis=declaredId&&uuid.test(declaredId)?"canonical_id":document.source.opportunity_id?"explicit_association":"user_selection";
  const rowTime=read(["observed at","observation time","observat la","crm observed at"]);
  const at=rowTime&&/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(rowTime)&&Number.isFinite(Date.parse(rowTime))?new Date(rowTime).toISOString():null;
  const fields:Array<{field:ComparisonField;headers:string[];right:string|null;rightField?:ComparisonField;label:string}>=[
    {field:"estimated_value",headers:["estimated value","estimated value high","valoare estimata"],right:canonical.estimatedValueHigh==null?null:String(canonical.estimatedValueHigh),label:"Valoare estimată"},
    {field:"communication_milestone",headers:["communication milestone","eveniment comunicare"],right:canonical.status,rightField:"workflow_status",label:"Comunicare / stare operațională"},
    {field:"workflow_status",headers:["workflow status","stare operationala"],right:canonical.status,label:"Stare operațională"},
    {field:"next_action",headers:["next action","urmatoarea actiune"],right:canonical.recommendedAction??null,label:"Următor pas declarat"}
  ];
  for(const item of fields){const value=read(item.headers);if(value===null)continue;
    const left:ComparisonObservation={sourceId:row.id,label:documentEvidence.label,value,field:item.field,currency:item.field==="estimated_value"?read(["currency","moneda"])??undefined:undefined,observedAt:at,version:document.version.id,authority:"source_declaration"};
    const right:ComparisonObservation={sourceId:canonicalId,label:canonical.title,value:item.right,field:item.rightField??item.field,currency:item.field==="estimated_value"?canonical.currency??"RON":undefined,observedAt:canonical.updatedAt??null,version:canonical.updatedAt??null,authority:"canonical_record"};
    result.comparisons.push(classifyComparison({id:`comparison:${item.field}:${row.id}:${canonical.id}`,entityId:canonical.id,identityBasis:basis,field:item.label,left,right}));
  }
  result.evidence.push({sourceId:canonicalId,recordId:canonical.id,label:canonical.title,sourceType:"Oportunitate",fact:`${canonical.title}; valoare estimată ${canonical.estimatedValueHigh} ${canonical.currency??"RON"}; stare operațională ${canonical.status}; următor pas ${canonical.recommendedAction??"necompletat"}.`,observedAt:canonical.updatedAt,route:`/opportunities/${canonical.id}`,providerId:"revenew"});
  for(const comparison of result.comparisons)result.evidence.unshift({...documentEvidence,sourceId:comparison.id,label:`${comparisonLabels[comparison.kind]} · ${comparison.field}`,fact:`${comparisonLabels[comparison.kind]} pentru ${canonical.title}. ${comparison.field}: în sursă ${comparison.left.value} ${comparison.left.currency??""}; în CRM ${comparison.right?.value} ${comparison.right?.currency??""}. ${comparison.explanation}`,claimType:"derived",comparisonKind:comparison.kind,provenance:{...documentEvidence.provenance!,classification:"inference"}});
  return result;
}
