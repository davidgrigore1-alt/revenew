import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import {createRequire} from 'node:module';
const module = {exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/documents/capabilities.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:module.exports,module});
const {documentCapabilities,documentSourceState,decodeStoredSheet,commercialDocumentHref}=module.exports;
const csvModule={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/documents/csv.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{module:csvModule,exports:csvModule.exports,require:createRequire(import.meta.url),TextEncoder});
const {parseDocumentCsv,mapDocumentCsv}=csvModule.exports;
test('MIME alone grants no preview, extraction, evidence, edit or import',()=>{
  for(const mime of ['application/pdf','application/vnd.google-apps.document','application/vnd.google-apps.spreadsheet','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']) {
    const c=documentCapabilities({mime,state:'metadata_only',hasOriginal:true});
    for(const key of ['preview','text','grid','evidence','verify','importRecords','edit','export']) assert.equal(c[key],false,key);
    assert.equal(c.original,true);
  }
});
test('stored sheets are partial and failed source text cannot become evidence',()=>{
  const c=documentCapabilities({mime:'application/vnd.google-apps.spreadsheet',state:'synced',hasText:true});
  assert.equal(c.grid,true); assert.match(c.coverage,/parțială/);
  assert.equal(documentCapabilities({mime:'text/plain',state:'access_revoked',hasText:true}).evidence,false);
  assert.match(documentSourceState('synced').detail,/nu a fost verificată acum/);
  assert.match(documentSourceState('unavailable').detail,/Nu presupunem/);
});
test('saved grid decoder preserves escaped pipes, newlines, blank cells, zeros and literal formulas',()=>{
  const cells=['0012','a | b','"quoted"','line\nnext','','=HYPERLINK("https://example.com")'];
  assert.equal(JSON.stringify(decodeStoredSheet(cells.map(JSON.stringify).join(' | '))),JSON.stringify([cells]));
});
test('saved grid decoder rejects malformed, executable and out-of-bound representations',()=>{
  for(const input of ['process.exit()','"a" | ','"a"|"b"','"a"\n',Array(41).fill('"a"').join(' | '),Array(501).fill('"a"').join('\n'),'a'.repeat(200001)]) assert.equal(decodeStoredSheet(input),null);
});
test('CSV preview preserves UTF-8, BOM, quoted separators, multiline values and empty cells',()=>{
  const parsed=parseDocumentCsv('\uFEFFTitlu;Telefon;Context;ID\r\nOfertă;0721000000;"A;B\nC";00017\r\nAltul;;;0\r\n');
  assert.equal(parsed.rows.length,2);assert.equal(parsed.rows[0][1],'0721000000');assert.equal(parsed.rows[0][2],'A;B\nC');assert.equal(parsed.rows[0][3],'00017');assert.equal(parsed.rows[1][1],'');
  const mapped=mapDocumentCsv(parsed,{title:0,phone:1,context:2,source_reference:3});
  assert.equal(mapped[0].source_reference,'00017');assert.equal(mapped[1].source_reference,'0');
});
test('CSV refuses binary disguises, malformed quotes, ragged rows, ambiguous headers and oversized input',()=>{
  for(const input of ['%PDF-1.4\na','PK\u0003\u0004\na','A,B\nx','A,a\nx,y','A,B\n"unclosed,y','A,B\nx,\u0000','A\n'+'x'.repeat(6001),'A\n'+Array(1001).fill('x').join('\n'),'A\n'+'x'.repeat(2*1024*1024)])assert.throws(()=>parseDocumentCsv(input));
});
test('CSV keeps literal formulas and rejects incomplete, duplicate or stale mapping',()=>{
  const csv=parseDocumentCsv('Title,ID\n=1+2,0001');
  assert.equal(csv.rows[0][0],'=1+2');
  for(const mapping of [{},{title:0,company:0},{title:7},{title:1.5}])assert.throws(()=>mapDocumentCsv(csv,mapping));
  assert.equal(mapDocumentCsv(csv,{title:0,source_reference:1})[0].title,'=1+2');
});
test('CSV accepts exactly the row bound and refuses mapped payloads above the server request budget',()=>{
  assert.equal(parseDocumentCsv('Title\n'+Array(1000).fill('row').join('\n')).rows.length,1000);
  const csv={headers:['Title','Context'],rows:Array.from({length:100},()=>['test','x'.repeat(6000)])};
  assert.throws(()=>mapDocumentCsv(csv,{title:0,context:1}),/512 KB/);
});
test('Company evidence reaches supported document detail and retains context for other work',()=>{
  assert.equal(commercialDocumentHref({id:'doc',type:'offer',status:'draft'},'opp'),'/documents/doc');
  assert.equal(commercialDocumentHref({id:'doc',type:'follow_up_email',status:'draft'},'opp'),'/opportunities/opp?tab=workflow#opportunity-documents');
  assert.equal(commercialDocumentHref({id:'doc',type:'offer',status:'archived'},'opp'),'/opportunities/opp?tab=workflow#opportunity-documents');
});
