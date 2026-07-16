"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { updateGeneratedDocument } from "@/lib/actions";
import {
  getFollowUpSendReadiness,
  openFollowUpSendConfirmation,
  sendApprovedFollowUp,
  type FollowUpReadiness
} from "@/lib/follow-up-send-actions";
import { assessFollowUpDraft, followUpStatusLabels, type FollowUpDraftStatus } from "@/lib/follow-up-studio";
import { formatDateTimeWithSeconds } from "@/lib/utils";

type TimelineItem = { id: string; label: string; description: string; date?: string; actorName?: string };
type StudioDraft = {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  subject: string;
  body: string;
  status: FollowUpDraftStatus;
  generationMode: "ai" | "local_fallback";
  recipientEmail?: string;
  contactName?: string;
  reason?: string;
  dueDate?: string;
};

const modeCopy = {
  disabled: "Livrarea este dezactivată. Niciun furnizor extern nu va fi contactat.",
  test: "Mod test: fluxul intern este verificat, fără livrare externă.",
  live: "Mod live: furnizorul este apelat numai după confirmarea finală explicită."
};

export function FollowUpStudio({ initialDraft, timeline, initialReadiness }: { initialDraft: StudioDraft; timeline: TimelineItem[]; initialReadiness: FollowUpReadiness }) {
  const [subject, setSubject] = useState(initialDraft.subject);
  const [body, setBody] = useState(initialDraft.body);
  const [savedRevision, setSavedRevision] = useState({ subject: initialDraft.subject, body: initialDraft.body });
  const [status, setStatus] = useState(initialDraft.status);
  const [readiness, setReadiness] = useState(initialReadiness);
  const [busy, setBusy] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const assessment = useMemo(() => assessFollowUpDraft({ subject, body, recipientEmail: readiness.recipient, contactName: initialDraft.contactName, reason: initialDraft.reason, dueDate: initialDraft.dueDate }), [subject, body, readiness.recipient, initialDraft]);
  const readOnly = status === "sent" || status === "archived";
  const materialEdit = subject !== savedRevision.subject || body !== savedRevision.body;
  const localRevisionMismatch = ["approved", "ready_to_send"].includes(status) && materialEdit;

  async function refreshReadiness() {
    const next = await getFollowUpSendReadiness(initialDraft.id);
    setReadiness(next);
    return next;
  }

  async function save(next: "edited" | "approved" | "ready_to_send" | "archived") {
    setBusy(next);
    setNotice(null);
    const result = await updateGeneratedDocument(initialDraft.opportunityId, initialDraft.id, { title: subject, content: body, status: next });
    if (!result.ok) {
      setNotice({ tone: "error", text: result.error ?? "Draftul nu a putut fi salvat." });
      setBusy("");
      return;
    }
    setStatus(result.status as FollowUpDraftStatus);
    setSavedRevision({ subject, body });
    await refreshReadiness();
    setNotice({ tone: "ok", text: next === "approved" ? "Versiunea curentă a fost aprobată explicit. Nu a fost trimis niciun email." : next === "ready_to_send" ? "Draft pregătit pentru confirmarea finală." : next === "archived" ? "Draft arhivat." : "Modificările au fost salvate; aprobarea anterioară nu mai este valabilă." });
    setBusy("");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      const result = await updateGeneratedDocument(initialDraft.opportunityId, initialDraft.id, { markCopied: true });
      if (!result.ok) throw new Error(result.error);
      setNotice({ tone: "ok", text: "Draft copiat. Nu a fost trimis extern." });
    } catch {
      setNotice({ tone: "error", text: "Copierea nu a reușit. Selectează manual textul." });
    }
  }

  async function openConfirmation() {
    setBusy("readiness");
    setNotice(null);
    const result = await openFollowUpSendConfirmation(initialDraft.id);
    setReadiness(result.readiness);
    if (result.readiness.ready && !localRevisionMismatch) setConfirmationOpen(true);
    else setNotice({ tone: "error", text: "Draftul nu este pregătit. Rezolvă elementele marcate înainte de confirmare." });
    setBusy("");
  }

  async function confirmSend() {
    setBusy("send");
    const result = await sendApprovedFollowUp(initialDraft.id, true);
    setConfirmationOpen(false);
    if (result.ok) {
      if (result.status === "sent") setStatus("sent");
      setNotice({ tone: "ok", text: result.status === "test_completed" ? "Test intern finalizat. Nu a fost livrat niciun email extern." : result.replay ? "Rezultatul existent a fost returnat; furnizorul nu a fost apelat din nou." : "Furnizorul live a confirmat trimiterea." });
    } else {
      setNotice({ tone: "error", text: result.error ?? "Încercarea nu a putut fi finalizată." });
    }
    await refreshReadiness();
    setBusy("");
  }

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.75fr)]">
    <section className="grid gap-5 rounded-lg border border-white/10 bg-ink-900/70 p-5 sm:p-6">
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-zinc-300">{initialDraft.generationMode === "ai" ? "Draft asistat AI" : "Draft standard"}</span>
        <span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-zinc-300">{followUpStatusLabels[status]}</span>
        <span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-zinc-300">Netrimis automat</span>
        <span className="rounded-lg border border-mint-400/20 bg-mint-400/10 px-2.5 py-1 text-mint-200">Mod {readiness.mode}</span>
      </div>

      <div className={`rounded-lg border p-4 text-sm ${readiness.mode === "live" ? "border-mint-400/25 bg-mint-400/10 text-mint-100" : "border-gold-400/20 bg-gold-400/10 text-gold-100"}`}>{modeCopy[readiness.mode]}</div>
      <dl className="grid gap-3 rounded-lg border border-white/10 bg-ink-950/60 p-4 text-sm sm:grid-cols-2">
        <div><dt className="text-zinc-500">Destinatar</dt><dd className="mt-1 break-all font-semibold text-white">{readiness.recipient || "Adresă lipsă"}</dd></div>
        <div><dt className="text-zinc-500">Contact / companie</dt><dd className="mt-1 font-semibold text-white">{initialDraft.contactName || "Contact neconfirmat"} · {initialDraft.opportunityTitle}</dd></div>
      </dl>

      <div><label htmlFor="follow-up-subject" className="text-sm font-semibold text-zinc-200">Subiect</label><input id="follow-up-subject" value={subject} onChange={(event) => setSubject(event.target.value)} disabled={readOnly} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-ink-950 px-4 text-white outline-none focus:border-mint-400/50 disabled:opacity-60" /></div>
      <div><label htmlFor="follow-up-body" className="text-sm font-semibold text-zinc-200">Mesaj</label><textarea id="follow-up-body" value={body} onChange={(event) => setBody(event.target.value)} disabled={readOnly} rows={16} className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-ink-950 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-mint-400/50 disabled:opacity-60" /></div>

      {localRevisionMismatch || !readiness.revisionMatches && ["approved", "ready_to_send"].includes(status) ? <p role="alert" className="rounded-lg border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">Conținutul sau destinatarul diferă de versiunea aprobată. Salvează revizuirea și aprobă din nou înainte de trimitere.</p> : null}
      {notice ? <p role="status" className={`rounded-lg border px-4 py-3 text-sm ${notice.tone === "error" ? "border-red-400/25 bg-red-400/10 text-red-100" : "border-mint-400/25 bg-mint-400/10 text-mint-100"}`}>{notice.text}</p> : null}

      <div className="flex flex-wrap gap-2">
        {!readOnly ? <button type="button" disabled={Boolean(busy)} onClick={() => save("edited")} className="rounded-lg bg-mint-500 px-4 py-2 text-sm font-semibold text-ink-950 disabled:opacity-60">Salvează revizuirea</button> : null}
        {!readOnly && !["approved", "ready_to_send"].includes(status) ? <button type="button" disabled={Boolean(busy) || !assessment.canApprove} onClick={() => save("approved")} className="rounded-lg border border-mint-400/30 bg-mint-400/10 px-4 py-2 text-sm font-semibold text-mint-200 disabled:opacity-50">Aprobă draftul</button> : null}
        {status === "approved" && !localRevisionMismatch ? <button type="button" disabled={Boolean(busy)} onClick={() => save("ready_to_send")} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white">Pregătit pentru trimitere</button> : null}
        {["approved", "ready_to_send"].includes(status) && !readOnly ? <button type="button" disabled={Boolean(busy) || localRevisionMismatch} onClick={openConfirmation} className="rounded-lg bg-gold-400 px-4 py-2 text-sm font-semibold text-ink-950 disabled:opacity-50">Verifică și confirmă trimiterea</button> : null}
        <button type="button" onClick={copy} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white">Copiază</button>
        {!readOnly ? <button type="button" disabled={Boolean(busy)} onClick={() => save("archived")} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-400">Arhivează</button> : null}
      </div>
      <p className="text-xs leading-5 text-zinc-500">ReveNew nu trimite automat. Numai confirmarea finală inițiază o încercare server-side; modul test nu reprezintă livrare.</p>
    </section>

    <aside className="grid content-start gap-5">
      <section className="rounded-lg border border-white/10 bg-ink-900/70 p-5"><h2 className="font-semibold text-white">Pregătire pentru trimitere</h2><ul className="mt-4 grid gap-2">{readiness.checks.map((check) => <li key={check.key} className={`text-sm ${check.passed && !(check.key === "revision" && localRevisionMismatch) ? "text-mint-300" : "text-red-200"}`}>{check.passed && !(check.key === "revision" && localRevisionMismatch) ? "Verificat" : "Blocat"} · {check.label}</li>)}</ul>{readiness.sendStatus === "test_completed" ? <p className="mt-4 rounded-lg border border-gold-400/20 bg-gold-400/10 p-3 text-sm text-gold-100">Rezultat persistent: test finalizat, fără livrare externă.</p> : null}{readiness.sendStatus === "sent" ? <p className="mt-4 rounded-lg border border-mint-400/20 bg-mint-400/10 p-3 text-sm text-mint-100">Livrare live confirmată{readiness.sentAt ? ` · ${formatDateTimeWithSeconds(readiness.sentAt)}` : ""}.</p> : null}{["failed", "disabled"].includes(readiness.sendStatus) ? <p className="mt-4 rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-100">Ultima încercare nu a produs o livrare. Reîncercarea este disponibilă după remedierea cauzei.</p> : null}</section>
      <section className="rounded-lg border border-white/10 bg-ink-900/70 p-5"><h2 className="font-semibold text-white">Context și calitate</h2><dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-zinc-500">Oportunitate</dt><dd><Link href={`/opportunities/${initialDraft.opportunityId}`} className="font-semibold text-mint-300">{initialDraft.opportunityTitle}</Link></dd></div><div><dt className="text-zinc-500">Motiv</dt><dd className="text-zinc-200">{assessment.reason}</dd></div><div><dt className="text-zinc-500">Ton detectat</dt><dd className="capitalize text-zinc-200">{assessment.tone}</dd></div></dl></section>
      <section className="rounded-lg border border-white/10 bg-ink-900/70 p-5"><h2 className="font-semibold text-white">Istoric auditabil</h2><div className="mt-4 grid gap-4">{timeline.length ? timeline.map((item) => <div key={item.id} className="border-l border-white/10 pl-3"><p className="text-sm font-semibold text-white">{item.label}</p><p className="mt-1 text-xs leading-5 text-zinc-400">{item.description}</p><p className="mt-1 text-xs text-zinc-500">{item.actorName ?? "Sistem"}{item.date ? ` · ${formatDateTimeWithSeconds(item.date)}` : ""}</p></div>) : <p className="text-sm text-zinc-400">Nu există evenimente pentru acest draft.</p>}</div></section>
    </aside>

    {confirmationOpen ? <div role="dialog" aria-modal="true" aria-labelledby="send-confirmation-title" className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"><div className="w-full max-w-lg rounded-xl border border-white/15 bg-ink-950 p-6 shadow-2xl"><h2 id="send-confirmation-title" className="text-xl font-semibold text-white">Confirmare finală</h2><p className="mt-3 text-sm leading-6 text-zinc-300">Confirmi inițierea în modul <strong>{readiness.mode}</strong> către <strong>{readiness.recipient}</strong>? Acțiunea nu este automată.</p><dl className="mt-4 grid gap-3 rounded-lg border border-white/10 bg-black/20 p-4 text-sm"><div><dt className="text-zinc-500">Subiect</dt><dd className="mt-1 font-semibold text-white">{subject}</dd></div><div><dt className="text-zinc-500">Mesaj</dt><dd className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap text-zinc-300">{body}</dd></div></dl>{readiness.mode === "test" ? <p className="mt-3 rounded-lg border border-gold-400/20 bg-gold-400/10 p-3 text-sm text-gold-100">Testul nu livrează extern și nu va apărea ca email trimis.</p> : null}<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setConfirmationOpen(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white">Renunță</button><button type="button" disabled={busy === "send"} onClick={confirmSend} className="rounded-lg bg-gold-400 px-4 py-2 text-sm font-semibold text-ink-950 disabled:opacity-60">Confirm explicit</button></div></div></div> : null}
  </div>;
}
