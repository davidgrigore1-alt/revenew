import { metadataEvidence, type EvidenceReference } from "@/lib/evidence-reference";
export const impactLabels={
 detected:"Detectat",reviewed:"Revizuit",action_prepared:"Acțiune pregătită",action_confirmed:"Intervenție confirmată",
 outcome_observed:"Rezultat observat",protected:"Valoare protejată",verified_recovered:"Venit recuperat verificat",
 invalidated:"Invalidat",dismissed:"Respins"
} as const;
export type ImpactKind=keyof typeof impactLabels;
export type ImpactState={status?:string;ownerId?:string|null;missingOwner?:boolean;missingNext?:boolean;overdue?:boolean;outcomeAt?:string;outcomeDate?:string;outcomeActorId?:string;confirmedActionAt?:string;provenance?:{actionPlanId?:string;approvalActorId?:string;workflowRunId?:string;workflowId?:string;actionId?:string}};
export type ImpactCase={id:string;business_id:string;opportunity_id:string;company_id:string|null;title:string;actor_profile_id:string;created_at:string;detected_amount:number|string|null;currency:string|null;before_state:ImpactState};
export type ImpactEvent={id:string;case_id:string;business_id:string;opportunity_id:string;revision:number;kind:ImpactKind;actor_profile_id:string;created_at:string;amount:number|string|null;currency:string|null;outcome_key:string|null;reference_type:string|null;reference_id:string|null;after_state:ImpactState;evidence:EvidenceReference[];note:string;supersedes_id:string|null};
export const impactRules={
 detected:"Estimarea CRM la identificarea riscului, o singură dată per oportunitate urmărită. Nu este venit recuperat.",
 acted:"Evenimente distincte de execuție confirmată, nu drafturi sau aprobări în așteptare. Valoarea intervențiilor nu este venit recuperat.",
 protected:"Estimarea inițială asociată unui blocaj rezolvat după o intervenție confirmată și verificată explicit de un responsabil autorizat. Nu dovedește cauzalitatea.",
 recovered:"Valoarea efectivă a rezultatului câștigat din CRM, după intervenție, verificată explicit de un responsabil autorizat. Un rezultat este numărat o singură dată. Nu este o măsură contabilă a încasărilor."
};
export type ImpactProof=ImpactCase&{events:ImpactEvent[];state:ImpactKind;revision:number;assertion:ImpactEvent|null;interventions:number;updatedAt:string};
export type MoneyTotal={currency:string;amount:string};
function cents(value:number|string|null):bigint|null{
 if(value===null)return null;
 const match=String(value).match(/^(\d{1,10})(?:\.(\d{1,2}))?$/);
 return match?BigInt(match[1])*BigInt(100)+BigInt((match[2]??"").padEnd(2,"0")):null;
}
export function sumImpactMoney(rows:Array<{amount:number|string|null;currency:string|null}>):MoneyTotal[]{
 const totals=new Map<string,bigint>();
 for(const row of rows){const value=cents(row.amount);if(value===null||!row.currency||! /^[A-Z]{3}$/.test(row.currency))continue;totals.set(row.currency,(totals.get(row.currency)??BigInt(0))+value);}
 return Array.from(totals.entries()).sort(([a],[b])=>a.localeCompare(b)).map(([currency,value])=>({currency,amount:String(value/BigInt(100))+"."+String(value%BigInt(100)).padStart(2,"0")}));
}
export function buildImpactProof(c:ImpactCase,events:ImpactEvent[]):ImpactProof{
 const own=events.filter(e=>e.case_id===c.id&&e.business_id===c.business_id&&e.opportunity_id===c.opportunity_id).sort((a,b)=>a.revision-b.revision)
 .map(e=>({...e,evidence:e.evidence.map(item=>metadataEvidence(item))}));
 const assertion=[...own].reverse().find(e=>["protected","verified_recovered","invalidated","dismissed"].includes(e.kind))??null;
 const latest=own.at(-1);
 return {...c,events:own,state:assertion?.kind??latest?.kind??"detected",revision:latest?.revision??-1,assertion,
  interventions:new Set(own.filter(e=>e.kind==="action_confirmed").map(e=>e.reference_id)).size,updatedAt:latest?.created_at??c.created_at};
}
export function summarizeImpact(proofs:ImpactProof[],from:string,to:string){
 const within=(value:string)=>value>=from&&value<to;
 // Defensive identity dedup in addition to the database uniqueness constraint.
 const unique=Array.from(new Map(proofs.map(p=>[p.business_id+":"+p.opportunity_id,p])).values());
 const valid=unique.filter(p=>!["invalidated","dismissed"].includes(p.state));
 const detected=valid.filter(p=>within(p.created_at));
 const acted=valid.filter(p=>p.events.some(e=>e.kind==="action_confirmed"&&within(e.created_at)));
 const protectedCases=valid.filter(p=>p.assertion?.kind==="protected"&&within(p.assertion.created_at));
 const recovered=valid.filter(p=>p.assertion?.kind==="verified_recovered"&&p.assertion.outcome_key&&p.assertion.note.trim().length>=20&&p.interventions>0&&within(p.assertion.created_at));
 return {
  detected:sumImpactMoney(detected.map(p=>({amount:p.detected_amount,currency:p.currency}))),
  acted:sumImpactMoney(acted.map(p=>({amount:p.detected_amount,currency:p.currency}))),
  interventions:new Set(acted.flatMap(p=>p.events.filter(e=>e.kind==="action_confirmed"&&within(e.created_at)).map(e=>p.business_id+":"+e.reference_id))).size,
  protected:sumImpactMoney(protectedCases.map(p=>({amount:p.assertion!.amount,currency:p.assertion!.currency}))),
  recovered:sumImpactMoney(recovered.map(p=>({amount:p.assertion!.amount,currency:p.assertion!.currency}))),
  recoveredVerified:recovered.length>0
 };
}
export function impactPeriod(input:{range?:string;from?:string;to?:string},now=new Date()){
 const end=new Date(now);end.setUTCHours(0,0,0,0);end.setUTCDate(end.getUTCDate()+1);
 let start=new Date(end);start.setUTCDate(start.getUTCDate()-30);let label="30 zile";
 if(input.range==="quarter"){start=new Date(Date.UTC(now.getUTCFullYear(),Math.floor(now.getUTCMonth()/3)*3,1));label="Trimestrul curent";}
 if(input.range==="custom"){
  const valid=(s?:string)=>!!s&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
  if(valid(input.from)&&valid(input.to)){
   const a=new Date(input.from!),b=new Date(input.to!);b.setUTCDate(b.getUTCDate()+1);
   if(a<b&&b<=end&&b.getTime()-a.getTime()<=366*86400000){start=a;end.setTime(b.getTime());label=input.from+" – "+input.to;}
  }
 }
 return {from:start.toISOString(),to:end.toISOString(),label};
}
