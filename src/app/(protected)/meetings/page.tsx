import Link from "next/link";
import {
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";

import { PageShell } from "@/components/dashboard/PageShell";
import { Button } from "@/components/ui/Button";
import {
  getOwnedExternalContext,
  requireGoogleConnectorActor,
} from "@/lib/google-workspace/repository";
import {
  formatProductDate,
  formatProductTime,
  formatUserFacingText,
} from "@/lib/ui/presentation";

export const dynamic = "force-dynamic";

const regionClass =
  "rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]";

const innerSurfaceClass =
  "rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))]";

async function getMeetings() {
  try {
    const actor = await requireGoogleConnectorActor();

    const from = new Date();
    from.setDate(from.getDate() - 14);
    from.setHours(0, 0, 0, 0);

    const to = new Date();
    to.setDate(to.getDate() + 30);
    to.setHours(23, 59, 59, 999);

    const result = await getOwnedExternalContext({
      actor,
      from: from.toISOString(),
      to: to.toISOString(),
      limit: 80,
    });

    return {
      connected: Boolean(result.connection),
      events: result.events
        .filter((event) => event.event_status !== "cancelled")
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    };
  } catch {
    return {
      connected: false,
      events: [],
    };
  }
}

function meetingState(
  startsAt: string,
  endsAt: string,
  now: number,
) {
  if (new Date(endsAt).getTime() < now) {
    return {
      label: "Încheiată",
      tone: "status-pill-neutral",
    };
  }

  if (new Date(startsAt).getTime() <= now) {
    return {
      label: "În desfășurare",
      tone: "status-pill-success",
    };
  }

  return {
    label: "Urmează",
    tone: "status-pill-brand",
  };
}

export default async function MeetingsPage() {
  const { connected, events } = await getMeetings();
  const now = Date.now();

  const upcoming = events.filter(
    (meeting) => new Date(meeting.ends_at).getTime() >= now,
  );

  const completed = events
    .filter(
      (meeting) => new Date(meeting.ends_at).getTime() < now,
    )
    .slice(-8)
    .reverse();

  const linkedCount = events.filter(
    (meeting) => meeting.linked_opportunity_id,
  ).length;

  const groups = new Map<string, typeof upcoming>();

  for (const meeting of upcoming) {
    const key = new Date(meeting.starts_at)
      .toISOString()
      .slice(0, 10);

    groups.set(key, [
      ...(groups.get(key) ?? []),
      meeting,
    ]);
  }

  const meetingRow = (
    meeting: (typeof events)[number],
  ) => {
    const state = meetingState(
      meeting.starts_at,
      meeting.ends_at,
      now,
    );

    const contextHref = meeting.linked_opportunity_id
      ? `/opportunities/${meeting.linked_opportunity_id}`
      : null;

    const completedMeeting = state.label === "Încheiată";

    return (
      <article
        key={meeting.id}
        className="grid gap-3 px-4 py-4 transition-colors hover:bg-[rgb(var(--surface-hover))] md:grid-cols-[70px_minmax(0,1fr)_auto] md:items-start"
      >
        <time className="pt-0.5 text-xs font-semibold tabular-nums text-[rgb(var(--foreground))]">
          {formatProductTime(meeting.starts_at)}
        </time>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-[rgb(var(--foreground))]">
              {meeting.title ||
                "Întâlnire cu detalii limitate"}
            </h4>

            <span
              className={`status-pill ${state.tone}`}
            >
              {state.label}
            </span>

            {meeting.event_status === "tentative" ? (
              <span className="status-pill status-pill-warning">
                Tentativă
              </span>
            ) : null}
          </div>

          <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-[rgb(var(--text-muted))]">
            <UserGroupIcon
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />

            <span>
              {meeting.participants.length
                ? meeting.participants
                    .slice(0, 3)
                    .map(
                      (party) =>
                        party.name || party.email,
                    )
                    .join(", ")
                : "Participanți indisponibili"}
            </span>
          </p>

          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[0.6875rem] text-[rgb(var(--text-subtle))]">
            <span>
              {formatProductTime(meeting.starts_at)}–
              {formatProductTime(meeting.ends_at)}
            </span>

            {contextHref ? (
              <Link
                href={contextHref}
                className="focus-ring font-semibold text-[rgb(var(--primary))] hover:underline"
              >
                Oportunitate asociată
              </Link>
            ) : (
              <span>
                Fără oportunitate asociată
              </span>
            )}
          </div>

          {meeting.normalized_description ? (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-[rgb(var(--text-subtle))]">
              {formatUserFacingText(
                meeting.normalized_description,
                {
                  stripUrls: true,
                },
              )}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          {meeting.conference_url &&
          !completedMeeting ? (
            <a
              href={meeting.conference_url}
              target="_blank"
              rel="noreferrer"
              aria-label="Deschide conferința"
              className="focus-ring grid h-8 w-8 place-items-center rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] transition-colors hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-hover))]"
            >
              <VideoCameraIcon
                className="h-4 w-4"
                aria-hidden="true"
              />
            </a>
          ) : null}

          <Link
            href={`/ai?question=${encodeURIComponent(
              `Pregătește-mi întâlnirea: ${
                meeting.title ||
                "întâlnire comercială"
              }`,
            )}&meeting=${encodeURIComponent(
              meeting.id,
            )}`}
            className="focus-ring inline-flex h-8 items-center rounded-[8px] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-elevated))] px-3 text-xs font-semibold transition-colors hover:bg-[rgb(var(--surface-hover))]"
          >
            {completedMeeting
              ? "Pregătește follow-up"
              : "Pregătește brief"}
          </Link>
        </div>
      </article>
    );
  };

  return (
    <PageShell
      eyebrow="Calendar comercial"
      title="Întâlniri"
      description="Context comercial înainte de conversație și următorul pas după întâlnire"
      actions={
        <Button
          href="/apps"
          variant="secondary"
        >
          Gestionează Calendar
        </Button>
      }
    >
      <div className="grid gap-6">
        {/* Summary */}
        <section
          aria-label="Rezumat întâlniri"
          className={`${regionClass} grid overflow-hidden sm:grid-cols-3`}
        >
          <div className="px-4 py-3.5 sm:border-r sm:border-[rgb(var(--border))]">
            <p className="micro-label">
              Urmează
            </p>

            <p className="mt-1 text-lg font-semibold tabular-nums">
              {upcoming.length}
            </p>

            <p className="mt-0.5 text-xs leading-5 text-[rgb(var(--text-muted))]">
              În următoarele 30 de zile
            </p>
          </div>

          <div className="border-t border-[rgb(var(--border))] px-4 py-3.5 sm:border-r sm:border-t-0">
            <p className="micro-label">
              Încheiate recent
            </p>

            <p className="mt-1 text-lg font-semibold tabular-nums">
              {completed.length}
            </p>

            <p className="mt-0.5 text-xs leading-5 text-[rgb(var(--text-muted))]">
              Disponibile pentru follow-up
            </p>
          </div>

          <div className="border-t border-[rgb(var(--border))] px-4 py-3.5 sm:border-t-0">
            <p className="micro-label">
              Cu oportunitate
            </p>

            <p className="mt-1 text-lg font-semibold tabular-nums">
              {linkedCount}
            </p>

            <p className="mt-0.5 text-xs leading-5 text-[rgb(var(--text-muted))]">
              Legături CRM confirmate
            </p>
          </div>
        </section>

        {/* Agenda + meeting intelligence */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="grid gap-4">
            <section className={`${regionClass} p-4 sm:p-5`}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="micro-label">
                    Agenda comercială
                  </p>

                  <h2 className="mt-1 text-base font-semibold text-[rgb(var(--foreground))]">
                    Următoarele 30 de zile
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">
                    Întâlniri autorizate din Calendar, cu contextul comercial disponibil.
                  </p>
                </div>

                <span className="shrink-0 text-xs tabular-nums text-[rgb(var(--text-muted))]">
                  {upcoming.length}{" "}
                  {upcoming.length === 1
                    ? "întâlnire"
                    : "întâlniri"}
                </span>
              </div>

              {groups.size ? (
                <div
                  className={`${innerSurfaceClass} mt-4 overflow-hidden`}
                >
                  {Array.from(groups.entries()).map(
                    ([key, items], groupIndex) => (
                      <section
                        key={key}
                        className={
                          groupIndex > 0
                            ? "border-t border-[rgb(var(--border))]"
                            : undefined
                        }
                      >
                        <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-2.5">
                          <h3 className="text-xs font-semibold capitalize text-[rgb(var(--text-secondary))]">
                            {formatProductDate(
                              items[0].starts_at,
                              {
                                weekday: "long",
                                year: false,
                              },
                            )}
                          </h3>
                        </div>

                        <div className="divide-y divide-[rgb(var(--border))]">
                          {items.map(meetingRow)}
                        </div>
                      </section>
                    ),
                  )}
                </div>
              ) : (
                <div
                  className={`${innerSurfaceClass} mt-4 px-5 py-9 text-center`}
                >
                  <CalendarDaysIcon
                    className="mx-auto h-7 w-7 text-[rgb(var(--text-subtle))]"
                    aria-hidden="true"
                  />

                  <h3 className="mt-3 text-sm font-semibold">
                    Nicio întâlnire programată
                  </h3>

                  <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[rgb(var(--text-muted))]">
                    {connected
                      ? "Calendarul este conectat, dar nu există evenimente în următoarele 30 de zile."
                      : "Conectează Google Calendar pentru a vedea agenda autorizată și contextul comercial asociat."}
                  </p>

                  {!connected ? (
                    <Button
                      href="/apps"
                      className="mt-4"
                    >
                      Deschide Aplicații
                    </Button>
                  ) : null}
                </div>
              )}
            </section>

            {completed.length ? (
              <section
                aria-labelledby="completed-meetings-title"
                className={`${regionClass} p-4 sm:p-5`}
              >
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="micro-label">
                      După conversație
                    </p>

                    <h2
                      id="completed-meetings-title"
                      className="mt-1 text-base font-semibold text-[rgb(var(--foreground))]"
                    >
                      Întâlniri încheiate recent
                    </h2>

                    <p className="mt-1 max-w-2xl text-xs leading-5 text-[rgb(var(--text-muted))]">
                      Revizuiește contextul și pregătește următorul pas; ReveNew nu presupune automat rezultatul.
                    </p>
                  </div>

                  <span className="shrink-0 text-xs tabular-nums text-[rgb(var(--text-muted))]">
                    {completed.length}
                  </span>
                </div>

                <div
                  className={`${innerSurfaceClass} mt-4 overflow-hidden divide-y divide-[rgb(var(--border))]`}
                >
                  {completed.map(meetingRow)}
                </div>
              </section>
            ) : null}
          </div>

          {/* Brief rail */}
          <aside
            className={`${regionClass} p-4 sm:p-5`}
          >
            <p className="micro-label">
              Brief de întâlnire
            </p>

            <h2 className="mt-2 text-base font-semibold text-[rgb(var(--foreground))]">
              Context înainte și după conversație
            </h2>

            <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">
              Ask ReveNew poate combina întâlnirea selectată cu oportunitatea, ultima conversație Gmail, acțiunea restantă și persoanele implicate.
            </p>

            <div
              className={`${innerSurfaceClass} mt-5 overflow-hidden divide-y divide-[rgb(var(--border))]`}
            >
              <div className="flex gap-3 p-3.5 text-xs leading-5 text-[rgb(var(--text-secondary))]">
                <ClockIcon
                  className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]"
                  aria-hidden="true"
                />

                <span>
                  Obiectiv comercial și întrebări deschise
                </span>
              </div>

              <div className="flex gap-3 p-3.5 text-xs leading-5 text-[rgb(var(--text-secondary))]">
                <UserGroupIcon
                  className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]"
                  aria-hidden="true"
                />

                <span>
                  Participanți și legături CRM confirmate
                </span>
              </div>

              <div className="flex gap-3 p-3.5 text-xs leading-5 text-[rgb(var(--text-secondary))]">
                <CalendarDaysIcon
                  className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]"
                  aria-hidden="true"
                />

                <span>
                  Ultimele interacțiuni și următorul pas
                </span>
              </div>
            </div>

            <div className="mt-4 border-t border-[rgb(var(--border))] pt-4">
              <p className="text-[0.6875rem] leading-5 text-[rgb(var(--text-subtle))]">
                Briefurile sunt lucru pregătit, nu adevăr inventat. Informația lipsă rămâne marcată explicit.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}