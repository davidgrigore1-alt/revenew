import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
const native=createRequire(import.meta.url);
export function loadTS(path,aliases={}) {
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:id=>id==='server-only'?{}:id in aliases?aliases[id]:native(id),TextEncoder,TextDecoder,Uint8Array,console,Date});
 return module.exports;
}
export const preparation=loadTS('src/lib/ai/preparation-intent.ts');
// Existing unrelated regression harnesses never select a local document. Fail if they unexpectedly do.
export const noSelectedSource={answerSelectedDocument:()=>{throw Error('unexpected selected document in legacy harness');}};
