import "server-only";
import type { CopilotAnswer, CopilotRequest, CopilotEvidence } from "@/lib/ai/copilot-types";
import { getRevenueCommand } from "@/lib/revenue-command-server";
import { projectCommercialReview } from "@/lib/commercial-decision-review";
import { formatProductDateTime, formatProductCurrency } from "@/lib/ui/presentation";

export async function revenueCommandAnswer(request:CopilotRequest):Promise<CopilotAnswer> {
 const empty:CopilotAnswer={answer:"Informația autorizată este insuficientă pentru această verificare.",summaryType:"insufficient_information",
  findings:[],evidence:[],checkedSources:[],missingInformation:[],caveats:[],preparedAction:null,suggestedAction:null,
  followUps:[],mode:"deterministic_fallback",providerAvailable:false};
 try {
  const route=new URL(request.context.route,"https://revenew.invalid");
  const model=await getRevenueCommand(route.searchParams.get("range")??undefined);
  const agenda=projectCommercialReview(model), selected=request.context.opportunityId?agenda.find(d=>d.id===request.context.opportunityId):undefined;
  // A browser record ID can narrow the authorized projection, never widen it.
  if(request.context.opportunityId&&!selected)return {...empty,caveats:["Decizia nu se află în selecția curentă autorizată. Poate fi rezolvată, în afara primelor opt sau indisponibilă; nu presupun o rezolvare."]};
  const q=request.question.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const scope=selected?"Această oportunitate":"Selecția autorizată";
  const chosen=selected?[selected]:agenda.slice(0,3);
  const changes=model.changes.filter(c=>!selected||c.opportunityId===selected.id).slice(0,5);
  const evidence:CopilotEvidence[]=chosen.flatMap(d=>d.evidence).slice(0,8).map(e=>({
   sourceId:e.sourceType+":"+e.sourceId,label:e.title,sourceType:(e.sourceType==="approval"?"Aprobare":e.sourceType==="action"?"Acțiune":e.sourceType==="document"?"Document":e.sourceType==="event"?"Istoric comercial":"Oportunitate") as CopilotEvidence["sourceType"],route:e.entityHref??null,
   fact:e.supportingFact??"Înregistrare autorizată folosită la evaluare.",observedAt:e.occurredAt,claimType:"fact" as const
  }));
  const caveats=[scope+" · stare curentă evaluată la "+formatProductDateTime(model.generatedAt)+".",
   "Schimbări: "+formatProductDateTime(model.period.from)+" – "+formatProductDateTime(model.period.to)+". Ultima revizuire: "+(model.checkpoint?formatProductDateTime(model.checkpoint):"neînregistrată")+".",
   "Răspunsul este o observație la acest moment; după modificări, întreabă din nou.",
   ...(model.limited||!model.currentComplete?["Selecție limitată sau date parțiale; absența unui blocaj nu este confirmată."]:[]),
   ...(model.historyClipped?["Revizuirea anterioară este în afara intervalului; istoricul anterior nu este inclus."]:[])];
  let answer:string;
  if(/schimbat|intamplat/.test(q)){
   answer=changes.length?changes.map(c=>c.title+" — "+c.label+": "+c.detail).join("\n")
    :model.changesComplete&&!model.limited&&!model.historyClipped?"Nu există schimbări comerciale materiale în contextul și intervalul evaluate.":"Nu pot confirma absența schimbărilor din istoricul disponibil.";
   evidence.splice(0,evidence.length,...changes.map(c=>({sourceId:c.id,label:c.label,sourceType:"Istoric comercial" as const,route:c.evidence.entityHref??null,fact:c.detail,observedAt:c.at,claimType:"fact" as const})));
  } else if(/impact|venit|interventii/.test(q)){
   const proof=selected?.proof, totals=selected?proof?.recovered:model.impact?.recovered;
   answer=totals?.length?"Venit recuperat verificat: "+totals.map(m=>formatProductCurrency(Number(m.amount),m.currency)).join(" · ")+"."
    :selected&&!proof||!selected&&!model.impact?"Informația despre impact nu este disponibilă.":"Încă neverificat.";
   answer+=" Valoarea detectată și intervențiile nu sunt venit recuperat.";
   if(selected)caveats.push("Dovada selectată reflectă istoricul disponibil al cazului; nu doar intervalul ales.");
   else caveats.push("Impactul de mai sus este cel înregistrat în interval.");
   evidence.push({sourceId:"impact:"+ (selected?.id??"authorized-selection"),label:"Registrul impactului comercial",sourceType:"Oportunitate",route:selected?"/recoverable?opportunity="+selected.id:"/recoverable",fact:answer,observedAt:model.generatedAt,claimType:"fact"});
  } else {
   answer=chosen.length?chosen.map(d=>d.state.title+" — "+d.label+". "+d.currentFacts.join(" ")+" "+d.reason+" Următorul pas sigur: "+d.action.label+".").join("\n")
    :model.currentComplete&&!model.limited?"Nu există decizii comerciale care necesită atenție acum.":"Agenda nu poate fi confirmată din datele disponibile.";
   if(/dovez/.test(q))answer=chosen.map(d=>d.label+": "+d.evidence.map(e=>e.title).join("; ")+".").join("\n")||empty.answer;
   if(/ramane|nerezolvat/.test(q))answer=chosen.map(d=>d.state.title+" — "+d.remaining.join("; ")+". Se consideră rezolvată când: "+d.completionCondition).join("\n")||answer;
  }
  return {...empty,answer,summaryType:model.currentComplete?"commercial":"insufficient_information",evidence,caveats,
   suggestedAction:selected?{label:selected.action.label,route:selected.action.href}:null,
   followUps:["Ce s-a schimbat?","Ce rămâne nerezolvat?","Ce dovezi susțin asta?"]};
 } catch { return {...empty,caveats:["Contextul nu este disponibil cu accesul curent. Nu a fost folosit context din alt workspace."]}; }
}
