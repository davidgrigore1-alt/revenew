"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, CheckIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { ActionToolbar, toolbarActionClass } from "@/components/ui/ActionToolbar";
import { EvidenceList } from "@/components/evidence/EvidenceList";
import { CopilotConversation } from "@/components/intelligence/CopilotConversation";
import { projectCommercialReview } from "@/lib/commercial-decision-review";
import type { RevenueCommandModel } from "@/lib/revenue-command-server";
import { markExecutiveBriefReviewed } from "@/lib/revenue-command-actions";
import { formatProductCurrency, formatProductDateTime } from "@/lib/ui/presentation";

const muted = "text-xs leading-5 text-[rgb(var(--text-muted))]";
// One track contract for header, every row and empty state; selected borders never alter tracks.
const agendaGrid = "grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_6rem_5.5rem_10.5rem] xl:items-center";
const money = (rows:Array<{amount:string;currency:string}>|null,empty="Încă neverificat") =>
 rows?.length ? rows.map(row=>formatProductCurrency(Number(row.amount),row.currency)).join(" · ") : empty;

export function CommercialDecisionReview({model}:{model:RevenueCommandModel}) {
 const router = useRouter();
 const [phase,setPhase] = useState<"before"|"during"|"after">("before");
 const [selectedId,setSelectedId] = useState<string|null>(null);
 const [visited,setVisited] = useState<string[]>([]);
 const [error,setError] = useState("");
 const [pending,startTransition] = useTransition();
 const detailHeading = useRef<HTMLHeadingElement>(null);
 const agenda = projectCommercialReview(model);
 const selected = agenda.find(item=>item.id===selectedId) ?? agenda[0];
 const selectedIndex = selected ? agenda.findIndex(item=>item.id===selected.id) : -1;
 const incomplete = !model.currentComplete || model.limited;
 useEffect(()=>{ if(phase==="during")detailHeading.current?.focus(); },[phase,selectedId]);
 function select(id:string) {
  setSelectedId(id); setVisited(previous=>previous.includes(id)?previous:[...previous,id]); setPhase("during");
 }
 function finish() {
  if(!model.reviewToken)return;
  setError("");
  startTransition(async()=>{
   const result=await markExecutiveBriefReviewed(model.reviewToken!);
   if(!result.ok){setError(result.error);return;}
   setPhase("after");router.refresh();
  });
 }
 const empty = incomplete
  ? "Datele disponibile nu permit confirmarea unei agende complete. Verifică înregistrările înainte de decizie."
  : "Nu există decizii comerciale care necesită atenție acum.";
 return <section aria-labelledby="commercial-review-title" className="py-6">
  <header className="flex flex-wrap items-start justify-between gap-4">
   <div className="min-w-0">
    <h1 id="commercial-review-title" className="text-xl font-semibold">Revizuire comercială</h1>
    <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">Tot ce necesită o decizie de management, într-un singur loc.</p>
    <p className={"mt-2 "+muted}>{formatProductDateTime(model.generatedAt)} · {model.scope==="business"?"Echipa autorizată":"Oportunitățile tale"}</p>
    <p className={muted}>Ultima revizuire: {model.checkpoint?formatProductDateTime(model.checkpoint):"încă neînregistrată"}</p>
   </div>
   <ActionToolbar label="Perioada revizuirii">
    {([["today","Astăzi"],["7","7 zile"],["30","30 zile"]] as const).map(([key,label])=><Link key={key} href={"/dashboard?view=review&range="+key} aria-current={model.period.key===key?"page":undefined} className={toolbarActionClass+" aria-[current=page]:border-[rgb(var(--primary))]"}>{label}</Link>)}
    <Button variant="ghost" size="small" onClick={()=>router.refresh()} aria-label="Actualizează revizuirea"><ArrowPathIcon className="h-4 w-4" aria-hidden="true"/></Button>
   </ActionToolbar>
  </header>

  <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-y border-[rgb(var(--border))] py-4">
   <div className="min-w-0">
    <p className="text-sm font-medium">{model.currentComplete&&agenda.length
     ? model.decisionCount+" decizii necesită atenție. Prima: "+(agenda[0].state.organization.name??agenda[0].state.title)+"."
     : empty}</p>
    <p className={"mt-1 "+muted}>{money(model.detected,model.detected===null?"Valoare indisponibilă":"Fără valoare detectată")} · estimare CRM în cazurile deschise
     {" · "}{model.impact?model.impact.interventions+" intervenții confirmate":"Intervenții indisponibile"} în interval</p>
    <p className={muted}>Venit recuperat verificat în interval: {model.impact?money(model.impact.recovered):"Informație insuficientă"}. Monedele și categoriile nu se adună.</p>
   </div>
   {phase==="before"?<Button size="small" onClick={()=>agenda[0]?select(agenda[0].id):setPhase("during")}>Începe revizuirea<ArrowRightIcon className="h-4 w-4" aria-hidden="true"/></Button>:null}
   {phase==="during"?<Button size="small" variant="secondary" loading={pending} disabled={!model.reviewToken} onClick={finish}>Încheie revizuirea</Button>:null}
  </div>
  {incomplete?<p role="status" className={"mt-3 "+muted}>Selecție limitată sau informații parțiale. Sunt inspectate cel mult 80 de oportunități autorizate; lista nu reprezintă întregul portofoliu.</p>:null}

  {phase==="after"?<section aria-live="polite" className="border-b border-[rgb(var(--border))] py-6">
   <h2 className="text-base font-semibold">Revizuire încheiată</h2>
   <p className="mt-2 text-sm">{visited.length} decizii consultate. {model.currentComplete?model.decisionCount+" necesită în continuare decizie în selecția curentă.":"Starea completă trebuie reverificată."}</p>
   <p className={"mt-2 "+muted}>Revizuirea a fost înregistrată. Aprobările, acțiunile, etapele și impactul nu au fost modificate. Data viitoare vei vedea ce s-a schimbat și ce a rămas deschis.</p>
   <ActionToolbar label="După revizuire" className="mt-4"><Button size="small" href="/dashboard">Revino la Control Center</Button><Button size="small" variant="secondary" onClick={()=>{setPhase("before");setVisited([]);}}>Vezi agenda curentă</Button></ActionToolbar>
  </section>:<div className={"mt-5 grid min-w-0 "+(phase==="during"?"gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]":"")}>
   <section aria-labelledby="decision-agenda-title" className="min-w-0">
    <div className="flex items-center justify-between gap-3 pb-3"><h2 id="decision-agenda-title" className="text-sm font-semibold">Agenda de decizie</h2><span className={muted}>{phase==="during"&&selected?selectedIndex+1+" din "+agenda.length:"Primele "+agenda.length}</span></div>
    <div aria-hidden="true" className={agendaGrid+" hidden border-y border-[rgb(var(--border))] px-3 py-2 text-xs text-[rgb(var(--text-muted))] xl:grid"}><span>Decizie · de ce acum</span><span>Responsabil</span><span>Termen</span><span>Următorul pas</span></div>
    {agenda.length?<ul className="divide-y divide-[rgb(var(--border))]">{agenda.map(item=><li key={item.id} className={agendaGrid+" border-l-2 px-3 py-4 "+(phase==="during"&&item.id===selected?.id?"border-[rgb(var(--primary))] bg-[rgb(var(--surface-elevated))]":"border-transparent")}>
     <button type="button" onClick={()=>select(item.id)} aria-pressed={phase==="during"&&item.id===selected?.id} aria-controls="commercial-review-detail" className="focus-ring min-w-0 text-left">
      <span className="block break-words text-sm font-semibold">{item.state.organization.name??item.state.title}</span>
      {item.state.organization.name?<span className={"mt-1 block break-words "+muted}>{item.state.title}</span>:null}
      <span className="mt-2 block text-xs font-medium leading-5">{item.label}</span>
      <span className={"mt-1 block "+muted}>{formatProductCurrency(item.state.financial.estimatedValue,item.state.financial.currency)} · estimare CRM</span>
      {item.carryOver?<span className={"mt-1 block "+muted}>{item.memory}</span>:null}
     </button>
     <span className={"min-w-0 break-words "+muted}>{item.state.ownership.ownerName??(item.state.ownership.ownerProfileId?"Responsabil atribuit":"Fără responsabil")}</span>
     <span className={muted}>{item.state.nextAction?.dueAt?formatProductDateTime(item.state.nextAction.dueAt):"De stabilit"}</span>
     <div className="min-w-0"><Button href={item.action.href} variant="secondary" size="small" className="max-w-full"><span className="truncate">{item.action.label}</span><ArrowRightIcon className="h-4 w-4 shrink-0" aria-hidden="true"/></Button></div>
    </li>)}</ul>:<div className={agendaGrid+" border-b border-[rgb(var(--border))] px-3 py-5"}><p className={"xl:col-span-4 "+muted}>{empty}</p></div>}
    {model.decisionCount>agenda.length?<p className={"mt-3 "+muted}>Sunt afișate primele opt decizii. După rezolvarea lor, actualizează agenda pentru următoarele.</p>:null}
   </section>

   {phase==="during"?<aside id="commercial-review-detail" aria-label="Detaliul deciziei" className="min-w-0 border-t border-[rgb(var(--border))] pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
    {selected?<><h2 ref={detailHeading} tabIndex={-1} className="focus-ring break-words text-base font-semibold">{selected.state.title}</h2>
     <p className="mt-3 text-sm font-medium">{selected.label}</p>
     <p className={"mt-1 "+muted}>{selected.reason}</p>
     <h3 className="mt-4 text-xs font-semibold">Situația acum</h3>
     <ul className={"mt-1 space-y-1 "+muted}>{selected.currentFacts.map(fact=><li key={fact}>{fact}</li>)}</ul>
     {selected.changes.length?<><h3 className="mt-4 text-xs font-semibold">Ce s-a schimbat</h3><ul className={"mt-1 space-y-1 "+muted}>{selected.changes.slice(0,3).map(change=><li key={change.id}>{change.label} · {formatProductDateTime(change.at)}</li>)}</ul></>:null}
     {selected.resolvedFacts.length?<><h3 className="mt-4 text-xs font-semibold">Ce s-a rezolvat</h3><ul className={"mt-1 space-y-1 "+muted}>{selected.resolvedFacts.map(fact=><li key={fact} className="flex gap-2"><CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--success-text))]" aria-hidden="true"/>{fact}</li>)}</ul></>:null}
     <h3 className="mt-4 text-xs font-semibold">Ce rămâne</h3><p className={"mt-1 "+muted}>{selected.label}. {selected.carryOver?selected.memory+".":""}</p>
     <h3 className="mt-4 text-xs font-semibold">De ce contează</h3><p className={"mt-1 "+muted}>{selected.reason}</p>
     <h3 className="mt-4 text-xs font-semibold">Dovezi</h3><EvidenceList items={selected.evidence} limit={4}/>
     <h3 className="mt-4 text-xs font-semibold">Acțiune sigură</h3><div className="mt-2"><Button href={selected.action.href} size="small">{selected.action.label}<ArrowRightIcon className="h-4 w-4" aria-hidden="true"/></Button></div>
     <p className={"mt-2 "+muted}>Acțiunea se verifică în fluxul existent. Nicio trimitere sau aprobare automată.</p>
     <details className={"mt-4 border-t border-[rgb(var(--border))] pt-2 "+muted}><summary className="focus-ring cursor-pointer py-2">De ce este prioritar? Când se rezolvă?</summary><p>{selected.rule}</p><p className="mt-2">Se consideră rezolvată când: {selected.completionCondition}</p><p className="mt-2">{selected.memory}.</p><ul className="mt-2">{selected.remaining.map(reason=><li key={reason}>{reason}</li>)}</ul></details>
     <details className={muted}><summary className="focus-ring cursor-pointer py-2">De la intervenție la impact</summary><p>{selected.proofLabel}</p>{selected.proof?<p className="mt-2">{selected.proof.interventions} intervenții confirmate · venit recuperat: {money(selected.proof.recovered)} · valoare protejată: {money(selected.proof.protected)}</p>:null}<p className="mt-2">Activitatea nu dovedește venit și nu atribuie automat rezultatul ReveNew.</p><Link className="focus-ring mt-2 inline-block hover:underline" href={"/recoverable?opportunity="+selected.id}>Vezi dovada →</Link></details>
     <Link className="focus-ring mt-3 inline-block text-xs hover:underline" href={"/opportunities/"+selected.id+"#opportunity-timeline"}>Istoric relevant și toate dovezile →</Link>
     <ActionToolbar label="Navigare în revizuire" className="mt-4">
      <Button variant="secondary" size="small" disabled={selectedIndex<=0} onClick={()=>select(agenda[selectedIndex-1].id)}>Decizia anterioară</Button>
      <Button variant="secondary" size="small" disabled={selectedIndex>=agenda.length-1} onClick={()=>select(agenda[selectedIndex+1].id)}>Următoarea decizie</Button>
     </ActionToolbar>
     <details className="mt-4"><summary className="focus-ring cursor-pointer py-2 text-sm font-medium">Întreabă ReveNew despre decizie</summary>
      <CopilotConversation key={selected.id+":"+model.period.key} lockedContext={{pageType:"dashboard",route:"/dashboard?view=review&range="+model.period.key,opportunityId:selected.id}} contextLabel="Revizuire comercială" initialSuggestions={["De ce trebuie decis acum?","Ce s-a schimbat?","Ce dovezi susțin asta?","Ce rămâne nerezolvat?"]}/>
     </details>
    </>:<p className={muted}>{empty}</p>}
   </aside>:null}
  </div>}

  {phase!=="after"?<div className="mt-6 grid gap-6 border-t border-[rgb(var(--border))] pt-4 lg:grid-cols-2">
   <section><h2 className="text-sm font-semibold">{model.checkpoint?"De la ultima revizuire":"Schimbări în interval"}</h2>
    {model.historyClipped?<p className={"mt-1 "+muted}>Checkpoint-ul este anterior intervalului. Sunt afișate numai schimbările din {model.period.label.toLowerCase()}.</p>:null}
    {model.changes.length?<ul className="mt-2 divide-y divide-[rgb(var(--border))]">{model.changes.slice(0,5).map(change=><li className="py-2" key={change.id}><Link href={"/opportunities/"+change.opportunityId+"#opportunity-timeline"} className="focus-ring text-xs font-medium hover:underline">{change.title} · {change.label}</Link><p className={muted}>{change.detail} · {formatProductDateTime(change.at)}</p></li>)}</ul>
     :<p className={"mt-2 "+muted}>{model.checkpoint&&model.changesComplete&&!model.historyClipped&&!model.limited?"Nu există schimbări comerciale materiale de la ultima revizuire.":"Nu sunt confirmate schimbări în intervalul și selecția disponibile."}</p>}
    {!model.changesComplete?<p className={"mt-2 "+muted}>Istoric parțial; absența schimbărilor nu poate fi confirmată.</p>:null}
    {model.changes.length>5?<Link href={"/dashboard?view=executive&range="+model.period.key} className="focus-ring mt-2 inline-block text-xs hover:underline">Vezi schimbările din brief →</Link>:null}
   </section>
   <section><h2 className="text-sm font-semibold">Ce a avansat</h2>{model.progress.length?<ul className="mt-2 space-y-2">{model.progress.slice(0,5).map(change=><li key={change.id} className="flex gap-2"><CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--success-text))]" aria-hidden="true"/><Link href={"/opportunities/"+change.opportunityId} className={"focus-ring hover:underline "+muted}>{change.label} · {change.title}</Link></li>)}</ul>:<p className={"mt-2 "+muted}>Niciun progres confirmat în selecția intervalului.</p>}
    <p className={"mt-4 "+muted}>Venit recuperat verificat: {model.impact?money(model.impact.recovered):"Informație insuficientă"}</p><Link href="/recoverable" className="focus-ring mt-1 inline-block text-xs hover:underline">Vezi dovada impactului →</Link>
   </section>
  </div>:null}
  {phase==="during"?<div className="mt-5 border-t border-[rgb(var(--border))] pt-3">
   <p className={muted}>Încheierea înregistrează numai revizuirea stării încărcate. Deciziile rămân deschise până când condițiile reale sunt rezolvate.</p>
   {!model.reviewToken?<p role="status" className={"mt-2 "+muted}>Înregistrarea revizuirii nu este disponibilă: sunt necesare date complete și checkpoint-ul configurat. Poți consulta agenda și acțiunile existente.</p>:null}
  </div>:null}
  {error?<p role="alert" className="mt-3 text-xs text-[rgb(var(--danger-text))]">{error}</p>:null}
 </section>;
}
