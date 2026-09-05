import fs from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {createLocalAdminClient,runLocalSql} from '../demo/local-supabase.mjs';
// Additive closure fixtures only, in the previously verified synthetic workspace.
const base=JSON.parse(fs.readFileSync('artifacts/phase4/fixture.json','utf8'));
const path='artifacts/phase4/closure-fixture.json';
const {client}=createLocalAdminClient();
const must=r=>{if(r.error)throw Error(r.error.code??'closure_fixture_failed');return r.data;};
const business=must(await client.from('businesses').select('id,name,owner_profile_id').eq('id',base.businessId).single());
if(business.name!=='[TEST] Phase 4 Intelligence acceptance'||business.owner_profile_id!==base.ownerProfileId)throw Error('synthetic_identity_mismatch');
const saved=fs.existsSync(path)?JSON.parse(fs.readFileSync(path,'utf8')):null;
if(saved?.ready){console.log('Closure fixture exists; refusing recreation.');process.exit(0);}
const profile=must(await client.from('profiles').select('id,user_id').eq('id',base.ownerProfileId).single());
const original=must(await client.from('opportunities').select('id,title,status,estimated_value_high,currency,updated_at').eq('id',base.opportunityIds[0]).eq('business_id',base.businessId).single());
const result=saved??{businessId:base.businessId,documents:[],duplicateOpportunityId:randomUUID(),contactLinkId:randomUUID(),canonical:original};
const literal=v=>v===null?'null':typeof v==='number'?String(v):typeof v==='boolean'?String(v):"'"+String(v).replaceAll("'","''")+"'";
function insert(table,row){runLocalSql(`insert into public.${table}(${Object.keys(row).join(',')}) values(${Object.values(row).map(literal).join(',')}) on conflict(id) do nothing;`);}
const save=()=>fs.writeFileSync(path,JSON.stringify(result,null,2));
save();
insert('opportunity_contacts',{id:result.contactLinkId,business_id:base.businessId,opportunity_id:original.id,contact_id:base.contactId,role:'decision_maker',is_primary:true});
insert('opportunities',{id:result.duplicateOpportunityId,business_id:base.businessId,organization_id:base.organizationId,title:original.title,type:'manual',status:'reviewed',owner_profile_id:base.ownerProfileId,estimated_value_low:1500,estimated_value_high:1500,currency:'RON',recommended_action:'Verifică anexa distinctă',city:'București'});
// Capture the canonical observation after the explicit association fixture change.
result.canonical=must(await client.from('opportunities').select('id,title,status,estimated_value_high,currency,updated_at').eq('id',original.id).single());save();
const at=result.canonical.updated_at;
const cases=[
 ['Conflict.csv',['Opportunity ID','Opportunity','Estimated value','Currency','Observed at'],[[original.id,original.title,'1300','RON',at]]],
 ['Compatible.csv',['Opportunity ID','Opportunity','Communication milestone','Observed at'],[[original.id,original.title,'Oferta trimisă',at]]],
 ['Identity.csv',['Opportunity','Estimated value','Currency','Observed at'],[[original.title,'1200','RON',at]]]
];
for(const [filename,headers,rows] of cases){
 const reserved=runLocalSql(`begin; set local role authenticated; set local request.jwt.claim.sub='${profile.user_id}'; select row_to_json(public.reserve_local_document('${base.businessId}','${filename}')); commit;`);
 const version=JSON.parse(reserved.split('\n').find(line=>line.startsWith('{')));
 result.documents.push({filename,sourceId:version.source_id,versionId:version.id});save();
 const content=Buffer.from([headers,...rows].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n'));
 must(await client.storage.from('commercial-document-originals').upload(version.object_key,content,{contentType:'text/csv',upsert:false}));
 must(await client.rpc('finalize_local_document',{p_version:version.id,p_size:content.length,p_hash:createHash('sha256').update(content).digest('hex'),p_headers:headers,p_rows:rows,p_parser:'csv-utf8-v1'}));
}
result.ready=true;save();console.log(JSON.stringify(result,null,2));
