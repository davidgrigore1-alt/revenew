"use client";
import { Select } from "@/components/ui/Select";
import { useRef,useState } from "react";
import { useRouter } from "next/navigation";
import { recordRevenueImpact } from "@/lib/revenue-impact-actions";
import { impactLabels,type ImpactKind } from "@/lib/revenue-impact";
import { toolbarActionClass,ActionToolbar } from "@/components/ui/ActionToolbar";
type Reference={id:string;label:string};
export function TrackImpact({opportunityId}:{opportunityId:string}){
 const router=useRouter(),request=useRef<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 return <div><button className={toolbarActionClass} disabled={busy} onClick={async()=>{
  if(busy)return;setBusy(true);request.current??=crypto.randomUUID();
  const result=await recordRevenueImpact({opportunityId,kind:"detected",requestId:request.current,revision:-1});
  if(result.ok){setError("");router.refresh();}else setError(result.error??"Nu s-a salvat.");setBusy(false);
 }}>{busy?"Se salvează…":"Urmărește impactul"}</button>{error?<p role="status" className="mt-2 text-xs">{error}</p>:null}</div>;
}
export function ImpactControls({opportunityId,revision,canVerify,actions,prepared}:{
 opportunityId:string;revision:number;canVerify:boolean;actions:Reference[];prepared:Reference[];
}){
 const router=useRouter(),[kind,setKind]=useState<ImpactKind>("reviewed"),[reference,setReference]=useState(""),[note,setNote]=useState(""),[confirmed,setConfirmed]=useState(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),request=useRef<{signature:string;id:string}|null>(null);
 const privileged=["protected","verified_recovered","invalidated","dismissed"].includes(kind);
 const references=kind==="action_confirmed"?actions:kind==="action_prepared"?prepared:null;
 const kinds:ImpactKind[]=["reviewed","action_prepared","action_confirmed","outcome_observed",...(canVerify?["protected","verified_recovered","invalidated","dismissed"] as ImpactKind[]:[])];
 return <details className="mt-4 border-t border-[rgb(var(--border))] pt-3 print:hidden">
  <summary className="focus-ring cursor-pointer text-xs font-semibold">Revizuiește și înregistrează impactul</summary>
  <p className="mt-3 text-xs leading-5 text-[rgb(var(--text-muted))]">Acest formular leagă înregistrări existente. Nu execută acțiuni. Venitul este preluat din rezultatul CRM, nu din textul documentelor.</p>
  <form className="mt-3 grid gap-3" onSubmit={async event=>{
   event.preventDefault();if(busy)return;setBusy(true);setMessage("");
   const input={opportunityId,kind,revision,referenceId:reference||undefined,note,confirmed};
   const signature=JSON.stringify(input);if(request.current?.signature!==signature)request.current={signature,id:crypto.randomUUID()};
   const result=await recordRevenueImpact({...input,requestId:request.current.id});
   setMessage(result.ok?"Înregistrat în istoricul impactului.":result.error??"Nu s-a salvat.");
   if(result.ok){request.current=null;router.refresh();}setBusy(false);
  }}>
   <label className="grid gap-1 text-xs">Înregistrare<Select className={toolbarActionClass} value={kind} disabled={busy} onChange={e=>{setKind(e.target.value as ImpactKind);setReference("");setConfirmed(false);}}>{kinds.map(k=><option key={k} value={k}>{impactLabels[k]}</option>)}</Select></label>
   {references?<label className="grid gap-1 text-xs">Înregistrarea existentă<Select required value={reference} disabled={busy} onChange={e=>setReference(e.target.value)} className={toolbarActionClass}><option value="">Selectează dovada</option>{references.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}</Select></label>:null}
   <label className="grid gap-1 text-xs">Explicație și atribuire<textarea maxLength={1000} minLength={privileged?20:undefined} required={privileged} value={note} disabled={busy} onChange={e=>setNote(e.target.value)} rows={3} className="focus-ring rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-2"/></label>
   {privileged?<label className="flex items-start gap-2 text-xs leading-5"><input type="checkbox" required checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={busy} className="mt-1"/>Confirm dovezile și această atribuire. Rezultatul observat după intervenție nu dovedește automat că ReveNew l-a cauzat. Corecțiile necesită invalidarea afirmației anterioare.</label>:null}
   <ActionToolbar><button disabled={busy} className={toolbarActionClass+" !bg-[rgb(var(--primary))] !text-[rgb(var(--primary-foreground))]"} type="submit">{busy?"Se salvează…":"Confirmă înregistrarea"}</button></ActionToolbar>
   {message?<p role="status" className="text-xs">{message}</p>:null}
  </form>
 </details>;
}
