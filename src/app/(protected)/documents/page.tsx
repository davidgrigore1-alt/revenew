import Link from "next/link";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

import { DriveWorkspace } from "@/components/apps/DriveWorkspace";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageShell } from "@/components/dashboard/PageShell";
import { DriveSourceActions } from "@/components/documents/DriveSourceActions";
import {
  DocumentTypeIcon,
  documentMimeLabel,
} from "@/components/documents/DocumentTypeIcon";
import { Button } from "@/components/ui/Button";
import { getCommercialDocuments } from "@/lib/commercial-documents";
import { formatProductDateTime } from "@/lib/ui/presentation";

export const dynamic = "force-dynamic";

const regionClass =
  "rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]";

const innerSurfaceClass =
  "rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))]";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    provider?: string;
    page?: string;
  };
}) {
  const model = await getCommercialDocuments({
    query: searchParams.q,
    provider: searchParams.provider,
    page: searchParams.page,
  });

  const driveCount = model.items.filter(
    (item) => item.provider === "google_drive",
  ).length;

  const revenewCount = model.items.filter(
    (item) => item.provider === "revenew",
  ).length;

  const href = (
    provider = model.provider,
    page = 1,
  ) =>
    `/documents?${new URLSearchParams({
      q: model.query,
      provider,
      page: String(page),
    })}`;

  return (
    <PageShell
      eyebrow="Documente"
      title="Documente comerciale"
      description="Surse autorizate, documente interne și context verificabil"
    >
      <div className="grid gap-6">
        {/* Search + source action */}
        <section className={`${regionClass} p-4 sm:p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <form
              action="/documents"
              className="flex h-9 min-w-0 max-w-xl flex-1 items-center rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))]"
            >
              <input
                type="hidden"
                name="provider"
                value={model.provider}
              />

              <input
                name="q"
                defaultValue={model.query}
                maxLength={100}
                aria-label="Caută documente și context comercial"
                placeholder="Caută documente sau oportunități…"
                className="focus-ring h-9 min-w-0 flex-1 rounded-button bg-transparent px-3 text-xs"
              />

              <button
                type="submit"
                aria-label="Caută documente"
                className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-button text-[rgb(var(--text-muted))] transition-colors hover:text-[rgb(var(--foreground))]"
              >
                <MagnifyingGlassIcon
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              </button>
            </form>

            {model.canSelect ? (
              <DriveWorkspace selectorOnly />
            ) : null}
          </div>
        </section>

        {/* Summary */}
        <section
          aria-label="Rezumat documente afișate"
          className={`${regionClass} grid overflow-hidden sm:grid-cols-3`}
        >
          <div className="px-4 py-3.5 sm:border-r sm:border-[rgb(var(--border))]">
            <p className="micro-label">
              În această pagină
            </p>

            <p className="mt-1 text-lg font-semibold tabular-nums">
              {model.items.length}
            </p>

            <p className="mt-0.5 text-xs leading-5 text-[rgb(var(--text-muted))]">
              Documente comerciale afișate
            </p>
          </div>

          <div className="border-t border-[rgb(var(--border))] px-4 py-3.5 sm:border-r sm:border-t-0">
            <p className="micro-label">
              Google Drive
            </p>

            <p className="mt-1 text-lg font-semibold tabular-nums">
              {driveCount}
            </p>

            <p className="mt-0.5 text-xs leading-5 text-[rgb(var(--text-muted))]">
              Selectate și autorizate explicit
            </p>
          </div>

          <div className="border-t border-[rgb(var(--border))] px-4 py-3.5 sm:border-t-0">
            <p className="micro-label">
              ReveNew
            </p>

            <p className="mt-1 text-lg font-semibold tabular-nums">
              {revenewCount}
            </p>

            <p className="mt-0.5 text-xs leading-5 text-[rgb(var(--text-muted))]">
              Create în fluxul comercial
            </p>
          </div>
        </section>

        {/* Document workspace */}
        <section className={`${regionClass} p-4 sm:p-5`}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="micro-label">
                Bibliotecă comercială
              </p>

              <h2 className="mt-1 text-base font-semibold text-[rgb(var(--foreground))]">
                Documente disponibile
              </h2>

              <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">
                Documentele păstrează sursa, contextul comercial și momentul ultimei verificări.
              </p>
            </div>

            <span className="shrink-0 text-xs tabular-nums text-[rgb(var(--text-muted))]">
              {model.items.length} afișate
            </span>
          </div>

          <nav
            aria-label="Sursa documentelor"
            className="mt-4 flex gap-1 border-b border-[rgb(var(--border))]"
          >
            {[
              ["all", "Toate"],
              ["google_drive", "Google Drive"],
              ["revenew", "ReveNew"],
            ].map(([value, label]) => {
              const active =
                model.provider === value;

              return (
                <Link
                  key={value}
                  href={href(value)}
                  aria-current={
                    active ? "page" : undefined
                  }
                  className={
                    "focus-ring relative px-3 py-2.5 text-xs font-medium transition-colors " +
                    (active
                      ? "text-[rgb(var(--foreground))]"
                      : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))]")
                  }
                >
                  {label}

                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-2 bottom-[-1px] h-[2px] rounded-full bg-[rgb(var(--primary))]"
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          {model.items.length ? (
            <div
              role="table"
              aria-label="Documente comerciale"
              className={`${innerSurfaceClass} mt-4 overflow-hidden`}
            >
              <div
                role="row"
                className="hidden gap-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-2.5 text-[11px] font-medium text-[rgb(var(--text-muted))] lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_7rem_10rem_8rem_2.5rem]"
              >
                {[
                  "Document",
                  "Context",
                  "Sursă",
                  "Actualizat / verificat",
                  "Stare",
                  "",
                ].map((label, index) => (
                  <span
                    role="columnheader"
                    key={index}
                  >
                    {label}
                  </span>
                ))}
              </div>

              <div className="divide-y divide-[rgb(var(--border))]">
                {model.items.map((item) => (
                  <div
                    key={`${item.kind}:${item.id}`}
                    role="row"
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-[rgb(var(--surface-hover))] lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_7rem_10rem_8rem_2.5rem]"
                  >
                    <div
                      role="cell"
                      className="flex min-w-0 items-center gap-3"
                    >
                      <DocumentTypeIcon
                        mime={item.mime}
                      />

                      <div className="min-w-0">
                        <Link
                          href={item.detailHref}
                          className="focus-ring block truncate text-sm font-semibold text-[rgb(var(--foreground))] hover:underline"
                        >
                          {item.title}
                        </Link>

                        <p className="mt-0.5 text-xs text-[rgb(var(--text-muted))]">
                          {item.commercialType} ·{" "}
                          {documentMimeLabel(
                            item.mime,
                          )}
                        </p>
                      </div>
                    </div>

                    <Link
                      role="cell"
                      href={item.linkedContext.href}
                      className="focus-ring col-start-1 truncate text-xs text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--foreground))] hover:underline lg:col-auto"
                    >
                      {item.linkedContext.title}
                    </Link>

                    <span
                      role="cell"
                      className="text-xs text-[rgb(var(--text-muted))]"
                    >
                      {item.provider ===
                      "google_drive"
                        ? "Google Drive"
                        : "ReveNew"}
                    </span>

                    <div
                      role="cell"
                      className="text-xs leading-5 text-[rgb(var(--text-muted))]"
                    >
                      {item.sourceModifiedAt ? (
                        <p>
                          Modificat{" "}
                          {formatProductDateTime(
                            item.sourceModifiedAt,
                          )}
                        </p>
                      ) : null}

                      {item.lastSyncedAt ? (
                        <p>
                          Verificat{" "}
                          {formatProductDateTime(
                            item.lastSyncedAt,
                          )}
                        </p>
                      ) : null}
                    </div>

                    <span
                      role="cell"
                      className="text-xs text-[rgb(var(--text-secondary))]"
                    >
                      {item.status}
                    </span>

                    <div
                      role="cell"
                      className="col-start-2 row-start-1 flex justify-end lg:col-auto lg:row-auto"
                    >
                      {item.provider ===
                      "google_drive" ? (
                        <DriveSourceActions
                          id={item.id}
                          title={item.title}
                          canSync={
                            item.availableActions
                              .sync
                          }
                          canRemove={
                            item.availableActions
                              .remove
                          }
                          detailHref={
                            item.detailHref
                          }
                          sourceHref={
                            item.sourceHref
                          }
                        />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              className={`${innerSurfaceClass} mt-4 overflow-hidden`}
            >
              <EmptyState
                title={
                  model.query
                    ? "Niciun document pentru această căutare"
                    : "Nu există documente comerciale"
                }
                description={
                  model.query
                    ? "Schimbă termenul sau sursa selectată. Căutarea nu modifică documentele ori legăturile lor comerciale."
                    : "Documentele apar după ce sunt create într-o oportunitate sau selectate explicit dintr-o sursă autorizată."
                }
                actions={
                  <>
                    <Button
                      href="/opportunities"
                      size="small"
                    >
                      Deschide oportunitățile
                    </Button>

                    <Button
                      href="/apps"
                      variant="secondary"
                      size="small"
                    >
                      Gestionează sursele
                    </Button>
                  </>
                }
              />
            </div>
          )}

          {model.page > 1 ||
          model.hasMore ? (
            <nav
              aria-label="Paginarea documentelor"
              className="mt-4 flex items-center justify-end gap-3 border-t border-[rgb(var(--border))] pt-4 text-xs"
            >
              {model.page > 1 ? (
                <Link
                  className="focus-ring rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] px-3 py-2 font-medium transition-colors hover:bg-[rgb(var(--surface-hover))]"
                  href={href(
                    model.provider,
                    model.page - 1,
                  )}
                >
                  Înapoi
                </Link>
              ) : null}

              <span className="text-[rgb(var(--text-muted))]">
                Pagina {model.page}
              </span>

              {model.hasMore ? (
                <Link
                  className="focus-ring rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] px-3 py-2 font-medium transition-colors hover:bg-[rgb(var(--surface-hover))]"
                  href={href(
                    model.provider,
                    model.page + 1,
                  )}
                >
                  Următoarea
                </Link>
              ) : null}
            </nav>
          ) : null}
        </section>
      </div>
    </PageShell>
  );
}