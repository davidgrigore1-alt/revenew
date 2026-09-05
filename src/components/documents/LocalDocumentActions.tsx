"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { LocalDocumentUpload } from "./LocalDocumentUpload";
import styles from "./Documents.module.css";
export function LocalDocumentActions({sourceId,versionId,state,opportunityId,opportunities}:{sourceId:string;versionId:string;state:string;opportunityId:string|null;opportunities:{id:string;title:string}[]}) {
  const router=useRouter();const [busy,setBusy]=useState(false),[error,setError]=useState(""),[confirm,setConfirm]=useState(false),[target,setTarget]=useState(opportunityId??"");
  async function action(name:string){if(busy)return;setBusy(true);setError("");try{const res=await fetch(`/api/documents/local/${sourceId}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:name,versionId,opportunityId:target||null})});const value=await res.json();if(!res.ok)throw new Error(value.error);if(value.deleted===false)setError("Documentul nu mai poate fi analizat. Ștergerea originalului este în așteptare; reîncearcă.");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Operațiunea nu a fost confirmată.");}finally{setBusy(false);}}
  return <div className={styles.section}>
    {!["ready","deleted","deletion_pending"].includes(state)?<Button loading={busy} onClick={()=>void action("retry")}>Reîncearcă verificarea</Button>:null}
    {state!=="deleted"&&state!=="deletion_pending"?<>
      <details><summary className="focus-ring cursor-pointer py-3 font-semibold">Leagă de context</summary><label className="grid max-w-lg gap-2 text-sm">Oportunitate<select className="focus-ring rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3" value={target} onChange={e=>setTarget(e.target.value)}><option value="">Fără asociere</option>{opportunities.map(o=><option key={o.id} value={o.id}>{o.title}</option>)}</select></label><Button className="mt-3" disabled={busy} onClick={()=>void action("associate")}>Salvează asocierea</Button></details>
      <details><summary className="focus-ring cursor-pointer py-3 font-semibold">Versiune nouă</summary><LocalDocumentUpload sourceId={sourceId}/></details>
    </>:null}
    {state!=="deleted"?<details><summary className="focus-ring cursor-pointer py-3 text-sm text-[rgb(var(--text-muted))]">Șterge documentul</summary><p className={styles.meta}>Șterge originalele și conținutul extras al tuturor versiunilor. Istoricul operațiunii rămâne, fără conținutul documentului.</p><label className="my-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)}/>Confirm ștergerea documentului</label><Button disabled={!confirm||busy} onClick={()=>void action("delete")}>{state==="deletion_pending"?"Reîncearcă ștergerea":"Șterge documentul"}</Button></details>:null}
    {error?<p className={styles.error} role="alert">{error}</p>:null}
  </div>;
}
