import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {loadTS} from './helpers/phase32-modules.mjs';
const require=createRequire(import.meta.url);
const {parse}=require('../scripts/documents/parse-workbook.cjs');
const workbook=parse(fs.readFileSync(new URL('./fixtures/corporate-workbook.xlsx',import.meta.url)));
const adapter=loadTS('src/lib/documents/workbook-import.ts');

test('corporate fixture retains uncached formulas and both visible and hidden sheets',()=>{
 assert.equal(workbook.sheetCount,4);
 const cell=workbook.sheets[3].cells.find(c=>c.address==='C3');
 assert.equal(cell.cached,false);assert.equal(cell.raw,null);assert.equal(cell.display,'');assert.ok(cell.formula);
 assert.ok(workbook.sheets.some(s=>s.visibility==='hidden'));
 assert.ok(workbook.sheets.some(s=>s.cells.some(c=>c.formula&&c.cached)));
 assert.throws(()=>adapter.workbookSheetCsv(workbook.sheets[3]),/rezultat memorat/);
 assert.throws(()=>adapter.workbookSheetCsv({...workbook.sheets[0],partial:true}),/parțială/);
 assert.equal(adapter.workbookSheetCsv(workbook.sheets[1]).rows.length,6);
});

function validator(doc) {
 const query={select(){return query},eq(){return query},async maybeSingle(){return {data:{source_id:'source'},error:null}}};
 return loadTS('src/lib/documents/validate-import-source.ts',{
  './local-documents':{getLocalDocument:async()=>doc},'./workbook-import':adapter,
  '@/lib/supabase/server':{createSupabaseServerClient:async()=>({from:()=>query})}
 }).validateImportSource;
}
const versionId='00000000-0000-4000-8000-000000000001';
test('saved-source confirmation rejects extra values, changed rows, duplicate mappings and missing sheets',async()=>{
 const validate=validator({source:{state:'active'},version:{state:'ready',headers:['Company','City']},segments:[{cells:['Synthetic','București']}]});
 const provenance={versionId,mapping:{name:0,city:null}};
 assert.equal(await validate(provenance,[{name:'Synthetic',city:''}]),true);
 await assert.rejects(()=>validate(provenance,[{name:'Synthetic',city:'Forged'}]));
 await assert.rejects(()=>validate(provenance,[{name:'Changed'}]));
 await assert.rejects(()=>validate(provenance,[]));
 await assert.rejects(()=>validate({...provenance,mapping:{name:0,city:0}},[{name:'Synthetic',city:'Synthetic'}]));
 const xlsx=validator({source:{state:'active'},version:{state:'ready',workbook},segments:[]});
 await assert.rejects(()=>xlsx({...provenance,sheetIndex:99},[{name:'Synthetic'}]));
});

test('deleted or unavailable source cannot authorize an import',async()=>{
 for(const [source,state] of [['deleted','ready'],['active','unavailable']]){
  await assert.rejects(()=>validator({source:{state:source},version:{state}})({versionId,mapping:{name:0}},[{name:'Synthetic'}]));
 }
});
