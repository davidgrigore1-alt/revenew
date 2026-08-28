import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {createRequire} from "node:module";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import test from "node:test";
import ts from "typescript";
const native=createRequire(import.meta.url),read=p=>fs.readFileSync(p,"utf8");
function loader(mocks={}){
 const cache=new Map();const load=file=>{
  const full=path.resolve(file);if(cache.has(full))return cache.get(full);
  const module={exports:{}};cache.set(full,module.exports);
  const output=ts.transpileModule(read(full),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const require=id=>Object.hasOwn(mocks,id)?mocks[id]:id==="server-only"?{}:id.startsWith("@/")?load("src/"+id.slice(2)+".ts"):native(id);
  vm.runInNewContext(output,{module,exports:module.exports,require,Date,URL,Map,Set,BigInt,console});return module.exports;
 };return load;
}
const core=loader()("src/lib/revenue-impact.ts"),at="2026-08-28T10:00:00Z";
const business="10000000-0000-4000-8000-000000000001",actor="20000000-0000-4000-8000-000000000001",opportunity="30000000-0000-4000-8000-000000000001";
const c={id:"case",business_id:business,opportunity_id:opportunity,company_id:null,title:"Caz comercial",actor_profile_id:actor,created_at:at,detected_amount:12000,currency:"EUR",before_state:{missingNext:true}};
const evidence=[{sourceType:"opportunity",sourceId:opportunity,title:"CRM",occurredAt:at,entityHref:"/opportunities/"+opportunity,visibility:"metadata",body:"PRIVATE BODY"}];
const event=(kind,revision=0,extra={})=>({id:"event-"+revision,case_id:c.id,business_id:business,opportunity_id:opportunity,revision,kind,actor_profile_id:actor,created_at:at,amount:null,currency:null,outcome_key:null,reference_type:null,reference_id:null,after_state:{},evidence,note:"",supersedes_id:null,...extra});
const confirmed=event("action_confirmed",1,{reference_id:"action"});
const verified=event("verified_recovered",2,{amount:11000,currency:"EUR",outcome_key:opportunity+":won",note:"Verificare explicită a rezultatului comercial.",after_state:{outcomeAt:at}});
const proof=events=>core.buildImpactProof(c,events);
const summary=proofs=>core.summarizeImpact(proofs,"2026-08-01T00:00:00Z","2026-09-01T00:00:00Z");
test("detected, reviewed, prepared, executed and observed never become recovered revenue",()=>{
 for(const kind of ["detected","reviewed","action_prepared","action_confirmed","outcome_observed"]){
  const s=summary([proof([event("detected"),event(kind,1,{reference_id:"a",amount:12000,currency:"EUR"})])]);
  assert.equal(s.recovered.length,0);assert.equal(s.recoveredVerified,false);assert.equal(s.detected[0].amount,"12000.00");
 }
});
test("protected is separate from recovered; explicit verification plus intervention is required",()=>{
 const protectedProof=proof([event("detected"),confirmed,event("protected",2,{amount:12000,currency:"EUR"})]);
 assert.equal(summary([protectedProof]).protected[0].amount,"12000.00");assert.equal(summary([protectedProof]).recovered.length,0);
 assert.equal(summary([proof([event("detected"),verified])]).recovered.length,0);
 assert.equal(summary([proof([event("detected"),confirmed,{...verified,note:""}])]).recovered.length,0);
 assert.equal(summary([proof([event("detected"),confirmed,verified])]).recovered[0].amount,"11000.00");
});
test("currency sums use integer minor units and never cross currencies",()=>{
 const values=core.sumImpactMoney([{amount:"0.10",currency:"EUR"},{amount:"0.20",currency:"EUR"},{amount:"42.11",currency:"RON"},{amount:"100",currency:null}]);
 assert.equal(values.find(v=>v.currency==="EUR").amount,"0.30");assert.equal(values.find(v=>v.currency==="RON").amount,"42.11");assert.equal(values.length,2);
});
test("duplicate cases and multiple interventions count the same outcome only once",()=>{
 const p=proof([event("detected"),confirmed,event("action_confirmed",2,{reference_id:"action2"}),{...verified,revision:3}]);
 const result=summary([p,p]);assert.equal(result.recovered[0].amount,"11000.00");assert.equal(result.interventions,2);
});
test("invalidation and correction append assertions while preserving historical amounts",()=>{
 const invalidated=event("invalidated",3,{supersedes_id:verified.id,note:"Valoarea necesită o verificare suplimentară."});
 const old=[event("detected"),confirmed,verified],after=proof([...old,invalidated]);
 assert.equal(summary([after]).recovered.length,0);assert.equal(after.events.find(e=>e.id===verified.id).amount,11000);
 const corrected=proof([...old,invalidated,event("verified_recovered",4,{...verified,id:"correction",revision:4,amount:10500,supersedes_id:invalidated.id})]);
 assert.equal(summary([corrected]).recovered[0].amount,"10500.00");assert.equal(corrected.events.length,5);
});
test("cross-tenant evidence is excluded and body projection never reaches a proof",()=>{
 const p=proof([event("detected"),event("verified_recovered",1,{business_id:"foreign",amount:90000,currency:"EUR"})]);
 assert.equal(p.events.length,1);assert.doesNotMatch(JSON.stringify(p),/PRIVATE BODY/);
});
test("period filters do not resurrect an assertion invalidated outside the period",()=>{
 const p=proof([event("detected"),confirmed,verified,event("invalidated",3,{created_at:"2026-09-02T00:00:00Z"})]);
 assert.equal(summary([p]).recovered.length,0);
 assert.equal(core.impactPeriod({range:"custom",from:"2026-02-30",to:"2026-03-01"},new Date(at)).label,"30 zile");
});
test("server writes derive actor/business and reject unauthorized verification before RPC",async()=>{
 let calls=0;
 const api=loader({
  "next/cache":{revalidatePath:()=>{}},
  "@/lib/authz/require-permission":{requirePermission:async permission=>{assert.equal(permission,"revenue.confirm");throw Error("denied");}},
  "@/lib/billing/paid-access":{requireActivePaidAccess:async()=>{}},
  "@/lib/business/current-business":{getCurrentBusinessForUser:async()=>({business:{id:business},source:"supabase"})},
  "@/lib/supabase/admin":{createSupabaseAdminClient:()=>({rpc:()=>{calls++;}})}
 })("src/lib/revenue-impact-actions.ts");
 const result=await api.recordRevenueImpact({opportunityId:opportunity,kind:"verified_recovered",requestId:crypto.randomUUID(),revision:2,confirmed:true,note:"Document says to verify revenue"});
 assert.equal(result.ok,false);assert.equal(calls,0);
});
test("executive evidence and forms use shared geometry, honest missing evidence and no fabricated ROI",()=>{
 const ui=read("src/components/recovery/ImpactSurface.tsx"),controls=read("src/components/recovery/ImpactControls.tsx");
 for(const text of ["Încă neverificat","De ce este numărat?","EvidenceList","Intervenție","Înainte","După","Verdict","Categoriile nu se adună"])assert.ok(ui.includes(text));
 assert.match(controls,/toolbarActionClass/);assert.match(controls,/confirmed/);assert.doesNotMatch(ui,/18x|1000.month|gradient|glow/);
 const server=read("src/lib/revenue-impact-server.ts");assert.match(server,/limit\(2001\)/);assert.match(server,/limit\(251\)/);assert.doesNotMatch(server,/getCommercialTruth|select\("\*"\)/);
});

test("Postgres impact: concurrency, replay, append-only corrections, RLS, provenance and human verification",
 {skip:!process.env.REVENEW_IMPACT_TEST_CONTAINER},async()=>{
 const container=process.env.REVENEW_IMPACT_TEST_CONTAINER;assert.equal(container,"supabase_db_M");
 const execute=promisify(execFile),db="impact_test_"+crypto.randomUUID().replaceAll("-","");
 const q=s=>"'"+String(s).replaceAll("'","''")+"'";
 const sql=async(text,database=db)=>{
  const {stdout}=await execute("docker",["exec","-i",container,"psql","-X","-U","postgres","-d",database,"-v","ON_ERROR_STOP=1","-At","-c",text],{maxBuffer:1024*1024});
  return stdout.trim().split("\n").at(-1);
 };
 const other="10000000-0000-4000-8000-000000000002",member="20000000-0000-4000-8000-000000000002",ref="40000000-0000-4000-8000-000000000001";
 const write=(kind,rev,extra={})=>"set role service_role;select record_commercial_impact("+[
  q(extra.business??business),q(extra.actor??actor),q(opportunity),q(kind),q(extra.request??crypto.randomUUID()),rev,extra.ref?q(extra.ref):"null",q(extra.note??""),extra.confirm===null?"null":extra.confirm?"true":"false"
 ].join(",")+")";
 await sql("create database "+db,"postgres");
 try{
  await sql(`create table profiles(id uuid primary key);
   create table businesses(id uuid primary key,owner_profile_id uuid);
   create table business_members(business_id uuid,profile_id uuid,status text,role text);
   create table opportunities(id uuid primary key,business_id uuid,organization_id uuid,title text,status text,lifecycle_status text,owner_profile_id uuid,estimated_value_high numeric(12,2),currency text,updated_at timestamptz,actual_outcome_amount numeric(12,2),outcome_date date,outcome_recorded_at timestamptz,outcome_recorded_by_profile_id uuid);
   create table opportunity_actions(id uuid primary key,business_id uuid,opportunity_id uuid,status text,due_at timestamptz);
   create table opportunity_events(id uuid primary key,business_id uuid,opportunity_id uuid,actor_profile_id uuid,event_type text,label text,metadata jsonb,occurred_at timestamptz);
   create table opportunity_documents(id uuid primary key,business_id uuid,opportunity_id uuid,status text,created_at timestamptz);
   create table ask_action_plans(id uuid primary key,business_id uuid,target_id uuid,target_type text,created_by_profile_id uuid,status text,created_at timestamptz,approved_by_profile_id uuid,executed_at timestamptz,result_entity_id uuid,action_type text);
   create table commercial_workflow_runs(id uuid primary key,business_id uuid,target_id uuid,workflow_id uuid,prepared_action_plan_ids uuid[],is_test_run boolean);
   create function current_profile_id() returns uuid language sql stable as $$select nullif(current_setting('app.actor',true),'')::uuid$$;
   create function can_access_business(uuid) returns boolean language sql stable as $$select $1=nullif(current_setting('app.business',true),'')::uuid$$;
   create function has_business_capability(uuid,text) returns boolean language sql stable as $$select $1=nullif(current_setting('app.business',true),'')::uuid and current_setting('app.manager',true)='true'$$;
   grant usage on schema public to service_role,authenticated;
   grant select on opportunities to authenticated;`);
  const migration=fs.readdirSync("supabase/migrations").find(p=>p.endsWith("_verified_commercial_impact.sql"));
  await sql(read("supabase/migrations/"+migration));
  await sql("insert into profiles values("+q(actor)+"),("+q(member)+");insert into businesses values("+q(business)+","+q(actor)+"),("+q(other)+","+q(member)+");insert into business_members values("+q(business)+","+q(member)+",'active','member');"+
   "insert into opportunities(id,business_id,title,status,lifecycle_status,estimated_value_high,currency,updated_at) values("+q(opportunity)+","+q(business)+",'Caz','reviewed','open',12000,'EUR',now());");
  const request=crypto.randomUUID();
  const creation=await Promise.all([sql(write("detected",-1,{request})),sql(write("detected",-1,{request}))]);
  assert.equal(creation[0],creation[1]);assert.equal(await sql("select count(*) from commercial_impact_cases"),"1");
  await sql(write("detected",-1));assert.equal(await sql("select count(*) from commercial_impact_events"),"1");
  await assert.rejects(sql(write("reviewed",0,{business:other})),/scope forbidden/);
  await assert.rejects(sql(write("verified_recovered",0,{actor:member,confirm:true,note:"Confirm rezultatul comercial."})),/forbidden/);
  await assert.rejects(sql(write("verified_recovered",0,{confirm:true,note:"Confirm rezultatul comercial."})),/intervention required/);
  await sql(write("reviewed",0));
  await sql("insert into opportunity_documents values("+q(ref)+","+q(business)+","+q(opportunity)+",'draft',now())");
  await sql(write("action_prepared",1,{ref}));assert.equal(await sql("select count(*) from commercial_impact_events where kind='verified_recovered'"),"0");
  await assert.rejects(sql(write("action_confirmed",2,{ref})),/audit intervention required/);
  await sql("update opportunities set owner_profile_id="+q(actor)+";insert into opportunity_events values("+q(ref)+","+q(business)+","+q(opportunity)+","+q(actor)+",'commercial_details_changed','Responsabil atribuit',"+q(JSON.stringify({owner_profile_id:actor,previous_owner_profile_id:null}))+"::jsonb,now());");
  await sql(write("action_confirmed",2,{ref}));
  await assert.rejects(sql(write("verified_recovered",3,{confirm:true,note:"Confirm rezultatul comercial."})),/won outcome required/);
  const protectedRequest=crypto.randomUUID();
  await assert.rejects(sql(write("protected",3,{confirm:null,note:"Confirm rezolvarea blocajului."})),/human attribution required/);
  await sql(write("protected",3,{confirm:true,request:protectedRequest,note:"Confirm rezolvarea blocajului."}));
  assert.equal(await sql("select count(*) from commercial_impact_events where kind='verified_recovered'"),"0");
  await sql("update opportunities set status='won',lifecycle_status='won',actual_outcome_amount=11000,outcome_date=current_date,outcome_recorded_at=now(),outcome_recorded_by_profile_id="+q(actor));
  const verifyRequest=crypto.randomUUID(),verify=write("verified_recovered",4,{request:verifyRequest,confirm:true,note:"Atribuire umană explicită pe baza rezultatului CRM."});
  const verifiedId=await sql(verify);assert.equal(await sql(verify),verifiedId);
  await assert.rejects(sql(write("verified_recovered",5,{confirm:true,note:"Duplicat din alt semnal comercial."})),/already verified/);
  await assert.rejects(sql("update commercial_impact_events set amount=99999 where id="+q(verifiedId)),/append-only/);
  await assert.rejects(sql("delete from commercial_impact_cases"),/append-only/);
  await assert.rejects(sql("set role authenticated;"+write("reviewed",5).replace("set role service_role;","")),/permission denied/);
  await sql(write("invalidated",5,{confirm:true,note:"Corecție explicită: suma inițială necesită ajustare."}));
  await sql("update opportunities set actual_outcome_amount=10500");
  await sql(write("verified_recovered",6,{confirm:true,note:"Corecție verificată explicit din rezultatul comercial."}));
  assert.equal(await sql("select amount from commercial_impact_events where id="+q(verifiedId)),"11000.00");
  assert.equal(await sql("select amount from commercial_impact_events order by revision desc limit 1"),"10500.00");
  assert.equal(await sql("select count(*) from commercial_impact_events where supersedes_id is not null"),"3");
  assert.equal(await sql("set role authenticated;set app.business="+q(other)+";set app.actor="+q(member)+";set app.manager='true';select count(*) from commercial_impact_events"),"0");
  assert.equal(await sql("set role authenticated;set app.business="+q(business)+";set app.actor="+q(actor)+";set app.manager='true';select count(*) from commercial_impact_cases"),"1");
  assert.equal(await sql("select has_table_privilege('authenticated','commercial_impact_events','INSERT')"),"f");
  assert.equal(await sql("select bool_and(jsonb_array_length(evidence)>0) from commercial_impact_events"),"t");
  const planId="50000000-0000-4000-8000-000000000001",runId="60000000-0000-4000-8000-000000000001";
  await sql("insert into ask_action_plans values("+q(planId)+","+q(business)+","+q(opportunity)+",'opportunity',"+q(actor)+",'prepared',now(),null,null,null,'create_task')");
  await assert.rejects(sql(write("action_confirmed",7,{ref:planId})),/executed human approved/);
  await sql("update ask_action_plans set status='executed',approved_by_profile_id="+q(actor)+",executed_at=now(),result_entity_id="+q(ref)+";insert into commercial_workflow_runs values("+q(runId)+","+q(business)+","+q(opportunity)+","+q(runId)+",array["+q(planId)+"::uuid],false)");
  await sql(write("action_confirmed",7,{ref:planId}));
  assert.equal(await sql("select after_state->'provenance'->>'workflowRunId' from commercial_impact_events order by revision desc limit 1"),runId);
  assert.equal(await sql("select count(*) from commercial_impact_events where kind='verified_recovered'"),"2");
  await sql("update ask_action_plans set id='50000000-0000-4000-8000-000000000002',action_type='prepare_email'");
  await assert.rejects(sql(write("action_confirmed",8,{ref:"50000000-0000-4000-8000-000000000002"})),/executed human approved/);
  const revision=Number(await sql("select max(revision) from commercial_impact_events"));
  const race=await Promise.allSettled([sql(write("reviewed",revision)),sql(write("reviewed",revision))]);
  assert.equal(race.filter(r=>r.status==="fulfilled").length,1);assert.match(String(race.find(r=>r.status==="rejected").reason),/revision changed/);
 }finally{
  assert.match(db,/^impact_test_[a-f0-9]{32}$/);
  await sql("drop database "+db,"postgres");
 }
});
