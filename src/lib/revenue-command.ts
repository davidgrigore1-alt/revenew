import { buildOpportunityCommercialState, describeCurrentCommercialState, type OpportunityCommercialState } from "@/lib/opportunity-commercial-state";
import { applicationDateKey, applicationLocalDateTimeToIso } from "@/lib/opportunity-domain";
import { metadataEvidence, type EvidenceReference } from "@/lib/evidence-reference";
import { summarizeImpact, sumImpactMoney, impactLabels, type ImpactProof } from "@/lib/revenue-impact";
import { formatProductDateTime } from "@/lib/ui/presentation";
import type { CommercialSignal, Opportunity } from "@/lib/types";

export const COMMAND_LIMITS={records:80,actions:1000,events:400,signals:240,documents:160,decisions:8,changes:20,progress:5} as const;
export type CommandChange={id:string;opportunityId:string;title:string;label:string;detail:string;at:string;progress:boolean;evidence:EvidenceReference};
export type CommandDecision={code:string;continuitySince:string|null;proof:{interventions:number;observed:boolean;recovered:Array<{amount:string;currency:string}>;protected:Array<{amount:string;currency:string}>}|null;id:string;state:OpportunityCommercialState;reason:string;rule:string;rank:number;action:{label:string;href:string};evidence:EvidenceReference[]};
export function commandPeriod(range:string|undefined,now=new Date()){
 const key=range==="7"||range==="30"?range:"today";
 const midnight=applicationLocalDateTimeToIso(applicationDateKey(now),"00:00")!;
 const from=key==="today"?midnight:new Date(now.getTime()-Number(key)*86400000).toISOString();
 return {key,label:key==="today"?"Astăzi":key+" zile",from,to:now.toISOString()};
}
export const materialEventLabels:Record<string,string>={
 commercial_details_changed:"Responsabilitate actualizată",next_action_created:"Următor pas creat",action_postponed:"Acțiune reprogramată",
 action_completed:"Acțiune finalizată",next_action_completed:"Acțiune finalizată",stage_changed:"Etapă comercială schimbată",
 outcome_recorded:"Rezultat înregistrat",outcome_corrected:"Rezultat corectat",deadline_changed:"Termen comercial schimbat",
 commercial_value_changed:"Valoare comercială schimbată",approval_requested:"Aprobare solicitată",approval_granted:"Aprobare rezolvată",
 approval_rejected:"Aprobare respinsă",workflow_prepared:"Lucru pregătit prin workflow"
};
export function materialChanges(opportunities:Opportunity[],businessId:string,names:Record<string,string>):CommandChange[]{
 return opportunities.filter(o=>o.businessId===businessId).flatMap(o=>o.timeline.flatMap(event=>{
  if(event.businessId!==businessId||!event.type||!materialEventLabels[event.type]||!Number.isFinite(Date.parse(event.date)))return [];
  const m=event.metadata??{},ownerEvent=event.type==="commercial_details_changed";
  if(ownerEvent&&(!Object.hasOwn(m,"previous_owner_profile_id")||!Object.hasOwn(m,"owner_profile_id")||m.previous_owner_profile_id===m.owner_profile_id))return [];
  const ownerName=(id:unknown)=>id===null?"Fără responsabil":typeof id==="string"?names[id]??"Membru al echipei · nume indisponibil":"Anterior neînregistrat";
  const detail=ownerEvent?ownerName(m.previous_owner_profile_id)+" → "+ownerName(m.owner_profile_id)
   :event.type==="action_postponed"&&typeof m.due_at==="string"?"Termen înregistrat: "+formatProductDateTime(m.due_at)
   :event.type==="stage_changed"&&typeof m.previous_status==="string"&&typeof m.status==="string"?"Schimbare de etapă înregistrată":"Schimbare confirmată în istoricul comercial.";
  return [{id:"event:"+event.id,opportunityId:o.id,title:o.title,label:ownerEvent?(m.owner_profile_id?"Responsabil atribuit":"Responsabil eliminat"):materialEventLabels[event.type],detail,at:event.date,
   progress:ownerEvent?!!m.owner_profile_id:["action_completed","next_action_completed","approval_granted"].includes(event.type),
   evidence:metadataEvidence({sourceType:"event",sourceId:event.id,title:event.label,occurredAt:event.date,entityHref:"/opportunities/"+o.id+"#opportunity-timeline"})}];
 }));
}
const priority:Record<string,number>={pending_approval:0,outreach_restricted:0,overdue_next_action:1,unassigned_owner:2,missing_next_action:2,proposal_without_follow_up:2,prepared_document_not_advanced:4,stale_activity:6};
export function compareCommandDecisions(a:CommandDecision,b:CommandDecision){
 const rank=a.rank-b.rank;if(rank)return rank;
 const time=(s:OpportunityCommercialState)=>s.nextAction?.dueAt?Date.parse(s.nextAction.dueAt):Infinity;
 const aTime=time(a.state),bTime=time(b.state);if(aTime!==bTime)return aTime<bTime?-1:1;
 // Currency groups are stable; raw values are NEVER compared across currencies.
 if(a.state.financial.currency!==b.state.financial.currency)return a.state.financial.currency.localeCompare(b.state.financial.currency);
 return (b.state.financial.estimatedValue??0)-(a.state.financial.estimatedValue??0)||a.id.localeCompare(b.id);
}
export function assembleRevenueCommand(input:{
 businessId:string;opportunities:Opportunity[];signals:CommercialSignal[];proofs:ImpactProof[];names?:Record<string,string>;changes?:CommandChange[];
 range?:string;now?:Date;checkpoint?:string|null;limited?:boolean;currentComplete?:boolean;impactAvailable?:boolean;changesComplete?:boolean;
}){
 const now=input.now??new Date(),period=commandPeriod(input.range,now),names=input.names??{};
 const opportunities=Array.from(new Map(input.opportunities.filter(o=>o.businessId===input.businessId).map(o=>[o.id,o])).values());
 const ids=new Set(opportunities.map(o=>o.id)),proofs=input.proofs.filter(p=>p.business_id===input.businessId&&ids.has(p.opportunity_id));
 const states=opportunities.map(o=>buildOpportunityCommercialState(o,{businessId:input.businessId,now,linkedSignals:input.signals}));
 const decisions:CommandDecision[]=[];
 const proofFor=(id:string)=>{
  if(input.impactAvailable===false)return null;
  const linked=proofs.filter(p=>p.opportunity_id===id),totals=summarizeImpact(linked,"0000",period.to);
  return {interventions:totals.interventions,observed:linked.some(p=>p.events.some(e=>e.kind==="outcome_observed")),recovered:totals.recovered,protected:totals.protected};
 };
 const continuity=(state:OpportunityCommercialState,code:string)=>{
  const op=opportunities.find(o=>o.id===state.opportunityId)!;
  const dates:Array<string|null|undefined>=[op.updatedAt];
  if(code==="stale_activity")return null; // Clock-based threshold crossing has no persisted event.
  if(code==="pending_approval")dates.push(input.signals.find(s=>s.businessId===input.businessId&&s.id===state.approval.signalId)?.updatedAt);
  if(code==="overdue_next_action")dates.push(state.nextAction?.dueAt,op.actions.find(a=>a.id===state.nextAction?.id)?.updatedAt);
  if(code==="prepared_document_not_advanced")dates.push(op.documents.find(d=>d.id===state.document.id)?.editedAt??op.documents.find(d=>d.id===state.document.id)?.createdAt);
  if(code==="missing_next_action"||code==="proposal_without_follow_up")dates.push(...op.actions.map(a=>a.updatedAt));
  if(dates.some(d=>!d||!Number.isFinite(Date.parse(d))))return null;
  return new Date(Math.max(...dates.map(d=>Date.parse(d!)))).toISOString();
 };
 if(input.currentComplete!==false)for(const state of states){
  const reasons=state.exceptions.filter(e=>priority[e.code]!==undefined).sort((a,b)=>priority[a.code]-priority[b.code]);
  if(state.lifecycle!=="open")continue;
  if(state.nextAction&&!state.nextAction.dueAt&&!reasons.some(r=>r.code==="missing_next_action")){
   reasons.push({code:"missing_next_action",label:"Următorul pas necesită un termen",explanation:"Există o acțiune, dar termenul ei nu este confirmat.",rule:"opportunity_actions.due_at",severity:"attention",evidenceIds:state.evidence.filter(e=>e.sourceType==="action").map(e=>e.id),missingInformation:["Termenul următorului pas."],safeAction:{label:"Stabilește termenul",href:"/opportunities/"+state.opportunityId+"#workflow-actions-list"}});
   reasons.sort((a,b)=>priority[a.code]-priority[b.code]);
  }
  const reason=reasons[0];if(!reason)continue;
  decisions.push({code:reason.code==="missing_next_action"&&state.nextAction?"next_action_undated":reason.code,continuitySince:continuity(state,reason.code),proof:proofFor(state.opportunityId),id:state.opportunityId,state,reason:reason.explanation+(reason.code==="pending_approval"&&state.resolvedSinceDetection.some(r=>r.label.startsWith("Responsabil comercial atribuit"))?" Responsabilitatea a fost clarificată; aprobarea rămâne deschisă.":""),
   rank:priority[reason.code],rule:"Decizie blocantă → restanță → responsabil/pas lipsă → verificare → inactivitate. Termenul departajează; valoarea doar în aceeași monedă.",
   action:reason.safeAction,evidence:state.evidence.filter(e=>reason.evidenceIds.includes(e.id)||e.sourceType==="opportunity").slice(0,4).map(e=>metadataEvidence({sourceType:e.sourceType,sourceId:e.sourceId,title:e.label,occurredAt:e.observedAt,entityHref:e.href}))});
 }
 if(input.currentComplete!==false&&input.impactAvailable!==false)for(const proof of proofs){
  const state=states.find(s=>s.opportunityId===proof.opportunity_id);
  if(!state||decisions.some(d=>d.id===state.opportunityId&&d.rank<=5)||["verified_recovered","protected","invalidated","dismissed"].includes(proof.state))continue;
  if(!proof.events.some(e=>["action_confirmed","outcome_observed","action_prepared"].includes(e.kind)))continue;
  const existing=decisions.findIndex(d=>d.id===state.opportunityId);if(existing>=0)decisions.splice(existing,1);
  decisions.push({code:proof.state==="action_prepared"?"intervention_confirmation_required":"result_verification_required",continuitySince:proof.updatedAt,proof:proofFor(state.opportunityId),id:state.opportunityId,state,rank:5,reason:"Intervenția sau rezultatul înregistrat necesită verificare; impactul nu este confirmat.",rule:"Verificarea rezultatului urmează blocajelor curente de execuție.",action:{label:"Verifică impactul",href:"/recoverable?opportunity="+state.opportunityId+"&case="+proof.id},evidence:proof.events.slice(-1).flatMap(e=>e.evidence).slice(0,4)});
 }
 decisions.sort(compareCommandDecisions);
 const baseChanges=[...materialChanges(opportunities,input.businessId,names),...(input.changes??[]).filter(c=>ids.has(c.opportunityId))];
 for(const proof of proofs)for(const e of proof.events){
  if(!["action_confirmed","outcome_observed","protected","verified_recovered","invalidated","dismissed"].includes(e.kind))continue;
  baseChanges.push({id:"impact:"+e.id,opportunityId:proof.opportunity_id,title:proof.title,label:impactLabels[e.kind],detail:"Înregistrare explicită în registrul impactului.",at:e.created_at,progress:e.kind==="action_confirmed"||e.kind==="verified_recovered",evidence:metadataEvidence({sourceType:"event",sourceId:e.id,title:impactLabels[e.kind],occurredAt:e.created_at,entityHref:"/opportunities/"+proof.opportunity_id})});
 }
 const periodChanges=Array.from(new Map(baseChanges.filter(c=>Date.parse(c.at)>=Date.parse(period.from)&&Date.parse(c.at)<=now.getTime()).map(c=>[c.id,c])).values()).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)||a.id.localeCompare(b.id));
 const since=periodChanges.filter(c=>!input.checkpoint||Date.parse(c.at)>Date.parse(input.checkpoint));
 const first=decisions[0];
 const summary=input.impactAvailable===false?null:summarizeImpact(proofs,period.from,period.to);
 return {generatedAt:period.to,period,checkpoint:input.checkpoint??null,decisions:decisions.slice(0,COMMAND_LIMITS.decisions),decisionCount:decisions.length,
  narrative:input.currentComplete===false?"Datele curente nu sunt complete; verifică înregistrările înainte de decizie.":first?decisions.length+" situații necesită decizie acum. Prima este „"+first.state.title+"”: "+first.reason:"Nu există blocaje executive identificate în selecția autorizată.",
  detected:input.currentComplete===false?null:sumImpactMoney(decisions.filter(d=>d.state.lifecycle==="open").map(d=>({amount:d.state.financial.estimatedValue,currency:d.state.financial.currency}))),
  impact:summary,changes:since.slice(0,COMMAND_LIMITS.changes),changeCount:since.length,progress:periodChanges.filter(c=>c.progress).slice(0,COMMAND_LIMITS.progress),
  currentComplete:input.currentComplete!==false,limited:!!input.limited,changesComplete:input.changesComplete!==false,historyClipped:!!input.checkpoint&&input.checkpoint<period.from};
}
export type RevenueCommand=ReturnType<typeof assembleRevenueCommand>;
export { describeCurrentCommercialState };
