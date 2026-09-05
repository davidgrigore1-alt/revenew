import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createClient} from '@supabase/supabase-js';
import {createLocalAdminClient,runLocalSql} from '../demo/local-supabase.mjs';
const require=createRequire(import.meta.url),{parse}=require('../documents/parse-workbook.cjs');
const {client:admin,local}=createLocalAdminClient(),bucket='commercial-document-originals';
const users=[],profiles=[],businesses=[randomUUID(),randomUUID()],keys=[];
const ok=r=>{assert.equal(r.error,null,r.error?.code);return r.data;};let checks=0;
const verify=(value,message)=>{assert.ok(value,message);checks++;};
try{
 const sessions=[];
 for(let i=0;i<3;i++){
  const email=`workbook-${randomUUID()}@revenew-test.invalid`,password=randomBytes(24).toString('base64url');
  const user=ok(await admin.auth.admin.createUser({email,password,email_confirm:true})).user;users.push(user.id);const profile=randomUUID();profiles.push(profile);
  runLocalSql(`insert into public.profiles(id,user_id,full_name,email) values('${profile}','${user.id}','[TEST] Workbook','${email}');`);
  const client=createClient(local.apiUrl,local.anonKey,{auth:{persistSession:false,autoRefreshToken:false}});ok(await client.auth.signInWithPassword({email,password}));sessions.push(client);
 }
 const [owner,foreign,member]=sessions;
 runLocalSql(`insert into public.businesses(id,owner_profile_id,name) values('${businesses[0]}','${profiles[0]}','[TEST] Workbook'),('${businesses[1]}','${profiles[1]}','[TEST] Foreign');insert into public.business_members(business_id,profile_id,role,status) values('${businesses[0]}','${profiles[2]}','member','active');`);
 const v=ok(await owner.rpc('reserve_local_document',{p_business:businesses[0],p_filename:'Synthetic.xlsx'}));keys.push(v.object_key);
 const bytes=fs.readFileSync(new URL('../../tests/fixtures/corporate-workbook.xlsx',import.meta.url)),workbook=parse(bytes),hash=createHash('sha256').update(bytes).digest('hex');
 verify(v.format==='xlsx'&&v.mime_type==='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','XLSX admission metadata');
 verify(Boolean((await owner.storage.from(bucket).upload(v.object_key,bytes,{contentType:v.mime_type})).error),'client upload denied');
 ok(await admin.storage.from(bucket).upload(v.object_key,bytes,{contentType:v.mime_type,upsert:false}));
 const args={p_version:v.id,p_size:bytes.length,p_hash:hash,p_workbook:workbook};
 verify(Boolean((await owner.rpc('finalize_local_workbook',args)).error),'client cannot finalize evidence');
 verify(Boolean((await owner.storage.from(bucket).download(v.object_key)).error),'reserved original unreadable');
 ok(await admin.rpc('finalize_local_workbook',args));ok(await admin.rpc('finalize_local_workbook',args));
 const version=ok(await owner.from('local_document_versions').select('*').eq('id',v.id).single());
 verify(version.workbook.sheetCount===4,'durable multi-sheet metadata');
 verify(version.workbook.sheets[3].cells.find(c=>c.address==='C3').cached===false,'uncached formula stays unknown');
 for(const session of [owner,member]){const blob=ok(await session.storage.from(bucket).download(v.object_key));verify(createHash('sha256').update(Buffer.from(await blob.arrayBuffer())).digest('hex')===hash,'exact byte identity under live RLS');}
 verify(ok(await foreign.from('local_document_versions').select('id,workbook').eq('id',v.id)).length===0,'foreign projection denied');
 verify(Boolean((await foreign.storage.from(bucket).download(v.object_key)).error),'foreign original denied');
 verify(Boolean((await admin.from('local_document_versions').update({workbook:{}}).eq('id',v.id)).error),'ready workbook immutable');
 verify(Boolean((await owner.rpc('import_crm_batch_atomic',{p_actor:profiles[0],p_business:businesses[0],p_target:'organizations',p_rows:[{name:'Forged'}],p_mode:'skip'})).error),'client cannot impersonate server import actor');
 const importArgs={p_actor:profiles[0],p_business:businesses[0],p_target:'organizations',p_rows:[{name:'Synthetic workbook organization'}],p_mode:'skip',p_version:v.id,p_sheet:1,p_mapping:{name:0}};
 const receipt=ok(await admin.rpc('import_crm_batch_atomic',importArgs));verify(receipt.ok&&receipt.created===1,'real CRM transaction');
 verify(ok(await admin.rpc('import_crm_batch_atomic',importArgs)).duplicate===true,'real RPC replay');
 verify(ok(await owner.from('data_import_batches').select('document_version_id,sheet_index').eq('id',receipt.batchId).single()).document_version_id===v.id,'durable linked receipt');
 verify(ok(await foreign.from('data_import_batches').select('id').eq('id',receipt.batchId)).length===0,'foreign receipt denied');
 runLocalSql(`update public.business_members set status='inactive' where business_id='${businesses[0]}' and profile_id='${profiles[2]}';`);
 verify(Boolean((await member.storage.from(bucket).download(v.object_key)).error),'revoked live token loses original');
 const v2=ok(await owner.rpc('reserve_local_document',{p_business:businesses[0],p_filename:'Replacement.xlsx',p_source:v.source_id}));keys.push(v2.object_key);verify(v2.object_key!==v.object_key,'new immutable version key');
 ok(await owner.rpc('begin_local_document_delete',{p_source:v.source_id}));verify(Boolean((await owner.storage.from(bucket).download(v.object_key)).error),'pending deletion immediately blocks bytes');
 verify(ok(await owner.from('local_document_versions').select('workbook').eq('id',v.id).single()).workbook===null,'pending deletion removes projection');
 ok(await admin.storage.from(bucket).remove(keys));ok(await admin.rpc('finish_local_document_delete',{p_source:v.source_id}));
 verify(Boolean((await admin.rpc('finalize_local_workbook',args)).error),'deleted version cannot resurrect');
 console.log(`Local workbook Storage/RLS/import checks passed: ${checks}.`);
}finally{
 if(keys.length)await admin.storage.from(bucket).remove(keys);
 const scope=businesses.map(id=>`'${id}'`).join(',');
 runLocalSql(`begin;delete from public.data_import_batches where business_id in (${scope});delete from public.crm_organizations where business_id in (${scope});delete from public.local_document_segments where business_id in (${scope});delete from public.local_document_audit where business_id in (${scope});delete from public.local_document_versions where business_id in (${scope});delete from public.local_document_sources where business_id in (${scope});delete from public.business_members where business_id in (${scope});delete from public.businesses where id in (${scope});${profiles.length?`delete from public.profiles where id in (${profiles.map(id=>`'${id}'`).join(',')});`:''}commit;`);
 for(const id of users)await admin.auth.admin.deleteUser(id);
}
