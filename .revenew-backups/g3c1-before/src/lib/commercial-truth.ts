import type { Opportunity } from "@/lib/types";
import { metadataEvidence,type EvidenceReference } from "@/lib/evidence-reference";

export type TruthState="confirmed"|"needs_review"|"insufficient";
export type ClaimType="commercial_value"|"offer_exists"|"offer_deadline"|"next_step"|"next_step_due_at"|"owner"|"primary_contact"|"customer_identity"|"meeting_commitment"|"client_response_state"|"deadline"|"approval_requirement";
export type TruthClaim={
 id:string;type:ClaimType;kind:"fact";opportunityId:string;label:string;value:string;
 amount?:number;currency?:string;date?:string;state:TruthState;freshness:"current"|"old"|"unknown";
 observedAt:string|null;derivation:"structured_record"|"explicit_source_field";evidence:EvidenceReference[];
};
export type TruthIssue={
 id:string;kind:"interpretation"|"missing";title:string;explanation:string;whyItMatters:string;nextStep:string;
 state:"needs_review"|"insufficient";claimIds:string[];evidence:EvidenceReference[];priority:number;
};
export type CommercialTruth={
 opportunityId:string;title:string;state:TruthState;evaluatedAt:string;claims:TruthClaim[];topFacts:TruthClaim[];
 issues:TruthIssue[];limitations:string[];sourceCount:number;
};
export type TruthSegment={
 businessId:string;opportunityId:string;sourceId:string;segmentId:string;title:string;kind:string;
 text:string;location:string;modifiedAt:string|null;syncedAt:string|null;originalHref?:string;mime:string;
};
export type TruthPrivateContext={
 emails:Array<{id:string;sentAt:string;direction:"inbound"|"outbound"}>;
 meetings:Array<{id:string;title:string;startsAt:string;endsAt:string;status:string}>;
};
export const truthStateLabels:Record<TruthState,string>={confirmed:"Context verificat",needs_review:"Necesită verificare",insufficient:"Informație insuficientă"};
export const TRUTH_LIMITS={sources:6,segments:144,characters:48000,claims:32,visibleFacts:5,issues:8,scopeOpportunities:8} as const;
const normalize=(value:string)=>value.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
function freshness(value:string|null,now:number):TruthClaim["freshness"]{
 const time=value?Date.parse(value):NaN;
 return !Number.isFinite(time)||time>now+86400000?"unknown":now-time>30*86400000?"old":"current";
}
function exactDate(value:string){
 const iso=value.match(/^(\d{4})-(\d{2})-(\d{2})$/),local=value.match(/^(\d{2})[./](\d{2})[./](\d{4})$/);
 const date=iso?iso[1]+"-"+iso[2]+"-"+iso[3]:local?local[3]+"-"+local[2]+"-"+local[1]:null;
 if(!date)return null;const parsed=new Date(date+"T23:59:59Z");return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===date?date:null;
}
export function parseCommercialAmount(raw:string):number|null{
 const value=raw.replace(/[ \u00a0]/g,"");
 if(!/^(?:\d+|\d{1,3}(?:[.,]\d{3})+)(?:[.,]\d{1,2})?$/.test(value))return null;
 const decimal=value.match(/[.,]\d{1,2}$/)?.[0];
 const integer=decimal?value.slice(0,-decimal.length):value;
 const amount=Number(integer.replace(/[.,]/g,"")+(decimal?"."+decimal.slice(1):""));
 return Number.isFinite(amount)&&amount>0&&amount<=1e12?amount:null;
}
/** Pure, bounded, read-only evaluation. Connected text is never a command or an action proposal. */
export function assembleCommercialTruth(input:{
 businessId:string;opportunity:Opportunity;companyName?:string|null;segments?:TruthSegment[];
 privateContext?:TruthPrivateContext;limitations?:string[];now?:string;
}):CommercialTruth{
 const opportunity=input.opportunity;
 if(opportunity.businessId!==input.businessId)throw new Error("truth_scope_forbidden");
 const evaluatedAt=input.now??new Date().toISOString(),now=Date.parse(evaluatedAt);
 const claims:TruthClaim[]=[],issues:TruthIssue[]=[],limitations=[...(input.limitations??[])];
 const route="/opportunities/"+opportunity.id;
 const record=metadataEvidence({sourceType:"opportunity",sourceId:opportunity.id,title:opportunity.title,occurredAt:opportunity.updatedAt??null,entityHref:route,commercialRelationship:opportunity.id});
 const add=(type:ClaimType,label:string,value:string,evidence:EvidenceReference[],extra:Partial<TruthClaim>={})=>{
  if(claims.length>=TRUTH_LIMITS.claims)return null;
  const observedAt=evidence[0]?.occurredAt??null;
  const claim:TruthClaim={id:opportunity.id+":"+type+":"+claims.length,type,kind:"fact",opportunityId:opportunity.id,label,value,
   state:"confirmed",freshness:freshness(observedAt,now),observedAt,derivation:"structured_record",evidence,...extra};
  if(claim.derivation==="explicit_source_field"&&claim.freshness!=="current")claim.state="needs_review";
  claims.push(claim);return claim;
 };
 const issue=(id:string,kind:TruthIssue["kind"],title:string,explanation:string,whyItMatters:string,nextStep:string,facts:TruthClaim[],priority:number)=>{
  if(issues.some(item=>item.id===id))return;
  issues.push({id,kind,title,explanation,whyItMatters,nextStep,state:kind==="missing"?"insufficient":"needs_review",
   claimIds:facts.map(f=>f.id),evidence:Array.from(new Map(facts.flatMap(f=>f.evidence).map(e=>[(e.sourceSegmentId??e.sourceId),e])).values()),priority});
 };
 const amount=opportunity.estimatedValueHigh;
 const value=Number.isFinite(amount)&&amount>0&&opportunity.currency?add("commercial_value","Estimare CRM",
  amount.toLocaleString("ro-RO")+" "+opportunity.currency,[record],{amount,currency:opportunity.currency}):null;
 const owner=add("owner","Responsabil",opportunity.ownerName??(opportunity.ownerProfileId?"Responsabil atribuit":"Lipsește"),[record]);
 if(!["won","lost","ignored"].includes(opportunity.status)&&!opportunity.ownerProfileId&&owner)issue("missing-owner","missing","Confirmă responsabilul","Nu este atribuit un responsabil în oportunitate.","Următorul pas nu are un proprietar clar.","Atribuie un responsabil prin fluxul existent.",[owner],80);
 const primary=opportunity.contacts?.find(contact=>contact.isPrimary&&contact.contact?.businessId===input.businessId);
 const contact=add("primary_contact","Contact principal",primary?.contact.fullName??"Neconfirmat",[record]);
 if(!["won","lost","ignored"].includes(opportunity.status)&&!primary&&contact)issue("missing-contact","missing","Confirmă interlocutorul","Nu există un contact principal asociat explicit.","Comunicarea poate ajunge la un interlocutor nepotrivit.","Verifică persoana de contact înainte de comunicare.",[contact],45);
 const customer=input.companyName?add("customer_identity","Companie CRM",input.companyName,[record]):null;
 const active=!["won","lost","ignored"].includes(opportunity.status)&&!["won","lost","disqualified","archived"].includes(opportunity.lifecycleStatus??"open");
 const pending=opportunity.actions.filter(action=>action.status==="pending");
 const future=pending.filter(action=>Number.isFinite(Date.parse(action.dueDate))&&Date.parse(action.dueDate)>=now)
  .sort((a,b)=>Date.parse(a.dueDate)-Date.parse(b.dueDate))[0];
 const next=add("next_step","Următor pas",future?.title??(!active?"Nu este necesar (închis)":opportunity.actions.length>=200?"Neverificat în lista disponibilă":"Lipsește"),future?[metadataEvidence({sourceType:"action",sourceId:future.id,title:future.title,occurredAt:future.updatedAt??future.createdAt??null,entityHref:route+"?tab=schedule"})]:[record]);
 if(future)add("next_step_due_at","Termen acțiune",future.dueDate.slice(0,10),next!.evidence,{date:future.dueDate});
 else if(active&&opportunity.actions.length<200&&next)issue("missing-next","missing","Confirmă următorul pas","Nu există o acțiune viitoare cu termen confirmat în oportunitate.","Contextul comercial nu are un pas de execuție programat.","Pregătește un pas intern pentru revizuire.",[next],85);
 else if(opportunity.actions.length>=200)limitations.push("Lista acțiunilor este limitată; absența unui pas viitor nu poate fi confirmată.");
 if(opportunity.deadline&&Number.isFinite(Date.parse(opportunity.deadline)))add("deadline","Termen CRM",opportunity.deadline.slice(0,10),[record],{date:opportunity.deadline});
 const segments=(input.segments??[]).filter(s=>s.businessId===input.businessId&&s.opportunityId===opportunity.id).slice(0,TRUTH_LIMITS.segments);
 const bySource=new Map<string,TruthSegment[]>();
 let characters=0;
 for(const segment of segments){
  if(characters+segment.text.length>TRUTH_LIMITS.characters){limitations.push("Doar primele fragmente autorizate au fost evaluate.");break;}
  if(!bySource.has(segment.sourceId)&&bySource.size>=TRUTH_LIMITS.sources)continue;
  characters+=segment.text.length;
  bySource.set(segment.sourceId,[...(bySource.get(segment.sourceId)??[]),segment]);
 }
 for(const [sourceId,parts] of Array.from(bySource.entries())){
  const evidence=(part:TruthSegment)=>metadataEvidence({sourceType:"document",sourceId,sourceDocumentId:sourceId,sourceSegmentId:part.segmentId,
   title:part.title,mimeType:part.mime,sourceLocation:part.location,occurredAt:part.modifiedAt,syncedAt:part.syncedAt,provider:"google_drive",
   entityHref:route+"/sources/"+sourceId+"#segment-"+part.segmentId,originalHref:part.originalHref,commercialRelationship:opportunity.id});
  const fields=parts.flatMap(part=>part.text.split(/\r?\n/).filter(line=>line.length<=220).map(line=>({part,line:line.trim()})));
  const customerField=fields.find(({line})=>/^(?:client|beneficiar|customer)\s*:\s*\S/i.test(line));
  const customerValue=customerField?.line.replace(/^[^:]+:\s*/,"").trim().slice(0,120);
  const sourceCustomer=customerField&&customerValue?add("customer_identity","Client menționat",customerValue,[evidence(customerField.part)],{derivation:"explicit_source_field"}):null;
  const identityMatches=!!customerValue&&!!input.companyName&&normalize(customerValue)===normalize(input.companyName);
  if(customer&&sourceCustomer&&!identityMatches)issue("customer:"+sourceId,"interpretation","Verifică asocierea documentului",
   "Documentul Google Drive asociat oportunității „"+opportunity.title+"” menționează clientul „"+customerValue+"”, iar compania CRM este „"+input.companyName+"”. ReveNew nu poate determina automat care înregistrare este corectă.",
   "Valoarea sau termenii pot aparține unui alt context comercial.","Verifică asocierea înainte de follow-up.",[customer,sourceCustomer],100);
  if(parts[0].kind==="offer"){
   const offer=add("offer_exists","Ofertă selectată",parts[0].title,[evidence(parts[0])]);
   if(active&&!future&&next&&offer&&opportunity.actions.length<200)issue("offer-without-next","missing","Oferta nu are următorul pas confirmat",
    "Există un document selectat ca ofertă, fără o acțiune viitoare în oportunitate.","Discuția comercială poate rămâne fără continuitate.",
    "Verifică oferta și pregătește următorul pas.",[offer,next],90);
   const values=fields.filter(({line})=>/^(?:valoare ofert[ăa]|total ofert[ăa]|proposal total|offer value)\s*:/i.test(line)).slice(0,2);
   for(const field of values){
    const parsed=field.line.match(/:\s*([\d., \u00a0]+)\s+(EUR|RON|USD|GBP)\s*$/i);
    const number=parsed?parseCommercialAmount(parsed[1]):null;
    if(!parsed||number===null)continue;
    const sourceValue=add("commercial_value","Valoare în ofertă",number.toLocaleString("ro-RO")+" "+parsed[2].toUpperCase(),[evidence(field.part)],
     {amount:number,currency:parsed[2].toUpperCase(),derivation:"explicit_source_field",state:identityMatches?"confirmed":"needs_review"});
    if(value&&sourceValue&&identityMatches&&(value.currency!==sourceValue.currency||number<opportunity.estimatedValueLow||number>opportunity.estimatedValueHigh))
     issue("value:"+sourceId,"interpretation","Verifică valoarea comercială","Estimarea CRM și valoarea explicită din ofertă diferă.",
      "Diferența poate schimba prioritatea comercială; sursele pot reprezenta momente sau versiuni diferite.",
      "Compară valorile și versiunile înainte de actualizarea CRM.",[value,sourceValue],95);
   }
  }
  const deadline=fields.find(({line})=>/^(?:termen ofert[ăa]|valabil[ăa] p[âa]n[ăa] la|offer deadline)\s*:/i.test(line));
  const date=deadline?exactDate(deadline.line.replace(/^[^:]+:\s*/,"")):null;
  if(deadline&&date)add("offer_deadline","Termen în document",date,[evidence(deadline.part)],{date:date+"T23:59:59Z",derivation:"explicit_source_field",state:identityMatches?"confirmed":"needs_review"});
 }
 const lastEmail=input.privateContext?.emails.filter(email=>email.direction==="inbound").sort((a,b)=>Date.parse(b.sentAt)-Date.parse(a.sentAt))[0];
 if(lastEmail)add("client_response_state","Ultimul email primit",lastEmail.sentAt.slice(0,10),[metadataEvidence({sourceType:"email",provider:"gmail",sourceId:lastEmail.id,title:"Email primit în contextul oportunității",occurredAt:lastEmail.sentAt,entityHref:"/inbox?email="+lastEmail.id})]);
 for(const meeting of (input.privateContext?.meetings??[]).filter(m=>m.status!=="cancelled").slice(0,2)){
  const fact=add("meeting_commitment","Întâlnire în Calendar",meeting.title,[metadataEvidence({sourceType:"calendar",provider:"google_calendar",sourceId:meeting.id,title:meeting.title,occurredAt:meeting.startsAt,entityHref:route})],{date:meeting.startsAt});
  const action=pending.find(a=>normalize(a.title)===normalize(meeting.title)&&a.dueDate.slice(0,10)===meeting.startsAt.slice(0,10));
  if(active&&fact&&action&&Date.parse(meeting.endsAt)<now&&Date.parse(action.dueDate)<now)
   issue("past-meeting:"+meeting.id,"interpretation","Verifică pasul după întâlnire","Ora întâlnirii a trecut, iar acțiunea asociată este încă în așteptare.",
    "Calendarul nu confirmă că întâlnirea a avut loc; următorul pas poate fi depășit.","Confirmă rezultatul întâlnirii și actualizează pasul intern.",[fact,next!].filter(Boolean),70);
 }
 for(const claim of claims.filter(c=>active&&c.date&&Date.parse(c.date)<now&&["offer_deadline","deadline"].includes(c.type))){
  issue("past-deadline:"+claim.id,"interpretation","Verifică termenul depășit","Termenul înregistrat este în trecut.",
   "Valabilitatea sau calendarul comercial necesită confirmare.","Verifică termenul curent înainte de comunicare.",[claim],75);
 }
 if(!segments.length)limitations.push("Nu există text Drive disponibil în selecția autorizată; oferta și termenii nu pot fi confirmați din documente.");
 if(claims.some(c=>c.freshness==="old"&&c.derivation==="explicit_source_field"))limitations.push("Unele documente au peste 30 de zile; informația veche nu înlocuiește datele CRM.");
 const ranked=issues.sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id)).slice(0,TRUTH_LIMITS.issues);
 const weights:Record<ClaimType,number>={commercial_value:100,offer_exists:85,offer_deadline:95,next_step:98,next_step_due_at:75,owner:90,primary_contact:40,customer_identity:50,meeting_commitment:45,client_response_state:65,deadline:80,approval_requirement:70};
 const topFacts=[...claims].sort((a,b)=>weights[b.type]-weights[a.type]||a.id.localeCompare(b.id)).slice(0,TRUTH_LIMITS.visibleFacts);
 const state:TruthState=ranked.some(i=>i.kind==="interpretation")||claims.some(c=>c.state==="needs_review")?"needs_review":ranked.length||limitations.length?"insufficient":"confirmed";
 return {opportunityId:opportunity.id,title:opportunity.title,state,evaluatedAt,claims,topFacts,issues:ranked,
  limitations:Array.from(new Set(limitations)),sourceCount:new Set(claims.flatMap(c=>c.evidence).map(e=>e.sourceType+":"+e.sourceId)).size};
}
