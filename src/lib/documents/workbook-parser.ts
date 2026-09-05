import "server-only";
import { fork } from "node:child_process";
import path from "node:path";
import { WORKBOOK_LIMITS, type WorkbookProjection } from "./workbook-types";
import { LocalDocumentError } from "./local-document-core";
let activeParsers=0;

export async function parseWorkbook(bytes: Uint8Array): Promise<WorkbookProjection> {
  if (!bytes.length || bytes.length > WORKBOOK_LIMITS.bytes) throw new LocalDocumentError("size", "Alege un workbook XLSX de cel mult 2 MB.");
  if(activeParsers>=2)throw new LocalDocumentError("busy","Verificarea documentelor este ocupată momentan. Reîncearcă în câteva secunde.");
  activeParsers++;
  return new Promise((resolve,reject) => {
    let child: ReturnType<typeof fork>;
    try { child = fork(path.join(process.cwd(),"scripts/documents/parse-workbook.cjs"),[],{ execArgv:["--max-old-space-size=128"], stdio:["ignore","ignore","ignore","ipc"], env:{ PATH:process.env.PATH, SystemRoot:process.env.SystemRoot, NODE_ENV:process.env.NODE_ENV } }); } catch { activeParsers--; reject(new LocalDocumentError("workbook", "Workbook-ul nu poate fi verificat momentan. Reîncearcă.")); return; }
    let settled = false;
    const finish = (value?: WorkbookProjection) => { if (settled) return; settled=true; activeParsers--; clearTimeout(timer); child.kill(); if (value) resolve(value); else reject(new LocalDocumentError("workbook", "Workbook-ul nu poate fi verificat în limitele disponibile. Alege un fișier XLSX valid, fără macrocomenzi sau obiecte încorporate.")); };
    const timer = setTimeout(()=>finish(),WORKBOOK_LIMITS.timeoutMs);
    child.once("error",()=>finish()); child.once("exit",()=>finish());
    child.once("message",message=>{ const reply=message as {ok:boolean;result?:WorkbookProjection}; finish(reply.ok ? reply.result : undefined); });
    child.send({bytes:Buffer.from(bytes).toString("base64")},error=>{if(error)finish();});
  });
}
