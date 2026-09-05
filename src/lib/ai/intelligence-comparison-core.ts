export type ComparisonKind = "match" | "compatible_detail" | "genuine_conflict" | "newer_observation" | "ambiguous_identity" | "missing_evidence" | "not_comparable";
export type ComparisonField = "estimated_value" | "workflow_status" | "commercial_stage" | "communication_milestone" | "next_action";
export type ComparisonObservation = {
  sourceId:string; label:string; value:string|null; field:ComparisonField; currency?:string;
  observedAt:string|null; version:string|null; authority:"source_declaration"|"canonical_record";
};
export type IdentityCandidate = {id:string;label:string;detail:string;sourceId:string};
export type IntelligenceComparison = {
  id:string;kind:ComparisonKind;entityId:string|null;identityBasis:"canonical_id"|"explicit_association"|"user_selection"|"unresolved";
  field:string;left:ComparisonObservation;right:ComparisonObservation|null;explanation:string;newerSourceId:string|null;
};
const norm=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
export function classifyComparison(input:Omit<IntelligenceComparison,"kind"|"explanation"|"newerSourceId">):IntelligenceComparison {
  const {left,right}=input;
  const result=(kind:ComparisonKind,explanation:string,newerSourceId:string|null=null)=>({...input,kind,explanation,newerSourceId});
  if(!input.entityId||input.identityBasis==="unresolved")return result("ambiguous_identity","Identitatea nu este confirmată. Selectează înregistrarea înainte de comparație.");
  if(!right||left.value===null||right.value===null)return result("missing_evidence","Lipsește una dintre valorile comparabile; absența nu este o contradicție.");
  if(left.field!==right.field){
    const independent=new Set(["workflow_status","commercial_stage","communication_milestone"]);
    return independent.has(left.field)&&independent.has(right.field)
      ?result("compatible_detail","Câmpurile descriu dimensiuni diferite: etapă comercială, activitate de comunicare sau stare operațională. Nu se exclud prin simpla diferență.")
      :result("not_comparable","Câmpurile nu au aceeași definiție comercială; valorile nu pot demonstra un conflict.");
  }
  if(left.field==="estimated_value"&&(!left.currency||!right.currency||left.currency!==right.currency))return result("not_comparable","Monedele lipsesc sau diferă. Nu există un contract de conversie pentru această comparație.");
  if(left.field==="estimated_value"&&(!/^\d+(\.\d{1,2})?$/.test(left.value)||!/^\d+(\.\d{1,2})?$/.test(right.value)))return result("not_comparable","Valoarea nu respectă tipul monetar comparabil.");
  const equal=left.field==="estimated_value"&&/^\d+(\.\d{1,2})?$/.test(left.value)&&/^\d+(\.\d{1,2})?$/.test(right.value)?left.value.replace(/^0+(?=\d)/,"").replace(/\.0+$/,"").replace(/(\.\d)0$/,"$1")===right.value.replace(/^0+(?=\d)/,"").replace(/\.0+$/,"").replace(/(\.\d)0$/,"$1"):norm(left.value)===norm(right.value);
  const leftTime=left.observedAt?Date.parse(left.observedAt):NaN,rightTime=right.observedAt?Date.parse(right.observedAt):NaN;
  if(equal)return result("match","Aceeași valoare în câmpuri comparabile; sursele rămân distincte.");
  if(!Number.isFinite(leftTime)||!Number.isFinite(rightTime))return result("not_comparable","Valorile diferă, dar timpul observațiilor nu este suficient documentat pentru a confirma un conflict în aceeași situație.");
  if(leftTime!==rightTime)return result("newer_observation","Observațiile au date diferite. Sursa mai nouă nu devine automat corectă sau autoritară.",leftTime>rightTime?left.sourceId:right.sourceId);
  if(left.field==="next_action"||left.field==="communication_milestone")return result("not_comparable","Textele diferite pot descrie aceeași acțiune sau detalii complementare; nu confirm un conflict prin diferența de formulare.");
  if(left.field!=="estimated_value")return result("not_comparable","Stările declarate nu au un vocabular comun verificat; formularea diferită nu confirmă o contradicție.");
  return result("genuine_conflict","Aceeași identitate, același câmp și timp de observație, unități comparabile, valori diferite. Verifică ambele surse; nu a fost aleasă automat valoarea corectă.");
}
export const comparisonLabels:Record<ComparisonKind,string>={match:"Valori concordante",compatible_detail:"Detalii compatibile",genuine_conflict:"Dezacord comparabil",newer_observation:"Observație mai nouă",ambiguous_identity:"Identitate de clarificat",missing_evidence:"Dovadă lipsă",not_comparable:"Comparație limitată"};
