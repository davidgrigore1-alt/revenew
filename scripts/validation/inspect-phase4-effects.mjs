import fs from 'node:fs';
import {createLocalAdminClient} from '../demo/local-supabase.mjs';
const fixture=JSON.parse(fs.readFileSync('artifacts/phase4/fixture.json'));
const {client}=createLocalAdminClient();
const workspace=await client.from('businesses').select('name').eq('id',fixture.businessId).single();
if(workspace.error||!workspace.data.name.startsWith('[TEST] Phase 4'))throw Error('fixture_identity_mismatch');
const result={};
for(const [table,fields] of [['ask_action_plans','id,status,action_type,target_id,created_by_profile_id'],['opportunities','id,status,updated_at']]){
 const read=await client.from(table).select(fields).eq('business_id',fixture.businessId).order('id');
 if(read.error)throw Error('fixture_read_failed');result[table]=read.data;
}
const label=process.argv[2]??'current';
if(!/^[a-z-]+$/.test(label))throw Error('invalid_snapshot_label');
fs.writeFileSync(`artifacts/phase4/effects-${label}.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
