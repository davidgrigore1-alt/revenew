"use client";
import Link from "next/link";
import { EvidenceList } from "@/components/evidence/EvidenceList";
import { Button } from "@/components/ui/Button";
import { truthStateLabels,type CommercialTruth } from "@/lib/commercial-truth";
import { formatProductDateTime } from "@/lib/ui/presentation";
export function CommercialTruthSnapshot({truth,onPrepare,compact=false,prepareLabel="Pregătește următorul pas"}:{truth:CommercialTruth|null;onPrepare?:()=>void;compact?:boolean;prepareLabel?:string}){
 if(!truth)return <p className="border-y border-[rgb(var(--border))] py-3 text-xs text-[rgb(var(--text-muted))]">Situație comercială · Informație insuficientă momentan. Oportunitatea rămâne disponibilă.</p>;
 const discrepancies=truth.issues.filter(item=>item.kind==="interpretation").length;
 return <section aria-label="Situație comercială verificabilă" className="min-w-0 border-y border-[rgb(var(--border))] py-3">
  <div className="flex items-center justify-between gap-3">
   <h3 className="text-xs font-semibold">{compact?<Link href={"/opportunities/"+truth.opportunityId} className="focus-ring hover:underline">{truth.title}</Link>:"Situație comercială"}</h3>
   <span className={"text-xs "+(truth.state==="confirmed"?"text-[rgb(var(--success-text))]":"text-[rgb(var(--text-muted))]")}>{discrepancies?discrepancies+" "+(discrepancies===1?"neconcordanță":"neconcordanțe"):truthStateLabels[truth.state]}</span>
  </div>
  <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
   {truth.topFacts.slice(0,5).map(fact=><div key={fact.id} className="flex min-w-0 items-baseline justify-between gap-3 py-1 text-xs">
    <dt className="shrink-0 text-[rgb(var(--text-muted))]">{fact.label}</dt>
    <dd className="truncate text-right font-medium" title={fact.value}>{fact.value}</dd>
   </div>)}
  </dl>
  <details className="mt-2">
   <summary className="focus-ring cursor-pointer rounded py-1 text-xs font-medium text-[rgb(var(--text-secondary))]">De ce? · Dovezi și următorul pas</summary>
   <div className="mt-2 divide-y divide-[rgb(var(--border))]">
    {truth.issues.slice(0,4).map(item=><article key={item.id} className="py-3 text-xs leading-5">
     <p className="text-[11px] text-[rgb(var(--text-muted))]">{item.kind==="interpretation"?"Interpretare · necesită verificare":"Ce lipsește"}</p>
     <h4 className="font-semibold">{item.title}</h4><p className="mt-1 text-[rgb(var(--text-secondary))]">{item.explanation}</p>
     <p className="mt-1"><span className="font-medium">De ce contează: </span>{item.whyItMatters}</p>
     <p className="mt-1"><span className="font-medium">Următorul pas: </span>{item.nextStep}</p>
     <details className="mt-2"><summary className="focus-ring cursor-pointer rounded text-[rgb(var(--text-muted))]">Vezi faptele și sursele</summary>
      <ul className="mt-2 space-y-1">{truth.claims.filter(f=>item.claimIds.includes(f.id)).map(f=><li key={f.id}><strong className="font-medium">Fapt înregistrat: </strong>{f.label} · {f.value}{f.freshness!=="current"?" · actualitate neconfirmată":""}</li>)}</ul>
      <EvidenceList items={item.evidence}/>
     </details>
    </article>)}
   </div>
   <details className="py-2 text-xs">
    <summary className="focus-ring cursor-pointer rounded text-[rgb(var(--text-muted))]">{truth.sourceCount} surse · Toate faptele evaluate</summary>
    <div className="mt-2 divide-y divide-[rgb(var(--border))]">{truth.claims.map(fact=><div key={fact.id} className="py-2">
     <p><span className="font-medium">{fact.label}: </span>{fact.value}</p>
     <p className="mt-1 text-[11px] text-[rgb(var(--text-muted))]">Fapt {fact.derivation==="explicit_source_field"?"menționat explicit în document":"înregistrat în context"} · {fact.observedAt?formatProductDateTime(fact.observedAt):"dată neconfirmată"}{fact.freshness==="old"?" · sursă veche":""}</p>
     <EvidenceList items={fact.evidence}/>
    </div>)}</div>
   </details>
   {truth.limitations.length?<p className="py-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{truth.limitations.join(" ")}</p>:null}
   <div className="mt-2 flex flex-wrap gap-2">
    <Button href={"/opportunities/"+truth.opportunityId+"?tab=files"} variant="secondary" size="small">Verifică documentele</Button>
    {onPrepare?<Button onClick={onPrepare} variant="secondary" size="small">{prepareLabel}</Button>:
     <Button size="small" variant="secondary" onClick={()=>window.dispatchEvent(new CustomEvent("revenew:open-contextual-assistant",{detail:{question:"Pregătește următorul pas."}}))}>Pregătește următorul pas</Button>}
   </div>
  </details>
 </section>;
}
