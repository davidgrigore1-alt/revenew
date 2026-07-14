"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { completeOpportunityTask, createOpportunityTask } from "@/lib/revenue-workspace/actions";
import type { OpportunityActionType } from "@/lib/types";

export function CompleteTaskButton({ opportunityId, actionId }: { opportunityId: string; actionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <div className="grid gap-2">
      {error ? <StatusNotice tone="warning">{error}</StatusNotice> : null}
      <Button
        variant="secondary"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const result = await completeOpportunityTask(opportunityId, actionId);
            if (result.ok) {
              setError("");
              router.refresh();
            } else {
              setError(result.error ?? "Acțiunea nu a putut fi finalizată.");
            }
          });
        }}
      >
        {isPending ? "Se finalizează..." : "Finalizează"}
      </Button>
    </div>
  );
}

export function CreateTaskForm({ opportunityId, compact = false, assignableProfiles = [] }: { opportunityId: string; compact?: boolean; assignableProfiles?: Array<{ id: string; fullName: string }> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createOpportunityTask(opportunityId, formData);
      if (result.ok) {
        setNotice("Acțiunea a fost creată.");
        setError("");
        router.refresh();
      } else {
        setError(result.error ?? "Acțiunea nu a putut fi creată.");
        setNotice("");
      }
    });
  }

  return (
    <form action={submit} className="grid gap-3 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-4">
      {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}
      {error ? <StatusNotice tone="warning">{error}</StatusNotice> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
          Titlu
          <input name="title" required defaultValue="Follow-up comercial" className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
          Tip
          <select name="type" defaultValue={"follow_up" satisfies OpportunityActionType} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3">
            <option value="call_contact">Apel</option>
            <option value="send_email">Email</option>
            <option value="follow_up">Follow-up</option>
            <option value="prepare_offer">Pregătește ofertă</option>
            <option value="prepare_documents">Revizuire documente</option>
            <option value="research_more">Task general</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
          Data
          <input name="dueDate" type="date" className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
          Ora
          <input name="dueTime" type="time" defaultValue="09:00" className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
          Prioritate
          <select name="priority" defaultValue="medium" className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3">
            <option value="high">Ridicată</option>
            <option value="medium">Medie</option>
            <option value="low">Scăzută</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
          Responsabil
          <select name="assignedToProfileId" defaultValue="" className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3">
            <option value="">Eu</option>
            {assignableProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.fullName}</option>)}
          </select>
        </label>
      </div>
      {!compact ? (
        <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
          Note
          <textarea name="description" rows={3} className="resize-y rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-2" />
        </label>
      ) : null}
      <div>
        <Button type="submit" disabled={isPending}>{isPending ? "Se creează..." : "Creează acțiune"}</Button>
      </div>
    </form>
  );
}
