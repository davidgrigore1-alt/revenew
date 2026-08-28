import Link from "next/link";
import { CalendarDaysIcon, ClockIcon, UserGroupIcon, VideoCameraIcon } from "@heroicons/react/24/outline";

import { PageShell } from "@/components/dashboard/PageShell";
import { Button } from "@/components/ui/Button";
import { getOwnedExternalContext, requireGoogleConnectorActor } from "@/lib/google-workspace/repository";
import { formatProductDate, formatProductTime, formatUserFacingText } from "@/lib/ui/presentation";

export const dynamic = "force-dynamic";

async function getMeetings() {
  try {
    const actor = await requireGoogleConnectorActor();
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 30);
    const result = await getOwnedExternalContext({ actor, from: from.toISOString(), to: to.toISOString(), limit: 80 });
    return result.events.filter((event) => event.event_status !== "cancelled").sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  } catch { return []; }
}
const day = new Intl.DateTimeFormat("ro-RO", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Bucharest" });
const hour = new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" });

export default async function MeetingsPage() {
  const meetings = await getMeetings();
  const groups = new Map<string, typeof meetings>();
  for (const meeting of meetings) {
    const key = new Date(meeting.starts_at).toISOString().slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), meeting]);
  }
  return <PageShell
    eyebrow="Calendar comercial"
    title="Întâlniri"
    description="Agenda autorizată, contextul comercial apropiat și briefurile pregătite înainte de conversație."
    actions={<><Button href="/apps" variant="secondary">Gestionează Calendar</Button><Button href="/ai">Pregătește un brief</Button></>}
  >
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section>
        <div className="flex items-center justify-between border-b border-[rgb(var(--border))] pb-3"><h2 className="text-sm font-semibold text-[rgb(var(--foreground))]">Următoarele 30 de zile</h2><span className="text-xs tabular-nums text-[rgb(var(--text-muted))]">{meetings.length} întâlniri</span></div>
        {groups.size ? <div>{Array.from(groups.entries()).map(([key, items]) => <section key={key} className="grid gap-2 border-b border-[rgb(var(--border))] py-4 md:grid-cols-[150px_minmax(0,1fr)]"><h3 className="text-xs font-semibold capitalize text-[rgb(var(--text-muted))]">{formatProductDate(items[0].starts_at, { weekday: "long", year: false })}</h3><div className="divide-y divide-[rgb(var(--border))]">{items.map((meeting) => <article key={meeting.id} className="grid gap-3 py-3 first:pt-0 md:grid-cols-[70px_minmax(0,1fr)_auto] md:items-start"><time className="text-xs font-semibold tabular-nums text-[rgb(var(--foreground))]">{formatProductTime(meeting.starts_at)}</time><div className="min-w-0"><h4 className="truncate text-sm font-semibold text-[rgb(var(--foreground))]">{meeting.title || "Întâlnire cu detalii limitate"}</h4><p className="mt-1 flex items-center gap-1.5 text-xs text-[rgb(var(--text-muted))]"><UserGroupIcon className="h-3.5 w-3.5"/>{meeting.participants.length ? meeting.participants.slice(0, 3).map((party) => party.name || party.email).join(", ") : "Participanți indisponibili"}</p>{meeting.normalized_description ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-[rgb(var(--text-subtle))]">{formatUserFacingText(meeting.normalized_description, { stripUrls: true })}</p> : null}</div><div className="flex gap-2">{meeting.conference_url ? <a href={meeting.conference_url} target="_blank" rel="noreferrer" aria-label="Deschide conferința" className="focus-ring grid h-8 w-8 place-items-center rounded-[8px] border border-[rgb(var(--border))]"><VideoCameraIcon className="h-4 w-4"/></a> : null}<Link href={`/ai?question=${encodeURIComponent(`Pregătește-mi întâlnirea: ${meeting.title || "întâlnire comercială"}`)}&meeting=${encodeURIComponent(meeting.id)}`} className="focus-ring inline-flex h-8 items-center rounded-[8px] border border-[rgb(var(--border))] px-3 text-xs font-semibold hover:bg-[rgb(var(--surface-hover))]">Pregătește brief</Link></div></article>)}</div></section>)}</div>
        : <div className="py-12 text-center"><CalendarDaysIcon className="mx-auto h-7 w-7 text-[rgb(var(--text-subtle))]"/><h2 className="mt-3 text-sm font-semibold">Nicio întâlnire disponibilă</h2><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[rgb(var(--text-muted))]">Conectează și sincronizează Google Calendar. ReveNew rămâne util din înregistrările CRM chiar fără context extern.</p><Button href="/apps" className="mt-4">Deschide Aplicații</Button></div>}
      </section>
      <aside className="border-l border-[rgb(var(--border))] pl-6"><p className="micro-label">Brief de întâlnire</p><h2 className="mt-2 text-base font-semibold">Context înainte de conversație</h2><p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">Ask ReveNew poate combina întâlnirea selectată cu oportunitatea, ultima conversație Gmail, acțiunea restantă și persoanele implicate.</p><div className="mt-5 space-y-3 border-y border-[rgb(var(--border))] py-4 text-xs"><p className="flex gap-2"><ClockIcon className="h-4 w-4 text-[rgb(var(--brand))]"/>Obiectiv comercial și întrebări deschise</p><p className="flex gap-2"><UserGroupIcon className="h-4 w-4 text-[rgb(var(--brand))]"/>Participanți și legături CRM confirmate</p><p className="flex gap-2"><CalendarDaysIcon className="h-4 w-4 text-[rgb(var(--brand))]"/>Ultimele interacțiuni și următorul pas</p></div><p className="mt-4 text-[0.6875rem] leading-5 text-[rgb(var(--text-subtle))]">Briefurile sunt lucru pregătit, nu adevăr inventat. Informația lipsă rămâne marcată explicit.</p></aside>
    </div>
  </PageShell>;
}