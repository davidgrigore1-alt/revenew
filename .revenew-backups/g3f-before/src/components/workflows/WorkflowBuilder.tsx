"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { changeWorkflowStatus, runWorkflowTest, saveWorkflowDefinition } from "@/lib/workflow-actions";
import type { SafeWorkflowAction, WorkflowAction, WorkflowCondition, WorkflowConditionField, WorkflowConditionOperator, WorkflowDefinition, WorkflowTrigger } from "@/lib/workflow-foundation";
import {
  workflowActionCatalog,
  workflowConditionCatalog,
  workflowGuardCopy,
  workflowOperatorCatalog,
  workflowOperatorsForField,
  workflowTriggerCapability,
  workflowTriggerCatalog,
} from "@/lib/workflow-presentation";
import { presentWorkflowState } from "@/lib/ui/presentation";
import type { WorkflowActivationPreflight } from "@/lib/workflow-preflight";

type OpportunityOption = { id: string; title: string };
type EditableCondition = WorkflowCondition & { key: number };
type EditableAction = WorkflowAction & { key: number };

const stateOptions: Partial<Record<WorkflowConditionField, Array<{ value: string; label: string }>>> = {
  execution_state: [
    { value: "healthy", label: "Sănătos" },
    { value: "needs_attention", label: "Necesită atenție" },
    { value: "overdue", label: "Restant" },
    { value: "waiting_for_client", label: "Așteaptă clientul" },
    { value: "waiting_internal", label: "Așteptare internă" },
    { value: "approval_required", label: "Necesită aprobare" },
    { value: "owner_missing", label: "Responsabil lipsă" },
    { value: "next_action_missing", label: "Acțiune următoare lipsă" },
    { value: "blocked", label: "Blocat" },
    { value: "prepared", label: "Lucru pregătit" },
    { value: "ready_for_review", label: "Gata de revizuire" },
    { value: "resolved", label: "Rezolvat" },
  ],
  waiting_state: [
    { value: "waiting_for_client", label: "Așteaptă clientul" },
    { value: "waiting_internal", label: "Așteptare internă" },
  ],
  severity: [
    { value: "critical", label: "Critică" },
    { value: "attention", label: "Necesită atenție" },
    { value: "informative", label: "Informativă" },
    { value: "positive", label: "Pozitivă" },
  ],
  currency: [{ value: "RON", label: "RON" }, { value: "EUR", label: "EUR" }, { value: "USD", label: "USD" }],
  stage: [
    { value: "new", label: "Nouă" },
    { value: "reviewed", label: "Revizuită" },
    { value: "action_generated", label: "Acțiune pregătită" },
    { value: "contacted", label: "Contact inițiat" },
    { value: "follow_up_needed", label: "Follow-up necesar" },
    { value: "won", label: "Câștigată" },
    { value: "lost", label: "Pierdută" },
  ],
};

function catalogGroups<T extends string>(items: Array<{ value: T; label: string; group?: string }>) {
  return Array.from(new Set(items.map((item) => item.group ?? "Altele"))).map((group) => ({
    group,
    items: items.filter((item) => (item.group ?? "Altele") === group),
  }));
}

function nodeClass(selected: boolean, role: "trigger" | "condition" | "guard" | "action") {
  const roleClass = role === "trigger"
    ? "border-l-[3px] border-l-blue-500"
    : role === "condition"
      ? "border-l-[3px] border-l-violet-500"
      : role === "guard"
        ? "border-l-[3px] border-l-emerald-500"
        : "border-l-[3px] border-l-[rgb(var(--primary))]";
  return "focus-ring w-full rounded-[10px] border bg-[rgb(var(--surface-elevated))] px-4 py-3 text-left shadow-[0_12px_36px_rgba(0,0,0,0.18)] transition-[border-color,background-color,transform] duration-fast hover:-translate-y-px hover:border-[rgb(var(--border-strong))] " + roleClass + (selected ? " border-[rgb(var(--primary))] ring-1 ring-[rgb(var(--primary)/0.28)]" : " border-[rgb(var(--border))]");
}

function FlowConnector() {
  return <div aria-hidden="true" className="mx-auto h-8 w-px bg-[rgb(var(--border-strong))]" />;
}

export function WorkflowBuilder({ workflow, opportunities, preflight }: { workflow: WorkflowDefinition; opportunities: OpportunityOption[]; preflight: WorkflowActivationPreflight }) {
  const keyRef = useRef(100);
  const sourceDescription = workflow.description?.replace(/^\[AI\]\s*/, "") ?? "";
  const [name, setName] = useState(workflow.name);
  const [description, setDescription] = useState(sourceDescription);
  const [trigger, setTrigger] = useState<WorkflowTrigger>(workflow.trigger);
  const [conditions, setConditions] = useState<EditableCondition[]>(() => workflow.conditions.map((item, index) => ({ ...item, key: index })));
  const [actions, setActions] = useState<EditableAction[]>(() => workflow.actions.map((item, index) => ({ ...item, key: index })));
  const [selected, setSelected] = useState("workflow");
  const initial = useRef(JSON.stringify({
    name: workflow.name,
    description: sourceDescription,
    trigger: workflow.trigger,
    conditions: workflow.conditions,
    actions: workflow.actions.map(({ key: _key, ...item }: WorkflowAction & { key?: number }) => item),
  }));
  const payload = useMemo(() => ({
    name,
    description,
    trigger,
    conditions: conditions.map(({ key: _key, ...item }) => item),
    actions: actions.map(({ key: _key, ...item }) => item),
  }), [name, description, trigger, conditions, actions]);
  const dirty = JSON.stringify(payload) !== initial.current;
  const editable = workflow.status === "draft" || workflow.status === "paused";
  const valid = name.trim().length >= 3
    && actions.length > 0
    && conditions.every((item) => ["is_empty", "is_not_empty"].includes(item.operator) || String(item.value ?? "").trim().length > 0);
  const triggerGroups = catalogGroups(workflowTriggerCatalog);
  const actionGroups = catalogGroups(workflowActionCatalog);
  const state = presentWorkflowState(workflow.status);
  const capability = workflowTriggerCapability(trigger);
  const selectedCondition = selected.startsWith("condition:")
    ? conditions.find((item) => item.key === Number(selected.split(":")[1]))
    : null;
  const selectedAction = selected.startsWith("action:")
    ? actions.find((item) => item.key === Number(selected.split(":")[1]))
    : null;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function addCondition() {
    if (conditions.length >= 8) return;
    const key = keyRef.current++;
    setConditions((current) => [...current, { key, field: "execution_state", operator: "equals", value: "needs_attention" }]);
    setSelected("condition:" + key);
  }

  function updateCondition(key: number, patch: Partial<EditableCondition>) {
    setConditions((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
  }

  function changeConditionField(condition: EditableCondition, field: WorkflowConditionField) {
    const operator = workflowOperatorsForField(field)[0];
    const value = stateOptions[field]?.[0]?.value ?? (field === "estimated_value" ? 0 : "");
    updateCondition(condition.key, { field, operator, value });
  }

  function addAction(type: SafeWorkflowAction = "create_internal_task") {
    if (actions.length >= 6) return;
    const key = keyRef.current++;
    const catalog = workflowActionCatalog.find((item) => item.value === type);
    setActions((current) => [...current, {
      key,
      type,
      description: catalog?.description ?? "Pregătește lucrul pentru revizuire.",
      configuration: {},
      requiresHumanApproval: type !== "create_notification",
    }]);
    setSelected("action:" + key);
  }

  function updateAction(key: number, patch: Partial<EditableAction>) {
    setActions((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
  }

  function moveAction(index: number, direction: -1 | 1) {
    setActions((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function confirmLeave(event: React.MouseEvent<HTMLAnchorElement>) {
    if (dirty && !window.confirm("Ai modificări nesalvate. Revii la lista de workflow-uri?")) event.preventDefault();
  }

  return <div className="min-w-0">
    <form action={saveWorkflowDefinition}>
      <input type="hidden" name="workflowId" value={workflow.id} />
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="trigger" value={trigger} />
      <input type="hidden" name="conditions" value={JSON.stringify(payload.conditions)} />
      <input type="hidden" name="actions" value={JSON.stringify(payload.actions)} />

      <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-2">
        <Link href="/workflows" onClick={confirmLeave} className="focus-ring text-xs font-semibold text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))]">← Workflow-uri</Link>
        <button type="button" onClick={() => setSelected("workflow")} className="focus-ring min-w-0 truncate text-sm font-semibold hover:text-[rgb(var(--primary))]">{name || "Workflow fără nume"}</button>
        <div className="flex items-center gap-3">
          <span className={dirty ? "text-xs font-medium text-[rgb(var(--warning-text))]" : "text-xs text-[rgb(var(--text-subtle))]"}>{dirty ? "Modificări nesalvate" : "Salvat"}</span>
          <button disabled={!editable || !valid || !dirty} className="focus-ring h-8 rounded-[8px] bg-[rgb(var(--primary))] px-3 text-xs font-semibold text-[rgb(var(--primary-foreground))] transition-colors duration-fast hover:bg-[rgb(var(--primary-hover))] disabled:cursor-not-allowed disabled:opacity-45">{editable ? "Salvează" : "Pune în pauză pentru editare"}</button>
        </div>
      </div>

      <div className="grid min-h-[660px] xl:grid-cols-[minmax(0,1fr)_21rem]">
        <section aria-label="Canvas workflow" className="relative overflow-auto border-b border-[rgb(var(--border))] bg-[rgb(var(--background))] px-5 py-10 xl:border-b-0 xl:border-r">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(rgb(var(--border-strong))_0.7px,transparent_0.7px)] [background-size:18px_18px]" />
          <div className="relative mx-auto w-full max-w-[46rem]">
            <button type="button" onClick={() => setSelected("trigger")} className={nodeClass(selected === "trigger", "trigger")}>
              <span className="micro-label">Când · Declanșator</span>
              <span className="mt-1 block text-sm font-semibold">{workflowTriggerCatalog.find((item) => item.value === trigger)?.label}</span>
              <span className="mt-1 block text-xs leading-5 text-[rgb(var(--text-muted))]">{capability.label}</span>
            </button>

            <FlowConnector />

            {conditions.length ? <div className="grid gap-3 md:grid-cols-2">
              {conditions.map((condition) => <button key={condition.key} type="button" onClick={() => setSelected("condition:" + condition.key)} className={nodeClass(selected === "condition:" + condition.key, "condition")}>
                <span className="micro-label">Dacă · Condiție</span>
                <span className="mt-1 block text-sm font-semibold">{workflowConditionCatalog.find((item) => item.value === condition.field)?.label}</span>
                <span className="mt-1 block truncate text-xs text-[rgb(var(--text-muted))]">{workflowOperatorCatalog.find((item) => item.value === condition.operator)?.label} {condition.value == null ? "" : String(condition.value)}</span>
              </button>)}
            </div> : <button type="button" onClick={() => setSelected("guard")} className="focus-ring w-full rounded-[10px] border border-dashed border-[rgb(var(--border-strong))] px-4 py-3 text-left text-xs text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-hover))]">Dacă · Fără condiții suplimentare</button>}
            <button type="button" onClick={addCondition} disabled={!editable || conditions.length >= 8} className="focus-ring mx-auto mt-3 flex h-8 items-center rounded-[8px] px-3 text-xs font-semibold text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--foreground))] disabled:opacity-40">+ Adaugă condiție</button>

            <FlowConnector />

            <button type="button" onClick={() => setSelected("guard")} className={nodeClass(selected === "guard", "guard")}>
              <span className="micro-label">ReveNew verifică · Gard comercial</span>
              <span className="mt-1 block text-sm font-semibold">{workflowGuardCopy.title}</span>
              <span className="mt-1 block text-xs leading-5 text-[rgb(var(--text-muted))]">Revalidare, ownership și control uman înainte de orice mutație protejată.</span>
            </button>

            <FlowConnector />

            <div className="grid gap-3 md:grid-cols-2">
              {actions.map((action, index) => <button key={action.key} type="button" onClick={() => setSelected("action:" + action.key)} className={nodeClass(selected === "action:" + action.key, "action")}>
                <span className="micro-label">Atunci · Acțiunea {String(index + 1).padStart(2, "0")}</span>
                <span className="mt-1 block text-sm font-semibold">{workflowActionCatalog.find((item) => item.value === action.type)?.label}</span>
                <span className="mt-1 block text-xs leading-5 text-[rgb(var(--text-muted))]">{action.requiresHumanApproval ? "Necesită revizuire umană" : "Acțiune internă permisă"}</span>
              </button>)}
            </div>
            <button type="button" onClick={() => addAction()} disabled={!editable || actions.length >= 6} className="focus-ring mx-auto mt-3 flex h-8 items-center rounded-[8px] px-3 text-xs font-semibold text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--foreground))] disabled:opacity-40">+ Adaugă acțiune</button>

            <div className="mx-auto mt-8 flex w-fit items-center gap-2 rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-3 py-2 text-[0.6875rem] text-[rgb(var(--text-muted))]">
              <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--success-solid))]" />
              Execuție controlată · salvare explicită · fără acțiuni externe automate
            </div>
          </div>
        </section>

        <aside aria-label="Inspector workflow" className="bg-[rgb(var(--surface-subtle))] px-4 py-5">
          <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] pb-3">
            <div><p className="micro-label">Inspector</p><h2 className="mt-1 text-sm font-semibold">Configurare bloc</h2></div>
            <span className="status-pill status-pill-neutral">{state.label}</span>
          </div>

          {selected === "workflow" ? <div className="mt-4 grid gap-4">
            <label className="text-xs font-semibold text-[rgb(var(--text-secondary))]">Nume<input value={name} onChange={(event) => setName(event.target.value)} disabled={!editable} minLength={3} maxLength={120} className="focus-ring mt-1.5 h-9 w-full rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-xs disabled:opacity-60" /></label>
            <label className="text-xs font-semibold text-[rgb(var(--text-secondary))]">Descriere<textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={!editable} maxLength={1000} rows={4} className="focus-ring mt-1.5 w-full resize-y rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-xs leading-5 disabled:opacity-60" /></label>
            <p className="text-xs leading-5 text-[rgb(var(--text-muted))]">{workflow.source === "ai_assisted" ? "Draft asistat · revizuiește fiecare bloc." : "Definiție creată manual."}</p>
          </div> : null}

          {selected === "trigger" ? <div className="mt-4">
            <label className="text-xs font-semibold text-[rgb(var(--text-secondary))]">Declanșator<select value={trigger} onChange={(event) => setTrigger(event.target.value as WorkflowTrigger)} disabled={!editable} className="focus-ring mt-1.5 h-9 w-full rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2 text-xs">{triggerGroups.map(({ group, items }) => <optgroup key={group} label={group}>{items.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</optgroup>)}</select></label>
            <div className="mt-4 border-t border-[rgb(var(--border))] pt-4"><p className="text-xs font-semibold">{capability.label}</p><p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{capability.explanation}</p></div>
          </div> : null}

          {selectedCondition ? <div className="mt-4 grid gap-3">
            <label className="text-xs font-semibold text-[rgb(var(--text-secondary))]">Câmp<select value={selectedCondition.field} onChange={(event) => changeConditionField(selectedCondition, event.target.value as WorkflowConditionField)} disabled={!editable} className="focus-ring mt-1.5 h-9 w-full rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2 text-xs">{workflowConditionCatalog.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="text-xs font-semibold text-[rgb(var(--text-secondary))]">Operator<select value={selectedCondition.operator} onChange={(event) => updateCondition(selectedCondition.key, { operator: event.target.value as WorkflowConditionOperator, value: ["is_empty", "is_not_empty"].includes(event.target.value) ? null : selectedCondition.value ?? "" })} disabled={!editable} className="focus-ring mt-1.5 h-9 w-full rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2 text-xs">{workflowOperatorsForField(selectedCondition.field).map((operator) => <option key={operator} value={operator}>{workflowOperatorCatalog.find((item) => item.value === operator)?.label}</option>)}</select></label>
            {!["is_empty", "is_not_empty"].includes(selectedCondition.operator) ? <label className="text-xs font-semibold text-[rgb(var(--text-secondary))]">Valoare{stateOptions[selectedCondition.field] ? <select value={String(selectedCondition.value ?? "")} onChange={(event) => updateCondition(selectedCondition.key, { value: event.target.value })} disabled={!editable} className="focus-ring mt-1.5 h-9 w-full rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2 text-xs">{stateOptions[selectedCondition.field]?.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select> : <input type={selectedCondition.field === "estimated_value" ? "number" : "text"} value={String(selectedCondition.value ?? "")} onChange={(event) => updateCondition(selectedCondition.key, { value: selectedCondition.field === "estimated_value" ? Number(event.target.value) : event.target.value })} disabled={!editable} maxLength={160} className="focus-ring mt-1.5 h-9 w-full rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-xs" />}</label> : null}
            <button type="button" onClick={() => { setConditions((current) => current.filter((item) => item.key !== selectedCondition.key)); setSelected("workflow"); }} disabled={!editable} className="focus-ring mt-2 w-fit text-xs font-semibold text-[rgb(var(--danger-text))] disabled:opacity-40">Elimină condiția</button>
          </div> : null}

          {selected === "guard" ? <div className="mt-4">
            <p className="text-sm font-semibold">{workflowGuardCopy.title}</p>
            <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{workflowGuardCopy.summary}</p>
            <ul className="mt-4 grid gap-2 border-t border-[rgb(var(--border))] pt-4 text-xs leading-5 text-[rgb(var(--text-muted))]">{workflowGuardCopy.details.map((item) => <li key={item}>— {item}</li>)}</ul>
          </div> : null}

          {selectedAction ? <div className="mt-4 grid gap-3">
            <label className="text-xs font-semibold text-[rgb(var(--text-secondary))]">Acțiune<select value={selectedAction.type} onChange={(event) => { const type = event.target.value as SafeWorkflowAction; updateAction(selectedAction.key, { type, configuration: {}, requiresHumanApproval: type !== "create_notification" }); }} disabled={!editable} className="focus-ring mt-1.5 h-9 w-full rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2 text-xs">{actionGroups.map(({ group, items }) => <optgroup key={group} label={group}>{items.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</optgroup>)}</select></label>
            {selectedAction.type === "prepare_email" ? <>
              <label className="text-xs font-semibold text-[rgb(var(--text-secondary))]">Subiect<input value={String(selectedAction.configuration?.subject ?? "")} onChange={(event) => updateAction(selectedAction.key, { configuration: { ...selectedAction.configuration, subject: event.target.value } })} disabled={!editable} maxLength={500} className="focus-ring mt-1.5 h-9 w-full rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-xs" /></label>
              <label className="text-xs font-semibold text-[rgb(var(--text-secondary))]">Instrucțiuni<textarea value={String(selectedAction.configuration?.body ?? "")} onChange={(event) => updateAction(selectedAction.key, { configuration: { ...selectedAction.configuration, body: event.target.value } })} disabled={!editable} maxLength={5000} rows={4} className="focus-ring mt-1.5 w-full resize-y rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-xs leading-5" /></label>
            </> : <label className="text-xs font-semibold text-[rgb(var(--text-secondary))]">Titlu lucru pregătit<input value={String(selectedAction.configuration?.title ?? "")} onChange={(event) => updateAction(selectedAction.key, { configuration: { ...selectedAction.configuration, title: event.target.value } })} disabled={!editable} maxLength={500} className="focus-ring mt-1.5 h-9 w-full rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-xs" /></label>}
            <label className="text-xs font-semibold text-[rgb(var(--text-secondary))]">Motiv și context<textarea value={selectedAction.description} onChange={(event) => updateAction(selectedAction.key, { description: event.target.value })} disabled={!editable} maxLength={240} rows={3} className="focus-ring mt-1.5 w-full resize-y rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-xs leading-5" /></label>
            <div className="flex items-center gap-1 border-t border-[rgb(var(--border))] pt-3">
              <button type="button" disabled={!editable || actions.findIndex((item) => item.key === selectedAction.key) === 0} onClick={() => moveAction(actions.findIndex((item) => item.key === selectedAction.key), -1)} className="focus-ring h-8 px-2 text-xs disabled:opacity-30" aria-label="Mută acțiunea în sus">Mută sus</button>
              <button type="button" disabled={!editable || actions.findIndex((item) => item.key === selectedAction.key) === actions.length - 1} onClick={() => moveAction(actions.findIndex((item) => item.key === selectedAction.key), 1)} className="focus-ring h-8 px-2 text-xs disabled:opacity-30" aria-label="Mută acțiunea în jos">Mută jos</button>
              <button type="button" disabled={!editable || actions.length === 1} onClick={() => { setActions((current) => current.filter((item) => item.key !== selectedAction.key)); setSelected("workflow"); }} className="focus-ring ml-auto h-8 px-2 text-xs text-[rgb(var(--danger-text))] disabled:opacity-30">Elimină</button>
            </div>
            <p className="text-[0.6875rem] leading-5 text-[rgb(var(--text-muted))]">{selectedAction.type === "create_notification" ? "Acțiune internă ReveNew." : "Lucru pregătit · necesită revizuire umană."}{selectedAction.type === "prepare_email" ? " Niciun email nu va fi trimis automat." : ""}</p>
          </div> : null}
        </aside>
      </div>
    </form>

    <div className="grid border-t border-[rgb(var(--border))] lg:grid-cols-3">
      <section id="activation-review" className="scroll-mt-24 px-4 py-5 lg:border-r lg:border-[rgb(var(--border))]">
        <p className="micro-label">Revizuire de activare</p>
        <h2 className="mt-1 text-sm font-semibold">Confirmă fluxul înainte să devină activ</h2>
        <dl className="mt-4 grid gap-2 text-xs leading-5 text-[rgb(var(--text-muted))]">
          <div><dt className="inline font-semibold text-[rgb(var(--text-secondary))]">Când: </dt><dd className="inline">{workflowTriggerCatalog.find((item) => item.value === trigger)?.label}</dd></div>
          <div><dt className="inline font-semibold text-[rgb(var(--text-secondary))]">Dacă: </dt><dd className="inline">{conditions.length ? conditions.length + " condiții de verificat" : "fără condiții suplimentare"}</dd></div>
          <div><dt className="inline font-semibold text-[rgb(var(--text-secondary))]">ReveNew verifică: </dt><dd className="inline">autorizarea, starea curentă și controlul uman</dd></div>
          <div><dt className="inline font-semibold text-[rgb(var(--text-secondary))]">Atunci: </dt><dd className="inline">{preflight.actions.join(" · ")}</dd></div>
          <div><dt className="inline font-semibold text-[rgb(var(--text-secondary))]">Țintă: </dt><dd className="inline">{preflight.target}</dd></div>
          <div><dt className="inline font-semibold text-[rgb(var(--text-secondary))]">Condiții salvate: </dt><dd className="inline">{preflight.conditions.join(" · ") || "Fără condiții suplimentare."}</dd></div>
          <div><dt className="inline font-semibold text-[rgb(var(--text-secondary))]">Efect extern: </dt><dd className="inline">{preflight.externalEffect}</dd></div>
          <div><dt className="inline font-semibold text-[rgb(var(--text-secondary))]">Control: </dt><dd className="inline">{preflight.approval}</dd></div>
          <div><dt className="inline font-semibold text-[rgb(var(--text-secondary))]">Permisiuni: </dt><dd className="inline">{preflight.permissions}</dd></div>
          <div><dt className="inline font-semibold text-[rgb(var(--text-secondary))]">{capability.label}: </dt><dd className="inline">{capability.explanation}</dd></div>
        </dl>
        {preflight.errors.length ? <ul className="mt-3 space-y-1 text-xs text-[rgb(var(--danger-text))]">{preflight.errors.map((error) => <li key={error}>{error}</li>)}</ul> : null}
        {workflow.status !== "archived" ? <form action={changeWorkflowStatus} className="mt-4">
          <input type="hidden" name="workflowId" value={workflow.id} />
          <input type="hidden" name="status" value={workflow.status === "active" ? "paused" : "active"} />
          <button disabled={dirty || !valid || (workflow.status !== "active" && (!capability.automatic || !preflight.canActivate))} className="focus-ring h-9 w-full rounded-[8px] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] px-3 text-xs font-semibold hover:bg-[rgb(var(--surface-elevated))] disabled:cursor-not-allowed disabled:opacity-45">{workflow.status === "active" ? "Pune workflow-ul în pauză" : "Activează explicit"}</button>
          {dirty ? <p className="mt-2 text-[0.6875rem] text-[rgb(var(--warning-text))]">Salvează modificările înainte de activare.</p> : null}
          {!capability.automatic && workflow.status !== "active" ? <p className="mt-2 text-[0.6875rem] leading-5 text-[rgb(var(--warning-text))]">Activarea automată nu este disponibilă pentru acest trigger. Poți salva și testa draftul.</p> : null}
        </form> : null}
      </section>

      <section className="px-4 py-5 lg:border-r lg:border-[rgb(var(--border))]">
        <p className="micro-label">Test fără mutații</p>
        <h2 className="mt-1 text-sm font-semibold">Verifică un caz real în siguranță</h2>
        <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">Condițiile și gardurile sunt evaluate, dar nu se creează taskuri, notificări sau emailuri.</p>
        {opportunities.length ? <form action={runWorkflowTest} className="mt-4 grid gap-2">
          <input type="hidden" name="workflowId" value={workflow.id} />
          <select name="targetId" aria-label="Oportunitate pentru test" className="focus-ring h-9 rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2 text-xs">{opportunities.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
          <button disabled={dirty} className="focus-ring h-9 rounded-[8px] bg-[rgb(var(--primary))] px-3 text-xs font-semibold text-[rgb(var(--primary-foreground))] disabled:opacity-45">Testează fără mutații</button>
        </form> : <p className="mt-4 text-xs text-[rgb(var(--text-muted))]">Nu există oportunități eligibile pentru test.</p>}
      </section>

      <section className="px-4 py-5">
        <p className="micro-label">Control</p>
        <h2 className="mt-1 text-sm font-semibold">Limite operaționale</h2>
        <ul className="mt-3 grid gap-2 text-xs leading-5 text-[rgb(var(--text-muted))]">
          <li>Acțiunile protejate sunt doar pregătite.</li>
          <li>Emailurile nu sunt trimise automat.</li>
          <li>Fiecare rulare rămâne auditabilă.</li>
        </ul>
        {workflow.status !== "archived" ? <form action={changeWorkflowStatus} className="mt-5">
          <input type="hidden" name="workflowId" value={workflow.id} />
          <input type="hidden" name="status" value="archived" />
          <button className="focus-ring text-xs font-semibold text-[rgb(var(--danger-text))]">Arhivează workflow-ul</button>
        </form> : null}
      </section>
    </div>
  </div>;
}