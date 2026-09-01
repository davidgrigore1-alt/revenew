"use client";
import { useId, useState } from "react";
import { buildControlCenterVisuals, type VisualCase } from "@/lib/control-center-visuals";
import { formatProductCurrency } from "@/lib/ui/presentation";

const dateLabel=(value:string)=>new Intl.DateTimeFormat("ro-RO",{day:"numeric",month:"short",timeZone:"UTC"}).format(new Date(value+"T12:00:00Z"));
export function ControlCenterVisuals({cases}:{cases:VisualCase[]}) {
 const model=buildControlCenterVisuals(cases),id=useId();
 const [currency,setCurrency]=useState("");
 const series=model.exposure.find(item=>item.currency===currency)??model.exposure[0];
 const points=series?.points??[];
 const max=Math.max(1,...points.map(point=>point.cumulative));
 const start=points.length?Date.parse(points[0].date):0, end=points.length?Date.parse(points[points.length-1].date):0;
 const x=(date:string)=>end===start?320:52+(Date.parse(date)-start)/(end-start)*548;
 const y=(value:number)=>116-value/max*88;
 const path=points.map(point=>x(point.date)+","+y(point.cumulative)).join(" ");
 const amount=(value:number)=>formatProductCurrency(value,series?.currency??"RON");
 return <section aria-label="Privire comercială de ansamblu" className="my-4 grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
  <figure className="min-w-0 rounded-[12px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-3">
   <figcaption className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-semibold">Expunere la termenele curente</h2><p className="mt-1 text-[11px] text-[rgb(var(--text-muted))]">Valoare estimată cumulată · doar cazurile din această coadă</p></div>
    <div role="group" aria-label="Moneda expunerii" className="flex gap-1">{model.exposure.map(item=><button type="button" key={item.currency} onClick={()=>setCurrency(item.currency)} aria-pressed={item===series} className="focus-ring rounded border border-[rgb(var(--border))] px-2 py-1 text-[11px] aria-pressed:border-[rgb(var(--primary))]">{item.currency}</button>)}</div>
   </figcaption>
   {points.length?<svg viewBox="0 0 640 148" className="mt-1 h-[148px] w-full" role="img" aria-labelledby={id}>
    <title id={id}>Valoarea estimată cumulată, ordonată după termenul comercial. {points.map(point=>dateLabel(point.date)+": "+amount(point.cumulative)).join("; ")}</title>
    {[0,.5,1].map(fraction=><g key={fraction}><line x1="52" x2="600" y1={y(max*fraction)} y2={y(max*fraction)} stroke="rgb(var(--border))"/><text x="44" y={y(max*fraction)+3} textAnchor="end" fontSize="10" fill="rgb(var(--text-muted))">{new Intl.NumberFormat("ro-RO",{notation:"compact",maximumFractionDigits:1}).format(max*fraction)}</text></g>)}
    {points.length>1?<polyline points={path} fill="none" stroke="rgb(var(--primary))" strokeWidth="2"/>:null}
    {points.map((point,index)=><g key={point.date}><circle cx={x(point.date)} cy={y(point.cumulative)} r="3" fill="rgb(var(--primary))"><title>{dateLabel(point.date)} · {amount(point.value)} · cumulat {amount(point.cumulative)}</title></circle>
     {index%Math.max(1,Math.ceil(points.length/5))===0||index===points.length-1?<text x={x(point.date)} y="138" textAnchor="middle" fontSize="10" fill="rgb(var(--text-muted))">{dateLabel(point.date)}</text>:null}
    </g>)}
   </svg>:<div className="flex h-[148px] items-center text-xs text-[rgb(var(--text-muted))]">Nu există valori cu termen comercial confirmat în această selecție.</div>}
   <div className="flex flex-wrap justify-between gap-2 text-[10px] leading-4 text-[rgb(var(--text-muted))]"><p>Termene actuale, nu istoric al expunerii sau prognoză de încasare.</p>{series?.undatedCount?<p>Fără termen: {amount(series.undated)} · {series.undatedCount} cazuri</p>:null}{model.unknownCount?<p>{model.unknownCount} valori neconfirmate, excluse din grafic.</p>:null}</div>
   {points.length?<details className="mt-1 text-[10px] text-[rgb(var(--text-muted))]"><summary className="focus-ring cursor-pointer py-1">Vezi valorile graficului</summary><table className="w-full text-left"><caption className="sr-only">Expunere în {series.currency}</caption><thead><tr><th>Termen</th><th>Valoare</th><th>Cumulat</th></tr></thead><tbody>{points.map(point=><tr key={point.date}><td>{dateLabel(point.date)}</td><td>{amount(point.value)}</td><td>{amount(point.cumulative)}</td></tr>)}</tbody></table></details>:null}
  </figure>
  <figure className="rounded-[12px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-3">
   <figcaption><h2 className="text-sm font-semibold">Distribuția atenției</h2><p className="mt-1 text-[11px] text-[rgb(var(--text-muted))]">{model.count} cazuri · fiecare apare într-o singură categorie</p></figcaption>
   <div className="mt-5 space-y-4">{model.distribution.map(row=><div key={row.label}><div className="mb-1.5 flex justify-between text-xs"><span>{row.label}</span><strong className="tabular-nums">{row.count}</strong></div><div className="h-2 overflow-hidden rounded-sm bg-[rgb(var(--surface-elevated))]" aria-hidden="true"><div className={"h-full "+(row.tone==="danger"?"bg-[rgb(var(--danger-text))]":row.tone==="warning"?"bg-[rgb(var(--primary))]":"bg-[rgb(var(--text-muted))]")} style={{width:(model.count?row.count/model.count*100:0)+"%"}}/></div></div>)}</div>
   <p className="mt-4 text-[10px] leading-4 text-[rgb(var(--text-muted))]">Restanțele au prioritate în clasificare. Numărul de cazuri nu este o măsură a venitului recuperat.</p>
  </figure>
 </section>;
}
