import type { CopilotAnswer, CopilotEvidence } from "./copilot-types";
import { normalizeIntelligenceText } from "./intelligence-evidence";

export const intelligenceAnswerSchema = {
  type:"object",additionalProperties:false,required:["conclusion","claims","unknowns","followUps"],properties:{
    conclusion:{type:"string",maxLength:320},
    claims:{type:"array",maxItems:3,items:{type:"object",additionalProperties:false,required:["text","evidenceIds","kind"],properties:{text:{type:"string",maxLength:240},evidenceIds:{type:"array",minItems:1,maxItems:3,items:{type:"string"}},kind:{type:"string",enum:["source_declaration","inference"]}}}},
    unknowns:{type:"array",maxItems:2,items:{type:"string",maxLength:120}},followUps:{type:"array",maxItems:2,items:{type:"string",maxLength:120}}
  }
};
function record(value:unknown):Record<string,unknown>|null {return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null;}
function plain(value:unknown,max:number) {return typeof value==="string"&&value.length<=max&&!/<\/?[a-z]|https?:\/\/|!\[|javascript:/i.test(value)?value.trim():null;}
function unsupportedProse(text:string) {
  const normalized=normalizeIntelligenceText(text);
  if(/nu a raspuns|nu au raspuns|n-a raspuns|niciun raspuns (?:primit|de la)/.test(normalized))return true;
  const financial=normalized.replace(/\bnu (?:reprezinta |este )?venit confirmat/g,"");
  if(/venit(?:uri)? (?:garantat|recuperat|confirmat)|roi realizat|probabilitate de castig/.test(financial))return true;
  // Evidence aliases belong only in citation fields. They are not source names.
  if(/\bE\d+\b/.test(text))return true;
  const currencies=new Set(text.match(/\b(?:RON|EUR|USD|GBP|CHF)\b/g));
  // A correct pair of amounts can still assert an unsupported inclusion/FX relation.
  return currencies.size>1&&/inclu|cumul|echivalent|convertit|conversia in/.test(normalized);
}
const numbers=(value:string)=>value.replace(/\bE\d+\b/g,"").match(/\d+(?:[.,]\d+)?/g)??[];
function unsupportedEntityCount(text:string,sources:CopilotEvidence[]) {
  const counts:Record<string,string>={doua:"2",doi:"2",trei:"3",patru:"4",cinci:"5",sase:"6",sapte:"7",opt:"8",noua:"9",zece:"10"};
  const normalize=(value:string)=>normalizeIntelligenceText(value).replace(/\b(doua|doi|trei|patru|cinci|sase|sapte|opt|noua|zece)\b/g,word=>counts[word]);
  const facts=normalize(sources.map(s=>s.fact).join(" "));
  return Array.from(normalize(text).matchAll(/\b(\d+)\s+(?:de\s+)?oportunitati/g)).some(match=>!new RegExp(`\\b${match[1]}\\s+(?:de\\s+)?oportunitati`).test(facts));
}
function unsupportedOutcome(text:string,sources:CopilotEvidence[]) {
  const normalized=normalizeIntelligenceText(text),facts=normalizeIntelligenceText(sources.map(s=>s.fact).join(" "));
  // A name/value overlap must not turn a pending opportunity into a completed outcome.
  for(const stem of ["castig","semnat","platit","incas","aprobat","executat","trimis"]){
    if(!normalized.includes(stem))continue;
    if(!facts.includes(stem))return true;
    if(new RegExp(`(?:nu|ne)[^.]{0,24}${stem}`).test(facts)&&!new RegExp(`(?:nu|ne)[^.]{0,24}${stem}`).test(normalized))return true;
  }
  return false;
}
export function supportedNumbers(claim:string,evidence:CopilotEvidence[]) {
  const supplied=new Set(evidence.flatMap(e=>numbers(`${e.fact} ${e.label} ${e.observedAt??""}`).map(n=>String(Number(n.replace(",","."))))));
  const moneyPairs=(text:string)=>{
    const direct=Array.from(text.matchAll(/(\d+(?:[.,]\d+)?)\s+(RON|EUR|USD|GBP|CHF)\b/g));
    // Retained structured rows preserve separate Value/Currency columns. Bind
    // only their adjacent labeled fields, never unrelated numbers and currencies.
    const fields=Array.from(text.matchAll(/(?:Value|Estimated value|Valoare(?: estimată)?|Amount|Sumă):\s*(\d+(?:[.,]\d+)?)\s*·\s*(?:Currency|Moneda|Monedă):\s*(RON|EUR|USD|GBP|CHF)\b/gi));
    return [...direct,...fields].map(m=>`${Number(m[1].replace(",","."))}:${m[2].toUpperCase()}`);
  };
  const sourcePairs=new Set(evidence.flatMap(e=>moneyPairs(e.fact)));
  return numbers(claim).every(n=>supplied.has(String(Number(n.replace(",",".")))))&&moneyPairs(claim).every(pair=>sourcePairs.has(pair));
}
export function validateIntelligenceSynthesis(raw:unknown,evidence:CopilotEvidence[]): {ok:true;answer:string;findings:CopilotAnswer["findings"];unknowns:string[];followUps:string[]}|{ok:false;reason:string} {
  const value=record(raw),conclusion=plain(value?.conclusion,320);
  if(!value||!conclusion||Object.keys(value).sort().join(",")!=="claims,conclusion,followUps,unknowns"||!Array.isArray(value.claims)||!value.claims.length||value.claims.length>3||![value.unknowns,value.followUps].every(items=>Array.isArray(items)&&items.length<=2&&items.every(item=>plain(item,120)!==null)))return {ok:false,reason:"invalid_schema"};
  const byId=new Map(evidence.map(e=>[e.sourceId,e]));
  const findings:CopilotAnswer["findings"]=[];
  for(const item of value.claims) {
    const claim=record(item),text=plain(claim?.text,240),ids=claim?.evidenceIds;
    if(!claim||!text||Object.keys(claim).sort().join(",")!=="evidenceIds,kind,text"||!Array.isArray(ids)||!ids.length||ids.length>3||!ids.every(id=>typeof id==="string"&&byId.has(id))||!["source_declaration","inference"].includes(String(claim.kind)))return {ok:false,reason:"invalid_claim_or_citation"};
    const supporting=ids.map(id=>byId.get(id)!);
    if(unsupportedEntityCount(text,supporting))return {ok:false,reason:"unsupported_entity_count"};
    if(unsupportedProse(text))return {ok:false,reason:"unsupported_financial_or_source_relation"};
    if(!supportedNumbers(text,supporting))return {ok:false,reason:"unsupported_number"};
    if(supporting.some(e=>e.comparisonKind&&e.comparisonKind!=="genuine_conflict")&&/conflict|contradic|contrazic/.test(normalizeIntelligenceText(text).replace(/(?:nu|fara)[^.]{0,35}(?:conflict|contradic\w*|contrazic\w*)/g,"")))return {ok:false,reason:"unsupported_comparison"};
    if(unsupportedOutcome(text,supporting))return {ok:false,reason:"unsupported_outcome"};
    // Behavioral guard: named commercial tokens must overlap the cited fact. This is
    // a conservative support heuristic, not proof of semantic entailment.
    const tokens=normalizeIntelligenceText(text).split(/[^a-z0-9]+/).filter(t=>t.length>4);
    const sourceText=normalizeIntelligenceText(supporting.map(s=>`${s.label} ${s.fact}`).join(" "));
    if(tokens.length&&!tokens.some(t=>sourceText.includes(t)))return {ok:false,reason:"unsupported_claim"};
    if(supporting.some(s=>s.comparisonKind)&&(/(?:sursa|documentul) (?:declara|spune|confirma)|in sursa/.test(normalizeIntelligenceText(text))))return {ok:false,reason:"comparison_is_server_inference"};
    const inferred=claim.kind==="inference"||supporting.some(s=>s.claimType==="derived");
    const detail=!inferred&&supporting.every(s=>s.sourceType==="Document")&&!/^în (?:document|surs)|^din surs/i.test(text)?`În sursă: ${text}`:text;
    findings.push({label:inferred?"Interpretare":"Din sursă",detail,kind:inferred?"derived":"confirmed",sourceIds:ids as string[]});
  }
  const cited=evidence.filter(e=>findings.some(f=>f.sourceIds.includes(e.sourceId)));
  if(unsupportedEntityCount(conclusion,cited))return {ok:false,reason:"unsupported_conclusion_count"};
  if(unsupportedProse(conclusion))return {ok:false,reason:"unsupported_conclusion_relation"};
  if(!supportedNumbers(conclusion,cited))return {ok:false,reason:"unsupported_conclusion_number"};
  if(unsupportedOutcome(conclusion,cited))return {ok:false,reason:"unsupported_conclusion_outcome"};
  // Conclusion must summarize the supported claims, rather than introduce another fact.
  const claimWords=new Set(normalizeIntelligenceText(findings.map(f=>f.detail).join(" ")).split(/[^a-z0-9]+/));
  const conclusionWords=normalizeIntelligenceText(conclusion).split(/[^a-z0-9]+/).filter(w=>w.length>4);
  const supportedConclusion=!conclusionWords.length||conclusionWords.some(w=>claimWords.has(w));
  const strings=(input:unknown,limit:number)=>Array.isArray(input)?input.slice(0,limit).flatMap(v=>{const text=plain(v,240);return text?[text]:[];}):[];
  // Keep supported model claims when an abstract headline adds no grounded
  // information. An unsupported headline is never rendered as business truth.
  return {ok:true,answer:supportedConclusion?conclusion:findings[0].detail,findings,unknowns:strings(value.unknowns,4),followUps:strings(value.followUps,3)};
}
