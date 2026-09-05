"use client";
import { formatUserFacingText } from "@/lib/ui/presentation";
import type { CopilotAnswer } from "@/lib/ai/copilot-types";
import { comparisonLabels } from "@/lib/ai/intelligence-comparison-core";

export function IntelligenceComparisonView({answer,disabled,onSelect}:{answer:CopilotAnswer;disabled:boolean;onSelect:(id:string)=>void}) {
  return <>
    {answer.clarification?<fieldset className="mt-4 border-t border-[rgb(var(--border))] pt-4" disabled={disabled}>
      <legend className="text-sm font-semibold">{answer.clarification.question}</legend>
      <p className="mb-3 text-sm text-[rgb(var(--text-secondary))]">Titlul similar nu confirmă identitatea. Selecția este folosită numai pentru această analiză.</p>
      <div className="grid gap-2">{answer.clarification.candidates.map(candidate=><button type="button" key={candidate.id} onClick={()=>onSelect(candidate.id)} className="focus-ring rounded-button border border-[rgb(var(--border))] px-3 py-3 text-left disabled:opacity-50"><span className="block text-sm font-semibold">{candidate.label}</span><span className="block text-sm text-[rgb(var(--text-secondary))]">{formatUserFacingText(candidate.detail)}</span><span className="block break-all text-xs text-[rgb(var(--text-secondary))]">Identificator: {candidate.id}</span></button>)}</div>
    </fieldset>:null}
    {answer.comparisons?.length?<div className="mt-4 space-y-4">{answer.comparisons.map(comparison=><section key={comparison.id} className="border-t border-[rgb(var(--border))] pt-3" aria-label={`${comparisonLabels[comparison.kind]} · ${comparison.field}`}>
      <h4 className="text-sm font-semibold">{comparisonLabels[comparison.kind]} · {comparison.field}</h4>
      <dl className="mt-2 grid gap-3 sm:grid-cols-2">{[comparison.left,comparison.right].map((observation,index)=><div key={index} className="min-w-0"><dt className="text-xs text-[rgb(var(--text-secondary))]">{index===0?"Declarația sursei":"Înregistrarea CRM"}</dt><dd className="mt-1 break-words text-sm">{formatUserFacingText(observation?.value??"Lipsă")} {observation?.currency??""}</dd><dd className="mt-1 text-xs text-[rgb(var(--text-secondary))]">{observation?.label}<br/>{observation?.observedAt??"Data observației lipsește"}</dd></div>)}</dl>
      <p className="mt-2 text-sm text-[rgb(var(--text-secondary))]">{comparison.explanation}</p>
    </section>)}</div>:null}
  </>;
}
