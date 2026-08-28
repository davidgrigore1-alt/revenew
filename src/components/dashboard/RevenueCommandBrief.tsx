"use client";
import { CaseReadiness } from "@/components/ui/CaseReadiness";
import patterns from "@/components/ui/OperationalPatterns.module.css";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, CheckIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { ActionToolbar, toolbarActionClass } from "@/components/ui/ActionToolbar";
import { EvidenceList } from "@/components/evidence/EvidenceList";
import { CopilotConversation } from "@/components/intelligence/CopilotConversation";
import { useToast } from "@/components/ui/ToastProvider";
import { describeCurrentCommercialState } from "@/lib/revenue-command";
import type { RevenueCommandModel } from "@/lib/revenue-command-server";
import { markExecutiveBriefReviewed } from "@/lib/revenue-command-actions";
import { evidenceHref } from "@/lib/evidence-reference";
import { formatProductDateTime, formatProductCurrency } from "@/lib/ui/presentation";
const muted="text-xs leading-5 text-[rgb(var(--text-muted))]";
const money=(rows:Array<{amount:string;currency:string}>|null,empty:string)=>rows?.length?rows.map(r=>formatProductCurrency(Number(r.amount),r.currency)).join(" · "):empty;
export function RevenueCommandBrief({model}:{model:RevenueCommandModel}){
 const [selectedId,setSelectedId]=useState<string|null>(null),[error,setError]=useState(""),[pending,startTransition]=useTransition();
 const router=useRouter(),{showToast}=useToast();
 const selected=model.decisions.find(d=>d.id===selectedId)??model.decisions[0],facts=selected?describeCurrentCommercialState(selected.state):null;
 const changes=selected?model.changes.filter(c=>c.opportunityId===selected.id):[];
 function review(){if(!model.reviewToken)return;setError("");startTransition(async()=>{
  const result=await markExecutiveBriefReviewed(model.reviewToken!);
  if(!result.ok){setError(result.error);return;}
  showToast({title:"Brief marcat ca revizuit",description:"Aprobările, acțiunile și impactul nu au fost modificate.",tone:"success"});router.refresh();
 });}
 return <section className="py-6" aria-labelledby="executive-brief-title">
  <header className="flex flex-wrap items-end justify-between gap-4">
   <div><p className="text-xs font-medium text-[rgb(var(--text-muted))]">Control Center</p><h1 id="executive-brief-title" className="mt-1 text-xl font-semibold">Brief comercial</h1><p className={"mt-1 "+muted}>Actualizat {formatProductDateTime(model.generatedAt)} · {model.scope==="business"?"Workspace autorizat":"Oportunitățile tale"}</p></div>
   <ActionToolbar label="Perioada brief-ului">{[["today","Astăzi"],["7","7 zile"],["30","30 zile"]].map(([id,label])=><Link key={id} href={"/dashboard?view=executive&range="+id} aria-current={model.period.key===id?"page":undefined} className={toolbarActionClass+" aria-[current=page]:border-[rgb(var(--primary))]"}>{label}</Link>)}</ActionToolbar>
  </header>
  <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-[rgb(var(--border))] py-4 xl:grid-cols-4">
   {[["Necesită decizie",model.detected===null?"Informație insuficientă":String(model.decisionCount)],["Valoare detectată · acum",money(model.detected,model.detected===null?"Informație insuficientă":"Fără valoare detectată")],["Intervenții confirmate · interval",model.impact?String(model.impact.interventions):"Informație insuficientă"],["Venit recuperat verificat · interval",money(model.impact?.recovered??null,model.impact?"Încă neverificat":"Informație insuficientă")]].map(([label,value])=><div key={label}><p className={muted}>{label}</p><p className="mt-1 text-base font-semibold tabular-nums">{value}</p></div>)}
  </div>
  <p className="py-4 text-sm leading-6">{model.narrative}</p>
  <p className={muted}>Brieful arată deciziile curente și schimbările din interval. Valoarea detectată nu este venit recuperat; monedele nu se adună.</p>
  {model.limited?<p role="status" className="mt-2 text-xs text-[rgb(var(--warning-text))]">Selecție limitată la cele mai recente 80 de oportunități autorizate și istoricul disponibil. Numerele nu reprezintă întregul workspace.</p>:null}
  <div className="mt-4 grid min-w-0 border-y border-[rgb(var(--border))] lg:grid-cols-[minmax(0,1.3fr)_minmax(340px,1fr)]">
   <section aria-label="Decizii executive" className={"min-w-0 " + patterns.reviewPane}>
    <h2 className="px-3 py-3 text-sm font-semibold">Ce necesită decizie <span className="font-normal text-[rgb(var(--text-muted))]">· primele {model.decisions.length}</span></h2>
    {model.decisions.length?<ul className="divide-y divide-[rgb(var(--border))]">{model.decisions.map((d,i)=><li key={d.id} className={selected?.id===d.id?"border-l-2 border-[rgb(var(--primary))] bg-[rgb(var(--surface-elevated))]":"border-l-2 border-transparent"}>
     <button type="button" aria-pressed={selected?.id===d.id} aria-controls="executive-decision-detail" onClick={()=>setSelectedId(d.id)} className="focus-ring block w-full px-3 py-3 text-left hover:bg-[rgb(var(--surface-subtle))]">
      <span className="flex items-baseline gap-2"><span className={muted}>{i+1}</span><span className="min-w-0 break-words text-sm font-semibold">{d.state.title}</span></span>
      <span className={"mt-1 block "+muted}>{d.state.organization.name??"Companie neconfirmată"}</span>
      <span className="mt-2 block text-xs leading-5">{d.reason}</span>
      <span className="mt-2 block"><CaseReadiness owner={Boolean(d.state.ownership.ownerProfileId)} action={Boolean(d.state.nextAction)} dated={Boolean(d.state.nextAction?.dueAt)} overdue={d.state.nextAction?.overdue} evidence={d.evidence.length}/></span>
      <span className={"mt-2 flex flex-wrap gap-x-3 gap-y-1 "+muted}><span>{d.state.ownership.ownerName??(d.state.ownership.ownerProfileId?"Responsabil atribuit":"Fără responsabil")}</span><span>{d.state.nextAction?.dueAt?formatProductDateTime(d.state.nextAction.dueAt):"Termen neconfirmat"}</span><span>{formatProductCurrency(d.state.financial.estimatedValue,d.state.financial.currency)} · estimare CRM</span></span>
     </button>
     <div className="px-3 pb-3"><Button href={evidenceHref(d.action.href)??d.action.href} variant="ghost" size="small">{d.action.label}<ArrowRightIcon className="h-4 w-4" aria-hidden="true"/></Button></div>
    </li>)}</ul>:<p className={"px-3 py-5 "+muted}>Nu există decizii confirmabile în selecția disponibilă.</p>}
    {model.decisionCount>8?<Link href="/recoverable" className="focus-ring block px-3 py-3 text-xs hover:underline">Vezi celelalte situații în Impact comercial →</Link>:null}
   </section>
   <aside id="executive-decision-detail" aria-label="Detaliul deciziei" className={"min-w-0 border-t border-[rgb(var(--border))] p-4 lg:border-l lg:border-t-0 " + patterns.reviewPane}>
    {selected&&facts?<><h2 className="text-base font-semibold">{selected.state.title}</h2>
     <h3 className="mt-4 text-xs font-semibold">De ce acum</h3><p className="mt-1 text-sm leading-6">{selected.reason}</p>
     <h3 className="mt-4 text-xs font-semibold">Situația acum</h3><p className={"mt-1 "+muted}>{facts.owner}</p><p className={muted}>{facts.next}</p>
     {changes.length?<><h3 className="mt-4 text-xs font-semibold">Ce s-a schimbat</h3><ul className={"mt-1 space-y-1 "+muted}>{changes.slice(0,3).map(c=><li key={c.id}>{c.label} · {formatProductDateTime(c.at)}</li>)}</ul></>:null}
     <h3 className="mt-4 text-xs font-semibold">Dovezi</h3><EvidenceList items={selected.evidence} limit={4}/>
     <div className="mt-4"><Button href={evidenceHref(selected.action.href)??selected.action.href} size="small">{selected.action.label}<ArrowRightIcon className="h-4 w-4" aria-hidden="true"/></Button></div>
     <details className={"mt-4 border-t border-[rgb(var(--border))] pt-2 "+muted}><summary className="focus-ring cursor-pointer py-2">De ce este prioritar?</summary><p>{selected.rule}</p><p className="mt-2">Nicio acțiune externă nu este executată din brief.</p></details>
     <Link href={"/opportunities/"+selected.id} className="focus-ring mt-3 inline-block text-xs hover:underline">Deschide oportunitatea și istoricul →</Link>
    </>:<p className={muted}>Selectează o decizie pentru context și dovezi.</p>}
   </aside>
  </div>
  <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
   <section aria-labelledby="executive-changes"><h2 id="executive-changes" className="text-sm font-semibold">{model.checkpoint?"De la ultima revizuire":"Ce s-a schimbat în interval"}</h2>
    <p className={"mt-1 "+muted}>{model.checkpoint?"Revizuit până la "+formatProductDateTime(model.checkpoint):"Nu există încă o revizuire înregistrată pentru acest context."}</p>
    {model.historyClipped?<p className={muted}>Revizuirea este anterioară intervalului ales; sunt afișate numai schimbările din {model.period.label.toLowerCase()}.</p>:null}
    {model.changes.length?<ul className="mt-3 divide-y divide-[rgb(var(--border))] border-t border-[rgb(var(--border))]">{model.changes.map(c=><li key={c.id} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_auto]"><div><Link href={evidenceHref(c.evidence.entityHref)??"/opportunities/"+c.opportunityId} className="focus-ring text-sm font-medium hover:underline">{c.title}</Link><p className="mt-1 text-xs">{c.label}</p><p className={muted}>{c.detail}</p></div><time className={muted} dateTime={c.at}>{formatProductDateTime(c.at)}</time></li>)}</ul>:<p className={"py-4 "+muted}>{!model.changesComplete?"Istoricul nu este complet; absența schimbărilor nu poate fi confirmată.":model.checkpoint&&!model.historyClipped&&!model.limited?"Nu există schimbări comerciale materiale de la ultima revizuire.":"Nu există schimbări comerciale materiale în intervalul și selecția disponibile."}</p>}
    {model.changeCount>20?<p className={muted}>Primele 20 din {model.changeCount} schimbări disponibile. Istoricul complet se consultă în oportunitate.</p>:null}
   </section>
   <section><h2 className="text-sm font-semibold">Ce a avansat</h2>{model.progress.length?<ul className="mt-3 space-y-3">{model.progress.map(c=><li key={c.id} className="flex gap-2"><CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--success-text))]" aria-hidden="true"/><div><p className="text-xs font-medium">{c.label}</p><Link href={"/opportunities/"+c.opportunityId} className={"focus-ring hover:underline "+muted}>{c.title}</Link></div></li>)}</ul>:<p className={"mt-3 "+muted}>Niciun progres confirmat în selecția acestui interval.</p>}
    <div className="mt-5 border-t border-[rgb(var(--border))] pt-4"><h3 className="text-xs font-semibold">Dovada impactului</h3><p className={"mt-2 "+muted}>Valoare protejată: {money(model.impact?.protected??null,"Încă neverificată")}</p><p className={muted}>Venit recuperat: {money(model.impact?.recovered??null,model.impact?"Încă neverificat":"Informație insuficientă")}</p><Link href="/recoverable" className="focus-ring mt-2 inline-block text-xs hover:underline">Vezi dovada →</Link></div>
   </section>
  </div>
  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-[rgb(var(--border))] py-4">
   <p className={muted}>Marchează revizuit pentru a evidenția schimbările noi la următoarea vizită. Nu confirmă acțiuni, aprobări sau venit.</p>
   <Button size="small" variant="secondary" onClick={review} disabled={!model.reviewToken} loading={pending}>Marchează brief-ul ca revizuit</Button>
   {!model.reviewToken?<p role="status" className={muted}>Revizuirea nu este disponibilă până la încărcarea completă a datelor și a serviciului de checkpoint.</p>:null}
   {error?<p role="alert" className="w-full text-xs text-[rgb(var(--danger-text))]">{error}</p>:null}
  </div>
  <details className="mt-4"><summary className="focus-ring cursor-pointer py-2 text-sm font-medium">Întreabă ReveNew despre brief</summary>
   <CopilotConversation key={model.period.key+":"+(selected?.id??"workspace")} lockedContext={{pageType:"dashboard",route:"/dashboard?view=executive&range="+model.period.key,opportunityId:selected?.id}} contextLabel="Brief executiv" initialSuggestions={["Ce s-a schimbat de la ultima revizuire?","Care decizii blochează cea mai mare valoare?","Ce impact a fost verificat?","De ce este această oportunitate prioritară?"]}/>
  </details>
 </section>;
}
