import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {createRequire} from "node:module";
import test from "node:test";
import ts from "typescript";
const native=createRequire(import.meta.url),read=p=>fs.readFileSync(p,"utf8");
function loader(mocks={},environment=process.env){
 const cache=new Map();const load=file=>{
  const full=path.resolve(file);if(cache.has(full))return cache.get(full);
  const module={exports:{}};cache.set(full,module.exports);
  const output=ts.transpileModule(read(full),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const require=id=>Object.hasOwn(mocks,id)?mocks[id]:id==="server-only"?{}:id.startsWith("@/")?load("src/"+id.slice(2)+(fs.existsSync("src/"+id.slice(2)+".ts")?".ts":".tsx")):native(id);
  vm.runInNewContext(output,{module,exports:module.exports,require,Date,URL,Map,Set,BigInt,Buffer,Intl,console,process:{env:environment}},{filename:full});return module.exports;
 };return load;
}
const load=loader(),command=load("src/lib/revenue-command.ts"),review=load("src/lib/commercial-decision-review.ts"),impact=load("src/lib/revenue-impact.ts");
const business="10000000-0000-4000-8000-000000000001",opId="20000000-0000-4000-8000-000000000001",owner="30000000-0000-4000-8000-000000000001";
const at="2026-08-28T12:00:00.000Z",before="2026-08-28T09:00:00.000Z",future="2026-08-31T12:02:03.375Z";
const task=(patch={})=>({id:"task",title:"Escaladează lipsa deciziei",status:"pending",dueDate:future,assignedToProfileId:owner,createdAt:before,updatedAt:before,...patch});
const op=(patch={})=>({id:opId,businessId:business,title:"Recuperare proiect mentenanță · Vector Industrial",status:"reviewed",lifecycleStatus:"open",ownerProfileId:owner,ownerName:"Irina Petrescu",
 estimatedValueHigh:76000,currency:"RON",createdAt:before,updatedAt:before,actions:[task()],documents:[],contacts:[],timeline:[],responses:[],...patch});
const signal=(patch={})=>({id:"approval",businessId:business,title:"Aprobarea comercială",status:"ready_for_review",reviewStatus:"ready_for_review",detectedFromOpportunityId:opId,createdAt:before,updatedAt:before,...patch});
const event=(type,id,date,metadata={})=>({id,type,date,metadata,businessId:business,label:type});
const ownerEvent=event("commercial_details_changed","assigned","2026-08-28T10:00:00.000Z",{previous_owner_profile_id:null,owner_profile_id:owner});
const postponed=event("action_postponed","postponed","2026-08-28T11:00:00.000Z",{action_id:"task",due_at:future});
const build=(patch={})=>command.assembleRevenueCommand({businessId:business,opportunities:[op()],signals:[],proofs:[],now:new Date(at),names:{[owner]:"Irina Petrescu"},...patch});
const agenda=patch=>review.projectCommercialReview(build(patch));
const c={id:"case",business_id:business,opportunity_id:opId,company_id:null,title:"Vector",actor_profile_id:owner,created_at:before,detected_amount:76000,currency:"RON",before_state:{ownerId:null,missingOwner:true,missingNext:true,overdue:true}};
const ie=(kind,revision,patch={})=>({id:"impact-"+revision,case_id:c.id,business_id:business,opportunity_id:opId,revision,kind,actor_profile_id:owner,created_at:before,amount:null,currency:null,outcome_key:null,reference_id:null,reference_type:null,after_state:{},evidence:[],note:"",supersedes_id:null,...patch});
const proof=events=>impact.buildImpactProof(c,events);

test("policy of silence: healthy cases and missing non-decision metadata do not fill the agenda",()=>{
 assert.equal(agenda().length,0);assert.equal(agenda({opportunities:[]}).length,0);
 assert.equal(agenda({opportunities:[op({lifecycleStatus:"won",status:"won",ownerProfileId:null,actions:[]})]}).length,0);
});
test("Vector: one current approval after Irina assignment and exact-action postponement; immutable Before",()=>{
 const p=proof([ie("detected",0),ie("action_confirmed",1,{reference_id:"task"})]),snapshot=JSON.stringify(p);
 const model=build({opportunities:[op({timeline:[ownerEvent,postponed]})],signals:[signal()],proofs:[p]}),items=review.projectCommercialReview(model);
 assert.equal(items.length,1);assert.equal(items[0].kind,"approval_required");
 assert.equal(items[0].state.ownership.ownerName,"Irina Petrescu");assert.equal(items[0].state.nextAction.dueAt,future);
 assert.equal(items[0].state.flags.nextActionOverdue,false);assert.equal(items[0].resolvedFacts.length,2);
 assert.deepEqual(Array.from(model.changes,c=>c.label),["Acțiune reprogramată","Responsabil atribuit"]);
 assert.equal(JSON.stringify(p),snapshot);assert.equal(p.before_state.missingOwner,true);assert.equal(p.before_state.overdue,true);
});
test("multi-issue collapse: pending approval, prepared document, missing owner and overdue become one primary decision",()=>{
 const items=agenda({opportunities:[op({ownerProfileId:null,ownerName:null,actions:[task({dueDate:before})],documents:[{id:"doc",title:"Ofertă",status:"ready_to_send",createdAt:before}]})],signals:[signal()]});
 assert.equal(items.length,1);assert.equal(items[0].kind,"approval_required");assert.ok(items[0].remaining.length>=3);
});
test("duplicate opportunity inputs do not create duplicate agenda rows",()=>{
 assert.equal(agenda({opportunities:[op(),op()],signals:[signal(),signal()]}).length,1);
});
test("owner assignment automatically clears only the ownership decision, preserving historical change",()=>{
 assert.equal(agenda({opportunities:[op({ownerProfileId:null,ownerName:null})]})[0].kind,"owner_missing");
 const model=build({opportunities:[op({timeline:[ownerEvent]})]});assert.equal(model.decisions.length,0);assert.equal(model.changes.length,1);
});
test("second blocker remains after owner assignment and postponement of only one action",()=>{
 const items=agenda({opportunities:[op({actions:[task(),task({id:"other",dueDate:before})],timeline:[ownerEvent,postponed]})]});
 assert.equal(items[0].kind,"critical_action_overdue");assert.equal(items[0].state.nextAction.id,"other");
});
test("approval resolution projects the next actual blocker, not an all-clear",()=>{
 const input={opportunities:[op({actions:[task({dueDate:before})]})],signals:[signal({status:"converted",reviewStatus:"converted"})]};
 assert.equal(agenda(input)[0].kind,"critical_action_overdue");
 assert.equal(agenda({signals:[signal({status:"converted",reviewStatus:"converted"})]}).length,0);
});
test("undated next action remains a current action but management must establish a future date",()=>{
 const item=agenda({opportunities:[op({actions:[task({dueDate:""})]})]})[0];
 assert.equal(item.kind,"next_action_missing");assert.match(item.label,/termen/);assert.equal(item.state.flags.nextActionMissing,false);
 assert.equal(agenda({opportunities:[op({actions:[task()]})]}).length,0);
});
test("carry-over persists across a completed review; checkpoint never resolves approval",()=>{
 const old=build({signals:[signal()]}),next=build({signals:[signal()],checkpoint:at,now:new Date("2026-08-28T12:10:00Z")});
 assert.equal(old.decisionCount,1);assert.equal(next.decisionCount,1);
 assert.equal(review.projectCommercialReview(next)[0].carryOver,true);
 assert.match(review.projectCommercialReview(next)[0].memory,/Rămasă deschisă/);
});
test("new or unproven continuity is never labelled as carry-over",()=>{
 assert.equal(agenda({signals:[signal({updatedAt:"2026-08-28T11:30:00Z"})],checkpoint:"2026-08-28T11:00:00Z"})[0].carryOver,false);
 assert.equal(agenda({opportunities:[op({updatedAt:undefined})],signals:[signal()],checkpoint:at})[0].carryOver,false);
});
test("T0/T1/T2/T3/T4 review history is exclusive, period-bound and retry-neutral",()=>{
 const source=op({timeline:[ownerEvent,postponed]});
 assert.equal(build({opportunities:[source],checkpoint:before}).changes.length,2);
 assert.equal(build({opportunities:[source],checkpoint:at}).changes.length,0);
 const approval=event("approval_granted","approved","2026-08-28T12:01:00Z");
 const next=build({opportunities:[op({timeline:[ownerEvent,postponed,approval]})],checkpoint:at,now:new Date("2026-08-28T12:05:00Z")});
 assert.equal(next.changes.length,1);assert.equal(next.changes[0].label,"Aprobare rezolvată");
 assert.equal(build({opportunities:[source],checkpoint:postponed.date}).changes.length,0);
});
test("period changes do not time-filter current decisions",()=>{
 const old=op({createdAt:"2025-01-01T00:00:00Z",updatedAt:"2025-01-01T00:00:00Z",ownerProfileId:null,ownerName:null});
 for(const range of ["today","7","30"])assert.equal(agenda({opportunities:[old],range})[0].kind,"owner_missing");
});
test("current human blocker outranks raw value; due urgency precedes value and undated",()=>{
 const small=op({id:"small",estimatedValueHigh:1,actions:[task({dueDate:before})]});
 const large=op({id:"large",estimatedValueHigh:999999,ownerProfileId:null,actions:[task({dueDate:future})]});
 assert.equal(build({opportunities:[large,small]}).decisions[0].id,"small");
 const a=build({signals:[signal()]}).decisions[0],b={...a,id:"undated",state:{...a.state,nextAction:null,financial:{...a.state.financial,estimatedValue:999999}}};
 assert.ok(command.compareCommandDecisions(a,b)<0);
});
test("RON/EUR remain separate; cross-currency amounts cannot change ordering",()=>{
 const opportunities=[op({id:"ron",currency:"RON",estimatedValueHigh:240500,ownerProfileId:null}),op({id:"eur",currency:"EUR",estimatedValueHigh:12000,ownerProfileId:null})];
 const first=build({opportunities}),second=build({opportunities:opportunities.map(o=>({...o,estimatedValueHigh:o.currency==="RON"?1:999999}))});
 assert.deepEqual(Array.from(first.decisions,d=>d.id),Array.from(second.decisions,d=>d.id));
 assert.equal(first.detected.find(v=>v.currency==="RON").amount,"240500.00");assert.equal(first.detected.find(v=>v.currency==="EUR").amount,"12000.00");assert.equal(first.detected.length,2);
});
for(const kind of ["detected","action_prepared","action_confirmed","outcome_observed"])test(kind+" cannot become verified revenue",()=>{
 const result=build({proofs:[proof([ie("detected",0),ie(kind,1,{reference_id:"task",amount:76000,currency:"RON"})])]});
 assert.equal(result.impact.recovered.length,0);assert.equal(result.impact.protected.length,0);
});
test("G3C verification alone supplies recovered value; later invalidation removes it",()=>{
 const events=[ie("detected",0),ie("action_confirmed",1,{reference_id:"task"}),ie("verified_recovered",2,{amount:73000,currency:"RON",outcome_key:opId+":won",note:"Verificare explicită a rezultatului comercial."})];
 assert.equal(build({proofs:[proof(events)]}).impact.recovered[0].amount,"73000.00");
 assert.equal(build({proofs:[proof([...events,ie("invalidated",3)])]}).impact.recovered.length,0);
});
test("result verification precedes inactivity and old unresolved impact is independent of selected period",()=>{
 const items=agenda({opportunities:[op({createdAt:"2025-01-01T00:00:00Z"})],proofs:[proof([ie("action_confirmed",0,{created_at:"2025-01-01T00:00:00Z",reference_id:"task"})])]});
 assert.equal(items[0].kind,"result_verification_required");assert.equal(items.length,1);
});
test("closed cases pending verification do not increase current detected exposure",()=>{
 const model=build({opportunities:[op({status:"won",lifecycleStatus:"won"})],proofs:[proof([ie("action_confirmed",0,{reference_id:"task"})])]});
 assert.equal(model.decisions.length,1);assert.equal(model.detected.length,0);
});
test("noisy CRUD/emails, invalid dates and foreign events never enter material changes",()=>{
 const timeline=[event("email_received","noise",before),event("random_edit","edit",before),event("action_completed","invalid","invalid"),{...ownerEvent,businessId:"foreign"},event("commercial_details_changed","same",before,{owner_profile_id:owner,previous_owner_profile_id:owner})];
 assert.equal(build({opportunities:[op({timeline})]}).changes.length,0);
});
test("tenant boundary excludes foreign decisions, changes, impact and approval",()=>{
 const result=build({opportunities:[op(),op({id:"foreign",businessId:"B",ownerProfileId:null,timeline:[ownerEvent]})],signals:[signal({businessId:"B"})],proofs:[{...proof([ie("verified_recovered",0)]),business_id:"B"}]});
 assert.equal(result.decisions.length,0);assert.equal(result.changes.length,0);assert.equal(result.impact.recovered.length,0);
});
test("partial data suppresses fabricated all-clear or financial exposure and bounded projections stay small",()=>{
 const partial=build({currentComplete:false,signals:[signal()]});assert.equal(partial.decisions.length,0);assert.equal(partial.detected,null);assert.match(partial.narrative,/nu sunt complete/);
 const model=build({opportunities:Array.from({length:25},(_,i)=>op({id:"op-"+i,ownerProfileId:null,timeline:[event("action_completed","ev-"+i,before)]}))});
 assert.equal(model.decisions.length,8);assert.equal(model.changes.length,20);assert.equal(model.progress.length,5);
});
test("review ticket is actor/business/scope-bound, short-lived, tamper-resistant and never contains the signing secret",()=>{
 const tickets=load("src/lib/revenue-command-review.ts"),actor={businessId:business,actorId:owner,scope:"business"},ticket={...actor,through:at,requestId:"40000000-0000-4000-8000-000000000001"};
 const token=tickets.signReviewTicket(ticket,"unit-test-secret");assert.doesNotMatch(token,/unit-test-secret/);
 assert.equal(tickets.verifyReviewTicket(token,"unit-test-secret",actor,new Date(at)).through,at);
 for(const changed of [{...actor,businessId:"B"},{...actor,actorId:"other"},{...actor,scope:"owned"}])assert.throws(()=>tickets.verifyReviewTicket(token,"unit-test-secret",changed,new Date(at)));
 assert.throws(()=>tickets.verifyReviewTicket(token+"x","unit-test-secret",actor,new Date(at)));
 assert.throws(()=>tickets.verifyReviewTicket(token,"unit-test-secret",actor,new Date("2026-08-28T12:31:00Z")));
 assert.throws(()=>tickets.verifyReviewTicket(token,"unit-test-secret",actor,new Date(before)));
});
test("finish review writes only checkpoint RPC, uses server actor and preserves retry identity",async()=>{
 const calls=[],actor={businessId:business,actorId:owner,scope:"business"};
 const api=loader({
  "@/lib/revenue-command-server":{revenueCommandActor:async()=>actor},
  "@/lib/revenue-command-review":{verifyReviewTicket:()=>({...actor,through:at,requestId:"same-request"})},
  "@/lib/supabase/admin":{createSupabaseAdminClient:()=>({rpc:async(name,args)=>{calls.push({name,args});return {data:"checkpoint",error:null};}})},
  "next/cache":{revalidatePath:p=>assert.equal(p,"/dashboard")}
 })("src/lib/revenue-command-actions.ts");
 assert.equal((await api.markExecutiveBriefReviewed("signed")).ok,true);assert.equal((await api.markExecutiveBriefReviewed("signed")).ok,true);
 assert.equal(calls.length,2);assert.ok(calls.every(c=>c.name==="record_executive_review"));assert.deepEqual(calls[0],calls[1]);assert.equal(calls[0].args.p_actor,owner);
});
test("invalid/revoked review context never reaches privileged checkpoint writer",async()=>{
 let writes=0;
 const api=loader({
  "@/lib/revenue-command-server":{revenueCommandActor:async()=>{throw Error("forbidden");}},
  "@/lib/revenue-command-review":{verifyReviewTicket:()=>{throw Error("must not call");}},
  "@/lib/supabase/admin":{createSupabaseAdminClient:()=>{writes++;}},
  "next/cache":{revalidatePath:()=>{}}
 })("src/lib/revenue-command-actions.ts");
 assert.equal((await api.markExecutiveBriefReviewed("untrusted")).ok,false);assert.equal(writes,0);
});
