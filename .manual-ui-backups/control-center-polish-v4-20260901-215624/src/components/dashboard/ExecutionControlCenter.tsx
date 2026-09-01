"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

import type { ReportingFxRate } from "@/lib/reporting-currency";
import { ControlCenterVisuals } from "@/components/dashboard/ControlCenterVisuals";
import { CaseReadiness } from "@/components/ui/CaseReadiness";
import { Button } from "@/components/ui/Button";
import { SegmentedFilter } from "@/components/ui/SegmentedFilter";
import { EvidenceList } from "@/components/evidence/EvidenceList";

import type {
  ExecutionCase,
  ExecutionControlCenterModel,
} from "@/lib/execution-control-center";

import {
  formatProductCurrency,
  formatProductDateTime,
  formatProductDate,
  presentOpportunityState,
} from "@/lib/ui/presentation";

import { cn } from "@/lib/utils";

const filters = [
  { id: "all", label: "Toate" },
  { id: "attention", label: "Necesită atenție" },
  { id: "overdue", label: "Restante" },
  { id: "unassigned", label: "Fără responsabil" },
] as const;

type Filter = (typeof filters)[number]["id"];

const sectionTitle =
  "text-xs font-semibold tracking-[-0.01em] text-[rgb(var(--foreground))]";

const muted =
  "text-xs leading-5 text-[rgb(var(--text-muted))]";

function matches(item: ExecutionCase, filter: Filter) {
  return (
    filter === "all" ||
    (filter === "attention" && item.severity !== "informative") ||
    (filter === "overdue" && item.overdue) ||
    (filter === "unassigned" && !item.owner.id)
  );
}

function Metric({
  value,
  label,
  tone = "neutral",
}: {
  value: ReactNode;
  label: string;
  tone?: "neutral" | "attention" | "primary";
}) {
  return (
    <div
      className={cn(
        "control-center-metric flex min-w-0 items-baseline gap-2 rounded-[0.68rem] border px-3 py-2",
        "bg-[rgb(var(--surface-raised))]",
        tone === "attention"
          ? "border-[rgb(var(--warning-text)/0.28)]"
          : tone === "primary"
            ? "border-[rgb(var(--interaction)/0.28)]"
            : "border-[rgb(var(--border-subtle))]",
      )}
    >
      <strong
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          tone === "attention"
            ? "text-[rgb(var(--warning-text))]"
            : "text-[rgb(var(--foreground))]",
        )}
      >
        {value}
      </strong>

      <span className="truncate text-metadata text-[rgb(var(--text-muted))]">
        {label}
      </span>
    </div>
  );
}

function CaseDetail({
  item,
  impactHref,
}: {
  item: ExecutionCase;
  impactHref?: string;
}) {
  return (
    <article
      aria-labelledby="selected-execution-title"
      className="control-center-case-detail min-w-0 px-5 py-5 xl:px-6"
    >
      <header className="border-b border-[rgb(var(--border))] pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--primary))]"
            />

            <p className="text-metadata font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">
              Caz selectat
            </p>
          </div>

          <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-2.5 py-1 text-metadata font-medium text-[rgb(var(--text-secondary))]">
            Control uman
          </span>
        </div>

        <h2
          id="selected-execution-title"
          className="mt-3 break-words text-lg font-semibold leading-6 tracking-[-0.018em]"
        >
          {item.organization}
        </h2>

        <p className="mt-1 break-words text-sm leading-5 text-[rgb(var(--text-secondary))]">
          {item.opportunityTitle}
        </p>

        {impactHref ? (
          <Link
            href={impactHref}
            className="focus-ring mt-2 inline-flex rounded text-xs text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--foreground))] hover:underline"
          >
            Impact urmărit · Vezi impactul →
          </Link>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[rgb(var(--primary)/0.26)] bg-[rgb(var(--primary)/0.07)] px-2.5 py-1 text-xs font-semibold tabular-nums">
            {formatProductCurrency(item.value, item.currency)}
          </span>

          <span className="text-xs text-[rgb(var(--text-muted))]">
            estimat
          </span>

          <span
            aria-hidden="true"
            className="h-1 w-1 rounded-full bg-[rgb(var(--border-strong))]"
          />

          <span className="text-xs text-[rgb(var(--text-secondary))]">
            {presentOpportunityState(item.status).label}
          </span>
        </div>

        <dl className="control-center-case-facts mt-4 grid grid-cols-2 overflow-hidden rounded-[0.72rem] border border-[rgb(var(--border-subtle))] sm:grid-cols-4">
          <div className="min-w-0 border-b border-r border-[rgb(var(--border-subtle))] px-3 py-2.5 sm:border-b-0">
            <dt className="text-micro font-medium uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
              Stare
            </dt>
            <dd
              className={cn(
                "mt-1 truncate text-xs font-semibold",
                item.overdue
                  ? "text-[rgb(var(--warning-text))]"
                  : "text-[rgb(var(--foreground))]",
              )}
            >
              {item.overdue ? "Termen depășit" : "În termen"}
            </dd>
          </div>

          <div className="min-w-0 border-b border-[rgb(var(--border-subtle))] px-3 py-2.5 sm:border-b-0 sm:border-r">
            <dt className="text-micro font-medium uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
              Responsabil
            </dt>
            <dd className="mt-1 truncate text-xs font-semibold">
              {item.owner.name}
            </dd>
          </div>

          <div className="min-w-0 border-r border-[rgb(var(--border-subtle))] px-3 py-2.5">
            <dt className="text-micro font-medium uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
              Scadență
            </dt>
            <dd className="mt-1 truncate text-xs font-semibold tabular-nums">
              {item.deadline ? formatProductDate(item.deadline) : "Neconfirmată"}
            </dd>
          </div>

          <div className="min-w-0 px-3 py-2.5">
            <dt className="text-micro font-medium uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
              Dovezi
            </dt>
            <dd className="mt-1 text-xs font-semibold tabular-nums">
              {item.evidence.length}
            </dd>
          </div>
        </dl>
      </header>

      <section
        className="py-5"
        aria-labelledby="execution-why-now"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h3
            id="execution-why-now"
            className={sectionTitle}
          >
            De ce acum
          </h3>

          {item.overdue ? (
            <span className="text-metadata font-medium text-[rgb(var(--warning-text))]">
              Termen depășit
            </span>
          ) : null}
        </div>

        <ul className="mt-3 space-y-2.5">
          {item.reasons.slice(0, 3).map((reason) => (
            <li
              key={reason}
              className="flex gap-2.5 text-[13px] leading-5"
            >
              <span
                aria-hidden="true"
                className="mt-[0.47rem] h-1 w-1 shrink-0 rounded-full bg-[rgb(var(--text-muted))]"
              />

              <span>{reason}</span>
            </li>
          ))}
        </ul>

        <details className="group mt-4">
          <summary className="focus-ring flex w-fit cursor-pointer list-none items-center gap-1.5 rounded text-metadata text-[rgb(var(--text-muted))] transition-colors hover:text-[rgb(var(--foreground))]">
            <ChevronRightIcon
              aria-hidden="true"
              className="h-3 w-3 transition-transform duration-fast group-open:rotate-90"
            />
            Cum este stabilită prioritatea
          </summary>

          <div className="mt-3 border-l border-[rgb(var(--border))] pl-4">
            <ul className="space-y-1.5">
              {item.rankingReasons.map((reason) => (
                <li
                  key={reason}
                  className={muted}
                >
                  {reason}
                </li>
              ))}

              {item.reasons.slice(4).map((reason) => (
                <li
                  key={reason}
                  className={muted}
                >
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        </details>
      </section>

      <section
        className="control-center-next-action rounded-[0.85rem] border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4"
        aria-labelledby="execution-next-action"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-metadata font-semibold uppercase tracking-[0.11em] text-[rgb(var(--primary))]">
              Următorul pas
            </p>

            <h3
              id="execution-next-action"
              className="mt-1 text-sm font-semibold tracking-[-0.01em]"
            >
              {item.nextAction
                ? item.nextAction.title
                : "Acțiune de confirmat"}
            </h3>
          </div>

          <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2.5 py-1 text-metadata text-[rgb(var(--text-muted))]">
            Decizie umană
          </span>
        </div>

        {item.nextAction ? (
          <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-secondary))]">
            {item.nextAction.owner ?? "Responsabil de confirmat"}
            {" · "}
            {formatProductDateTime(item.nextAction.dueAt)}
          </p>
        ) : (
          <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-secondary))]">
            Nu există încă o acțiune următoare confirmată.
          </p>
        )}

        <p className="mt-3 text-xs leading-5 text-[rgb(var(--text-muted))]">
          {item.intervention.explanation}
        </p>

        <dl className="control-center-next-action-facts mt-4 grid gap-px overflow-hidden rounded-control border border-[rgb(var(--gold-300)/0.52)] bg-[rgb(var(--gold-300)/0.34)] sm:grid-cols-3">
          <div className="min-w-0 bg-[rgb(var(--surface-raised)/0.78)] px-3 py-2.5">
            <dt className="text-metadata text-[rgb(var(--text-muted))]">Responsabil</dt>
            <dd className="mt-1 truncate text-xs font-semibold">{item.nextAction?.owner ?? item.owner.name}</dd>
          </div>
          <div className="min-w-0 bg-[rgb(var(--surface-raised)/0.78)] px-3 py-2.5">
            <dt className="text-metadata text-[rgb(var(--text-muted))]">Scadență propusă</dt>
            <dd className="mt-1 truncate text-xs font-semibold">{item.nextAction ? formatProductDate(item.nextAction.dueAt) : "De confirmat"}</dd>
          </div>
          <div className="min-w-0 bg-[rgb(var(--surface-raised)/0.78)] px-3 py-2.5">
            <dt className="text-metadata text-[rgb(var(--text-muted))]">Impact estimat</dt>
            <dd className="mt-1 truncate text-xs font-semibold tabular-nums">{formatProductCurrency(item.value, item.currency)}</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            href={item.intervention.href}
            size="small"
          >
            {item.intervention.label}

            <ArrowRightIcon
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />
          </Button>

          <Link
            href={`/opportunities/${encodeURIComponent(item.opportunityId)}`}
            className="focus-ring rounded text-xs text-[rgb(var(--text-muted))] transition-colors hover:text-[rgb(var(--foreground))] hover:underline"
          >
            Deschide oportunitatea
          </Link>
        </div>
      </section>

      <dl className="control-center-secondary-facts grid grid-cols-1 gap-3 border-b border-[rgb(var(--border))] py-5 sm:grid-cols-2">
        <div className="min-w-0 rounded-[0.65rem] border border-[rgb(var(--border-subtle))] bg-[rgb(var(--surface-subtle)/0.58)] px-3 py-2.5">
          <dt className={muted}>
            Ultima activitate
          </dt>

          <dd className="mt-1 text-xs font-medium">
            {item.lastActivityAt
              ? formatProductDate(item.lastActivityAt)
              : "Neconfirmată"}
          </dd>
        </div>

        <div className="min-w-0 rounded-[0.65rem] border border-[rgb(var(--border-subtle))] bg-[rgb(var(--surface-subtle)/0.58)] px-3 py-2.5">
          <dt className={muted}>
            Următoarea întâlnire
          </dt>

          <dd className="mt-1 text-xs font-medium">
            {item.nextMeetingAt
              ? formatProductDateTime(item.nextMeetingAt)
              : "Neconfirmată"}
          </dd>
        </div>
      </dl>

      <section
        className="pt-5"
        aria-labelledby="execution-evidence"
      >
        <div className="flex items-baseline gap-2">
          <h3
            id="execution-evidence"
            className={sectionTitle}
          >
            Dovezi
          </h3>

          <span className="text-metadata tabular-nums text-[rgb(var(--text-muted))]">
            {item.evidence.length}
          </span>
        </div>

        <EvidenceList items={item.evidence} />
      </section>

      <section
        className="mt-4 border-t border-[rgb(var(--border))] pt-5"
        aria-labelledby="execution-recent"
      >
        <h3
          id="execution-recent"
          className={sectionTitle}
        >
          Activitate recentă
        </h3>

        <EvidenceList
          items={item.recentActivity}
          limit={3}
          label="Activitate recentă"
        />
      </section>
    </article>
  );
}

export function ExecutionControlCenter({
  model,
  impactLinks = {},
  fx,
  asOf,
}: {
  model: ExecutionControlCenterModel;
  impactLinks?: Record<string, string>;
  fx: ReportingFxRate | null;
  asOf: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = model.cases.filter((item) =>
    matches(item, filter),
  );

  const selected =
    visible.find((item) => item.id === selectedId) ??
    visible[0] ??
    null;

  const filterOptions = filters.map((option) => ({
    ...option,
    count: model.cases.filter((item) =>
      matches(item, option.id),
    ).length,
  }));

  return (
    <section
      aria-labelledby="execution-center-title"
      className="control-center-primary pt-5"
    >
      {/* ─────────────────────────────────────────────
          EXECUTIVE HEADER
      ───────────────────────────────────────────── */}

      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--primary))]"
            />

            <p className="text-micro font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-muted))]">
              Control Center
            </p>
          </div>

          <h1
            id="execution-center-title"
            className="mt-2 text-page-heading font-semibold tracking-[-0.03em]"
          >
            Ce necesită atenție acum
          </h1>

          <p className="mt-1 max-w-3xl text-label leading-5 text-[rgb(var(--text-secondary))]">
            Situații comerciale ordonate pentru o intervenție
            sigură, cu responsabil, motiv și valoare estimată.
          </p>
        </div>

        <Link
          href="/opportunities"
          className="focus-ring shrink-0 rounded text-xs text-[rgb(var(--text-muted))] transition-colors hover:text-[rgb(var(--foreground))] hover:underline"
        >
          Toate oportunitățile →
        </Link>
      </header>

      {/* ─────────────────────────────────────────────
          EXECUTIVE METRICS
      ───────────────────────────────────────────── */}

      <div className="control-center-truth-strip mt-4 flex flex-wrap gap-2 border-y border-[rgb(var(--border-subtle))] py-3">
        <Metric
          value={model.cases.length}
          label={
            model.cases.length === 1
              ? "situație de revizuit"
              : "situații de revizuit"
          }
          tone="primary"
        />

        <Metric
          value={model.overdueCount}
          label="cu termen depășit"
          tone={model.overdueCount ? "attention" : "neutral"}
        />

        {Object.entries(model.exposure).map(
          ([currency, amount]) => (
            <Metric
              key={currency}
              value={formatProductCurrency(
                amount,
                currency,
              )}
              label="expunere estimată"
            />
          ),
        )}
      </div>

      {model.sourceState === "fallback" ? (
        <p
          role="status"
          className="mt-3 rounded-[0.7rem] border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-3 py-2 text-xs leading-5 text-[rgb(var(--text-muted))]"
        >
          Afișăm evaluarea disponibilă din înregistrări.
          Pregătirea intervențiilor nu este disponibilă
          momentan.
        </p>
      ) : null}

      {/* ─────────────────────────────────────────────
          OPERATIONAL ANALYTICS — NOW ABOVE THE QUEUE
      ───────────────────────────────────────────── */}

      <section
        className="control-center-analysis mt-5 border-b border-[rgb(var(--border-subtle))] pb-5"
        aria-labelledby="control-center-exposure-title"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--primary))]"
              />

              <p className="text-metadata font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-muted))]">
                Analiză operațională
              </p>
            </div>

            <h2
              id="control-center-exposure-title"
              className="mt-2 text-base font-semibold tracking-[-0.018em]"
            >
              Unde este concentrată atenția comercială
            </h2>

            <p className="mt-1 max-w-3xl text-xs leading-5 text-[rgb(var(--text-muted))]">
              Expunerea estimată este derivată din cazurile
              deschise și termenele lor comerciale. Valorile
              rămân distincte de venitul confirmat și nu
              reprezintă o prognoză.
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-metadata uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
              Stare analizată
            </p>

            <p className="mt-1 text-xs font-medium text-[rgb(var(--text-secondary))]">
              {formatProductDate(asOf)}
            </p>
          </div>
        </div>

        <ControlCenterVisuals
          cases={model.cases}
          fx={fx}
          asOf={asOf}
        />
      </section>

      {/* ─────────────────────────────────────────────
          EXECUTION QUEUE HEADER + FILTERS
      ───────────────────────────────────────────── */}

      <section
        className="control-center-interventions mt-5"
        aria-labelledby="execution-queue-title"
      >
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-[rgb(var(--border-subtle))] pb-3">
          <div>
            <p className="text-metadata font-semibold uppercase tracking-[0.11em] text-[rgb(var(--text-muted))]">
              Ordine de intervenție
            </p>

            <h2
              id="execution-queue-title"
              className="mt-1 text-sm font-semibold tracking-[-0.012em]"
            >
              Situațiile care cer o decizie
            </h2>

            <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
              Selectează un caz pentru motiv, dovezi și
              următorul pas.
            </p>
          </div>

          <div className="min-w-0">
            <SegmentedFilter
              label="Filtrează situațiile"
              options={filterOptions}
              value={filter}
              onChange={setFilter}
            />
          </div>
        </div>

        {visible.length ? (
          <div className="control-center-workbench product-work-surface mt-3 grid min-w-0 overflow-hidden lg:grid-cols-[minmax(0,1.08fr)_minmax(350px,0.92fr)]">
            {/* QUEUE */}

            <div className="control-center-case-list min-w-0 lg:max-h-[min(760px,72vh)] lg:overflow-y-auto lg:overscroll-contain">
              <div className="flex items-center justify-between border-b border-[rgb(var(--border))] px-3.5 py-3">
                <p className="text-metadata text-[rgb(var(--text-muted))]">
                  {visible.length}{" "}
                  {visible.length === 1
                    ? "situație vizibilă"
                    : "situații vizibile"}
                </p>

                <span className="text-metadata text-[rgb(var(--text-muted))]">
                  Prioritate operațională
                </span>
              </div>

              <ul
                aria-label="Coada de execuție comercială"
                className="divide-y divide-[rgb(var(--border))]"
              >
                {visible.map((item) => {
                  const isSelected =
                    selected?.id === item.id;

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        aria-controls="execution-case-detail"
                        onClick={() =>
                          setSelectedId(item.id)
                        }
                        className={cn(
                          "focus-ring relative flex w-full min-w-0 gap-3 border-l-2 px-4 py-4 text-left transition-colors duration-fast",
                          isSelected
                            ? "control-center-case-selected border-[rgb(var(--interaction))] bg-[rgb(var(--interaction-tint)/0.62)]"
                            : "border-transparent hover:bg-[rgb(var(--surface-subtle))]",
                        )}
                      >
                        <span
                          aria-label={
                            item.severity === "critical"
                              ? "Prioritate critică"
                              : item.severity ===
                                  "attention"
                                ? "Necesită atenție"
                                : "De urmărit"
                          }
                          className={cn(
                            "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                            item.severity === "critical"
                              ? "bg-[rgb(var(--danger-text))]"
                              : item.severity ===
                                  "attention"
                                ? "bg-[rgb(var(--warning-text))]"
                                : "bg-[rgb(var(--text-muted))]",
                          )}
                        />

                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-4">
                            <span
                              title={item.organization}
                              className="truncate text-sm font-semibold tracking-[-0.01em]"
                            >
                              {item.organization}
                            </span>

                            <span className="shrink-0 text-xs font-semibold tabular-nums">
                              {formatProductCurrency(
                                item.value,
                                item.currency,
                              )}
                            </span>
                          </span>

                          <span
                            title={item.opportunityTitle}
                            className="mt-0.5 block truncate text-xs text-[rgb(var(--text-secondary))]"
                          >
                            {item.opportunityTitle}
                          </span>

                          <span className="mt-2.5 block text-xs font-medium leading-5 text-[rgb(var(--foreground))]">
                            {item.primaryReason}
                          </span>

                          <span className="mt-2 flex flex-wrap items-center gap-1.5 text-metadata text-[rgb(var(--text-muted))]">
                            <span
                              className={cn(
                                "control-center-meta-chip",
                                !item.owner.id && "control-center-meta-chip-muted",
                              )}
                            >
                              {item.owner.name}
                            </span>

                            {item.overdue ? (
                              <span className="control-center-meta-chip control-center-meta-chip-warning">
                                {item.overdueDays
                                  ? `Restant · ${item.overdueDays}${
                                      item.overdueDays === 1
                                        ? " zi"
                                        : " zile"
                                    }`
                                  : "Termen depășit"}
                              </span>
                            ) : null}

                            <span className="control-center-evidence-chip">
                              {item.evidence.length}{" "}
                              {item.evidence.length === 1 ? "dovadă" : "dovezi"}
                            </span>

                            <CaseReadiness
                              owner={Boolean(item.owner.id)}
                              action={Boolean(item.nextAction)}
                              dated={Boolean(
                                item.nextAction?.dueAt,
                              )}
                              overdue={item.overdue}
                              evidence={item.evidence.length}
                            />
                          </span>
                        </span>

                        <ChevronRightIcon
                          aria-hidden="true"
                          className={cn(
                            "mt-1 h-3.5 w-3.5 shrink-0 transition-transform duration-fast",
                            isSelected
                              ? "translate-x-0.5 text-[rgb(var(--interaction))]"
                              : "text-[rgb(var(--text-muted))]",
                          )}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* SELECTED CASE */}

            <div
              key={selected?.id}
              id="execution-case-detail"
              className="control-center-case-inspector min-w-0 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface))] lg:max-h-[min(760px,72vh)] lg:overflow-y-auto lg:overscroll-contain lg:border-l lg:border-t-0"
            >
              <p
                role="status"
                className="sr-only"
              >
                {selected
                  ? `Caz selectat: ${selected.organization} — ${selected.opportunityTitle}`
                  : ""}
              </p>

              {selected ? (
                <CaseDetail
                  key={selected.id}
                  item={selected}
                  impactHref={
                    impactLinks[
                      selected.opportunityId
                    ]
                  }
                />
              ) : null}
            </div>
          </div>
        ) : (
          <div className="product-grouping-surface mt-3 px-5 py-10">
            <h2 className="text-sm font-semibold">
              {model.cases.length
                ? "Nicio situație în acest filtru."
                : "Nicio intervenție în coada disponibilă."}
            </h2>

            <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">
              {model.cases.length
                ? "Alege Toate pentru restul situațiilor comerciale."
                : "Poți continua lucrul din oportunități sau verifica semnalele de mai jos."}
            </p>
          </div>
        )}
      </section>

      {model.waitingCount > 0 ? (
        <div className="mt-3 flex items-start gap-2 border-l-2 border-[rgb(var(--border-strong))] pl-3">
          <p className="text-xs leading-5 text-[rgb(var(--text-muted))]">
            {model.waitingCount}{" "}
            {model.waitingCount === 1
              ? "situație așteaptă"
              : "situații așteaptă"}{" "}
            clientul în fereastra de răspuns. Fără revenire
            prematură.
          </p>
        </div>
      ) : null}
    </section>
  );
}
