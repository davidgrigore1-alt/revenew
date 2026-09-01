import Link from "next/link";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { ControlCenterViews } from "@/components/dashboard/ControlCenterViews";
import { CommercialDecisionReview } from "@/components/dashboard/CommercialDecisionReview";
import { RevenueCommandBrief } from "@/components/dashboard/RevenueCommandBrief";
import { getRevenueCommand } from "@/lib/revenue-command-server";
import { getImpactLinks } from "@/lib/revenue-impact-server";
import { getDriveEvidence } from "@/lib/google-workspace/drive";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { HomeAskSurface } from "@/components/dashboard/HomeAskSurface";
import { WorkspaceDecisionQueue } from "@/components/dashboard/WorkspaceDecisionQueue";
import { getCurrentProfile } from "@/lib/auth/profile";
import { buildExecutiveMorningBrief } from "@/lib/executive-morning-brief";
import { getRevenueWorkspaceSummary } from "@/lib/revenue-workspace";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { formatDate } from "@/lib/utils";
import { buildWorkspaceDecisionQueue } from "@/lib/workspace-decision-queue";
import { getGoogleWorkspacePublicState } from "@/lib/google-workspace/repository";
import { getOwnedCommunicationIndex } from "@/lib/ai/google-context-tool";
import { CommercialInterventions } from "@/components/dashboard/CommercialInterventions";
import { getCommercialInterventionBrief } from "@/lib/commercial-interventions-server";
import { getReportingFxRate } from "@/lib/reporting-fx";
import { ExecutionControlCenter } from "@/components/dashboard/ExecutionControlCenter";
import { buildExecutionControlCenter } from "@/lib/execution-control-center";
import { deriveFirstValueJourney } from "@/lib/first-value-journey";
import { GettingStarted } from "@/components/guidance/GettingStarted";
import { IntegrationBrandIcon } from "@/components/ui/IntegrationBrandIcon";

export const dynamic = "force-dynamic";

export default async function DashboardPage(
  props: {
    searchParams?: Promise<{
      view?: string;
      range?: string;
    }>;
  }
) {
  const searchParams = (await props.searchParams) ?? {};
  try {
    if (
      searchParams.view === "executive" ||
      searchParams.view === "review"
    ) {
      const model = await getRevenueCommand(searchParams.range);

      return (
        <div className="mx-auto w-full max-w-[1600px] px-4 pb-12 sm:px-6 lg:px-8">
          <ControlCenterViews
            active={
              searchParams.view === "review"
                ? "review"
                : "executive"
            }
          />

          {searchParams.view === "review" ? (
            <CommercialDecisionReview
              key={`${model.contextKey}:${model.scope}:${model.period.key}`}
              model={model}
            />
          ) : (
            <RevenueCommandBrief model={model} />
          )}
        </div>
      );
    }

    const [
      summary,
      currentProfile,
      googleState,
      communicationsByOpportunityId,
      fx,
    ] = await Promise.all([
      getRevenueWorkspaceSummary(),
      getCurrentProfile(),
      getGoogleWorkspacePublicState(),
      getOwnedCommunicationIndex(),
      getReportingFxRate(),
    ]);

    const scopedOpportunities = summary.viewer.isManager
      ? summary.opportunities
      : summary.opportunities.filter(
          (opportunity) =>
            opportunity.ownerProfileId ===
            summary.viewer.profileId,
        );

    const scopedOpportunityIds = new Set(
      scopedOpportunities.map((opportunity) => opportunity.id),
    );

    const scopedSignals = summary.viewer.isManager
      ? summary.signals
      : summary.signals.filter((signal) =>
          Boolean(
            (signal.detectedFromOpportunityId &&
              scopedOpportunityIds.has(
                signal.detectedFromOpportunityId,
              )) ||
              (signal.convertedOpportunityId &&
                scopedOpportunityIds.has(
                  signal.convertedOpportunityId,
                )),
          ),
        );

    const scopedActions = summary.viewer.isManager
      ? summary.actions
      : summary.actions.filter(
          (action) =>
            action.assignedToProfileId ===
              summary.viewer.profileId ||
            Boolean(
              action.opportunityId &&
                scopedOpportunityIds.has(action.opportunityId),
            ),
        );

    const scopedEvents = summary.viewer.isManager
      ? summary.events
      : summary.events.filter((event) =>
          Boolean(
            event.opportunityId &&
              scopedOpportunityIds.has(event.opportunityId),
          ),
        );

    const decisionQueue = buildWorkspaceDecisionQueue(
      {
        opportunities: scopedOpportunities,
        signals: scopedSignals,
      },
      {
        limit: 20,
        communicationsByOpportunityId,
      },
    );

    const interventionBrief =
      await getCommercialInterventionBrief({
        opportunities: scopedOpportunities,
        signals: scopedSignals,
      });

    const documentEvidenceByOpportunityId =
      await getDriveEvidence(
        scopedOpportunities.map((item) => item.id),
      ).catch(() => ({}));

    const impactLinks = await getImpactLinks(
      scopedOpportunities.map((opportunity) => opportunity.id),
    ).catch(() => ({}));

    const executionCenter = buildExecutionControlCenter({
      opportunities: scopedOpportunities,
      signals: scopedSignals,
      queue: decisionQueue,
      brief: interventionBrief,
      viewer: summary.viewer,
      communicationsByOpportunityId,
      documentEvidenceByOpportunityId,
    });

    const gettingStarted =
      scopedOpportunities.length === 0
        ? deriveFirstValueJourney(scopedSignals)
        : null;

    const visibleDecisionItems = decisionQueue.items.slice(0, 5);

    const morningBrief = buildExecutiveMorningBrief(
      decisionQueue,
      {
        viewerName: currentProfile.profile?.full_name,
        scope: summary.viewer.isManager
          ? "management"
          : "individual",
        actions: scopedActions,
        events: scopedEvents,
        signals: scopedSignals,
        assignedToday: {
          dueToday: summary.workQueue.dueToday.length,
          overdue: summary.workQueue.overdue.length,
        },
      },
    );

    const todayItems = [
      ...summary.workQueue.overdue,
      ...summary.workQueue.dueToday,
    ].slice(0, 3);

    const gmailStatus =
      googleState.connection?.gmailStatus === "connected"
        ? "✓ Activ"
        : googleState.connection?.gmailStatus === "syncing"
          ? "↻ Sincronizare"
          : googleState.connection?.gmailStatus ===
                "action_required" ||
              googleState.connection?.gmailStatus === "error"
            ? "! Necesită atenție"
            : "○ Neconectat";

    const calendarStatus =
      googleState.connection?.calendarStatus === "connected"
        ? "✓ Activ"
        : googleState.connection?.calendarStatus === "syncing"
          ? "↻ Sincronizare"
          : googleState.connection?.calendarStatus ===
                "action_required" ||
              googleState.connection?.calendarStatus === "error"
            ? "! Necesită atenție"
            : "○ Neconectat";

    const driveStatus =
      googleState.connection?.driveStatus === "connected"
        ? "✓ Activ"
        : googleState.connection?.driveStatus ===
            "action_required"
          ? "! Necesită atenție"
          : "○ Neconectat";

    const relevantDocuments = new Set(
      Object.values(documentEvidenceByOpportunityId)
        .flat()
        .map(
          (item) =>
            item.sourceDocumentId ?? item.sourceId,
        ),
    ).size;

    const implementationReady = [
      {
        label: "Gmail",
        provider: "gmail" as const,
        status: gmailStatus,
        active:
          googleState.connection?.gmailStatus === "connected",
        attention:
          googleState.connection?.gmailStatus === "action_required" ||
          googleState.connection?.gmailStatus === "error",
      },
      {
        label: "Google Calendar",
        provider: "google_calendar" as const,
        status: calendarStatus,
        active:
          googleState.connection?.calendarStatus === "connected",
        attention:
          googleState.connection?.calendarStatus === "action_required" ||
          googleState.connection?.calendarStatus === "error",
      },
      {
        label: "Google Drive",
        provider: "google_drive" as const,
        status: driveStatus,
        active:
          googleState.connection?.driveStatus === "connected",
        attention:
          googleState.connection?.driveStatus === "action_required",
      },
    ];

    const lastGoogleSync =
      googleState.connection?.lastSuccessfulSyncAt
        ? new Intl.DateTimeFormat("ro-RO", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Bucharest",
          }).format(
            new Date(
              googleState.connection.lastSuccessfulSyncAt,
            ),
          )
        : null;

    const visibleDecisionQueue = {
      ...decisionQueue,
      items: visibleDecisionItems,
      criticalCount: visibleDecisionItems.filter(
        (item) => item.severity === "critical",
      ).length,
      attentionCount: visibleDecisionItems.filter(
        (item) => item.severity === "attention",
      ).length,
    };

    return (
      <div className="control-center-canvas app-page mx-auto w-full max-w-[var(--workspace-axis)] px-[var(--page-gutter)] pb-24 lg:pb-12">
        {!isSupabaseConfigured ? (
          <div className="pt-4">
            <DemoNotice />
          </div>
        ) : null}

        <ControlCenterViews active="now" />

        {gettingStarted ? (
          <div className="pt-4">
            <GettingStarted journey={gettingStarted} />
          </div>
        ) : null}

        <ExecutionControlCenter
          model={executionCenter}
          impactLinks={impactLinks}
          fx={fx}
          asOf={new Date().toISOString()}
        />

        {interventionBrief ? (
          <details className="control-center-disclosure group mt-5">
            <summary className="control-center-disclosure-summary focus-ring flex cursor-pointer list-none items-center justify-between gap-4 marker:hidden">
              <span className="text-sm font-semibold">Pregătire și aprobare intervenții</span>
              <span aria-hidden="true" className="control-center-disclosure-chevron">⌄</span>
            </summary>

            <div className="control-center-disclosure-content">
              <CommercialInterventions
                brief={interventionBrief}
              />
            </div>
          </details>
        ) : null}

        {interventionBrief ? (
          <details className="control-center-disclosure group mt-4">
            <summary className="control-center-disclosure-summary focus-ring flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 marker:hidden">
              <span>
                <span className="block text-sm font-semibold">
                  Continuă analiza cu ReveNew
                </span>

                <span className="mt-1 block text-xs text-[rgb(var(--text-muted))]">
                  Întreabă ce s-a schimbat, de ce contează
                  sau pregătește următorul pas.
                </span>
              </span>

              <span className="inline-flex items-center gap-2 text-xs font-semibold text-[rgb(var(--primary))]">
                <span className="group-open:hidden">Deschide analiza</span>
                <span className="hidden group-open:inline">Închide analiza</span>
                <span aria-hidden="true" className="control-center-disclosure-chevron">⌄</span>
              </span>
            </summary>

            <div className="control-center-disclosure-content">
              <HomeAskSurface
                greeting={morningBrief.salutation}
              />
            </div>
          </details>
        ) : (
          <HomeAskSurface
            greeting={morningBrief.salutation}
          />
        )}

        <div className="mt-5 grid gap-5">
          <details className="control-center-disclosure group">
            <summary className="control-center-disclosure-summary focus-ring flex cursor-pointer list-none items-center justify-between gap-4 marker:hidden">
              <span className="text-sm font-semibold text-[rgb(var(--text-secondary))]">Alte semnale și decizii comerciale</span>
              <span aria-hidden="true" className="control-center-disclosure-chevron">⌄</span>
            </summary>

            <div className="control-center-disclosure-content">
              <WorkspaceDecisionQueue
                queue={visibleDecisionQueue}
              />
            </div>
          </details>

          <div className="control-center-sources-band">
  <section
    aria-labelledby="implementation-status-title"
    className="py-5"
  >
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
            aria-hidden="true"
          />

          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgb(var(--text-muted))]">
            Surse autorizate
          </p>
        </div>

        <h2
          id="implementation-status-title"
          className="mt-2 text-[15px] font-semibold tracking-[-0.015em] text-[rgb(var(--foreground))]"
        >
          Context conectat
        </h2>

        <p className="mt-1 max-w-xl text-xs leading-5 text-[rgb(var(--text-muted))]">
          ReveNew folosește numai sursele disponibile și autorizate în
          spațiul curent de lucru.
        </p>
      </div>

      {lastGoogleSync ? (
        <div className="rounded-full border border-[rgb(var(--border-subtle))] bg-[rgb(var(--surface-subtle))] px-3 py-1.5 text-[10px] font-medium text-[rgb(var(--text-muted))]">
          Sincronizat · {lastGoogleSync}
        </div>
      ) : null}
    </div>

    <ul className="control-center-source-grid mt-4 grid gap-2.5 sm:grid-cols-3">
      {implementationReady.map((integration) => (
        <li
          key={integration.label}
          className={[
            "control-center-source-card group relative overflow-hidden rounded-xl border p-3.5 transition-colors",
            integration.active
              ? "border-emerald-700/[0.14] bg-emerald-500/[0.025] dark:border-emerald-300/[0.13] dark:bg-emerald-300/[0.035]"
              : integration.attention
                ? "border-amber-500/[0.22] bg-amber-500/[0.035]"
                : "border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))]",
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-3">
            <IntegrationBrandIcon
              provider={integration.provider}
              size="medium"
              className={
                integration.active
                  ? "ring-1 ring-black/[0.025]"
                  : "opacity-70 grayscale-[0.15]"
              }
            />

            <span
              className={[
                "inline-flex min-h-6 shrink-0 items-center gap-1.5 rounded-full border px-2 text-[10px] font-semibold leading-none",
                integration.active
                  ? "border-emerald-700/[0.16] bg-emerald-700/[0.06] text-emerald-800 dark:border-emerald-300/[0.16] dark:bg-emerald-300/[0.07] dark:text-emerald-200"
                  : integration.attention
                    ? "border-amber-500/[0.22] bg-amber-500/[0.07] text-amber-800 dark:text-amber-200"
                    : "border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] text-[rgb(var(--text-muted))]",
              ].join(" ")}
            >
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full",
                  integration.active
                    ? "bg-emerald-500"
                    : integration.attention
                      ? "bg-amber-500"
                      : "bg-[rgb(var(--text-muted))] opacity-45",
                ].join(" ")}
                aria-hidden="true"
              />

              {integration.status}
            </span>
          </div>

          <div className="mt-4">
            <p className="text-[13px] font-semibold tracking-[-0.01em] text-[rgb(var(--foreground))]">
              {integration.label}
            </p>

            <p className="mt-1 text-[10px] leading-4 text-[rgb(var(--text-muted))]">
              {integration.active
                ? "Disponibil în contextul comercial autorizat."
                : integration.attention
                  ? "Conexiunea necesită verificare înainte de utilizare."
                  : "Sursa nu este disponibilă în contextul curent."}
            </p>
          </div>

          {integration.active ? (
            <div
              className="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/35 to-transparent"
              aria-hidden="true"
            />
          ) : null}
        </li>
      ))}
    </ul>

    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--border-subtle))] pt-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-[rgb(var(--text-muted))]">
        {relevantDocuments > 0 ? (
          <span className="inline-flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full bg-blue-500"
              aria-hidden="true"
            />

            {relevantDocuments}{" "}
            {relevantDocuments === 1
              ? "document relevant"
              : "documente relevante"}{" "}
            în context
          </span>
        ) : null}

        <span>
          Starea fiecărei surse este verificată separat.
        </span>
      </div>

      <Link
        href="/apps"
        className="focus-ring group inline-flex items-center gap-1.5 rounded-md text-xs font-semibold text-[rgb(var(--primary))]"
      >
        Gestionează aplicațiile
        <span
          className="transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        >
          →
        </span>
      </Link>
    </div>
  </section>
</div>
        </div>

        <div className="control-center-lower-grid mt-5 grid w-full gap-4 md:grid-cols-2">
          <section className="control-center-lower-panel" aria-labelledby="home-today-title">
            <div className="flex items-center justify-between gap-4">
              <h2
                id="home-today-title"
                className="text-sm font-semibold"
              >
                Astăzi
              </h2>

              <Link
                href="/today"
                className="focus-ring rounded text-xs font-medium text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))]"
              >
                Vezi toate
              </Link>
            </div>

            {todayItems.length > 0 ? (
              <ul className="mt-3 divide-y divide-[rgb(var(--border))] border-t border-[rgb(var(--border))]">
                {todayItems.map((action) => (
                  <li key={action.id}>
                    <Link
                      href={
                        action.opportunityId
                          ? `/opportunities/${action.opportunityId}`
                          : "/today"
                      }
                      className="product-interactive-row focus-ring block px-2 py-3"
                    >
                      <p className="truncate text-sm font-medium">
                        {action.title}
                      </p>

                      <p className="mt-1 truncate text-xs text-[rgb(var(--text-muted))]">
                        {action.company} ·{" "}
                        {formatDate(action.dueAt)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 border-t border-[rgb(var(--border))] py-4 text-sm text-[rgb(var(--text-muted))]">
                Nu ai acțiuni restante sau scadente
                astăzi.
              </p>
            )}
          </section>

          <section className="control-center-lower-panel" aria-labelledby="home-recent-title">
            <div className="flex items-center justify-between gap-4">
              <h2
                id="home-recent-title"
                className="text-sm font-semibold"
              >
                Activitate recentă
              </h2>

              <Link
                href="/opportunities"
                className="focus-ring rounded text-xs font-medium text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))]"
              >
                Oportunități
              </Link>
            </div>

            {morningBrief.recentChanges.length > 0 ? (
              <ul className="mt-3 divide-y divide-[rgb(var(--border))] border-t border-[rgb(var(--border))]">
                {morningBrief.recentChanges
                  .slice(0, 3)
                  .map((change) => (
                    <li
                      key={change.id}
                      className="py-3 text-sm"
                    >
                      {change.href ? (
                        <Link
                          href={change.href}
                          className="focus-ring rounded font-medium hover:underline"
                        >
                          {change.label}
                        </Link>
                      ) : (
                        <span className="font-medium">
                          {change.label}
                        </span>
                      )}

                      <p className="mt-1 line-clamp-1 text-xs text-[rgb(var(--text-muted))]">
                        {change.context}
                      </p>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="mt-3 border-t border-[rgb(var(--border))] py-4 text-sm text-[rgb(var(--text-muted))]">
                Nicio schimbare comercială semnificativă în
                ultimele 24 de ore.
              </p>
            )}
          </section>
        </div>
      </div>
    );
  } catch (error) {
    if (isRedirectError(error)) throw error;

    if (
      searchParams.view === "review" ||
      searchParams.view === "executive"
    ) {
      return (
        <div className="mx-auto w-full max-w-[1600px] px-4 pb-12 sm:px-6 lg:px-8">
          <ControlCenterViews
            active={
              searchParams.view === "review"
                ? "review"
                : "executive"
            }
          />

          <div className="py-6">
            <ErrorState
              title={
                searchParams.view === "review"
                  ? "Revizuirea nu a putut fi încărcată."
                  : "Brieful nu a putut fi încărcat."
              }
              description="Verifică accesul și reîncarcă datele înainte de decizie."
              actionHref={`/dashboard?view=${searchParams.view}`}
            />
          </div>
        </div>
      );
    }

    console.error(
      "Dashboard revenue workspace error",
      error,
    );

    return (
      <div className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-6 lg:px-8">
        <ErrorState />
      </div>
    );
  }
}
