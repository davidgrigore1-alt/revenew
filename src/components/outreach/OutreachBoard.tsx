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
  <div className="flex flex-wrap gap-2 border-b border-[rgb(var(--border))] pb-3" aria-label="Filtre status draft">{tabs.map(([value,label])=><button key={value} type="button" onClick={()=>setTab(value)} aria-pressed={tab===value} className={`focus-ring min-h-10 rounded-button px-3 py-2 text-sm font-semibold transition ${tab===value?"border border-[rgb(var(--brand-500))] bg-[rgb(var(--brand-100))] text-[rgb(var(--brand-800))] dark:bg-[rgb(var(--surface-muted))] dark:text-[rgb(var(--brand-300))]":"border border-transparent text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]"}`}>{label} · {drafts.filter(d=>tabFor(d.status)===value).length}</button>)}</div>
  {visible.length?<div className="grid auto-rows-fr gap-4 md:grid-cols-2">{visible.map(d=><article key={d.id} className="flex h-full min-w-0 flex-col rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-card">
   <div className="flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-[rgb(var(--surface-muted))] px-2.5 py-1 text-[rgb(var(--text-secondary))]">{d.generationMode==="ai"?"Draft asistat AI":"Draft standard"}</span><span className="rounded-full bg-[rgb(var(--surface-muted))] px-2.5 py-1 text-[rgb(var(--text-secondary))]">{followUpStatusLabels[d.status]}</span><span className="rounded-full bg-[rgb(var(--success-background))] px-2.5 py-1 text-[rgb(var(--success-text))]">Netrimis automat</span></div>
   <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">{d.opportunityTitle}</p><h2 className="mt-2 font-semibold text-[rgb(var(--foreground))]">{d.subject}</h2><p className="mt-2 line-clamp-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--text-muted))]">{d.body}</p>
   <div className="mt-4 grid gap-1 border-t border-[rgb(var(--border))] pt-3 text-xs text-[rgb(var(--text-muted))]">{d.createdAt?<p>Creat la {formatDateTimeWithSeconds(d.createdAt)}</p>:null}{d.nextDueAt?<p className="font-semibold text-[rgb(var(--warning-text))]">Următorul follow-up: {formatDateTimeWithSeconds(d.nextDueAt)}</p>:null}</div>
   <div className="mt-auto flex flex-col gap-2 pt-5 sm:flex-row sm:items-center"><Link href={`/outreach/${d.id}`} className="focus-ring inline-flex min-h-11 items-center justify-center rounded-button bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-[rgb(var(--primary-foreground))]">Deschide Studio</Link><Link href={`/opportunities/${d.opportunityId}`} className="focus-ring inline-flex min-h-11 items-center justify-center rounded-button border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--foreground))] hover:bg-[rgb(var(--surface-muted))]">Vezi oportunitatea</Link></div>
  </article>)}</div>:<p className="rounded-button border border-dashed border-[rgb(var(--border))] px-4 py-3 text-sm text-[rgb(var(--text-muted))]">Nu există drafturi în această etapă.</p>}
 </div>
}
