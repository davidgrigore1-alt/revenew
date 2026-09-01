import "server-only";
import type { CopilotAnswer,CopilotRequest } from "@/lib/ai/copilot-types";
import { getCommercialTruthScope, getCurrentCommercialStateForOpportunity } from "@/lib/commercial-truth-server";
import { describeCurrentCommercialState } from "@/lib/opportunity-commercial-state";
import type { CommercialTruth } from "@/lib/commercial-truth";
export async function commercialTruthAnswer(request:CopilotRequest):Promise<CopilotAnswer>{
 const empty:CopilotAnswer={answer:"Informația autorizată este insuficientă pentru această verificare.",summaryType:"insufficient_information",
  findings:[],evidence:[],checkedSources:[],missingInformation:[],caveats:[],preparedAction:null,suggestedAction:null,
  followUps:[],mode:"deterministic_fallback",providerAvailable:false};
 try{
  const currentQuestion=request.question.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  if(request.context.opportunityId && /^(?:cine (?:este|e) responsabil|ce trebuie facut in continuare|care este urmatorul pas)[? .]*$/.test(currentQuestion.trim())){
   const state=await getCurrentCommercialStateForOpportunity(request.context.opportunityId),facts=describeCurrentCommercialState(state);
   const ownerQuestion=/^cine/.test(currentQuestion);
   return {...empty,answer:ownerQuestion?facts.owner:facts.next+" "+facts.blocker+". Acțiune sigură: "+facts.action.label+".",
    summaryType:"commercial",caveats:["Această oportunitate · stare curentă evaluată la "+state.evaluatedAt+". Răspunsul devine istoric după o modificare."],
    evidence:state.evidence.filter(e=>["opportunity","action","approval"].includes(e.sourceType)).map(e=>({sourceId:e.id,label:e.label,sourceType:e.sourceType==="action"?"Acțiune":e.sourceType==="approval"?"Aprobare":"Oportunitate",route:e.href,fact:ownerQuestion?facts.owner:facts.next,observedAt:e.observedAt,claimType:"fact" as const})),
    suggestedAction:{label:facts.action.label,route:facts.action.href},followUps:["Cine este responsabil?","Ce trebuie făcut în continuare?"]};
  }
  const result=await getCommercialTruthScope({opportunityId:request.context.opportunityId,organizationId:request.context.organizationId,preferDocuments:/contrazic|neconcord|document|asociere/i.test(request.question)});
  const q=request.question.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  let items=result.items;
  if(/(?:ofert|dovez).*(?:urmator|pas|pipeline)/.test(q))items=items.filter(t=>t.issues.some(i=>i.id==="offer-without-next"));
  if(/contrazic|neconcord|difer|asocierea/.test(q))items=items.filter(t=>t.issues.some(i=>i.kind==="interpretation"));
  if(/document.*(?:deadline|termen)/.test(q)){
   const now=Date.now(),end=now+14*86400000;
   items=items.filter(t=>t.claims.some(c=>c.type==="offer_deadline"&&c.date&&Date.parse(c.date)>=now&&Date.parse(c.date)<=end));
  }
  if(/schimbat/.test(q))return {...empty,caveats:["Datele surselor indică actualizări, nu istoricul complet al valorilor. Nu pot reconstrui sigur diferențele din ultimele șapte zile."]};
  if(!items.length)return {...empty,answer:"Nu pot confirma o situație corespunzătoare din sursele evaluate.",caveats:[result.label,result.limited?"Selecție limitată la opt oportunități, cu prioritate pentru documentele asociate; rezultatul nu acoperă întregul workspace.":"Absența unei concluzii nu dovedește absența situației."]};
  const selected=items.sort((a,b)=>(b.issues[0]?.priority??0)-(a.issues[0]?.priority??0)).slice(0,3);
  const evidence=Array.from(new Map(selected.flatMap(t=>t.claims.flatMap(c=>c.evidence)).map(e=>[(e.sourceSegmentId??e.sourceType+":"+e.sourceId),e])).values());
  const primary=selected[0],issue=primary.issues[0];
  return {...empty,answer:issue?primary.title+" — "+issue.title+". "+issue.explanation:primary.title+" — context disponibil pentru verificare.",
   summaryType:selected.every(t=>t.state==="insufficient")?"insufficient_information":"commercial",
   caveats:[result.label,...(result.limited?["Selecție limitată la opt oportunități, cu prioritate pentru documentele asociate; nu este o evaluare exhaustivă."]:[]),
    "Sursele vechi nu înlocuiesc automat înregistrările CRM."],
   evidence:evidence.map(e=>({sourceId:e.sourceSegmentId??e.sourceType+":"+e.sourceId,label:e.title,sourceType:e.sourceType==="document"?"Document":e.sourceType==="email"?"Email":e.sourceType==="calendar"?"Calendar":"Oportunitate",
    route:e.entityHref??null,fact:e.supportingFact??e.sourceLocation??"Înregistrare autorizată",observedAt:e.occurredAt,claimType:"fact",providerId:e.provider})),
   suggestedAction:{label:issue?.kind==="interpretation"?"Verifică":"Deschide oportunitatea",route:"/opportunities/"+primary.opportunityId},
   followUps:["Ce informații se contrazic?","Ce informații lipsesc?"],
   commercialTruth:{scope:result.label,limited:result.limited,items:selected},
  };
 }catch{return {...empty,caveats:["Contextul solicitat nu este disponibil cu accesul curent. Nu a fost folosit context din alt workspace."]};}
}
export type CommercialTruthAnswer={scope:string;limited:boolean;items:CommercialTruth[]};
