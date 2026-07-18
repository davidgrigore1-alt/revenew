"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { Textarea } from "@/components/ui/Textarea";
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
          <Input name="title" required defaultValue="Follow-up comercial" className="min-h-11 bg-[rgb(var(--background))]" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
          Tip
          <Select name="type" defaultValue={"follow_up" satisfies OpportunityActionType} className="min-h-11 bg-[rgb(var(--background))]">
            <option value="call_contact">Apel</option>
            <option value="send_email">Email</option>
            <option value="follow_up">Follow-up</option>
            <option value="prepare_offer">Pregătește ofertă</option>
            <option value="prepare_documents">Revizuire documente</option>
            <option value="research_more">Task general</option>
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
          Data
          <Input name="dueDate" type="date" className="min-h-11 bg-[rgb(var(--background))]" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
          Ora
          <Input name="dueTime" type="time" defaultValue="09:00" className="min-h-11 bg-[rgb(var(--background))]" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
          Prioritate
          <Select name="priority" defaultValue="medium" className="min-h-11 bg-[rgb(var(--background))]">
            <option value="high">Ridicată</option>
            <option value="medium">Medie</option>
            <option value="low">Scăzută</option>
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
          Responsabil
          <Select name="assignedToProfileId" defaultValue="" className="min-h-11 bg-[rgb(var(--background))]">
            <option value="">Eu</option>
            {assignableProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.fullName}</option>)}
          </Select>
        </label>
      </div>
      {!compact ? (
        <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
          Note
          <Textarea name="description" rows={3} className="bg-[rgb(var(--background))]" />
        </label>
      ) : null}
      <div>
        <Button type="submit" disabled={isPending}>{isPending ? "Se creează..." : "Creează acțiune"}</Button>
      </div>
    </form>
  );
}
