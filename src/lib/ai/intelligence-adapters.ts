import "server-only";
import type { CopilotAnswer, CopilotEvidence, CopilotRequest } from "./copilot-types";
import { normalizeIntelligenceText, relevance, type EvidenceFamily } from "./intelligence-evidence";
import { getPreparedWorkRegistry } from "@/lib/prepared-work-registry";
import { getAskPreparedWork } from "./ask-prepared-work";
import { getCommercialWorkflowWorkspace } from "@/lib/workflow-runtime";
import { getFollowUpWorkspaceSummary } from "@/lib/follow-up-summary";
import { getGoogleWorkspacePublicState } from "@/lib/google-workspace/repository";
import { getDriveWorkspace, getDocumentSourceDetail } from "@/lib/google-workspace/drive";
import { getUniversalBusinessContext } from "./universal-business-context";
import { requirePermission } from "@/lib/authz/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Each adapter owns its authoritative loader and permission. No generic table or
// arbitrary model query is accepted. These supplements do not execute provider actions.
export async function retrieveSupplementalIntelligence(request:CopilotRequest,now=new Date()) {
  const evidence:CopilotEvidence[]=[],checks:CopilotAnswer["checkedSources"]=[],limits:string[]=[];
  const q=normalizeIntelligenceText(request.question),page=request.context;
  if(page.documentSourceId)return {evidence,checks,limits};
  const narrow=Boolean(page.opportunityId||page.organizationId||page.contactId);
  function add(family:EvidenceFamily,id:string,label:string,fact:string,route:string|null,modifiedAt:string|null=null) {
    evidence.push({sourceId:`${family}:${id}`,recordId:id,label:label.slice(0,160),fact:fact.slice(0,900),sourceType:family==="documents"||family==="drive"||family==="prepared"?"Document":family==="activities"?"Istoric comercial":"Brief executiv",route,observedAt:modifiedAt,providerId:family,claimType:"fact",provenance:{family,recordId:id,version:modifiedAt,independenceKey:`${family}:${id}`,classification:family==="reports"?"computed_result":family==="drive"||family==="documents"?"source_declaration":"canonical_record",retrievedAt:now.toISOString(),analyzedAt:now.toISOString(),modifiedAt,locator:{},coverage:"bounded_records",partial:true}});
  }
  const adapters:Array<{family:EvidenceFamily;label:string;read:()=>Promise<void>}>=[];
  if(!narrow&&/pregatit|draft|revizui|aprobar/.test(q))adapters.push({family:"prepared",label:"Lucru pregătit",read:async()=>{
    const [registry,plans]=await Promise.all([getPreparedWorkRegistry(),getAskPreparedWork()]);
    for(const item of [...plans,...registry.items].slice(0,12))add("prepared",item.id,item.title,`${item.status} · ${item.target.label} · ${item.proposal}`,`/prepared?item=${encodeURIComponent(item.id)}`,item.preparedAt??null);
    limits.push("Lucrul pregătit include registrul autorizat, limitat la 200 de documente active.");
  }});
  if(!narrow&&/workflow|automatizar|reguli|rular/.test(q))adapters.push({family:"workflows",label:"Workflow-uri",read:async()=>{
    await requirePermission("settings.update");
    const workspace=await getCommercialWorkflowWorkspace();
    for(const item of workspace.workflows.slice(0,8))add("workflows",item.id,item.name,`${item.status} · ${item.description??""} · declanșator ${item.trigger}`,`/workflows/${item.id}`);
    for(const run of workspace.runs.slice(0,8))add("workflows",run.id,"Rulare workflow",`${run.status} · ${run.guard_reason} · ${run.is_test_run?"test":"rulare"}`,`/workflows/${run.workflow_id}`,run.created_at);
    limits.push("Workflow-uri: maximum 50 de definiții și 50 de rulări recente; fără activare sau execuție.");
  }});
  if(!narrow&&/raport|metric|performant|follow.up/.test(q))adapters.push({family:"reports",label:"Indicatori de follow-up",read:async()=>{
    await requirePermission("reports.read");
    const metric=await getFollowUpWorkspaceSummary();
    add("reports","followup","Follow-up · calcule canonice",`În revizuire: ${metric.awaitingReview}; aprobate netrimise: ${metric.approvedNotSent}; scadente: ${metric.dueFollowUps}; livrări reale confirmate: ${metric.realDeliveries}; încercări test: ${metric.testModeAttempts}; încercări eșuate: ${metric.failedAttempts}. Nu reprezintă venit recuperat.`,"/reports",now.toISOString());
  }});
  if(!narrow&&/surs|conect|aplicat|integrar|provider/.test(q))adapters.push({family:"apps",label:"Starea aplicațiilor",read:async()=>{
    const state=await getGoogleWorkspacePublicState(),connection=state.connection;
    add("apps","google_workspace","Google Workspace",connection?`Gmail: ${connection.gmailStatus}; Calendar: ${connection.calendarStatus}. Conexiunea nu dovedește acces complet la obiecte sau istoric.`:"Nu există conexiune Google disponibilă pentru actorul curent.","/apps");
  }});
  if(/document|ofert|dovez|contract|fisier|sheet|drive/.test(q))adapters.push({family:"documents",label:"Documente interne",read:async()=>{
    await requirePermission("documents.read");
    const universal=await getUniversalBusinessContext(page),client=await createSupabaseServerClient();
    if(!client)return;
    const ids=universal.summary.opportunities.filter(o=>!page.opportunityId||o.id===page.opportunityId).filter(o=>!page.organizationId||o.organizationId===page.organizationId).filter(o=>!page.contactId||o.contacts?.some(link=>link.contact.id===page.contactId)).map(o=>o.id).slice(0,200);
    if(!ids.length)return;
    const result=await client.from("opportunity_documents").select("id,opportunity_id,title,body,updated_at").eq("business_id",universal.workspace.id).in("opportunity_id",ids).order("updated_at",{ascending:false}).limit(100);
    if(result.error)throw new Error("document_retrieval_failed");
    for(const row of (result.data??[]).map(row=>({row,score:relevance(q,`${row.title} ${row.body??""}`)})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score).slice(0,8).map(item=>item.row))add("documents",row.id,row.title??"Document",row.body??"Conținut indisponibil.",`/documents/${row.id}`,row.updated_at);
    limits.push("Documente interne: cel mult 100 de documente din 200 de oportunități vizibile; fragmente limitate.");
  }});
  if(/drive|google|sheet|document|dovez|contract/.test(q))adapters.push({family:"drive",label:"Drive selectat · privat",read:async()=>{
    const universal=page.contactId||page.organizationId?await getUniversalBusinessContext(page):null;
    const ids=universal?.summary.opportunities.filter(o=>(!page.organizationId||o.organizationId===page.organizationId)&&(!page.contactId||o.contacts?.some(link=>link.contact.id===page.contactId))).map(o=>o.id);
    if(ids&&!ids.length)return;
    const workspace=await getDriveWorkspace(page.opportunityId,ids);
    if(!workspace.authorized)throw new Error("drive_unavailable");
    for(const source of workspace.sources.filter(s=>!ids||(s.opportunity_id&&ids.includes(s.opportunity_id))).slice(0,10)) {
      const detail=await getDocumentSourceDetail(source.id);if(!detail)continue;
      for(const segment of detail.segments.map(s=>({s,score:relevance(q,s.text)})).filter(s=>s.score>0).sort((a,b)=>b.score-a.score).slice(0,2).map(item=>item.s))add("drive",`${source.id}:${segment.id}`,source.name,`${segment.location_label} · ${segment.text}`,`/opportunities/${detail.context.id}/sources/${source.id}#segment-${segment.id}`,source.modified_time);
    }
    limits.push("Drive: doar sursele selectate ale conexiunii proprii; cel mult 10 surse și extracția reținută.");
  }});
  // At most two independent loaders concurrently, with source-specific failure.
  for(let offset=0;offset<adapters.length;offset+=2)await Promise.all(adapters.slice(offset,offset+2).map(async adapter=>{
    try{await adapter.read();checks.push({providerId:adapter.family,label:adapter.label,state:"available",checkedAt:now.toISOString(),detail:"Citire prin contractul autorizat; acoperire limitată."});}
    catch{checks.push({providerId:adapter.family,label:adapter.label,state:"unavailable",checkedAt:now.toISOString(),detail:"Sursa nu este disponibilă în contextul autorizat."});}
  }));
  return {evidence:evidence.slice(0,20),checks,limits};
}
