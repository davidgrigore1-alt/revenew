"use client";

import { useState } from "react";
import { ArrowRightIcon, CheckCircleIcon, ExclamationTriangleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import {
  presentWorkflowAction,
  presentWorkflowConditionField,
  presentWorkflowOperator,
  presentWorkflowTrigger,
  workflowGuardCopy,
} from "@/lib/workflow-presentation";
import type { CopilotWorkflowDraftPreview } from "@/lib/workflow-drafting";

type CreateResponse = {
  ok?: boolean;
  workflowId?: string;
  replay?: boolean;
  status?: string;
  route?: string;
  error?: string;
};

function presentValue(value: string | number | null | undefined) {
  if (value == null) return "";
  if (typeof value === "number") return value.toLocaleString("ro-RO");
  const labels: Record<string, string> = {
    active: "Activă",
    overdue: "Restant",
    next_action_missing: "Acțiune următoare lipsă",
  };
  return labels[value] ?? value;
}

export function WorkflowDraftPreview({
  preview,
  onModify,
}: {
  preview: CopilotWorkflowDraftPreview;
  onModify: (request: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreateResponse | null>(null);
  const [error, setError] = useState("");
  const canCreate =
    Boolean(preview.definition) &&
    (preview.state === "ready" || preview.state === "partial");

  async function createDraft() {
    if (!canCreate || creating || created?.ok) return;
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/ai/workflow-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: preview.originalRequest,
          confirmationId: preview.confirmationId,
        }),
      });
      const payload = (await response.json()) as CreateResponse;
      if (!response.ok || !payload.ok || !payload.route) {
        throw new Error(payload.error || "Draftul nu a putut fi creat.");
      }
      setCreated(payload);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Draftul nu a putut fi creat. Nicio acțiune nu a fost executată.",
      );
    } finally {
      setCreating(false);
    }
  }

  if (!preview.definition) {
    return (
      <section className="mt-5 border-l-2 border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] px-4 py-3" aria-label="Clarificare workflow">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--warning-text))]" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-[rgb(var(--warning-text))]">
              {preview.state === "unsupported" ? "Cerere nesuportată în forma actuală" : "Am nevoie de o clarificare"}
            </p>
            <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-secondary))]">
              {preview.clarification ?? preview.summary}
            </p>
            {preview.unsupportedIntents.length ? (
              <ul className="mt-2 grid gap-1 text-xs leading-5 text-[rgb(var(--text-muted))]">
                {preview.unsupportedIntents.map((item) => <li key={item}>— {item}</li>)}
              </ul>
            ) : null}
            <button
              type="button"
              onClick={() => onModify(preview.originalRequest)}
              className="focus-ring mt-3 text-xs font-semibold text-[rgb(var(--foreground))] underline decoration-[rgb(var(--primary)/0.6)] underline-offset-4"
            >
              Reformulează cererea
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-5 overflow-hidden rounded-panel border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-elevated))]" aria-label="Preview workflow pregătit">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgb(var(--border))] px-4 py-3.5">
        <div>
          <p className="micro-label">Workflow propus</p>
          <h4 className="mt-1.5 text-base font-semibold text-[rgb(var(--foreground))]">{preview.title}</h4>
          <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{preview.summary}</p>
        </div>
        <span className="status-pill status-pill-warning">Draft · inactiv</span>
      </header>

      <div className="grid gap-0 px-4 py-2">
        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 border-b border-[rgb(var(--border))] py-3">
          <p className="micro-label pt-0.5">Când</p>
          <div>
            <p className="text-sm font-semibold">{presentWorkflowTrigger(preview.definition.trigger)}</p>
            <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Acesta este singurul declanșator canonic al draftului.</p>
          </div>
        </div>

        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 border-b border-[rgb(var(--border))] py-3">
          <p className="micro-label pt-0.5">Dacă</p>
          <div className="grid gap-1.5">
            {preview.definition.conditions.length ? preview.definition.conditions.map((condition, index) => (
              <p key={condition.field + "-" + index} className="text-sm text-[rgb(var(--text-secondary))]">
                <span className="font-semibold text-[rgb(var(--foreground))]">{presentWorkflowConditionField(condition.field)}</span>
                {" "}{presentWorkflowOperator(condition.operator)}
                {condition.value == null ? null : <> <span className="font-semibold text-[rgb(var(--foreground))]">{presentValue(condition.value)}</span></>}
              </p>
            )) : <p className="text-sm text-[rgb(var(--text-muted))]">Nu sunt adăugate condiții suplimentare.</p>}
          </div>
        </div>

        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 border-b border-[rgb(var(--border))] py-3">
          <p className="micro-label pt-0.5">Verifică</p>
          <div>
            <p className="text-sm font-semibold">{workflowGuardCopy.title}</p>
            <ul className="mt-1.5 grid gap-1 text-xs leading-5 text-[rgb(var(--text-muted))]">
              {workflowGuardCopy.details.slice(0, 3).map((item) => <li key={item}>— {item}</li>)}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 py-3">
          <p className="micro-label pt-0.5">Atunci</p>
          <ol className="grid gap-2">
            {preview.definition.actions.map((action, index) => (
              <li key={action.type + "-" + index} className="flex items-start gap-2">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[rgb(var(--border-strong))] text-[0.625rem] font-semibold text-[rgb(var(--text-muted))]">{index + 1}</span>
                <div>
                  <p className="text-sm font-semibold">{presentWorkflowAction(action.type)}</p>
                  <p className="mt-0.5 text-xs leading-5 text-[rgb(var(--text-muted))]">{action.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {preview.unsupportedIntents.length ? (
        <div className="border-t border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] px-4 py-3">
          <p className="text-xs font-semibold text-[rgb(var(--warning-text))]">Partea nesuportată nu va fi inclusă</p>
          <ul className="mt-1 grid gap-1 text-xs leading-5 text-[rgb(var(--text-muted))]">
            {preview.unsupportedIntents.map((item) => <li key={item}>— {item}</li>)}
          </ul>
        </div>
      ) : null}

      <div className="flex items-start gap-2 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-3">
        <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />
        <p className="text-xs leading-5 text-[rgb(var(--text-muted))]">
          Creezi doar definiția inactivă. Ask ReveNew nu o activează, nu o rulează și nu trimite emailuri.
        </p>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--border))] px-4 py-3">
        <button
          type="button"
          onClick={() => onModify(preview.originalRequest)}
          disabled={creating || Boolean(created?.ok)}
          className="focus-ring min-h-8 rounded-button px-2 text-xs font-semibold text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-subtle))] hover:text-[rgb(var(--foreground))] disabled:opacity-50"
        >
          Modifică cererea
        </button>
        {created?.ok && created.route ? (
          <Button href={created.route} size="small">
            {created.replay ? "Deschide draftul existent" : "Continuă în builder"}
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button type="button" size="small" loading={creating} disabled={!canCreate} onClick={() => void createDraft()}>
            Creează workflow Draft
          </Button>
        )}
        {created?.ok ? (
          <p className="flex w-full items-center gap-1.5 text-xs text-[rgb(var(--success-text))]" role="status">
            <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
            {created.replay ? "Draftul există deja și nu a fost duplicat." : "Draft creat. Rămâne inactiv până la activarea explicită din builder."}
          </p>
        ) : null}
        {error ? <p className="w-full text-xs text-[rgb(var(--danger-text))]" role="alert">{error}</p> : null}
      </footer>
    </section>
  );
}
