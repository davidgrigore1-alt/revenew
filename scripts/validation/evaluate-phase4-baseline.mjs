import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {loadTS,preparation} from '../../tests/helpers/phase32-modules.mjs';
// Retrospective baseline reconstruction, never a checkout/reset or a live model call.
const ref='8aa5f52',folder='artifacts/phase4';fs.mkdirSync(folder,{recursive:true});
function baseline(path,overrides={}){
 const source=execFileSync('git',['show',`${ref}:${path}`],{encoding:'utf8',windowsHide:true});
 const local=`${folder}/baseline-${path.split('/').at(-1)}.txt`;fs.writeFileSync(local,source);
 const imports=Object.fromEntries(Array.from(source.matchAll(/from\s+["']([^"']+)["']/g),m=>[m[1],{}]).filter(([id])=>id.startsWith('@/')||id.startsWith('./')));
 return loadTS(local,{...imports,...overrides});
}
const version={source_id:'10000000-0000-4000-8000-000000000001',id:'20000000-0000-4000-8000-000000000001',state:'ready',content_hash:'a'.repeat(64),finalized_at:'2026-09-05T08:00:00Z',original_filename:'Baseline.csv',headers:['Opportunity','Value','Currency','Next action','City'],row_count:40};
const segments=Array.from({length:40},(_,i)=>({row_number:i+2,cells:[i===30?'LATE-031':`Contract ${i+1}`,i===0?'0.10':i===1?'0.20':String(i+1),i===2?'EUR':'RON',i%3?'Review':'',i%2?'Cluj':'București']}));
const document={source:{state:'active'},version,segments};
const retrieval=baseline('src/lib/ai/source-retrieval.ts',{'@/lib/documents/local-documents':{getLocalDocument:async()=>document},'@/lib/ai/source-comparison':{}});
const orchestrator=baseline('src/lib/ai/copilot-orchestrator.ts',{'@/lib/ai/preparation-intent':preparation,'@/lib/ai/source-retrieval':retrieval});
const core=loadTS('src/lib/ai/intelligence-evidence.ts',{'@/lib/revenue-impact':loadTS('src/lib/revenue-impact.ts',{'@/lib/evidence-reference':{}})});
let modelCalls=0;
const provider={kind:'ollama',model:()=> 'fixture-only',available:()=>true,createTurn:()=>{modelCalls++;throw Error('baseline selected route must not synthesize');}};
const results=[];
for(const [id,question] of [['P4-05','Găsește LATE-031'],['P4-07','Care este suma valorilor?'],['P4-08','Top 5 valori'],['P4-10','Total EUR și RON'],['P4-25','Suma doar cele din București']]){
 const answer=(await orchestrator.runCopilot({question,history:[],context:{route:'/ai',pageType:'ai',documentSourceId:version.source_id,documentVersionId:version.id}},provider)).answer;
 const calculation=core.calculateRetainedRows(question,core.retainedRows(version,segments),false);
 results.push({id,question,baseline:{mode:answer.mode,evidenceCount:answer.evidence.length,hasTypedCalculation:Boolean(answer.calculations?.length),lateReferenceFound:answer.evidence.some(e=>e.fact.includes('LATE-031'))},finalDeterministic:{operation:calculation?.operation??null,totals:calculation?.totals??[],includedRows:calculation?.rows.length??null,ranked:calculation?.ranked??[]}});
}
assert.equal(modelCalls,0);
const report={baselineCommit:ref,method:'Retrospective execution of baseline selected-document orchestrator with an authorized synthetic loader. Not a contemporaneous full-system baseline, not a live model evaluation.',modelCalls,results};
fs.writeFileSync(`${folder}/baseline-final-structured.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({baselineCommit:ref,cases:results.length,modelCalls,output:`${folder}/baseline-final-structured.json`}));
