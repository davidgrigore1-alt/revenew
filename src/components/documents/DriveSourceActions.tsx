"use client";
import { useRef,useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toolbarActionClass,toolbarOverflowClass } from "@/components/ui/ActionToolbar";
import { sourceStateLabels,type SourceState } from "@/lib/google-workspace/drive-types";
const action="focus-ring block w-full rounded-button px-3 py-2 text-left text-xs hover:bg-[rgb(var(--surface-subtle))] disabled:opacity-50";
export function DriveSourceActions({id,title,canSync,canRemove,detailHref,sourceHref,inlineSync=false,onChanged}:{
 id:string;title:string;canSync:boolean;canRemove:boolean;detailHref?:string;sourceHref?:string;inlineSync?:boolean;onChanged?:()=>void;
}){
 const router=useRouter(),dialog=useRef<HTMLDialogElement>(null),menu=useRef<HTMLDetailsElement>(null),inFlight=useRef(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function mutate(mode:"sync"|"remove"){
  if(inFlight.current)return;inFlight.current=true;setBusy(true);setMessage("");
  if(menu.current)menu.current.open=false;
  try{
   const response=await fetch("/api/integrations/google/drive",{method:"POST",headers:{"content-type":"application/json"},cache:"no-store",
    body:JSON.stringify({action:mode,sourceId:id,confirmed:mode==="remove"})});
   if(!response.ok)throw new Error("source_unavailable");
   const result=await response.json();
   setMessage(mode==="remove"?"Document eliminat din ReveNew; fișierul Google este păstrat.":result.unchanged?"Conținut neschimbat; sursa a fost verificată.":sourceStateLabels[result.state as SourceState]??"Sursa a fost verificată.");
   dialog.current?.close();onChanged?.();
   if(mode==="remove"&&inlineSync)router.push("/documents");else router.refresh();
  }catch{setMessage("Operațiunea nu a fost finalizată. Verifică accesul și reîncearcă.");}
  finally{inFlight.current=false;setBusy(false);}
 }
 return <div className="flex flex-wrap items-center gap-2">
  {inlineSync&&canSync?<button disabled={busy} className={toolbarActionClass} onClick={()=>mutate("sync")}>{busy?"Se sincronizează…":"Sincronizează"}</button>:null}
  <details ref={menu} className="relative">
   <summary aria-label={"Acțiuni pentru "+title} className={toolbarOverflowClass}>⋯</summary>
   <div className="absolute right-0 top-full z-20 w-48 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-1 shadow-lg">
    {detailHref?<Link className={action} href={detailHref}>Deschide</Link>:null}
    {sourceHref?<a className={action} href={sourceHref} target="_blank" rel="noopener noreferrer">Deschide în Google Drive</a>:null}
    {!inlineSync&&canSync?<button disabled={busy} className={action} onClick={()=>mutate("sync")}>Sincronizează</button>:null}
    {canRemove?<button disabled={busy} className={action} onClick={()=>{if(menu.current)menu.current.open=false;dialog.current?.showModal();}}>Elimină din ReveNew</button>:null}
   </div>
  </details>
  {message?<p role="status" className="max-w-xs text-xs text-[rgb(var(--text-muted))]">{message}</p>:null}
  <dialog ref={dialog} onCancel={event=>{if(busy)event.preventDefault();}} aria-label="Elimină din ReveNew" className="w-[min(28rem,95vw)] rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 text-[rgb(var(--foreground))] backdrop:bg-black/50">
   <h3 className="font-semibold">Elimină din ReveNew</h3><p className="mt-3 text-sm">Conținutul sincronizat și legătura comercială vor fi eliminate. Fișierul din Google Drive nu va fi șters.</p>
   <div className="mt-4 flex justify-end gap-2"><button disabled={busy} className={action+" w-auto"} onClick={()=>dialog.current?.close()}>Anulează</button><button disabled={busy} className={action+" w-auto"} onClick={()=>mutate("remove")}>Elimină din ReveNew</button></div>
  </dialog>
 </div>;
}
