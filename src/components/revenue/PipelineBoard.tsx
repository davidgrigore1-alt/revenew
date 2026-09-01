"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import patterns from "@/components/ui/OperationalPatterns.module.css";
import { ReportingCurrencyControl } from "@/components/ui/ReportingCurrencyControl";
import { Select } from "@/components/ui/Select";
import { StatusNotice } from "@/components/ui/StatusNotice";
import {
  isOpenOpportunity,
  lifecycleForOpportunity,
} from "@/lib/opportunity-domain";
import {
  caseCountLabel,
  convertReportingAmount,
  summarizeReportingAmounts,
  type OriginalAmount,
  type ReportingCurrency,
  type ReportingFxRate,
} from "@/lib/reporting-currency";
import { updatePipelineStatus } from "@/lib/revenue-workspace/actions";
import type {
  Opportunity,
  OpportunityStatus,
} from "@/lib/types";
import {
  formatCurrency,
  formatDate,
} from "@/lib/utils";

type PipelineColumn = {
  id: string;
  label: string;
  nextStatus: OpportunityStatus;
  totalValue: number;
  count: number;
  opportunities: Opportunity[];
};

type PipelineFilter =
  | "all"
  | "attention"
  | "overdue"
  | "ownerless"
  | "no_next_action";

type FilterDefinition = {
  id: PipelineFilter;
  label: string;
  count: number;
};

function originalAmount(
  opportunity: Opportunity,
  won = false,
): OriginalAmount {
  return {
    value: won
      ? opportunity.actualOutcomeAmount
      : opportunity.estimatedValueHigh,
    currency: opportunity.currency ?? "RON",
  };
}

function Aggregate({
  rows,
  currency,
  fx,
}: {
  rows: OriginalAmount[];
  currency: ReportingCurrency;
  fx: ReportingFxRate | null;
}) {
  if (rows.length === 0) {
    return (
      <span className="tabular-nums">
        {formatCurrency(0, currency)}
      </span>
    );
  }

  const summary = summarizeReportingAmounts(
    rows,
    currency,
    fx,
  );

  return (
    <span className="tabular-nums">
      {summary.total !== null
        ? formatCurrency(summary.total, currency)
        : summary.originals.length
          ? summary.originals
              .map((item) =>
                formatCurrency(
                  item.value,
                  item.currency,
                ),
              )
              .join(" · ")
          : "Valoare neconfirmată"}

      {summary.excludedCount > 0 ? (
        <span className="mt-1 block text-micro font-normal leading-4 text-[rgb(var(--text-muted))]">
          {summary.excludedCount} valori neconfirmate /
          monede neconvertibile, excluse
        </span>
      ) : null}
    </span>
  );
}

function getNextAction(opportunity: Opportunity) {
  return opportunity.actions
    .filter(
      (action) => action.status === "pending",
    )
    .sort((a, b) =>
      (a.dueDate || "9999").localeCompare(
        b.dueDate || "9999",
      ),
    )[0];
}

function getOperationalState(
  opportunity: Opportunity,
  today: string,
) {
  const open = isOpenOpportunity(opportunity);
  const nextAction = getNextAction(opportunity);

  const date = open
    ? nextAction?.dueDate ??
      opportunity.deadline
    : opportunity.outcomeDate;

  const overdue =
    open &&
    Boolean(date) &&
    String(date).slice(0, 10) < today;

  const missingOwner =
    open && !opportunity.ownerProfileId;

  const missingNextAction =
    open && !nextAction;

  const missingDate =
    open && !date;

  const needsAttention =
    open &&
    (overdue ||
      missingOwner ||
      missingNextAction ||
      missingDate);

  const reasons: string[] = [];

  if (overdue) {
    reasons.push("Termen depășit");
  }

  if (missingOwner) {
    reasons.push("Fără responsabil");
  }

  if (missingNextAction) {
    reasons.push("Fără pas următor");
  }

  if (missingDate) {
    reasons.push("Fără termen");
  }

  return {
    open,
    nextAction,
    date,
    overdue,
    missingOwner,
    missingNextAction,
    missingDate,
    needsAttention,
    reasons,
  };
}

function matchesFilter(
  opportunity: Opportunity,
  filter: PipelineFilter,
  today: string,
) {
  if (filter === "all") {
    return true;
  }

  const state = getOperationalState(
    opportunity,
    today,
  );

  if (!state.open) {
    return false;
  }

  switch (filter) {
    case "attention":
      return state.needsAttention;

    case "overdue":
      return state.overdue;

    case "ownerless":
      return state.missingOwner;

    case "no_next_action":
      return state.missingNextAction;

    default:
      return true;
  }
}

function OpportunityCard({
  opportunity,
  columnId,
  isPending,
  onStatusChange,
  currency,
  fx,
  today,
}: {
  opportunity: Opportunity;
  columnId: string;
  isPending: boolean;
  onStatusChange: (
    id: string,
    status: OpportunityStatus,
  ) => void;
  currency: ReportingCurrency;
  fx: ReportingFxRate | null;
  today: string;
}) {
  const state = getOperationalState(
    opportunity,
    today,
  );

  const company = opportunity.contact?.company;
  const isOpen = state.open;
  const isWon = columnId === "won";

  const original = originalAmount(
    opportunity,
    isWon,
  );

  const equivalent =
    fx && original.currency !== currency
      ? convertReportingAmount(
          original.value,
          original.currency,
          currency,
          fx,
        )
      : null;

  return (
    <article className="group min-w-0 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-3 transition-colors duration-fast hover:bg-[rgb(var(--surface-hover))]">
      <Link
        href={`/opportunities/${opportunity.id}`}
        title={opportunity.title}
        className="focus-ring line-clamp-2 rounded-button text-xs font-semibold leading-5 text-[rgb(var(--foreground))] transition-colors group-hover:text-[rgb(var(--primary))]"
      >
        {opportunity.title}
      </Link>

      {company &&
      company !== opportunity.title ? (
        <p
          className="mt-1 truncate text-metadata text-[rgb(var(--text-muted))]"
          title={company}
        >
          {company}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className="text-card-title font-semibold leading-6 tabular-nums text-[rgb(var(--foreground))]"
            title={
              isWon
                ? "Venit confirmat"
                : "Valoare estimată"
            }
          >
            <span className="sr-only">
              {isWon
                ? "Venit confirmat: "
                : "Valoare estimată: "}
            </span>

            {original.value != null &&
            Number.isFinite(original.value)
              ? formatCurrency(
                  original.value,
                  original.currency,
                )
              : "Neconfirmat"}
          </p>

          {equivalent !== null ? (
            <p
              className="mt-0.5 text-metadata tabular-nums text-[rgb(var(--text-muted))]"
              title="Echivalent analitic la cursul de referință ECB"
            >
              ≈{" "}
              {formatCurrency(
                equivalent,
                currency,
              )}
            </p>
          ) : null}
        </div>

        {isOpen && state.overdue ? (
          <span className="inline-flex min-h-6 shrink-0 items-center rounded-full border border-[rgb(var(--danger-border))] bg-[rgb(var(--danger-background))] px-2 text-[10px] font-semibold text-[rgb(var(--danger-text))]">
            Termen depășit
          </span>
        ) : null}
      </div>

      {!isOpen ? (
        <p
          className={`mt-1 text-metadata font-medium ${
            isWon
              ? "text-[rgb(var(--success-text))]"
              : "text-[rgb(var(--danger-text))]"
          }`}
        >
          {isWon
            ? "Venit confirmat"
            : lifecycleForOpportunity(
                  opportunity,
                ) === "disqualified"
              ? "Descalificat · valoare estimată"
              : "Pierdut · valoare estimată"}
        </p>
      ) : null}

      {isOpen &&
      (state.missingOwner ||
        state.missingNextAction ||
        state.missingDate) ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {state.missingOwner ? (
            <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-2 py-1 text-[10px] font-medium text-[rgb(var(--text-secondary))]">
              Fără responsabil
            </span>
          ) : null}

          {state.missingNextAction ? (
            <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-2 py-1 text-[10px] font-medium text-[rgb(var(--text-secondary))]">
              Fără pas următor
            </span>
          ) : null}

          {state.missingDate ? (
            <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-2 py-1 text-[10px] font-medium text-[rgb(var(--text-secondary))]">
              Fără termen
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex min-w-0 items-start justify-between gap-2 text-metadata leading-4 text-[rgb(var(--text-muted))]">
        <span
          className={
            state.missingOwner
              ? "min-w-0 truncate font-medium text-[rgb(var(--text-secondary))]"
              : "min-w-0 truncate"
          }
          title="Responsabil comercial"
        >
          {opportunity.ownerName ??
            (opportunity.ownerProfileId
              ? "Responsabil atribuit"
              : "Responsabil neatribuit")}
        </span>

        <span
          className={`shrink-0 text-right ${
            state.overdue
              ? "font-semibold text-[rgb(var(--danger-text))]"
              : ""
          }`}
          title={
            isOpen
              ? state.nextAction?.dueDate
                ? "Termenul următorului pas"
                : "Termen comercial"
              : "Data rezultatului"
          }
        >
          {state.date
            ? formatDate(state.date)
            : isOpen
              ? "Fără termen"
              : "Dată neconfirmată"}
        </span>
      </div>

      {isOpen ? (
        <>
          <div className="mt-3 flex items-start gap-2 border-t border-[rgb(var(--border))] pt-3 text-xs leading-5">
            <span
              aria-hidden="true"
              className="shrink-0 text-[rgb(var(--primary))]"
            >
              →
            </span>

            <p
              className="line-clamp-2 text-[rgb(var(--foreground))]"
              title={state.nextAction?.title}
            >
              <span className="sr-only">
                Următorul pas:{" "}
              </span>

              {state.nextAction?.title ??
                "Stabilește următorul pas"}
            </p>
          </div>

          <div className="mt-3">
            <Select
              density="compact"
              className="text-metadata text-[rgb(var(--text-muted))]"
              aria-label={`Schimbă etapa pentru ${opportunity.title}`}
              disabled={isPending}
              value={opportunity.status}
              onChange={(event) =>
                onStatusChange(
                  opportunity.id,
                  event.target
                    .value as OpportunityStatus,
                )
              }
            >
              {![
                "reviewed",
                "contacted",
                "follow_up_needed",
              ].includes(
                opportunity.status,
              ) ? (
                <option
                  value={opportunity.status}
                  disabled
                >
                  Etapă curentă ·{" "}
                  {columnId === "lead"
                    ? "Lead"
                    : "Calificat"}
                </option>
              ) : null}

              <option value="reviewed">
                Lead verificat
              </option>

              <option value="contacted">
                Calificat/contactat
              </option>

              <option value="follow_up_needed">
                Propunere/follow-up
              </option>
            </Select>
          </div>
        </>
      ) : (
        <Link
          href={`/opportunities/${opportunity.id}`}
          className="focus-ring mt-3 block border-t border-[rgb(var(--border))] pt-3 text-metadata font-medium text-[rgb(var(--text-muted))] transition-colors hover:text-[rgb(var(--foreground))]"
        >
          Vezi rezultatul →
        </Link>
      )}
    </article>
  );
}

export function PipelineBoard({
  columns,
  fx,
}: {
  columns: PipelineColumn[];
  fx: ReportingFxRate | null;
}) {
  const router = useRouter();

  const [currency, setCurrency] =
    useState<ReportingCurrency>("RON");

  const [filter, setFilter] =
    useState<PipelineFilter>("all");

  const [isPending, startTransition] =
    useTransition();

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const active = columns
    .filter(
      (column) =>
        !["won", "lost"].includes(column.id),
    )
    .flatMap(
      (column) => column.opportunities,
    );

  const won =
    columns.find(
      (column) => column.id === "won",
    )?.opportunities ?? [];

  const attention = active.filter(
    (opportunity) =>
      getOperationalState(
        opportunity,
        today,
      ).needsAttention,
  );

  const overdue = active.filter(
    (opportunity) =>
      getOperationalState(
        opportunity,
        today,
      ).overdue,
  );

  const ownerless = active.filter(
    (opportunity) =>
      getOperationalState(
        opportunity,
        today,
      ).missingOwner,
  );

  const noNextAction = active.filter(
    (opportunity) =>
      getOperationalState(
        opportunity,
        today,
      ).missingNextAction,
  );

  const totalPipelineCases = columns.reduce(
    (total, column) =>
      total + column.opportunities.length,
    0,
  );

  const originals =
    summarizeReportingAmounts(
      active.map((item) =>
        originalAmount(item),
      ),
      currency,
      fx,
    ).originals;

  const focusItems = [...attention]
    .sort((left, right) => {
      const leftState =
        getOperationalState(
          left,
          today,
        );

      const rightState =
        getOperationalState(
          right,
          today,
        );

      if (
        leftState.overdue !==
        rightState.overdue
      ) {
        return leftState.overdue
          ? -1
          : 1;
      }

      if (
        leftState.missingOwner !==
        rightState.missingOwner
      ) {
        return leftState.missingOwner
          ? -1
          : 1;
      }

      if (
        leftState.missingNextAction !==
        rightState.missingNextAction
      ) {
        return leftState.missingNextAction
          ? -1
          : 1;
      }

      return String(
        leftState.date ?? "9999",
      ).localeCompare(
        String(
          rightState.date ?? "9999",
        ),
      );
    })
    .slice(0, 3);

  const visibleColumns = columns.map(
    (column) => {
      const opportunities =
        column.opportunities.filter(
          (opportunity) =>
            matchesFilter(
              opportunity,
              filter,
              today,
            ),
        );

      return {
        ...column,
        opportunities,
        count: opportunities.length,
        totalCount:
          column.opportunities.length,
      };
    },
  );

  const visibleCount =
    visibleColumns.reduce(
      (total, column) =>
        total +
        column.opportunities.length,
      0,
    );

  const filters: FilterDefinition[] = [
    {
      id: "all",
      label: "Toate",
      count: totalPipelineCases,
    },
    {
      id: "attention",
      label: "Necesită intervenție",
      count: attention.length,
    },
    {
      id: "overdue",
      label: "Termen depășit",
      count: overdue.length,
    },
    {
      id: "ownerless",
      label: "Fără responsabil",
      count: ownerless.length,
    },
    {
      id: "no_next_action",
      label: "Fără pas următor",
      count: noNextAction.length,
    },
  ];

  const activeFilter =
    filters.find(
      (item) => item.id === filter,
    ) ?? filters[0];

  function scrollToFilterRegion() {
    const behavior: ScrollBehavior =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches
        ? "auto"
        : "smooth";

    requestAnimationFrame(() => {
      document
        .getElementById(
          "pipeline-filter-region",
        )
        ?.scrollIntoView({
          behavior,
          block: "start",
        });
    });
  }

  function showPriorityCases() {
    setFilter("attention");
    scrollToFilterRegion();
  }

  function changeStatus(
    opportunityId: string,
    status: OpportunityStatus,
    lossReason = "",
  ) {
    const formData = new FormData();

    formData.set("status", status);

    if (lossReason) {
      formData.set(
        "lossReason",
        lossReason,
      );
    }

    startTransition(async () => {
      const result =
        await updatePipelineStatus(
          opportunityId,
          formData,
        );

      if (result.ok) {
        setNotice(
          result.unchanged
            ? "Statusul era deja actualizat."
            : "Statusul pipeline a fost actualizat.",
        );

        setError("");
        router.refresh();
      } else {
        setError(
          result.error ??
            "Statusul nu a putut fi actualizat.",
        );

        setNotice("");
      }
    });
  }

  return (
    <section
      aria-labelledby="pipeline-work-title"
      className="min-w-0 overflow-hidden border-y border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))]"
    >
      {/* Commercial control */}
      <header className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-3">
          <div>
            <p className="micro-label">
              Control comercial
            </p>

            <h2
              id="pipeline-work-title"
              className="mt-1 text-base font-semibold text-[rgb(var(--foreground))]"
            >
              Pipeline comercial · vedere pe etape
            </h2>

            <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">
              {active.length} oportunități active ·{" "}
              {
                active.filter(
                  (item) =>
                    item.ownerProfileId,
                ).length
              }{" "}
              cu responsabil ·{" "}
              {
                active.filter((item) =>
                  item.actions.some(
                    (action) =>
                      action.status ===
                        "pending" &&
                      action.dueDate,
                  ),
                ).length
              }{" "}
              cu pas și termen
            </p>
          </div>

          <p className="text-micro font-semibold tracking-[0.08em] text-[rgb(var(--text-muted))]">BANI → EXECUȚIE → ACȚIUNE</p>
        </div>

        {/* Executive pulse */}
        <div className="grid border-t border-[rgb(var(--border))] sm:grid-cols-2 xl:grid-cols-5">
          <div className="px-5 py-4 xl:border-r xl:border-[rgb(var(--border))]">
            <p className="text-metadata text-[rgb(var(--text-muted))]">
              Valoare estimată activă
            </p>

            <p className="mt-1 text-lg font-semibold text-[rgb(var(--foreground))]">
              <Aggregate
                rows={active.map((item) =>
                  originalAmount(item),
                )}
                currency={currency}
                fx={fx}
              />
            </p>

            <p className="mt-1 text-micro text-[rgb(var(--text-muted))]">
              {active.length} cazuri active
            </p>
          </div>

          <div className="border-t border-[rgb(var(--border))] px-5 py-4 sm:border-l sm:border-t-0 xl:border-l-0 xl:border-r">
            <p className="text-metadata text-[rgb(var(--text-muted))]">
              Valoare în cazuri de intervenție
            </p>

            <p className="mt-1 text-lg font-semibold text-[rgb(var(--foreground))]">
              <Aggregate
                rows={attention.map((item) =>
                  originalAmount(item),
                )}
                currency={currency}
                fx={fx}
              />
            </p>

            <p className="mt-1 text-micro text-[rgb(var(--text-muted))]">
              {attention.length}{" "}
              {attention.length === 1
                ? "oportunitate"
                : "oportunități"} · valoare estimată
            </p>
          </div>

          <div className="border-t border-[rgb(var(--border))] px-5 py-4 xl:border-t-0 xl:border-r">
            <p className="text-metadata text-[rgb(var(--text-muted))]">
              Termene depășite
            </p>

            <p
              className={`mt-1 text-lg font-semibold tabular-nums ${
                overdue.length
                  ? "text-[rgb(var(--danger-text))]"
                  : "text-[rgb(var(--foreground))]"
              }`}
            >
              {overdue.length}
            </p>

            <p className="mt-1 text-micro text-[rgb(var(--text-muted))]">
              oportunități active
            </p>
          </div>

          <div className="border-t border-[rgb(var(--border))] px-5 py-4 sm:border-l xl:border-l-0 xl:border-t-0 xl:border-r">
            <p className="text-metadata text-[rgb(var(--text-muted))]">
              Fără responsabil
            </p>

            <p className="mt-1 text-lg font-semibold tabular-nums text-[rgb(var(--foreground))]">
              {ownerless.length}
            </p>

            <p className="mt-1 text-micro text-[rgb(var(--text-muted))]">
              necesită atribuire
            </p>
          </div>

          <div className="border-t border-[rgb(var(--border))] px-5 py-4 xl:border-t-0">
            <p className="text-metadata text-[rgb(var(--text-muted))]">
              Venit confirmat
            </p>

            <p className="mt-1 text-lg font-semibold text-[rgb(var(--success-text))]">
              <Aggregate
                rows={won.map((item) =>
                  originalAmount(
                    item,
                    true,
                  ),
                )}
                currency={currency}
                fx={fx}
              />
            </p>

            <p className="mt-1 text-micro text-[rgb(var(--text-muted))]">
              rezultate câștigate
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-2 border-t border-[rgb(var(--border))] px-5 py-2.5 text-micro leading-4 text-[rgb(var(--text-muted))]">
          <p>
            Conversia este analitică. Valorile
            originale rămân neschimbate.
          </p>

          {originals.length ? (
            <p>
              Monede originale ·{" "}
              {originals
                .map(
                  (item) =>
                    `${item.currency}: ${caseCountLabel(
                      item.count,
                    )}`,
                )
                .join(" / ")}
            </p>
          ) : null}
        </div>
      </header>

      {notice ? (
        <div className="px-4 pt-4">
          <StatusNotice tone="success">
            {notice}
          </StatusNotice>
        </div>
      ) : null}

      {error ? (
        <div className="px-4 pt-4">
          <StatusNotice tone="warning">
            {error}
          </StatusNotice>
        </div>
      ) : null}

      {/* ReveNew Focus */}
      <div className="px-4 pt-4">
        <section className="overflow-hidden border-y border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
          <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="micro-label">
                  ReveNew Focus
                </p>

                {attention.length ? (
                  <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-2 py-0.5 text-[10px] font-medium tabular-nums text-[rgb(var(--text-muted))]">
                    Top {Math.min(3, attention.length)} din{" "}
                    {attention.length}
                  </span>
                ) : null}
              </div>

              <h3 className="mt-1 text-sm font-semibold text-[rgb(var(--foreground))]">
                {attention.length
                  ? `${attention.length} ${
                      attention.length === 1
                        ? "oportunitate necesită"
                        : "oportunități necesită"
                    } intervenție`
                  : "Execuția de bază este acoperită"}
              </h3>

              <p className="mt-1 max-w-2xl text-xs leading-5 text-[rgb(var(--text-muted))]">
                ReveNew semnalează numai lipsuri
                verificabile de execuție: responsabil,
                pas următor, termen sau termen deja
                depășit.
              </p>
            </div>

            {attention.length ? (
              <button
                type="button"
                aria-controls="pipeline-board-region"
                onClick={showPriorityCases}
                className="focus-ring rounded-button bg-[rgb(var(--primary))] px-3 py-2 text-xs font-semibold text-[rgb(var(--primary-foreground))] transition-colors duration-fast hover:bg-[rgb(var(--primary-hover))]"
              >
                {filter === "attention"
                  ? "Vezi board-ul filtrat ↓"
                  : `Vezi toate cele ${attention.length} cazuri în board ↓`}
              </button>
            ) : null}
          </div>

          {focusItems.length ? (
            <div className="divide-y divide-[rgb(var(--border))] border-t border-[rgb(var(--border))]">
              {focusItems.map(
                (opportunity) => {
                  const state =
                    getOperationalState(
                      opportunity,
                      today,
                    );

                  const company =
                    opportunity.contact
                      ?.company;

                  const amount =
                    originalAmount(
                      opportunity,
                    );

                  return (
                    <Link
                      key={opportunity.id}
                      href={`/opportunities/${opportunity.id}`}
                      className="focus-ring grid gap-3 px-4 py-3.5 transition-colors duration-fast hover:bg-[rgb(var(--surface-hover))] md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-[rgb(var(--foreground))]">
                            {opportunity.title}
                          </p>

                          {state.overdue ? (
                            <span className="rounded-full border border-[rgb(var(--danger-border))] bg-[rgb(var(--danger-background))] px-2 py-1 text-[10px] font-semibold text-[rgb(var(--danger-text))]">
                              Termen depășit
                            </span>
                          ) : null}
                        </div>

                        {company ? (
                          <p className="mt-1 truncate text-xs text-[rgb(var(--text-muted))]">
                            {company}
                          </p>
                        ) : null}

                        <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-secondary))]">
                          {state.reasons.join(
                            " · ",
                          )}
                        </p>
                      </div>

                      <div className="shrink-0 text-left md:text-right">
                        <p className="text-sm font-semibold tabular-nums text-[rgb(var(--foreground))]">
                          {amount.value !=
                            null &&
                          Number.isFinite(
                            amount.value,
                          )
                            ? formatCurrency(
                                amount.value,
                                amount.currency,
                              )
                            : "Valoare neconfirmată"}
                        </p>

                        <p className="mt-1 text-micro font-medium text-[rgb(var(--primary))]">
                          Revizuiește oportunitatea →
                        </p>
                      </div>
                    </Link>
                  );
                },
              )}
            </div>
          ) : (
            <div className="border-t border-[rgb(var(--border))] px-4 py-4">
              <p className="text-xs font-medium text-[rgb(var(--foreground))]">
                Nu sunt detectate blocaje operaționale de
                bază.
              </p>

              <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">
                Oportunitățile active au responsabil, pas
                următor și termen acoperite.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Board controls */}
      <div
        id="pipeline-filter-region"
        className="scroll-mt-24 px-4 pt-4"
      >
        <section className="product-grouping-surface px-4 py-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="micro-label">
                Vizualizare board
              </p>

              <p
                className="mt-1 text-xs text-[rgb(var(--text-muted))]"
                aria-live="polite"
              >
                Filtru activ:{" "}
                <strong className="font-semibold text-[rgb(var(--foreground))]">
                  {activeFilter.label}
                </strong>
                {" · "}
                <strong className="font-semibold tabular-nums text-[rgb(var(--foreground))]">
                  {visibleCount}
                </strong>{" "}
                {visibleCount === 1
                  ? "caz afișat"
                  : "cazuri afișate"}
              </p>
            </div>

            {filter !== "all" ? (
              <button
                type="button"
                onClick={() =>
                  setFilter("all")
                }
                className="focus-ring rounded-button px-2 py-1 text-xs font-semibold text-[rgb(var(--primary))] transition-colors hover:bg-[rgb(var(--interaction-tint))]"
              >
                Resetează la toate
              </button>
            ) : (
              <p className="text-micro text-[rgb(var(--text-muted))]">
                Selectează o problemă pentru a izola
                cazurile relevante
              </p>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {filters.map((item) => {
              const selected =
                filter === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  aria-controls="pipeline-board-region"
                  onClick={() =>
                    setFilter(item.id)
                  }
                  className={
                    "focus-ring inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors duration-fast " +
                    (selected
                      ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                      : "border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] text-[rgb(var(--text-muted))] hover:border-[rgb(var(--border-strong))] hover:text-[rgb(var(--foreground))]")
                  }
                >
                  <span>
                    {item.label}
                  </span>

                  <span
                    className={
                      selected
                        ? "tabular-nums opacity-80"
                        : "tabular-nums opacity-65"
                    }
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
            <div className="ml-auto"><ReportingCurrencyControl currency={currency} onChange={setCurrency} fx={fx} /></div>
          </div>
        </section>
      </div>

      {/* Pipeline board */}
      <div
        id="pipeline-board-region"
        className="focus-ring overflow-x-auto p-4"
        role="region"
        aria-label={`Pipeline pe etape · filtru ${activeFilter.label}`}
        tabIndex={0}
      >
        <div className={patterns.board}>
          {visibleColumns.map(
            (column, stageIndex) => {
              const stageStates =
                column.opportunities.map(
                  (opportunity) =>
                    getOperationalState(
                      opportunity,
                      today,
                    ),
                );

              const stageAttention =
                stageStates.filter(
                  (state) =>
                    state.needsAttention,
                ).length;

              const stageOverdue =
                stageStates.filter(
                  (state) =>
                    state.overdue,
                ).length;

              const stageOwnerless =
                stageStates.filter(
                  (state) =>
                    state.missingOwner,
                ).length;

              const filtered =
                filter !== "all";

              return (
                <section
                  key={column.id}
                  className={patterns.column}
                >
                  <header className="min-h-[94px] border-b border-[rgb(var(--border))] px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="min-w-0 text-sm font-semibold text-[rgb(var(--foreground))]">
                        <span className="mr-2 text-micro font-normal text-[rgb(var(--text-muted))]">
                          {String(
                            stageIndex + 1,
                          ).padStart(
                            2,
                            "0",
                          )}
                        </span>

                        {column.label}
                      </h3>

                      <span
                        aria-label={
                          filtered
                            ? `${column.count} din ${column.totalCount} oportunități afișate`
                            : `${column.count} oportunități`
                        }
                        className="shrink-0 rounded-full bg-[rgb(var(--surface-muted))] px-1.5 py-0.5 text-micro tabular-nums text-[rgb(var(--text-secondary))]"
                      >
                        {filtered
                          ? `${column.count}/${column.totalCount}`
                          : column.count}
                      </span>
                    </div>

                    <p
                      className="mt-2 text-xs font-medium text-[rgb(var(--text-secondary))]"
                      title={
                        column.id === "won"
                          ? "Venit confirmat"
                          : "Valoare estimată"
                      }
                    >
                      <Aggregate
                        rows={column.opportunities.map(
                          (item) =>
                            originalAmount(
                              item,
                              column.id ===
                                "won",
                            ),
                        )}
                        currency={
                          currency
                        }
                        fx={fx}
                      />
                    </p>

                    {!["won", "lost"].includes(
                      column.id,
                    ) ? (
                      filtered ? (
                        <p className="mt-2 text-micro leading-4 text-[rgb(var(--text-muted))]">
                          {column.count
                            ? `${column.count} ${
                                column.count === 1
                                  ? "caz corespunde"
                                  : "cazuri corespund"
                              } filtrului`
                            : `Niciun caz pentru „${activeFilter.label}”`}
                        </p>
                      ) : (
                        <p className="mt-2 text-micro leading-4 text-[rgb(var(--text-muted))]">
                          {stageAttention
                            ? `${stageAttention} ${
                                stageAttention === 1
                                  ? "necesită intervenție"
                                  : "necesită intervenție"
                              }`
                            : "Owner, pas și termen acoperite"}

                          {stageOverdue
                            ? ` · ${stageOverdue} ${
                                stageOverdue === 1
                                  ? "termen depășit"
                                  : "termene depășite"
                              }`
                            : ""}

                          {stageOwnerless
                            ? ` · ${stageOwnerless} fără responsabil`
                            : ""}
                        </p>
                      )
                    ) : (
                      <p className="mt-2 text-micro leading-4 text-[rgb(var(--text-muted))]">
                        {column.id === "won"
                          ? "Rezultate confirmate"
                          : "Rezultate închise fără venit confirmat"}
                      </p>
                    )}
                  </header>

                  <div
                    className={
                      patterns.columnBody
                    }
                  >
                    {column.opportunities
                      .length ? (
                      column.opportunities.map(
                        (opportunity) => (
                          <OpportunityCard
                            key={
                              opportunity.id
                            }
                            opportunity={
                              opportunity
                            }
                            columnId={
                              column.id
                            }
                            isPending={
                              isPending
                            }
                            onStatusChange={
                              changeStatus
                            }
                            currency={
                              currency
                            }
                            fx={fx}
                            today={today}
                          />
                        ),
                      )
                    ) : (
                      <div className="px-3 py-10 text-center">
                        <p className="text-xs font-medium text-[rgb(var(--text-faint))]">
                          {filter === "all"
                            ? "Nicio înregistrare în această etapă."
                            : "Niciun caz pentru filtrul curent."}
                        </p>

                        {filter !== "all" &&
                        column.totalCount > 0 ? (
                          <p className="mt-1 text-micro text-[rgb(var(--text-faint))]">
                            Etapa conține {column.totalCount}{" "}
                            {column.totalCount === 1
                              ? "caz în total"
                              : "cazuri în total"}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </section>
              );
            },
          )}
        </div>
      </div>

      <footer className="flex flex-wrap justify-between gap-2 border-t border-[rgb(var(--border))] px-5 py-3 text-micro leading-4 text-[rgb(var(--text-muted))]">
        <p>
          Estimările, venitul confirmat și rezultatele
          rămân categorii distincte.
        </p>

        <p>
          Schimbări explicite și auditabile ·
          derulează orizontal pentru toate etapele.
        </p>
      </footer>
    </section>
  );
}
