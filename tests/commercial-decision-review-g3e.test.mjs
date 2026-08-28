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
 assert.deepEqual(Array.from(model.changes,c=>c.label),["Acțiune reprogramată","Responsabil atribuit","Intervenție confirmată"]);
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

function serverHarness({role="business_manager",denied=[],rows=[{id:opId,business_id:business,owner_profile_id:owner,title:"Vector",status:"reviewed",created_at:before,updated_at:before}],extra={},errors={},proofs=[]}={}) {
 const queries=[],impactCalls=[];
 const permissions=["opportunities.read","actions.read","signals.read","approvals.read","documents.read","workspace.audit.read"].filter(p=>!denied.includes(p));
 const tables={opportunities:rows,opportunity_actions:[{id:"task",business_id:business,opportunity_id:opId,title:"Pas",status:"pending",due_at:future,updated_at:before}],
  commercial_signals:[{id:"approval",business_id:business,detected_from_opportunity_id:opId,title:"Aprobare",status:"ready_for_review",review_status:"ready_for_review",updated_at:before}],
  executive_review_checkpoints:[{business_id:business,reviewer_profile_id:owner,scope:role==="business_member"?"owned":"business",reviewed_through:before}],...extra};
 const client={rpc:async()=>({data:[{profile_id:owner,full_name:"Irina Petrescu"}],error:null}),from(table){
  const query={table,filters:[],limit:null,fields:null};queries.push(query);
  const chain={select(fields){query.fields=fields;return chain;},eq(k,v){query.filters.push([k,v]);return chain;},in(k,v){query.filters.push([k,v]);return chain;},
   gte(){return chain;},lte(){return chain;},order(){return chain;},or(){return chain;},limit(n){query.limit=n;return chain;},
   then(resolve){const data=(tables[table]??[]).filter(row=>query.filters.every(([k,v])=>Array.isArray(v)?v.includes(row[k]):row[k]===v)).slice(0,query.limit??Infinity);return Promise.resolve({data,error:errors[table]??null}).then(resolve);}};
  return chain;
 }};
 const api=loader({
  react:{cache:f=>f},
  "@/lib/authz/require-permission":{requirePermission:async()=>({authenticated:true,profileId:owner,businessRole:role,permissions})},
  "@/lib/business/current-business":{getCurrentBusinessForUser:async()=>({source:"supabase",business:{id:business}})},
  "@/lib/supabase/server":{createSupabaseServerClient:()=>client},
  "@/lib/revenue-impact-server":{getRevenueImpact:async input=>{impactCalls.push(input);return {proofs,limited:false,available:true};}},
  "@/lib/supabase/data":{
   mapOpportunityAction:r=>task({id:r.id,dueDate:r.due_at,updatedAt:r.updated_at}),
   mapOpportunityEvent:r=>event(r.event_type,r.id,r.occurred_at,r.metadata),
   mapOpportunityContacts:()=>[],
   mapOpportunity:(r,actions,documents,timeline,contacts,responses,name)=>op({id:r.id,businessId:r.business_id,title:r.title,ownerProfileId:r.owner_profile_id,ownerName:name,createdAt:r.created_at,updatedAt:r.updated_at,actions,documents,timeline,contacts,responses})
  }
 },{SUPABASE_SERVICE_ROLE_KEY:"test-key"})("src/lib/revenue-command-server.ts");
 return {api,queries,impactCalls};
}
test("server reads are tenant-scoped, bounded and owned scope filters before loading related records",async()=>{
 const h=serverHarness({role:"business_member",rows:[{id:opId,business_id:business,owner_profile_id:owner,title:"Owned",updated_at:before},{id:"not-owned",business_id:business,owner_profile_id:"someone-else",title:"Hidden"},{id:"foreign",business_id:"B",owner_profile_id:owner,title:"Foreign"}]});
 const model=await h.api.getRevenueCommand("30");assert.equal(model.scope,"owned");
 assert.deepEqual(Array.from(h.impactCalls[0].opportunityIds),[opId]);assert.equal(h.impactCalls[0].includeOutsidePeriod,true);
 assert.ok(h.queries.find(q=>q.table==="opportunities").filters.some(([k,v])=>k==="owner_profile_id"&&v===owner));
 for(const q of h.queries){assert.ok(q.filters.some(([k,v])=>k==="business_id"&&v===business),q.table);assert.ok(q.limit>0);assert.doesNotMatch(q.fields,/\*|raw_source_text|content|body|credential|token/);}
 const serialized=JSON.stringify(model);assert.doesNotMatch(serialized,/Foreign|Hidden|test-key/);
});
test("resource permissions fail closed instead of loading forbidden approvals/documents/workflow audit",async()=>{
 const h=serverHarness({denied:["approvals.read","documents.read","workspace.audit.read"]}),model=await h.api.getRevenueCommand();
 for(const table of ["commercial_signals","opportunity_documents","commercial_workflow_runs"])assert.equal(h.queries.some(q=>q.table===table),false);
 assert.equal(model.currentComplete,false);assert.equal(model.reviewToken,null);
});
test("empty owned scope never queries global signals or creates malformed in filters",async()=>{
 const h=serverHarness({rows:[]}),model=await h.api.getRevenueCommand();
 assert.equal(h.queries.some(q=>q.table==="commercial_signals"),false);assert.equal(model.decisions.length,0);
 assert.equal(h.impactCalls[0].opportunityIds.length,0);
});
test("checkpoint reads include actor and scope; missing checkpoint schema leaves an inspectable review",async()=>{
 const h=serverHarness({errors:{executive_review_checkpoints:{code:"missing"}}}),model=await h.api.getRevenueCommand();
 const q=h.queries.find(q=>q.table==="executive_review_checkpoints");
 assert.ok(q.filters.some(([k,v])=>k==="reviewer_profile_id"&&v===owner));assert.ok(q.filters.some(([k,v])=>k==="scope"&&v==="business"));
 assert.equal(model.checkpointAvailable,false);assert.equal(model.reviewToken,null);assert.equal(model.decisions.length,1);
});
test("workflow/approval changes use persisted taxonomy and do not duplicate approval+conversion",async()=>{
 const h=serverHarness({extra:{commercial_signal_events:[{id:"approval-event",business_id:business,signal_id:"approval",event_type:"signal_approved",created_at:new Date().toISOString()}]}});
 const model=await h.api.getRevenueCommand("30");
 const q=h.queries.find(q=>q.table==="commercial_signal_events"),types=q.filters.find(([k])=>k==="event_type")[1];
 assert.ok(types.includes("signal_approved"));assert.equal(types.includes("signal_converted"),false);
 assert.ok(model.progress.some(c=>c.label==="Aprobare rezolvată"));
});
test("capped records disable a misleading whole-scope checkpoint",async()=>{
 const rows=Array.from({length:81},(_,i)=>({id:opId.slice(0,-3)+String(i).padStart(3,"0"),business_id:business,owner_profile_id:owner,updated_at:before,title:"Scoped",status:"reviewed"}));
 const h=serverHarness({rows}),model=await h.api.getRevenueCommand();assert.equal(model.limited,true);assert.equal(model.reviewToken,null);assert.ok(model.decisions.length<=8);
});
test("Ask reloads current scoped decisions for each question and never serializes the review ticket",async()=>{
 let calls=0,current=build({opportunities:[op({timeline:[ownerEvent,postponed]})],signals:[signal()]});
 const api=loader({"@/lib/revenue-command-server":{getRevenueCommand:async range=>{calls++;assert.equal(range,"7");return {...current,reviewToken:"PRIVATE_REVIEW_TICKET"};}}})("src/lib/ai/revenue-command-answer.ts");
 const request={question:"De ce trebuie decis acum?",context:{route:"/dashboard?view=review&range=7",pageType:"dashboard",opportunityId:opId},history:[]};
 const first=await api.revenueCommandAnswer(request);assert.match(first.answer,/Irina/);assert.match(first.answer,/Aprobarea/);assert.ok(first.evidence.length);
 assert.doesNotMatch(JSON.stringify(first),/PRIVATE_REVIEW_TICKET/);assert.equal(first.preparedAction,null);
 current=build();const second=await api.revenueCommandAnswer(request);assert.equal(second.summaryType,"insufficient_information");assert.equal(calls,2);
});
test("Ask foreign selection cannot fall back to another authorized record or its evidence",async()=>{
 const api=loader({"@/lib/revenue-command-server":{getRevenueCommand:async()=>build({signals:[signal()]})}})("src/lib/ai/revenue-command-answer.ts");
 const answer=await api.revenueCommandAnswer({question:"Ce dovezi susțin asta?",context:{route:"/dashboard?view=review",opportunityId:"foreign"},history:[]});
 assert.equal(answer.evidence.length,0);assert.doesNotMatch(answer.answer,/Irina|Vector/);
});
test("Ask history states interval/checkpoint and impact cannot promote detected value",async()=>{
 const api=loader({"@/lib/revenue-command-server":{getRevenueCommand:async()=>build({signals:[signal()],opportunities:[op({timeline:[ownerEvent]})],checkpoint:before})}})("src/lib/ai/revenue-command-answer.ts");
 const context={route:"/dashboard?view=executive",opportunityId:opId};
 const changes=await api.revenueCommandAnswer({question:"Ce s-a schimbat?",context,history:[]});
 assert.match(changes.answer,/Responsabil atribuit/);assert.ok(changes.caveats.some(c=>c.includes("Ultima revizuire")));assert.ok(changes.evidence.length);
 const answer=await api.revenueCommandAnswer({question:"Ce impact a fost verificat?",context,history:[]});
 assert.match(answer.answer,/Încă neverificat/);assert.doesNotMatch(answer.answer,/76.000/);
});
test("ordinary page assembly has no AI/provider/download/body parsing path and existing mutations invalidate dashboard",()=>{
 const server=read("src/lib/revenue-command-server.ts"),projection=read("src/lib/commercial-decision-review.ts"),page=read("src/app/(protected)/dashboard/page.tsx");
 for(const source of [server,projection])assert.doesNotMatch(source,/fetch\(|getCommercialTruth|openai|refreshGoogle|download|embedding|Picker|parseDocument/);
 assert.ok(page.indexOf('searchParams.view==="review"')<page.indexOf("const [summary, currentProfile"));
 assert.match(read("src/lib/commercial-state-invalidation.ts"),/"\/dashboard"/);
 assert.match(read("src/lib/revenue-impact-actions.ts"),/revalidatePath\("\/dashboard"\)/);
});
test("checkpoint migration remains personal append-only with service-only RPC and replay constraints (static contract)",()=>{
 const sql=read("supabase/migrations/20260828131036_executive_review_checkpoints.sql");
 for(const expression of [/enable row level security/i,/reviewer_profile_id = public.current_profile_id/,/can_access_business/,/before update or delete/i,/pg_advisory_xact_lock/,/review replay mismatch/,/unique \(business_id, reviewer_profile_id, request_id\)/,/from public, anon, authenticated/])assert.match(sql,expression);
 assert.doesNotMatch(sql,/update public\.opportunities|insert into public\.commercial_impact|update public\.commercial_signals/i);
});
test("rendered review hierarchy has orientation, four agenda columns and no native select; during detail is progressive",()=>{
 const React=native("react"),{renderToStaticMarkup}=native("react-dom/server");
 const render=phase=>{
  const ui=loader({
   react:{...React,useState:initial=>React.useState(initial==="before"?phase:initial)},
   "next/link":{default:({children,...props})=>React.createElement("a",props,children),__esModule:true},
   "next/navigation":{useRouter:()=>({refresh(){}})},
   "@/components/ui/OperationalPatterns.module.css":{default:{reviewPane:"review-pane"},__esModule:true},
   "@/lib/revenue-command-actions":{markExecutiveBriefReviewed:async()=>({ok:true})},
   "@/components/ui/Button":{Button:({children,href,loading,size,variant,...props})=>React.createElement(href?"a":"button",{...props,href},children)},
   "@/components/evidence/EvidenceList":{EvidenceList:()=>React.createElement("p",null,"Dovadă autorizată")},
   "@/components/intelligence/CopilotConversation":{CopilotConversation:()=>React.createElement("p",null,"Ask existent")}
  })("src/components/dashboard/CommercialDecisionReview.tsx");
  return renderToStaticMarkup(React.createElement(ui.CommercialDecisionReview,{model:{...build({signals:[signal()],opportunities:[op({timeline:[ownerEvent,postponed]})]}),scope:"business",reviewToken:"test"}}));
 };
 const beforeHtml=render("before");for(const label of ["Revizuire comercială","Agenda de decizie","Începe revizuirea","Responsabil","Termen","Următorul pas"])assert.ok(beforeHtml.includes(label));
 const during=render("during");const labels=["Situația acum","Ce s-a schimbat","Ce s-a rezolvat","Ce rămâne","Dovezi","Acțiune sigură"];
 for(let i=1;i<labels.length;i++)assert.ok(during.indexOf(labels[i])>during.indexOf(labels[i-1]));
 assert.match(during,/<details/);assert.doesNotMatch(beforeHtml+during,/<select|<option|revenue engine|DecisionItem/i);
 const after=render("after");assert.match(after,/Revizuire încheiată/);assert.match(after,/necesită în continuare decizie/);
 assert.doesNotMatch(read("src/components/intelligence/CopilotConversation.tsx"),/<select/);
});


test("explicit contradiction investigation still uses G3B on demand from review",async()=>{
 let truthCalls=0;
 const api=loader({
  "@/lib/commercial-truth-server":{getCommercialTruthScope:async()=>{truthCalls++;return {items:[],label:"Context autorizat",limited:false};}},
  "@/lib/ai/revenue-command-answer":{revenueCommandAnswer:()=>{throw Error("cadence must not replace document truth");}}
 })("src/lib/ai/commercial-truth-answer.ts");
 await api.commercialTruthAnswer({question:"Ce informații se contrazic?",context:{route:"/dashboard?view=review",opportunityId:opId},history:[]});
 assert.equal(truthCalls,1);
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
