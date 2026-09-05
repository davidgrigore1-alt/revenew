import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {createLocalAdminClient,runLocalSql} from '../demo/local-supabase.mjs';

// Explicit opt-in command, exclusively localhost; synthetic tenants, never demo/customer records.
const {client:admin,local}=createLocalAdminClient();
const bucket='commercial-document-originals',users=[],businesses=[randomUUID(),randomUUID()],profiles=[],keys=[];
const client=()=>createClient(local.apiUrl,local.anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
const ok=result=>{assert.equal(result.error,null,result.error?.code);return result.data;};
let checks=0;
function verified(condition,message){assert.ok(condition,message);checks++;}
try {
  const sessions=[];
  for(let i=0;i<4;i++){
    const email=`document-${randomUUID()}@revenew-test.invalid`,password=randomBytes(24).toString('base64url');
    const user=ok(await admin.auth.admin.createUser({email,password,email_confirm:true})).user;users.push(user.id);const p=randomUUID();profiles.push(p);
    runLocalSql(`insert into public.profiles(id,user_id,full_name,email) values('${p}','${user.id}','[TEST] Document memory','${email}');`);
    const c=client();ok(await c.auth.signInWithPassword({email,password}));sessions.push(c);
  }
  const [owner,foreign,viewer,member]=sessions;
  runLocalSql(`begin; insert into public.businesses(id,owner_profile_id,name) values('${businesses[0]}','${profiles[0]}','[TEST] Document Memory'),('${businesses[1]}','${profiles[1]}','[TEST] Foreign Document Memory');
    insert into public.business_members(business_id,profile_id,role,status) values('${businesses[0]}','${profiles[2]}','viewer','active'),('${businesses[0]}','${profiles[3]}','member','active'); commit;`);
  const bucketData=ok(await admin.storage.getBucket(bucket));verified(bucketData.public===false,'private bucket');
  for(const c of [foreign,viewer])verified(Boolean((await c.rpc('reserve_local_document',{p_business:businesses[0],p_filename:'Pipeline.csv'})).error),'unauthorized reservation denied');
  const v=ok(await owner.rpc('reserve_local_document',{p_business:businesses[0],p_filename:'Pipeline.csv'}));keys.push(v.object_key);
  const bytes=Buffer.from('Company,Status,Next action\nMeridian,In Negotiation,\nNova,Active,Call\n','utf8');const hash=createHash('sha256').update(bytes).digest('hex');
  verified(Boolean((await owner.storage.from(bucket).upload(v.object_key,bytes,{contentType:'text/csv'})).error),'direct client upload denied; bounded server path only');
  ok(await admin.storage.from(bucket).upload(v.object_key,bytes,{contentType:'text/csv',upsert:false}));
  verified(Boolean((await owner.storage.from(bucket).download(v.object_key)).error),'reserved bytes unavailable');
  const args={p_version:v.id,p_size:bytes.length,p_hash:hash,p_headers:['Company','Status','Next action'],p_rows:[['Meridian','In Negotiation',''],['Nova','Active','Call']],p_parser:'csv-utf8-v1'};
  verified(Boolean((await owner.rpc('finalize_local_document',args)).error),'client cannot forge authoritative hash/size');
  ok(await admin.rpc('finalize_local_document',args));ok(await admin.rpc('finalize_local_document',args));checks++;
  verified(ok(await owner.from('local_document_segments').select('*').eq('version_id',v.id)).length===2,'idempotent finalization, row locations');
  for(const c of [viewer,member]){
    verified(ok(await c.from('local_document_sources').select('id').eq('id',v.source_id)).length===1,'workspace collaboration, not uploader private');
    const blob=ok(await c.storage.from(bucket).download(v.object_key));verified(createHash('sha256').update(Buffer.from(await blob.arrayBuffer())).digest('hex')===hash,'original byte identity across accounts/sessions');
  }
  for(const table of ['local_document_sources','local_document_versions','local_document_segments','local_document_audit'])verified(ok(await foreign.from(table).select('*').eq('business_id',businesses[0])).length===0,`foreign ${table} denied`);
  verified(Boolean((await foreign.storage.from(bucket).download(v.object_key)).error),'cross-tenant exact object denied');
  verified(Boolean((await client().storage.from(bucket).download(v.object_key)).error),'anonymous object denied');
  const publicResponse=await fetch(`${local.apiUrl}/storage/v1/object/public/${bucket}/${v.object_key}`);verified(!publicResponse.ok,'public object URL cannot read bytes');
  verified(Boolean((await owner.storage.from(bucket).upload(v.object_key,Buffer.from('overwrite'),{contentType:'text/csv',upsert:true})).error),'overwrite denied');
  verified(Boolean((await admin.storage.from(bucket).upload(v.object_key,bytes,{contentType:'text/csv',upsert:false})).error),'server immutable upload conflict');
  verified(Boolean((await owner.from('local_document_versions').update({content_hash:'a'.repeat(64),byte_size:1}).eq('id',v.id)).error),'metadata forgery denied');
  verified(Boolean((await admin.from('local_document_versions').update({content_hash:'a'.repeat(64)}).eq('id',v.id)).error),'DB finalized hash immutability');
  verified(Boolean((await owner.from('local_document_segments').update({cells:['fake']}).eq('version_id',v.id)).error),'extracted evidence immutable to clients');
  verified(Boolean((await owner.storage.from(bucket).download(`${businesses[0]}/${randomUUID()}`)).error),'forged key denied');
  verified(Boolean((await foreign.rpc('begin_local_document_delete',{p_source:v.source_id})).error),'forged source deletion denied');
  const opportunity=randomUUID();
  runLocalSql(`insert into public.opportunities(id,business_id,title,type,status) values('${opportunity}','${businesses[1]}','[TEST] Foreign','manual','reviewed');`);
  verified(Boolean((await owner.rpc('associate_local_document',{p_source:v.source_id,p_opportunity:opportunity})).error),'foreign opportunity denied');
  runLocalSql(`update public.business_members set status='inactive' where business_id='${businesses[0]}' and profile_id='${profiles[3]}';`);
  verified(ok(await member.from('local_document_segments').select('*').eq('version_id',v.id)).length===0,'revoked membership loses segments');
  verified(Boolean((await member.storage.from(bucket).download(v.object_key)).error),'download denied with still-live token after revoke');
  const v2=ok(await owner.rpc('reserve_local_document',{p_business:businesses[0],p_filename:'Pipeline.csv',p_source:v.source_id}));keys.push(v2.object_key);
  verified(v2.id!==v.id&&v2.object_key!==v.object_key,'replacement immutable distinct version');
  verified(ok(await owner.from('local_document_versions').select('state').eq('id',v.id))[0].state==='ready','unfinished replacement/import cancellation preserves original');
  const badKey=v2.object_key;
  verified(Boolean((await admin.storage.from(bucket).upload(badKey,Buffer.from('%PDF'),{contentType:'application/pdf'})).error),'bucket rejects MIME mismatch');
  verified(Boolean((await admin.storage.from(bucket).upload(badKey,Buffer.alloc(2097153),{contentType:'text/csv'})).error),'bucket enforces size');
  ok(await owner.rpc('begin_local_document_delete',{p_source:v.source_id}));
  verified(Boolean((await owner.storage.from(bucket).download(v.object_key)).error),'pending deletion blocks bytes before removal');
  verified(ok(await owner.from('local_document_segments').select('*').eq('version_id',v.id)).length===0,'pending deletion removes extracted body');
  const failedDeletionClient=createClient(local.apiUrl,local.serviceRoleKey,{auth:{persistSession:false},global:{fetch:async()=>{throw new Error('synthetic removal outage');}}});
  const failedRemoval=await failedDeletionClient.storage.from(bucket).remove(keys);verified(Boolean(failedRemoval.error),'physical delete failure injected at Storage transport');
  verified(ok(await owner.from('local_document_sources').select('state').eq('id',v.source_id))[0].state==='deletion_pending','truthful deletion pending after failure');
  ok(await owner.rpc('begin_local_document_delete',{p_source:v.source_id}));ok(await admin.storage.from(bucket).remove(keys));ok(await admin.rpc('finish_local_document_delete',{p_source:v.source_id}));
  verified(ok(await owner.from('local_document_sources').select('state').eq('id',v.source_id))[0].state==='deleted','retry reaches deletion receipt');
  verified(Boolean((await admin.storage.from(bucket).download(v.object_key)).error),'physical bytes removed');
  verified(Boolean((await admin.rpc('finalize_local_document',args)).error),'finalization cannot resurrect deleted version');
  verified(ok(await owner.from('local_document_audit').select('*').eq('source_id',v.source_id)).every(row=>!('body' in row)&&!('cells' in row)),'audit tombstone contains no body');
  console.log(`Local Storage/Postgres document checks passed: ${checks}. Synthetic fixtures cleaned in finally.`);
} finally {
  if(keys.length)await admin.storage.from(bucket).remove(keys);
  // Exact random test businesses only. No demo reset; all fixture objects removed via Storage API first.
  const scope=businesses.map(id=>`'${id}'`).join(',');
  runLocalSql(`begin; delete from public.local_document_segments where business_id in (${scope}); delete from public.local_document_audit where business_id in (${scope}); delete from public.local_document_versions where business_id in (${scope}); delete from public.local_document_sources where business_id in (${scope}); delete from public.opportunities where business_id in (${scope}); delete from public.business_members where business_id in (${scope}); delete from public.businesses where id in (${scope}); ${profiles.length?`delete from public.profiles where id in (${profiles.map(id=>`'${id}'`).join(',')});`:''} commit;`);
  for(const id of users)await admin.auth.admin.deleteUser(id);
}
