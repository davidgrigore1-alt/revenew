"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { updateGeneratedDocument } from "@/lib/actions";
import { assessFollowUpDraft, followUpStatusLabels, type FollowUpDraftStatus } from "@/lib/follow-up-studio";
import { formatDateTimeWithSeconds } from "@/lib/utils";

type TimelineItem={id:string;label:string;description:string;date?:string;actorName?:string};
type StudioDraft={id:string;opportunityId:string;opportunityTitle:string;subject:string;body:string;status:FollowUpDraftStatus;generationMode:"ai"|"local_fallback";recipientEmail?:string;contactName?:string;reason?:string;dueDate?:string;createdAt?:string};

export function FollowUpStudio({initialDraft,timeline}:{initialDraft:StudioDraft;timeline:TimelineItem[]}){
 const[subject,setSubject]=useState(initialDraft.subject);const[body,setBody]=useState(initialDraft.body);const[status,setStatus]=useState(initialDraft.status);const[busy,setBusy]=useState("");const[notice,setNotice]=useState<{tone:"ok"|"error";text:string}|null>(null);
 const assessment=useMemo(()=>assessFollowUpDraft({subject,body,recipientEmail:initialDraft.recipientEmail,contactName:initialDraft.contactName,reason:initialDraft.reason,dueDate:initialDraft.dueDate}),[subject,body,initialDraft]);
 const readOnly=status==="sent"||status==="archived";
 async function save(next:"edited"|"approved"|"ready_to_send"|"archived"){
  setBusy(next);setNotice(null);const result=await updateGeneratedDocument(initialDraft.opportunityId,initialDraft.id,{title:subject,content:body,status:next});
  if(!result.ok){setNotice({tone:"error",text:result.error??"Draftul nu a putut fi salvat."});setBusy("");return}
  setStatus(next);setNotice({tone:"ok",text:next==="approved"?"Draft aprobat explicit. Nu a fost trimis extern.":next==="ready_to_send"?"Draft pregătit pentru utilizare manuală.":next==="archived"?"Draft arhivat.":"Modificările au fost salvate."});setBusy("");
 }
 async function copy(){
  try{await navigator.clipboard.writeText(`${subject}\n\n${body}`);const result=await updateGeneratedDocument(initialDraft.opportunityId,initialDraft.id,{markCopied:true});if(!result.ok)throw new Error(result.error);setNotice({tone:"ok",text:"Draft copiat. Nu a fost trimis extern."})}catch{setNotice({tone:"error",text:"Copierea nu a reușit. Selectează manual textul."})}
 }
 const mailto=initialDraft.recipientEmail?`mailto:${encodeURIComponent(initialDraft.recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`:"";
 return <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.7fr)]">
  <section className="grid gap-5 rounded-lg border border-white/10 bg-ink-900/70 p-5 sm:p-6">
   <div className="flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-zinc-300">{initialDraft.generationMode==="ai"?"Draft asistat AI":"Draft standard"}</span><span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-zinc-300">{followUpStatusLabels[status]}</span><span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-zinc-300">Netrimis automat</span></div>
   <div><label htmlFor="follow-up-subject" className="text-sm font-semibold text-zinc-200">Subiect</label><input id="follow-up-subject" value={subject} onChange={e=>setSubject(e.target.value)} disabled={readOnly} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-ink-950 px-4 text-white outline-none focus:border-mint-400/50 disabled:opacity-60"/></div>
   <div><label htmlFor="follow-up-body" className="text-sm font-semibold text-zinc-200">Mesaj</label><textarea id="follow-up-body" value={body} onChange={e=>setBody(e.target.value)} disabled={readOnly} rows={16} className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-ink-950 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-mint-400/50 disabled:opacity-60"/></div>
   {!readOnly?<div><p className="text-sm font-semibold text-zinc-200">Variante rapide</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={()=>setBody(assessment.variants.shorter)} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-200">Mai scurt</button><button type="button" onClick={()=>setBody(assessment.variants.warmer)} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-200">Mai cald</button><button type="button" onClick={()=>setBody(assessment.variants.direct)} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-200">Mai direct</button></div></div>:null}
   {notice?<p role="status" className={`rounded-lg border px-4 py-3 text-sm ${notice.tone==="error"?"border-red-400/25 bg-red-400/10 text-red-100":"border-mint-400/25 bg-mint-400/10 text-mint-100"}`}>{notice.text}</p>:null}
   <div className="flex flex-wrap gap-2">
    {!readOnly?<button type="button" disabled={Boolean(busy)} onClick={()=>save("edited")} className="rounded-lg bg-mint-500 px-4 py-2 text-sm font-semibold text-ink-950 disabled:opacity-60">Salvează revizuirea</button>:null}
    {!readOnly&&!["approved","ready_to_send"].includes(status)?<button type="button" disabled={Boolean(busy)||!assessment.canApprove} onClick={()=>save("approved")} className="rounded-lg border border-mint-400/30 bg-mint-400/10 px-4 py-2 text-sm font-semibold text-mint-200 disabled:opacity-50">Aprobă draftul</button>:null}
    {status==="approved"?<button type="button" disabled={Boolean(busy)} onClick={()=>save("ready_to_send")} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white">Pregătit pentru utilizare</button>:null}
    <button type="button" onClick={copy} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white">Copiază</button>
    {mailto&&["approved","ready_to_send"].includes(status)?<a href={mailto} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white">Deschide în clientul email</a>:null}
    {!readOnly?<button type="button" disabled={Boolean(busy)} onClick={()=>save("archived")} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-400">Arhivează</button>:null}
   </div>
   <p className="text-xs leading-5 text-zinc-500">ReveNew pregătește conținutul, iar echipa decide. Deschiderea clientului email nu confirmă și nu înregistrează trimiterea.</p>
  </section>
  <aside className="grid content-start gap-5">
   <section className="rounded-lg border border-white/10 bg-ink-900/70 p-5"><h2 className="font-semibold text-white">Context și calitate</h2><dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-zinc-500">Oportunitate</dt><dd><Link href={`/opportunities/${initialDraft.opportunityId}`} className="font-semibold text-mint-300">{initialDraft.opportunityTitle}</Link></dd></div><div><dt className="text-zinc-500">Motiv</dt><dd className="text-zinc-200">{assessment.reason}</dd></div><div><dt className="text-zinc-500">Ton detectat</dt><dd className="capitalize text-zinc-200">{assessment.tone}</dd></div>{initialDraft.dueDate?<div><dt className="text-zinc-500">Termen follow-up</dt><dd className="text-zinc-200">{formatDateTimeWithSeconds(initialDraft.dueDate)}</dd></div>:null}</dl>
    <ul className="mt-5 grid gap-2">{assessment.qualityChecks.map(check=><li key={check.label} className={`text-sm ${check.passed?"text-mint-300":"text-gold-300"}`}>{check.passed?"Verificat":"De revizuit"} · {check.label}</li>)}</ul>
    {assessment.missingInformation.length?<div className="mt-5 rounded-lg border border-gold-400/20 bg-gold-400/10 p-3"><p className="text-sm font-semibold text-gold-200">Informații de confirmat</p><ul className="mt-2 grid gap-1 text-xs leading-5 text-gold-100">{assessment.missingInformation.map(item=><li key={item}>{item}</li>)}</ul></div>:null}
   </section>
   <section className="rounded-lg border border-white/10 bg-ink-900/70 p-5"><h2 className="font-semibold text-white">Istoric auditabil</h2><div className="mt-4 grid gap-4">{timeline.length?timeline.map(item=><div key={item.id} className="border-l border-white/10 pl-3"><p className="text-sm font-semibold text-white">{item.label}</p><p className="mt-1 text-xs leading-5 text-zinc-400">{item.description}</p><p className="mt-1 text-xs text-zinc-500">{item.actorName??"Sistem"}{item.date?` · ${formatDateTimeWithSeconds(item.date)}`:""}</p></div>):<p className="text-sm text-zinc-400">Nu există evenimente pentru acest draft.</p>}</div></section>
  </aside>
 </div>
}