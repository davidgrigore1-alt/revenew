"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookmarkIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { createWorkspaceNote, updateWorkspaceNote, type WorkspaceNote, type WorkspaceNoteTargetType } from "@/lib/workspace-notes";
import { formatDateTimeWithSeconds } from "@/lib/utils";

export function RecordNotes({ targetType, targetId, notes }: { targetType: WorkspaceNoteTargetType; targetId: string; notes: WorkspaceNote[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function create(formData: FormData) {
    startTransition(async () => {
      const result = await createWorkspaceNote(targetType, targetId, formData);
      if (!result.ok) {
        setError(result.error ?? "Nota nu a putut fi salvată.");
        return;
      }
      setError("");
      router.refresh();
    });
  }

  function mutate(noteId: string, action: "pin" | "unpin" | "delete") {
    startTransition(async () => {
      const result = await updateWorkspaceNote(noteId, targetType, targetId, action);
      if (!result.ok) setError("Nota nu a putut fi actualizată.");
      else { setError(""); router.refresh(); }
    });
  }

  return (
    <section aria-labelledby={`record-notes-${targetType}`} className="grid gap-3">
      <header className="flex items-end justify-between gap-3 border-b border-[rgb(var(--border))] pb-3">
        <div><p className="product-eyebrow">Context intern</p><h2 id={`record-notes-${targetType}`} className="mt-1 text-base font-semibold">Note</h2></div>
        <span className="text-xs tabular-nums text-[rgb(var(--text-muted))]">{notes.length}</span>
      </header>
      <form action={create} className="grid gap-2">
        <Textarea name="content" rows={3} maxLength={5000} required placeholder="Adaugă un fapt, o decizie sau context util echipei…" aria-label="Conținutul notei" />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]"><input type="checkbox" name="isPinned" className="size-4" /> Fixează sus</label>
          <Button type="submit" size="small" disabled={pending}>{pending ? "Se salvează" : "Adaugă nota"}</Button>
        </div>
        {error ? <p role="alert" className="text-xs text-[rgb(var(--danger-text))]">{error}</p> : null}
      </form>
      {notes.length ? <div className="divide-y divide-[rgb(var(--border))] border-y border-[rgb(var(--border))]">
        {notes.map((note) => <article key={note.id} className="group grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[0.6875rem] text-[rgb(var(--text-muted))]">{note.pinned ? <span className="status-pill status-pill-brand">Fixată</span> : null}<span>{note.authorName}</span><span>·</span><time dateTime={note.createdAt}>{formatDateTimeWithSeconds(note.createdAt)}</time></div>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--text-secondary))]">{note.content}</p>
          </div>
          {note.canEdit ? <div className="flex gap-1 opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <button type="button" disabled={pending} onClick={() => mutate(note.id, note.pinned ? "unpin" : "pin")} className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-control hover:bg-[rgb(var(--surface-muted))]" aria-label={note.pinned ? "Elimină fixarea notei" : "Fixează nota"} title={note.pinned ? "Elimină fixarea" : "Fixează"}><BookmarkIcon className="h-4 w-4" aria-hidden="true" /></button>
            <button type="button" disabled={pending} onClick={() => mutate(note.id, "delete")} className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-control hover:bg-[rgb(var(--danger-background))] hover:text-[rgb(var(--danger-text))]" aria-label="Șterge nota" title="Șterge"><TrashIcon className="h-4 w-4" aria-hidden="true" /></button>
          </div> : null}
        </article>)}
      </div> : <p className="border-y border-dashed border-[rgb(var(--border))] py-6 text-sm text-[rgb(var(--text-muted))]">Nu există note colaborative pentru această înregistrare.</p>}
      <p className="text-[0.6875rem] leading-5 text-[rgb(var(--text-faint))]">Notele sunt context de business introdus de utilizatori și sunt tratate ca date neîncrezute de sistemele AI.</p>
    </section>
  );
}