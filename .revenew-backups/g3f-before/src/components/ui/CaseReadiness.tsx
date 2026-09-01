import { cn } from "@/lib/utils";

/** Independent facts, not a completion percentage or a prediction. */
export function CaseReadiness({owner, action, dated, overdue=false, evidence}:{owner:boolean;action:boolean;dated:boolean;overdue?:boolean;evidence?:number}) {
 const facts=[["Responsable",owner],["Pas următor",action],["Termen",dated]] as const;
 return <span className="inline-flex flex-wrap items-center gap-2 text-[10px] font-normal text-[rgb(var(--text-muted))]">
  <span className="inline-flex gap-1" role="img" aria-label={`Responsabil ${owner?"atribuit":"lipsă"}; pas următor ${action?"stabilit":"lipsă"}; termen ${overdue?"depășit":dated?"stabilit":"lipsă"}`}>
   {facts.map(([label,known],index)=><span key={label} title={label+": "+(index===2&&overdue?"depășit":known?"stabilit":"lipsă")} className={cn("h-1.5 w-5 rounded-sm",index===2&&overdue?"bg-[rgb(var(--danger-text))]":known?"bg-[rgb(var(--primary)/0.7)]":"border border-[rgb(var(--border-strong))]")}/>)}
  </span>
  <span>{overdue?"Termen depășit":!owner?"Fără responsabil":!action?"Pas de stabilit":!dated?"Termen de stabilit":"Pas planificat"}</span>
  {evidence!==undefined?<span className="border-l border-[rgb(var(--border))] pl-2">{evidence} dovezi</span>:null}
 </span>;
}
