"use client";

import { useMemo, useState } from "react";

import { createSequenceDraft, updateSequenceSteps } from "@/lib/communication-workspace";

type SequenceStep = { type: "email" | "wait" | "manual_task"; label: string; businessDays?: number };
type EditableStep = SequenceStep & { key: string };

function normalizedSteps(steps: SequenceStep[]): EditableStep[] {
  const initial = steps.length ? steps : [
    { type: "email" as const, label: "Pregătește email pentru revizuire" },
    { type: "wait" as const, label: "Așteaptă răspunsul clientului", businessDays: 3 },
    { type: "manual_task" as const, label: "Revizuire manuală dacă nu există răspuns" }
  ];
  return initial.slice(0, 12).map((step, index) => ({ ...step, key: `${index}-${step.type}-${step.label}` }));
}

function payload(steps: EditableStep[]) {
  return JSON.stringify(steps.map((step) => step.type === "wait"
    ? { type: "wait", label: step.label, businessDays: step.businessDays ?? 3 }
    : step.type === "email"
      ? { type: "email", mode: "prepare_only", label: step.label }
      : { type: "manual_task", label: step.label }));
}

function StepEditor({ step, index, count, onChange, onMove, onRemove }: {
  step: EditableStep; index: number; count: number;
  onChange: (patch: Partial<EditableStep>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const label = step.type === "email" ? "Email pregătit" : step.type === "wait" ? "Așteptare" : "Task manual";
  return <li className="grid gap-3 border-b border-[rgb(var(--border))] py-3 last:border-b-0 md:grid-cols-[2rem_8rem_minmax(0,1fr)_auto] md:items-center">
    <span className="grid h-7 w-7 place-items-center rounded-full border border-[rgb(var(--border-strong))] text-[0.6875rem] font-semibold tabular-nums">{index + 1}</span>
    <div><span className="text-xs font-semibold">{label}</span>{step.type === "email" ? <span className="mt-0.5 block text-[0.625rem] uppercase tracking-[0.08em] text-[rgb(var(--primary))]">Doar pregătire</span> : null}</div>
    <div className="flex min-w-0 gap-2"><input aria-label={`Titlul pasului ${index + 1}`} value={step.label} maxLength={180} onChange={(event) => onChange({ label: event.target.value })} className="focus-ring h-8 min-w-0 flex-1 rounded-[7px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2.5 text-xs"/>{step.type === "wait" ? <label className="flex shrink-0 items-center gap-1 text-[0.6875rem] text-[rgb(var(--text-muted))]"><input aria-label="Zile lucrătoare" type="number" min={1} max={20} value={step.businessDays ?? 3} onChange={(event) => onChange({ businessDays: Number(event.target.value) })} className="focus-ring h-8 w-14 rounded-[7px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2 text-xs"/> zile</label> : null}</div>
    <div className="flex items-center gap-1"><button type="button" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Mută pasul ${index + 1} în sus`} className="focus-ring h-8 w-8 rounded-[7px] text-xs text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-hover))] disabled:opacity-30">↑</button><button type="button" disabled={index === count - 1} onClick={() => onMove(1)} aria-label={`Mută pasul ${index + 1} în jos`} className="focus-ring h-8 w-8 rounded-[7px] text-xs text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-hover))] disabled:opacity-30">↓</button><button type="button" disabled={count === 1} onClick={onRemove} aria-label={`Elimină pasul ${index + 1}`} className="focus-ring h-8 px-2 text-[0.6875rem] font-semibold text-[rgb(var(--text-muted))] hover:text-[rgb(var(--danger-text))] disabled:opacity-30">Elimină</button></div>
  </li>;
}

export function SequenceStepBuilder({ sequenceId, initialSteps, disabled = false }: { sequenceId: string; initialSteps: SequenceStep[]; disabled?: boolean }) {
  const [steps, setSteps] = useState(() => normalizedSteps(initialSteps));
  const serialized = useMemo(() => payload(steps), [steps]);
  function update(index: number, patch: Partial<EditableStep>) { setSteps((current) => current.map((step, position) => position === index ? { ...step, ...patch } : step)); }
  function move(index: number, direction: -1 | 1) { setSteps((current) => { const next = [...current]; const target = index + direction; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return next; }); }
  function add(type: SequenceStep["type"]) { setSteps((current) => current.length >= 12 ? current : [...current, { key: `${Date.now()}-${type}`, type, label: type === "email" ? "Pregătește email pentru revizuire" : type === "wait" ? "Așteaptă răspunsul clientului" : "Task manual", ...(type === "wait" ? { businessDays: 3 } : {}) }]); }
  if (disabled) return <p className="mt-3 text-[0.6875rem] text-[rgb(var(--text-muted))]">Pune secvența în pauză pentru a edita pașii.</p>;
  return <form action={updateSequenceSteps} className="mt-3 border-t border-[rgb(var(--border))] pt-3"><input type="hidden" name="sequenceId" value={sequenceId}/><input type="hidden" name="steps" value={serialized}/><ol>{steps.map((step, index) => <StepEditor key={step.key} step={step} index={index} count={steps.length} onChange={(patch) => update(index, patch)} onMove={(direction) => move(index, direction)} onRemove={() => setSteps((current) => current.filter((_, position) => position !== index))}/>)}</ol><div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" onClick={() => add("email")} className="focus-ring h-8 rounded-[7px] border border-[rgb(var(--border))] px-2.5 text-xs font-semibold">+ Email</button><button type="button" onClick={() => add("wait")} className="focus-ring h-8 rounded-[7px] border border-[rgb(var(--border))] px-2.5 text-xs font-semibold">+ Așteptare</button><button type="button" onClick={() => add("manual_task")} className="focus-ring h-8 rounded-[7px] border border-[rgb(var(--border))] px-2.5 text-xs font-semibold">+ Task manual</button><button className="focus-ring ml-auto h-8 rounded-[7px] bg-[rgb(var(--brand))] px-3 text-xs font-semibold text-black">Salvează pașii</button></div></form>;
}

export function NewSequenceBuilder() {
  const [steps, setSteps] = useState(() => normalizedSteps([]));
  const serialized = useMemo(() => payload(steps), [steps]);
  function update(index: number, patch: Partial<EditableStep>) { setSteps((current) => current.map((step, position) => position === index ? { ...step, ...patch } : step)); }
  function move(index: number, direction: -1 | 1) { setSteps((current) => { const next = [...current]; const target = index + direction; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return next; }); }
  function add(type: SequenceStep["type"]) { setSteps((current) => current.length >= 12 ? current : [...current, { key: `${Date.now()}-${type}`, type, label: type === "email" ? "Pregătește email pentru revizuire" : type === "wait" ? "Așteaptă răspunsul clientului" : "Task manual", ...(type === "wait" ? { businessDays: 3 } : {}) }]); }
  return <form action={createSequenceDraft} className="mt-5 border-t border-[rgb(var(--border))] pt-4"><div className="grid gap-3 md:grid-cols-2"><input name="name" required maxLength={120} placeholder="Nume secvență" className="focus-ring h-9 rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm"/><input name="description" maxLength={1000} placeholder="Obiectiv comercial și criteriu de ieșire" className="focus-ring h-9 rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm"/></div><input type="hidden" name="steps" value={serialized}/><ol className="mt-3">{steps.map((step, index) => <StepEditor key={step.key} step={step} index={index} count={steps.length} onChange={(patch) => update(index, patch)} onMove={(direction) => move(index, direction)} onRemove={() => setSteps((current) => current.filter((_, position) => position !== index))}/>)}</ol><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => add("email")} className="focus-ring h-8 rounded-[7px] border border-[rgb(var(--border))] px-2.5 text-xs font-semibold">+ Email</button><button type="button" onClick={() => add("wait")} className="focus-ring h-8 rounded-[7px] border border-[rgb(var(--border))] px-2.5 text-xs font-semibold">+ Așteptare</button><button type="button" onClick={() => add("manual_task")} className="focus-ring h-8 rounded-[7px] border border-[rgb(var(--border))] px-2.5 text-xs font-semibold">+ Task manual</button><button className="focus-ring ml-auto h-9 rounded-[8px] bg-[rgb(var(--brand))] px-4 text-sm font-semibold text-black">Creează draftul</button></div></form>;
}