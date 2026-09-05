import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import test from 'node:test';
import ts from 'typescript';
const nativeRequire=createRequire(import.meta.url);
function harness({denied=false,queryError=false,rpcError=false,known=[]}={}) {
  const calls=[],cache=new Map(),receipts=new Map();
  const supabase={from(table){const filters=[];const query={select(){return query;},eq(key,value){filters.push([key,value]);return query;},limit(){return query;},then(resolve){calls.push({table,filters});return Promise.resolve({data:table==='commercial_signals'?known:[],error:queryError?{code:'fixture_failure'}:null}).then(resolve);}};return query;},async rpc(name,args){calls.push({name,args});if(name==='business_assignable_profiles')return {data:[],error:null};if(rpcError)return {data:null,error:{code:'fixture_failure'}};if(receipts.has(args.batch_fingerprint))return {data:{...receipts.get(args.batch_fingerprint),duplicate_batch:true},error:null};const result={batch_id:'fixture-batch',created:args.accepted_rows.length,rejected:args.rejected_rows.length,duplicates:0,failed:0,duplicate_batch:false};receipts.set(args.batch_fingerprint,result);return {data:result,error:null};}};
  const mocks={
    'server-only':{},'next/cache':{revalidatePath(){}},
    '@/lib/authz/require-permission':{async requirePermission(permission){calls.push({permission});if(denied)throw new Error('denied');return {profileId:'fixture-profile'};}},
    '@/lib/business/current-business':{async getCurrentBusinessForUser(){return {business:{id:'fixture-business'}};}},
    '@/lib/supabase/server':{async createSupabaseServerClient(){return supabase;}},
    '@/lib/supabase/data':{},'@/lib/opportunity-attention':{}
  };
  mocks['./authz/require-permission']=mocks['@/lib/authz/require-permission'];
  mocks['./supabase/admin']={createSupabaseAdminClient:()=>supabase};
  mocks['./documents/validate-import-source']={validateImportSource:()=>{throw Error('unexpected saved source');}};
  function load(file){if(cache.has(file))return cache.get(file);const module={exports:{}};cache.set(file,module.exports);const require=specifier=>Object.hasOwn(mocks,specifier)?mocks[specifier]:specifier.startsWith('@/')?load('src/'+specifier.slice(2)+'.ts'):specifier.startsWith('.')?load(path.join(path.dirname(file),specifier)+'.ts'):nativeRequire(specifier);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{require,module,exports:module.exports,console:{warn(){}},Buffer,Date,Set,Map});return module.exports;}
  return {actions:load('src/lib/commercial-ingestion-actions.ts'),calls,receipts};
}
test('Documents uses the existing server authority and tenant-scoped preview without writes',async()=>{
  const h=harness();const result=await h.actions.previewCommercialSignalImport('fixture.csv',[{title:'Ofertă',source_reference:'0017'}]);
  assert.equal(result.ok,true);assert.equal(result.accepted[0].source_reference,'0017');
  assert.ok(h.calls.some(call=>call.permission==='signals.create'));
  for(const call of h.calls.filter(call=>call.table))assert.ok(call.filters.some(([key,value])=>key==='business_id'&&value==='fixture-business'));
  assert.equal(h.calls.filter(call=>call.name==='import_document_signal_batch').length,0);
});
test('denied or failed validation never reaches the import RPC',async()=>{
  const denied=harness({denied:true});await assert.rejects(()=>denied.actions.confirmCommercialSignalImport('fixture.csv',[{title:'Ofertă'}]),/denied/);assert.equal(denied.calls.length,1);
  const failed=harness({queryError:true});assert.equal((await failed.actions.confirmCommercialSignalImport('fixture.csv',[{title:'Ofertă'}])).ok,false);assert.equal(failed.receipts.size,0);
});
test('confirmation forwards only explicit selections and retains durable replay identity',async()=>{
  const h=harness();const rows=[{title:'Ofertă A'},{title:'Ofertă B'},{title:''}];
  const preview=await h.actions.previewCommercialSignalImport('fixture.csv',rows);
  const selected=[preview.accepted[0].row_fingerprint];
  const first=await h.actions.confirmCommercialSignalImport('fixture.csv',rows,selected);
  assert.equal(first.created,1);assert.equal(first.notSelected,1);assert.equal(first.rejected,1);
  const rpc=h.calls.find(call=>call.name==='import_document_signal_batch');assert.equal(rpc.args.target_business_id,'fixture-business');assert.equal(rpc.args.p_actor,'fixture-profile');assert.equal(rpc.args.accepted_rows.length,1);assert.equal(rpc.args.accepted_rows[0].title,'Ofertă A');
  const repeated=await h.actions.confirmCommercialSignalImport('fixture.csv',rows,selected);assert.equal(repeated.duplicateBatch,true);assert.equal(repeated.batchId,first.batchId);assert.equal(h.receipts.size,1);
});
test('empty or forged selection and RPC failure cannot report successful creation',async()=>{
  const h=harness();assert.equal((await h.actions.confirmCommercialSignalImport('fixture.csv',[{title:'Ofertă'}],[])).ok,false);assert.equal((await h.actions.confirmCommercialSignalImport('fixture.csv',[{title:'Ofertă'}],['forged'])).ok,false);assert.equal(h.receipts.size,0);
  const failed=harness({rpcError:true});const result=await failed.actions.confirmCommercialSignalImport('fixture.csv',[{title:'Ofertă'}]);assert.equal(result.ok,false);assert.equal(result.created,0);assert.equal(failed.receipts.size,0);
});
test('source owner and approval declarations never assign canonical responsibility',async()=>{
 const h=harness();const rows=[{title:'Declared responsibility',owner:'Unmatched source owner',approval_status:'Approved',outcome_confirmed:'Yes',next_action:'Send an email'}];
 const preview=await h.actions.previewCommercialSignalImport('fixture.csv',rows);
 assert.equal(preview.accepted.length,1);assert.equal(preview.accepted[0].owner_label,'Unmatched source owner');assert.equal(preview.accepted[0].owner_profile_id,'');
 const result=await h.actions.confirmCommercialSignalImport('fixture.csv',rows,[preview.accepted[0].row_fingerprint]);assert.equal(result.ok,true);
 const row=h.calls.find(call=>call.name==='import_document_signal_batch').args.accepted_rows[0];
 assert.equal(row.owner_profile_id,'');assert.equal(row.approval_status_label,'Approved');assert.equal(row.outcome_confirmed_label,'Yes');assert.doesNotMatch(row.context,/[\r\n]/);
});
