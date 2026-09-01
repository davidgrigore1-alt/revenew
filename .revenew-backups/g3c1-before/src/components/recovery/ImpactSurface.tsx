import Link from "next/link";
import styles from "./ImpactSurface.module.css";
import { EvidenceList } from "@/components/evidence/EvidenceList";
import { ActionToolbar,toolbarActionClass } from "@/components/ui/ActionToolbar";
import { ImpactControls } from "@/components/recovery/ImpactControls";
import { impactLabels,impactRules,type ImpactState,type MoneyTotal } from "@/lib/revenue-impact";
import type { RevenueImpactModel } from "@/lib/revenue-impact-server";
import { formatProductDateTime } from "@/lib/ui/presentation";
const money=(amount:number|string|null,currency:string|null)=>amount!==null&&currency?Number(amount).toLocaleString("ro-RO",{maximumFractionDigits:2})+" "+currency:"Valoare neconfirmată";
function Totals({values,empty}:{values:MoneyTotal[];empty:string}){return values.length?<>{values.map(v=><div key={v.currency} className="tabular-nums">{money(v.amount,v.currency)}</div>)}</>:<span className="text-sm font-normal text-[rgb(var(--text-muted))]">{empty}</span>;}
function StateFacts({state}:{state:ImpactState}){
 const facts=[state.missingOwner===true?"Fără responsabil":state.missingOwner===false?"Responsabil atribuit":null,
  state.missingNext===true?"Fără pas viitor confirmat":state.missingNext===false?"Următor pas confirmat":null,
  state.overdue===true?"Acțiune restantă":state.overdue===false?"Fără acțiuni restante":null];
 return <ul className="mt-2 space-y-1 text-xs">{facts.filter(Boolean).map(f=><li key={f}>{f}</li>)}</ul>;
}
export function ImpactSurface({model,selectedId,baseQuery="",print=false,currentDetected,references={actions:[],prepared:[]}}:{
 model:RevenueImpactModel;selectedId?:string;baseQuery?:string;print?:boolean;currentDetected?:MoneyTotal[];
 references?:{actions:Array<{id:string;label:string;occurred_at:string}>;prepared:Array<{id:string;title:string;created_at:string}>};
}){
 const selected=selectedId?model.proofs.find(p=>p.id===selectedId):model.proofs[0],summary=model.summary;
 const href=(id:string)=>"/recoverable?"+baseQuery+(baseQuery?"&":"")+"case="+id;
 const metrics=[
  {label:"Valoare detectată",value:<Totals values={currentDetected??summary.detected} empty={currentDetected?"Fără valoare confirmată în coadă":"Fără cazuri urmărite"}/>,rule:currentDetected?"Instantaneul estimărilor CRM din coada de risc autorizată, acum. Nu este un total istoric pentru interval și nu este venit recuperat.":impactRules.detected},
  {label:"Intervenții confirmate",value:<>{summary.interventions}<span className="ml-1 text-xs font-normal text-[rgb(var(--text-muted))]">înregistrate</span></>,rule:impactRules.acted},
  {label:"Valoare protejată",value:<Totals values={summary.protected} empty="Încă neverificată"/>,rule:impactRules.protected},
  {label:"Venit recuperat verificat",value:<Totals values={summary.recovered} empty="Încă neverificat"/>,rule:impactRules.recovered}
 ];
 return <section aria-label="Dovada impactului comercial" className={"impact-proof "+styles.root}>
  <div className="flex items-center justify-between gap-3 py-3"><p className="text-xs text-[rgb(var(--text-muted))]">{model.period.label} · afirmații verificate până în prezent</p><ActionToolbar><Link className={toolbarActionClass+" print:hidden"} href={"/recoverable?"+baseQuery+(baseQuery?"&":"")+"proof=1"}>Dovadă executivă</Link></ActionToolbar></div>
  {!model.available?<p role="status" className="border-y border-[rgb(var(--border))] py-4 text-sm">Istoricul impactului nu este disponibil. Nu se poate confirma venitul recuperat.</p>:model.limited?<p role="status" className="border-y border-[rgb(var(--border))] py-4 text-sm">Selecție limitată. Totalurile nu sunt publicate dintr-un istoric incomplet; deschide cazul din oportunitate.</p>:
  <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-[rgb(var(--border))] py-4 xl:grid-cols-4">{metrics.map(m=><div key={m.label}><h2 className="text-xs text-[rgb(var(--text-muted))]">{m.label}</h2><div className="mt-2 text-lg font-semibold">{m.value}</div><details className="mt-2 text-xs text-[rgb(var(--text-muted))]"><summary className="focus-ring cursor-pointer">Cum se calculează?</summary><p className="mt-2 leading-5">{m.rule}</p></details></div>)}</div>}
  <p className="py-3 text-xs leading-5 text-[rgb(var(--text-muted))]">Categoriile nu se adună. Valoarea detectată reflectă riscul curent; intervențiile și verificările sunt înregistrate în interval. Monedele sunt separate, fără conversie. Nu se calculează ROI fără un cost contractual cunoscut.</p>
  {print?<><h2 className="mt-3 text-sm font-semibold">Ce s-a observat după intervenție</h2><p className="mt-2 text-sm">{summary.recoveredVerified?"Rezultatele verificate sunt atribuite explicit de echipă; nu reprezintă o demonstrație automată a cauzalității.":"Venitul recuperat nu poate fi încă verificat."}</p></>:null}
  {selectedId&&!selected?<p role="status" className="py-3 text-xs">Cazul selectat nu este disponibil în acest interval sau cu accesul curent.</p>:null}
  {model.proofs.length?<div className={print?"":"grid border-y border-[rgb(var(--border))] xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"}>
   <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-[rgb(var(--border))] text-[rgb(var(--text-muted))]">{["Caz","Valoare","Stare","Actualizat"].map(v=><th key={v} className="px-3 py-3 font-medium">{v}</th>)}</tr></thead>
    <tbody>{model.proofs.map(p=><tr key={p.id} className={"border-b border-[rgb(var(--border))] "+(selected?.id===p.id?"bg-[rgb(var(--surface-subtle))]":"")}><td className="px-3 py-3"><Link className="focus-ring font-medium hover:underline" href={href(p.id)}>{p.title}</Link><p className="mt-1 text-[rgb(var(--text-muted))]">{p.interventions} intervenții asociate</p></td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{money(p.assertion?.amount??p.detected_amount,p.assertion?.currency??p.currency)}</td><td className="px-3 py-3">{impactLabels[p.state]}</td><td className="px-3 py-3 text-[rgb(var(--text-muted))]">{formatProductDateTime(p.updatedAt)}</td></tr>)}</tbody></table></div>
   {selected?<article className="min-w-0 border-t border-[rgb(var(--border))] px-4 py-4 xl:border-l xl:border-t-0">
    <h2 className="text-sm font-semibold">{selected.title}</h2><Link href={"/opportunities/"+selected.opportunity_id} className="focus-ring mt-1 inline-block text-xs hover:underline">Deschide oportunitatea →</Link>
    <ol className="mt-4 space-y-4">
     <li><h3 className="text-xs font-semibold">Înainte</h3><p className="mt-1 text-sm tabular-nums">{money(selected.detected_amount,selected.currency)} · estimare CRM expusă</p><StateFacts state={selected.before_state}/><EvidenceList items={selected.events.find(e=>e.kind==="detected")?.evidence??[]} limit={1}/></li>
     <li className="border-t border-[rgb(var(--border))] pt-3"><h3 className="text-xs font-semibold">Intervenție</h3>{selected.interventions?selected.events.filter(e=>e.kind==="action_confirmed").map(e=><div key={e.id} className="mt-2"><EvidenceList items={e.evidence.filter(r=>r.sourceType==="event"||r.sourceType==="action")} limit={1}/><p className="text-xs text-[rgb(var(--text-muted))]">{formatProductDateTime(e.created_at)}</p></div>):<p className="mt-2 text-xs text-[rgb(var(--text-muted))]">Nicio execuție confirmată în acest caz.</p>}</li>
     <li className="border-t border-[rgb(var(--border))] pt-3"><h3 className="text-xs font-semibold">După</h3>{selected.assertion&&["protected","verified_recovered"].includes(selected.assertion.kind)?<><StateFacts state={selected.assertion.after_state}/><p className="mt-2 text-xs">Rezultat observat după intervenție.</p><EvidenceList items={selected.assertion.evidence} limit={2}/></>:<p className="mt-2 text-xs text-[rgb(var(--text-muted))]">Rezultat încă neverificat.</p>}</li>
     <li className="border-t border-[rgb(var(--border))] pt-3"><h3 className="text-xs font-semibold">Verdict</h3><p className="mt-2 text-sm font-medium">{impactLabels[selected.state]}</p><details className="mt-2 text-xs"><summary className="focus-ring cursor-pointer">De ce este numărat?</summary><p className="mt-2 leading-5">{selected.state==="verified_recovered"?impactRules.recovered:selected.state==="protected"?impactRules.protected:selected.state==="invalidated"||selected.state==="dismissed"?"Afirmația nu este inclusă în totalurile actuale. Istoricul rămâne vizibil.":impactRules.detected}</p>{selected.assertion?.note?<p className="mt-2 leading-5">Atribuire umană: {selected.assertion.note}</p>:null}</details></li>
    </ol>
    <details className="mt-4 border-t border-[rgb(var(--border))] pt-3 text-xs"><summary className="focus-ring cursor-pointer">Istoric și proveniență · {selected.events.length} înregistrări</summary><ol className="mt-3 space-y-3">{selected.events.map(e=><li key={e.id} className="break-words"><strong>{impactLabels[e.kind]}</strong> · {formatProductDateTime(e.created_at)}<p>Actor: {e.actor_profile_id} · Revizia {e.revision}</p><p>Înregistrare: {e.id}</p>{e.supersedes_id?<p>Corectează / înlocuiește afirmația: {e.supersedes_id}</p>:null}{e.amount!==null?<p>{money(e.amount,e.currency)}</p>:null}{e.note?<p>{e.note}</p>:null}{e.after_state.provenance?<dl>{Object.entries(e.after_state.provenance).map(([key,value])=><div key={key}><dt className="inline">{{actionPlanId:"Plan",approvalActorId:"Aprobat de",workflowRunId:"Rulare workflow",workflowId:"Workflow",actionId:"Acțiune"}[key]??"Referință"}: </dt><dd className="inline">{value}</dd></div>)}</dl>:null}<EvidenceList items={e.evidence} limit={2}/></li>)}</ol></details>
    {!print&&model.canTrack?<ImpactControls key={selected.id+":"+selected.revision} opportunityId={selected.opportunity_id} revision={selected.revision} canVerify={model.canVerify} actions={references.actions.filter(a=>a.occurred_at>=selected.created_at).map(a=>({id:a.id,label:a.label}))} prepared={references.prepared.filter(d=>d.created_at>=selected.created_at).map(d=>({id:d.id,label:d.title??"Document pregătit"}))}/>:null}
   </article>:null}
  </div>:<p className="border-y border-[rgb(var(--border))] py-5 text-sm text-[rgb(var(--text-muted))]">Nu există încă un caz de impact urmărit. Pornește dintr-o oportunitate cu risc real; istoricul nu este completat retroactiv.</p>}
  {print?<p className="mt-4 text-xs text-[rgb(var(--text-muted))]">Pentru imprimare folosește comanda browserului. Dovezile complete se deschid din fiecare caz. Valorile sunt afirmații comerciale auditate, nu încasări contabile.</p>:null}
 </section>;
}
