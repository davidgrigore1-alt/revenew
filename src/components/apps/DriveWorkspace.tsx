"use client";
import { Select } from "@/components/ui/Select";
import Link from "next/link";
import { useEffect,useRef,useState,useCallback } from "react";
import { useRouter } from "next/navigation";
import { prepareDrivePicker, selectDriveFiles } from "@/components/apps/drive-picker";
import { documentKinds,sourceStateLabels,type DocumentKind,type SourceState } from "@/lib/google-workspace/drive-types";
import type { DocumentSource } from "@/lib/google-workspace/drive";
import { DocumentTypeIcon } from "@/components/documents/DocumentTypeIcon";
import { DriveSourceActions } from "@/components/documents/DriveSourceActions";
import { toolbarActionClass } from "@/components/ui/ActionToolbar";
import { safeOriginalEvidenceHref } from "@/lib/evidence-reference";
type Model={connectionId:string|null;authorized:boolean;sources:Array<DocumentSource&{canManage:boolean}>;opportunities:Array<{id:string;title:string}>};
type ReviewFile={fileId:string;resourceKey?:string;name:string;mime:string;modifiedAt?:string;state:string;existing:boolean;existingOpportunityId?:string;opportunityId:string;kind:DocumentKind};
const actionClass=toolbarActionClass;
const primaryClass=actionClass+" !bg-[rgb(var(--primary))] !text-[rgb(var(--primary-foreground))]";
async function post(input:Record<string,unknown>){
 const response=await fetch("/api/integrations/google/drive",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(input),cache:"no-store"});
 const data=await response.json();if(!response.ok)throw new Error("drive_unavailable");return data;
}
export function DriveWorkspace({opportunityId,authorized=false,compact=false,selectorOnly=false}:{opportunityId?:string;authorized?:boolean;compact?:boolean;selectorOnly?:boolean}){
 const router=useRouter();const [expanded,setExpanded]=useState(!compact);const [model,setModel]=useState<Model|null>(null);
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [files,setFiles]=useState<ReviewFile[]>([]);
 const trust=useRef<HTMLDialogElement>(null);const review=useRef<HTMLDialogElement>(null);
 const reviewTitle=useRef<HTMLHeadingElement>(null);const returnFocus=useRef<HTMLElement|null>(null);
 const pageScroll=useRef({left:0,top:0});
 const activePicker=useRef<AbortController|null>(null);
 const refresh=useCallback(async()=>{
  const response=await fetch("/api/integrations/google/drive"+(opportunityId?"?opportunity="+encodeURIComponent(opportunityId):""),{cache:"no-store"});
  if(!response.ok)throw new Error("drive_unavailable");setModel(await response.json());
 },[opportunityId]);
 useEffect(()=>{refresh().catch(()=>setMessage("Documentele nu sunt disponibile. Verifică accesul sau configurarea Drive."));},[refresh]);
 useEffect(()=>()=>activePicker.current?.abort(),[]);
 // Preload public Picker configuration and SDKs only; GIS requests a token exclusively on click.
 useEffect(()=>{if(model?.authorized&&model.connectionId)void prepareDrivePicker(model.connectionId).catch(()=>{});},[model?.authorized,model?.connectionId]);
 const enabled=model?.authorized??authorized;
 const restorePagePosition=useCallback(()=>window.scrollTo(pageScroll.current.left,pageScroll.current.top),[]);
 const restoreReviewOrigin=useCallback(()=>{
  restorePagePosition();
  requestAnimationFrame(()=>{restorePagePosition();returnFocus.current?.focus({preventScroll:true});});
 },[restorePagePosition]);
 async function pick(){
  if(!model?.connectionId)return;
  returnFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
  pageScroll.current={left:window.scrollX,top:window.scrollY};
  setBusy(true);setMessage("");
  try{
   activePicker.current=new AbortController();const picked=await selectDriveFiles(model.connectionId,activePicker.current.signal);
   if(!picked.length)return;
   const result=await post({action:"review",connectionId:model.connectionId,files:picked});
   setFiles(result.files.map((file:ReviewFile)=>({...file,opportunityId:opportunityId??file.existingOpportunityId??"",kind:"other"})));
   review.current?.showModal();
   restorePagePosition();
   requestAnimationFrame(()=>{restorePagePosition();reviewTitle.current?.focus({preventScroll:true});});
  }catch{setMessage("Selecția nu este disponibilă. Verifică autorizarea Google Drive și configurarea Picker.");}
  finally{activePicker.current=null;setBusy(false);}
 }
 async function confirm(){
  if(!model?.connectionId)return;setBusy(true);
  try{
   const result=await post({action:"ingest",connectionId:model.connectionId,confirmed:true,
    files:files.map(file=>({fileId:file.fileId,resourceKey:file.resourceKey,opportunityId:file.opportunityId,kind:file.kind}))});
   const good=result.results.filter((item:{state:string})=>["synced","metadata_only"].includes(item.state)).length;
   setMessage(`${good} documente adăugate sau actualizate · ${result.results.length-good} necesită atenție.`);
   review.current?.close();setFiles([]);await refresh();router.refresh();
  }catch{setMessage("Documentele nu au fost adăugate. Verifică accesul și contextul.");}
  finally{setBusy(false);}
 }
 const format=(mime:string)=>mime==="application/vnd.google-apps.document"?"Google Docs":mime==="application/vnd.google-apps.spreadsheet"?"Google Sheets · prima foaie":mime==="application/pdf"?"PDF · doar metadate":mime==="text/plain"?"Text":mime;
 return <div className="min-w-0 text-[rgb(var(--foreground))]">
  {compact||selectorOnly?<div className="flex flex-wrap items-center gap-2">
   <button type="button" disabled={busy||!model} className={selectorOnly?actionClass:primaryClass} onClick={()=>enabled?pick():trust.current?.showModal()}>{busy?"Se procesează…":selectorOnly?"Selectează din Google Drive":enabled?"Selectează documente":"Activează Google Drive"}</button>
   {compact&&!selectorOnly?<button type="button" aria-expanded={expanded} className={actionClass} onClick={()=>setExpanded(value=>!value)}>{expanded?"Ascunde documentele":"Vezi documentele"}</button>:null}
  </div>:null}
  {expanded&&!selectorOnly?<section aria-label="Documente din Google Drive" className={compact?"mt-2":""}>
   {!compact?<><div className="flex flex-wrap items-center justify-between gap-3">
    <div><h3 className="text-sm font-semibold">Documente din Google Drive</h3><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Fișiere selectate explicit · fără acțiuni externe</p></div>
    <button type="button" disabled={busy||(!model&&enabled)} className={primaryClass} onClick={()=>enabled?pick():trust.current?.showModal()}>{busy?"Se procesează…":enabled?"Selectează din Google Drive":"Activează Google Drive"}</button>
   </div><p className="mt-2 text-xs text-[rgb(var(--text-muted))]">Documentele confirmate sunt vizibile membrilor spațiului de lucru. Numai profilul conectat le poate sincroniza.</p></>:null}
   {model?.sources.length?<ul className="mt-3 divide-y divide-[rgb(var(--border))]">{model.sources.map(source=><li key={source.id} className="flex flex-wrap items-center gap-3 py-3">
    <DocumentTypeIcon mime={source.mime_type}/><div className="min-w-0 flex-1">
     <Link className="focus-ring text-xs font-medium hover:underline" href={`/opportunities/${source.opportunity_id}/sources/${source.id}`}>{source.name}</Link>
     <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{documentKinds[source.document_kind]} · {format(source.mime_type)} · {sourceStateLabels[source.state]}</p>
     <p className="text-xs text-[rgb(var(--text-muted))]">{model.opportunities.find(item=>item.id===source.opportunity_id)?.title??"Oportunitate asociată"}{source.last_synced_at?" · Verificat "+new Date(source.last_synced_at).toLocaleString("ro-RO"):""}</p>
    </div><DriveSourceActions id={source.id} title={source.name}
     canSync={source.canManage&&enabled&&source.connection_id===model.connectionId} canRemove={source.canManage}
     detailHref={`/opportunities/${source.opportunity_id}/sources/${source.id}`}
     sourceHref={safeOriginalEvidenceHref(source.web_view_link??undefined)??undefined}
     onChanged={()=>void refresh().catch(()=>setMessage("Documentele nu au putut fi reîncărcate."))}/>
   </li>)}</ul>:<p className="py-4 text-xs text-[rgb(var(--text-muted))]">{model?"Niciun document selectat pentru acest context.":"Se verifică documentele…"}</p>}
   {model&&model.sources.length>=100?<p className="text-xs text-[rgb(var(--text-muted))]">Sunt afișate cele mai recente 100 de documente.</p>:null}
   {model&&!enabled&&model.connectionId?<button className={actionClass} onClick={()=>trust.current?.showModal()}>Reautorizează Google Drive</button>:null}
  </section>:null}
  {message?<p role="status" className="mt-3 text-xs leading-5">{message}</p>:null}
  <dialog ref={trust} className="dark w-[min(32rem,95vw)] rounded-xl border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] p-6 text-[rgb(var(--foreground))] backdrop:bg-black/50" style={{colorScheme:"dark"}} aria-labelledby="drive-trust-title">
   <h3 id="drive-trust-title" className="text-base font-semibold">Activează Google Drive</h3>
   <dl className="mt-6 space-y-5 text-sm leading-6">
    <div className="border-l-2 border-[rgb(var(--success-border))] pl-3"><dt className="font-semibold text-[rgb(var(--success-text))]">Ce poate accesa ReveNew?</dt><dd className="mt-1 text-[rgb(var(--text-muted))]">Doar documentele pe care le selectezi explicit.</dd></div>
    <div><dt className="font-medium">De ce?</dt><dd className="mt-1 text-[rgb(var(--text-muted))]">Pentru a le folosi drept context și dovezi comerciale.</dd></div>
    <div className="border-l-2 border-[rgb(var(--warning-border))] pl-3"><dt className="font-semibold text-[rgb(var(--warning-text))]">Ce NU face?</dt><dd className="mt-1 text-[rgb(var(--text-muted))]">Nu scanează întregul Google Drive prin această funcție.</dd></div>
    <div className="border-t border-[rgb(var(--border))] pt-4"><dt className="font-medium">Control</dt><dd className="mt-1 text-[rgb(var(--text-muted))]">Documentele pot fi eliminate ulterior din ReveNew.</dd></div></dl>
   <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-[rgb(var(--border))] pt-4"><button className={actionClass} onClick={()=>trust.current?.close()}>Anulează</button><a className={primaryClass} href="/api/integrations/google/connect?capability=drive">Continuă cu Google Drive</a></div>
  </dialog>
  <dialog ref={review} tabIndex={-1} onClose={()=>{setFiles([]);restoreReviewOrigin();}} onCancel={event=>{if(busy)event.preventDefault();}} className="w-[min(56rem,calc(100vw-2rem))] overflow-visible rounded-panel border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-elevated))] p-0 text-[rgb(var(--foreground))] shadow-none backdrop:bg-[rgb(12_14_16/0.62)]" aria-labelledby="drive-review-title">
   <div className="max-h-[min(42rem,calc(100dvh-2rem))] overflow-y-auto overscroll-contain rounded-[inherit]">
    <header className="sticky top-0 z-[1] border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] px-5 py-4 sm:px-6">
     <p className="micro-label">Google Drive · selecție controlată</p>
     <h3 ref={reviewTitle} tabIndex={-1} id="drive-review-title" className="mt-1 text-lg font-semibold tracking-[-0.015em] outline-none">Documente selectate</h3>
     <p className="mt-1 max-w-[42rem] text-sm leading-5 text-[rgb(var(--text-muted))]">Confirmă contextul și tipul fiecărui document înainte ca acesta să devină sursă comercială în ReveNew.</p>
    </header>
    <div className="grid gap-3 bg-[rgb(var(--surface-subtle))] p-4 sm:p-5">{files.map(file=><section key={file.fileId} className="rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-4">
     <div className="flex min-w-0 items-start justify-between gap-4 border-b border-[rgb(var(--border))] pb-3">
      <div className="min-w-0"><p className="truncate text-sm font-semibold">{file.name}</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{format(file.mime)}{file.modifiedAt?" · modificat "+new Date(file.modifiedAt).toLocaleDateString("ro-RO"):""}</p><p className="mt-1 text-xs font-medium text-[rgb(var(--text-secondary))]">{file.existing?"Deja adăugat · sursa va fi actualizată":file.state==="ready"?"Pregătit pentru confirmare":sourceStateLabels[file.state as SourceState]??"Necesită atenție"}</p></div>
      <button disabled={busy} className={actionClass} aria-label={"Elimină din selecție "+file.name} onClick={()=>setFiles(rows=>rows.filter(row=>row.fileId!==file.fileId))}>Elimină</button>
     </div>
     <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,.42fr)]">
      <label className="text-xs font-semibold text-[rgb(var(--text-secondary))]">Oportunitate<Select portalContainer={review.current} disabled={busy} density="compact" className="mt-1.5 w-full" value={file.opportunityId} onChange={event=>setFiles(rows=>rows.map(row=>row.fileId===file.fileId?{...row,opportunityId:event.target.value}:row))}><option value="">Selectează contextul comercial</option>{model?.opportunities.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</Select></label>
      <label className="text-xs font-semibold text-[rgb(var(--text-secondary))]">Tip document<Select portalContainer={review.current} disabled={busy} density="compact" className="mt-1.5 w-full" value={file.kind} onChange={event=>setFiles(rows=>rows.map(row=>row.fileId===file.fileId?{...row,kind:event.target.value as DocumentKind}:row))}>{Object.entries(documentKinds).map(([key,label])=><option key={key} value={key}>{label}</option>)}</Select></label>
     </div>
    </section>)}</div>
    {model&&model.opportunities.length>=100?<p className="border-t border-[rgb(var(--border))] px-5 py-3 text-xs text-[rgb(var(--text-muted))] sm:px-6">Sunt afișate primele 100 de oportunități. Pentru alt context, pornește din pagina oportunității.</p>:null}
    <footer className="sticky bottom-0 z-[1] flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] px-5 py-3.5 sm:px-6">
     <p className="text-xs text-[rgb(var(--text-muted))]">Niciun document nu este folosit înainte de confirmare.</p>
     <div className="flex items-center gap-2"><button disabled={busy} className={actionClass} onClick={()=>review.current?.close()}>Anulează</button><button className={primaryClass} disabled={busy||!files.length||files.some(file=>!file.opportunityId||!["ready","metadata_only"].includes(file.state))} onClick={confirm}>{busy?"Se adaugă…":`Adaugă ${files.length} ${files.length===1?"document":"documente"}`}</button></div>
    </footer>
   </div>
  </dialog>
 </div>;
}
