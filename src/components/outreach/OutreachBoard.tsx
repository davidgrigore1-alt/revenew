"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { followUpStatusLabels, type FollowUpDraftStatus } from "@/lib/follow-up-studio";
import { formatDateTimeWithSeconds } from "@/lib/utils";
export type OutreachDraftItem={id:string;opportunityId:string;opportunityTitle:string;subject:string;body:string;status:FollowUpDraftStatus;generationMode:"ai"|"local_fallback";createdAt?:string;nextDueAt?:string};
type Tab="review"|"approved"|"ready"|"sent"|"archived";
const tabs:Array<[Tab,string]>=[["review","De revizuit"],["approved","Aprobate"],["ready","Pregătite"],["sent","Trimise extern"],["archived","Arhivate"]];
function tabFor(status:FollowUpDraftStatus):Tab{if(status==="approved")return"approved";if(status==="ready_to_send")return"ready";if(status==="sent")return"sent";if(status==="archived")return"archived";return"review"}
export function OutreachBoard({drafts}:{drafts:OutreachDraftItem[]}){
 const[tab,setTab]=useState<Tab>("review");const visible=useMemo(()=>drafts.filter(d=>tabFor(d.status)===tab),[drafts,tab]);
 return <div className="grid gap-5">
  <div className="flex flex-wrap gap-2" aria-label="Filtre status draft">{tabs.map(([value,label])=><button key={value} type="button" onClick={()=>setTab(value)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab===value?"bg-mint-400/12 text-mint-400":"border border-white/10 bg-white/[0.05] text-zinc-300 hover:text-white"}`}>{label} · {drafts.filter(d=>tabFor(d.status)===value).length}</button>)}</div>
  {visible.length?<div className="grid gap-4 md:grid-cols-2">{visible.map(d=><article key={d.id} className="rounded-lg border border-white/10 bg-ink-900/70 p-5">
   <div className="flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-zinc-300">{d.generationMode==="ai"?"Draft asistat AI":"Draft standard"}</span><span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-zinc-300">{followUpStatusLabels[d.status]}</span><span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-zinc-300">Netrimis automat</span></div>
   <p className="mt-4 text-xs font-semibold uppercase text-mint-400">{d.opportunityTitle}</p><h2 className="mt-2 font-semibold text-white">{d.subject}</h2><p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{d.body}</p>
   <div className="mt-3 grid gap-1 text-xs text-zinc-400">{d.createdAt?<p>Creat la {formatDateTimeWithSeconds(d.createdAt)}</p>:null}{d.nextDueAt?<p className="font-semibold text-gold-300">Următorul follow-up: {formatDateTimeWithSeconds(d.nextDueAt)}</p>:null}</div>
   <div className="mt-4 flex flex-wrap gap-2"><Link href={`/outreach/${d.id}`} className="rounded-lg bg-mint-500 px-4 py-2 text-sm font-semibold text-ink-950">Deschide Studio</Link><Link href={`/opportunities/${d.opportunityId}`} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-200">Vezi oportunitatea</Link></div>
  </article>)}</div>:<p className="rounded-lg border border-white/10 bg-white/[0.035] px-4 py-5 text-sm text-zinc-400">Nu există drafturi în această etapă.</p>}
 </div>
}