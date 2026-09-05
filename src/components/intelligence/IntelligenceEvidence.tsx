"use client";
import { useId, useState } from "react";
import { Drawer } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { CopilotAnswer, CopilotEvidence } from "@/lib/ai/copilot-types";
import { uniqueEvidenceSources } from "@/lib/ai/intelligence-evidence";
import { formatProductDateTime } from "@/lib/ui/presentation";

function freshSourceHref(route:string) {
  // A full navigation also rechecks authorization when the citation points at
  // the already-open document. An anchor-only jump would reuse its old page.
  const url=new URL(route,"https://revenew.invalid");
  url.searchParams.set("inspection",String(Date.now()));
  return `${url.pathname}${url.search}${url.hash}`;
}

export function IntelligenceEvidence({answer, inline=false}: {answer:CopilotAnswer; inline?:boolean}) {
  const [selected,setSelected]=useState<CopilotEvidence|null>(null),title=useId();
  const calculation=answer.calculations?.find(item=>item.id===selected?.sourceId);
  return <section className={inline?"mt-2":"mt-5 border-t border-[rgb(var(--border))] pt-3"} aria-label={inline?"Dovezile afirmației":"Dovezi și acoperire"}>
    {inline?<div className="flex flex-wrap gap-2">{answer.evidence.map(e=><button key={e.sourceId} type="button" onClick={()=>setSelected(e)} className="focus-ring min-h-9 max-w-full rounded-control border border-[rgb(var(--border-subtle))] px-2 text-left text-xs text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-subtle))]">{e.label}</button>)}</div>:<details>
    <summary className="focus-ring cursor-pointer rounded-control py-2 text-[13px] text-[rgb(var(--text-secondary))]">{uniqueEvidenceSources(answer.evidence)} surse · {answer.evidence.length} dovezi · Acoperire și proveniență</summary>
    <ol className="mt-2 divide-y divide-[rgb(var(--border-subtle))]">{answer.evidence.map((e,index)=><li key={e.sourceId}><button type="button" onClick={()=>setSelected(e)} className="focus-ring flex min-h-11 w-full items-baseline gap-3 rounded-control py-2 text-left text-[13px] hover:bg-[rgb(var(--surface-subtle))]"><span className="w-5 shrink-0 tabular-nums text-[rgb(var(--text-secondary))]">{index+1}</span><span className="min-w-0 flex-1 break-words">{e.label}</span><span className="shrink-0 text-xs text-[rgb(var(--text-secondary))]">Inspectează</span></button></li>)}</ol>
    {answer.checkedSources.length?<ul className="mt-3 space-y-1 text-xs leading-5 text-[rgb(var(--text-secondary))]">{Array.from(new Map(answer.checkedSources.map(c=>[c.providerId,c])).values()).map(c=><li key={c.providerId}><strong className="font-medium">{c.label}</strong> · {c.state==="available"?"disponibil":c.state==="not_connected"?"neconectat":c.state==="forbidden"?"acces indisponibil":"indisponibil"}. {c.detail}</li>)}</ul>:null}
    </details>}
    {selected?<Drawer labelledBy={title} onClose={()=>setSelected(null)}><div className="flex h-full flex-col"><header className="flex items-start justify-between gap-4 border-b border-[rgb(var(--border))] p-5"><div><p className="text-xs text-[rgb(var(--text-secondary))]">Dovada din răspuns</p><h2 id={title} className="mt-2 break-words text-lg font-semibold">{selected.label}</h2></div><Button size="small" variant="secondary" onClick={()=>setSelected(null)}>Închide</Button></header><div className="min-h-0 flex-1 overflow-y-auto p-5"><p className="text-[15px] leading-7 text-[rgb(var(--text-secondary))]">{selected.fact}</p><dl className="mt-6 grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-3 text-[13px]"><dt>Semnificație</dt><dd>{selected.provenance?.classification==="inference"?"Interpretare / comparație pentru revizuire":selected.provenance?.classification==="computed_result"?"Calcul determinist din sursă":selected.sourceType==="Document"?"Declarație a sursei; nu confirmare independentă":"Înregistrare autorizată"}</dd><dt>Data sursei</dt><dd>{selected.observedAt?formatProductDateTime(selected.observedAt):"Nedisponibilă"}</dd>{selected.provenance?<><dt>Recuperată</dt><dd>{formatProductDateTime(selected.provenance.retrievedAt)}</dd><dt>Versiune</dt><dd className="break-all">{selected.provenance.version??"Revizie observată"}</dd><dt>Poziție</dt><dd>{[selected.provenance.locator.sheet,selected.provenance.locator.row?`rând ${selected.provenance.locator.row}`:null,selected.provenance.locator.range].filter(Boolean).join(" · ")||"Înregistrarea citată"}</dd><dt>Acoperire</dt><dd>{selected.provenance.partial?"Parțială; consultă limitele răspunsului":"Proiecția autorizată"}</dd></>:null}</dl>{calculation?<div className="mt-5 border-t border-[rgb(var(--border))] pt-4 text-[13px]"><p>{calculation.rows.length} rânduri incluse · {calculation.exclusions} excluse</p><details className="mt-2"><summary className="focus-ring cursor-pointer py-2">Rândurile folosite în calcul</summary><ol className="max-h-52 space-y-1 overflow-y-auto">{calculation.rows.map(id=><li key={id}>{id.includes(":sheet:")?`Foaia ${Number(id.match(/:sheet:(\d+):/)?.[1])+1} · `:"CSV · "}rând {id.match(/:row:(\d+)$/)?.[1]??"înregistrat"}</li>)}</ol></details></div>:null}<p className="mt-6 text-xs leading-5 text-[rgb(var(--text-secondary))]">Aceasta este dovada folosită la momentul analizei. Deschiderea sursei verifică din nou accesul curent.</p>{selected.route?<a href={freshSourceHref(selected.route)} className="focus-ring mt-5 inline-flex min-h-10 items-center rounded-control border border-[rgb(var(--border))] px-3 text-sm font-medium">Deschide sursa autorizată →</a>:null}</div></div></Drawer>:null}
  </section>;
}
