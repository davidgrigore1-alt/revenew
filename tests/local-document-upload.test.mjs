import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import {createRequire} from 'node:module';
const native=createRequire(import.meta.url);
const flat=v=>Array.isArray(v)?v.flatMap(flat):v&&typeof v==='object'?[v,...flat(v.props?.children)]:[];
const text=v=>Array.isArray(v)?v.map(text).join(''):v&&typeof v==='object'?text(v.props?.children):String(v??'');
function harness(){
 const states=[],requests=[],routes=[];let cursor=0;
 const react={useId:()=> 'upload-test',useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],v=>states[i]=v];},useRef(v){const i=cursor++;return states[i]??(states[i]={current:v});}};
 const compile=(file,aliases={})=>{const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{module,exports:module.exports,TextEncoder,TextDecoder,fetch:async(url,options)=>{requests.push({url,...options});return {ok:true,json:async()=>({sourceId:'source',versionId:'version'})};},require:id=>id in aliases?aliases[id]:native(id)});return module.exports;};
 const component=compile('src/components/documents/LocalDocumentUpload.tsx',{react,'next/navigation':{useRouter:()=>({push:r=>routes.push(r),refresh:()=>{}})},'@/components/ui/Button':{Button:'button'},'@/lib/documents/csv':compile('src/lib/documents/csv.ts'),'./Documents.module.css':{}});
 const render=()=>{cursor=0;return component.LocalDocumentUpload({});};
 const find=fn=>flat(render()).find(fn);
 const settle=()=>new Promise(r=>setImmediate(r));
 return {render,find,requests,routes,settle,async select(files){find(n=>n.type==='input').props.onChange({currentTarget:{files,value:'native'}});await settle();},async drop(files){find(n=>n.type==='section').props.onDrop({preventDefault(){},dataTransfer:{files}});await settle();}};
}
const file=(name='synthetic.csv',raw='Company,Status\nSynthetic,Active',extra={})=>({name,type:'text/csv',size:raw.length,arrayBuffer:async()=>new TextEncoder().encode(raw).buffer,...extra});
test('native selection is visible, validated, replaceable and saves only the selected bytes',async()=>{
 const h=harness();assert.equal(h.find(n=>n.type==='button'&&text(n)==='Salvează documentul'),undefined);
 await h.select([file()]);assert.match(text(h.render()),/synthetic.csv/);assert.match(text(h.render()),/Pregătit pentru salvare/);assert.equal(h.requests.length,0);
 await h.select([]);assert.match(text(h.render()),/synthetic.csv/);
 await h.select([file('replacement.csv','Company\nReplacement')]);assert.doesNotMatch(text(h.render()),/synthetic.csv/);
 h.find(n=>n.type==='button'&&text(n)==='Salvează documentul').props.onClick();await h.settle();
 assert.equal(h.requests.length,1);assert.equal(new TextDecoder().decode(h.requests[0].body),'Company\nReplacement');assert.equal(h.routes[0],'/documents/local/source/versions/version');
});
test('drop shares validation; unreadable, invalid, multiple and malformed files cannot save',async()=>{
 const h=harness();await h.drop([file()]);assert.match(text(h.render()),/Pregătit pentru salvare/);
 for(const files of [[file('book.xlsx')],[file('bad.csv','Company,Status\nragged')],[file('empty.csv','')],[file('blocked.csv','a\nb',{arrayBuffer:async()=>{throw Error('denied');}})],[file(),file('two.csv')]]){
  await h.drop(files);assert.ok(h.find(n=>n.props?.role==='alert'));assert.equal(h.find(n=>n.type==='button'&&text(n)==='Salvează documentul').props.disabled,true);
 }
 assert.equal(h.requests.length,0);
});
test('late file reads cannot replace newer native selections',async()=>{
 const h=harness();let resolve;
 await h.select([file('slow.csv','a\nb',{arrayBuffer:()=>new Promise(r=>resolve=r)})]);
 assert.equal(h.find(n=>n.type==='button'&&text(n)==='Salvează documentul').props.disabled,true);
 await h.select([file('current.csv')]);resolve(new TextEncoder().encode('a\nb').buffer);await h.settle();
 assert.match(text(h.render()),/current.csv/);assert.doesNotMatch(text(h.render()),/slow.csv/);
});
