"use client";

import { useEffect, useId, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ReportingCurrencyControl } from "@/components/ui/ReportingCurrencyControl";
import {
  buildReportingControlCenter,
  type ReportingCase,
} from "@/lib/control-center-reporting";
import {
  caseCountLabel,
  type ReportingCurrency,
  type ReportingFxRate,
} from "@/lib/reporting-currency";
import { formatProductCurrency } from "@/lib/ui/presentation";

const DAY_MS = 24 * 60 * 60 * 1000;

const dateLabel = (value: string, full = false) =>
  new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "short",
    ...(full ? ({ year: "numeric" } as const) : {}),
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));

const compact = (value: number) =>
  new Intl.NumberFormat("ro-RO", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const sum = (values: number[]) =>
  values.reduce((total, value) => total + value, 0);

const compositionLabel = (
  items: { currency: string; count: number }[],
) =>
  items
    .map((item) => `${item.currency}: ${caseCountLabel(item.count)}`)
    .join(" · ");

const bucketColors = [
  "rgb(var(--danger-text) / .78)",
  "rgb(var(--primary) / .92)",
  "rgb(var(--text-muted) / .76)",
  "rgb(var(--text-faint) / .72)",
];

const card =
  "flex min-w-0 flex-col rounded-panel border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] p-5 shadow-card";

const tooltipPanel =
  "min-w-[220px] max-w-[280px] rounded-control border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-floating))] p-3.5 text-metadata shadow-elevated";

type AxisTickProps = {
  x?: string | number;
  y?: string | number;
  payload?: {
    value?: string | number;
  };
};

export function ControlCenterVisuals({
  cases,
  fx,
  asOf,
}: {
  cases: ReportingCase[];
  fx: ReportingFxRate | null;
  asOf: string;
}) {
  const [currency, setCurrency] = useState<ReportingCurrency>("RON");
  const [reduceMotion, setReduceMotion] = useState(false);
  const rawId = useId();
  const chartId = rawId.replace(/:/g, "");
  const gradientId = `revenew-exposure-${chartId}`;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(query.matches);
    sync();
    query.addEventListener?.("change", sync);
    return () => query.removeEventListener?.("change", sync);
  }, []);

  const model = buildReportingControlCenter(cases, currency, fx, asOf);
  const { points } = model;

  const amount = (value: number) =>
    formatProductCurrency(value, currency);

  const monetary = model.total !== null;
  const unavailableAmount = fx
    ? "sumă neconfirmată"
    : "conversie indisponibilă";

  const excluded = model.excludedCount
    ? `${model.excludedCount} valori neconfirmate / monede neconvertibile, excluse din sume.`
    : "";

  const chartData = points
    .map((point) => ({
      ...point,
      timestamp: Date.parse(`${point.date}T12:00:00Z`),
      addedValue: sum(point.cases.map((row) => row.converted)),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  const chartStart = chartData[0]?.timestamp ?? 0;
  const chartEnd = chartData[chartData.length - 1]?.timestamp ?? 0;
  const todayTimestamp =
    model.todayInRange && model.today
      ? Date.parse(`${model.today}T12:00:00Z`)
      : null;

  const xDomain =
    chartData.length === 1
      ? [
          chartData[0].timestamp - DAY_MS,
          chartData[0].timestamp + DAY_MS,
        ]
      : (["dataMin", "dataMax"] as const);

  const barData = model.buckets.map((entry, index) => ({
    label: entry.label,
    value: monetary ? sum(entry.values) : sum(entry.counts),
    count: sum(entry.counts),
    originals: entry.summary.originals,
    excludedCount: entry.summary.excludedCount,
    color: bucketColors[index],
  }));

  const hasBarData = barData.some((entry) => entry.value > 0);

  const renderBucketTick = ({
    x = 0,
    y = 0,
    payload,
  }: AxisTickProps) => {
    const row = barData.find(
      (entry) => entry.label === String(payload?.value ?? ""),
    );

    if (!row) return null;

    const numericX = Number(x) || 0;
    const numericY = Number(y) || 0;

    return (
      <g transform={`translate(${numericX},${numericY})`}>
        <text
          x={0}
          y={13}
          textAnchor="middle"
          fontSize={11}
          fill="rgb(var(--text-secondary))"
        >
          {row.label}
        </text>
        <text
          x={0}
          y={31}
          textAnchor="middle"
          fontSize={10}
          fill="rgb(var(--text-muted))"
        >
          {caseCountLabel(row.count)}
        </text>
      </g>
    );
  };

  return (
    <section
      aria-label="Privire comercială de ansamblu"
      className="my-5"
    >
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
        <ReportingCurrencyControl
          currency={currency}
          onChange={setCurrency}
          fx={fx}
        />
        <p className="text-micro text-[rgb(var(--text-muted))]">
          Monede originale ·{" "}
          {compositionLabel(model.originals) ||
            "Nicio valoare confirmată"}
        </p>
      </div>

      <div className="grid items-stretch gap-3.5 lg:grid-cols-[minmax(0,1.85fr)_minmax(320px,1fr)]">
        <figure className={card}>
          <figcaption className="flex min-h-[88px] flex-wrap content-start items-start justify-between gap-x-5 gap-y-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold">
                  Expunere cumulată după termen
                </h2>
                <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface-raised))] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
                  {currency}
                </span>
              </div>
              <p className="mt-1 text-metadata leading-5 text-[rgb(var(--text-muted))]">
                Valoarea cazurilor deschise, ordonată după termenul comercial
              </p>
            </div>

            {monetary ? (
              <p className="text-right">
                <strong className="block text-[1.4rem] font-semibold tracking-[-0.02em] tabular-nums">
                  {amount(model.datedValue)}
                </strong>
                <span className="text-micro text-[rgb(var(--text-muted))]">
                  estimat · cu termen confirmat
                </span>
              </p>
            ) : null}
          </figcaption>

          <div
            className="relative h-[268px] w-full"
            role="img"
            aria-label={`Expunere estimată în ${currency}, cumulată după termenele comerciale actuale. Curba conectează vizual termene discrete și nu reprezintă istoric de venit.`}
          >
            {monetary && chartData.length ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{
                      top: 18,
                      right: 16,
                      bottom: 10,
                      left: 0,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id={gradientId}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="rgb(var(--primary))"
                          stopOpacity={0.15}
                        />
                        <stop
                          offset="55%"
                          stopColor="rgb(var(--primary))"
                          stopOpacity={0.055}
                        />
                        <stop
                          offset="100%"
                          stopColor="rgb(var(--primary))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      vertical={false}
                      stroke="rgb(var(--border))"
                      strokeOpacity={0.72}
                    />

                    <XAxis
                      type="number"
                      dataKey="timestamp"
                      scale="time"
                      domain={xDomain}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={34}
                      tickMargin={12}
                      tick={{
                        fill: "rgb(var(--text-muted))",
                        fontSize: 11,
                      }}
                      tickFormatter={(value) =>
                        dateLabel(
                          new Date(Number(value))
                            .toISOString()
                            .slice(0, 10),
                        )
                      }
                    />

                    <YAxis
                      width={48}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={8}
                      domain={[
                        0,
                        (dataMax: number) =>
                          Math.max(1, dataMax * 1.08),
                      ]}
                      tick={{
                        fill: "rgb(var(--text-muted))",
                        fontSize: 11,
                      }}
                      tickFormatter={(value) =>
                        compact(Number(value))
                      }
                    />

                    {todayTimestamp !== null &&
                    chartStart &&
                    chartEnd ? (
                      <ReferenceArea
                        x1={chartStart}
                        x2={todayTimestamp}
                        fill="rgb(var(--danger-text))"
                        fillOpacity={0.022}
                        strokeOpacity={0}
                      />
                    ) : null}

                    {todayTimestamp !== null ? (
                      <ReferenceLine
                        x={todayTimestamp}
                        stroke="rgb(var(--text-muted) / .72)"
                        strokeWidth={1}
                        strokeDasharray="3 5"
                        label={{
                          value: "ASTĂZI",
                          position: "insideTop",
                          fill: "rgb(var(--text-secondary))",
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      />
                    ) : null}

                    <Tooltip
                      isAnimationActive={!reduceMotion}
                      animationDuration={160}
                      cursor={{
                        stroke: "rgb(var(--text-muted) / .45)",
                        strokeWidth: 1,
                        strokeDasharray: "3 5",
                      }}
                      content={({ active, payload }) => {
                        const row = payload?.[0]?.payload as
                          | (typeof chartData)[number]
                          | undefined;

                        if (!active || !row) return null;

                        return (
                          <div className={tooltipPanel}>
                            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
                              {dateLabel(row.date, true)}
                            </p>

                            <p className="mt-2 text-micro text-[rgb(var(--text-muted))]">
                              Expunere cumulată · {currency}
                            </p>
                            <p className="mt-0.5 text-lg font-semibold tracking-[-0.02em] tabular-nums">
                              {amount(row.cumulative)}
                            </p>

                            <div className="mt-3 border-t border-[rgb(var(--border))] pt-2.5">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[rgb(var(--text-muted))]">
                                  Până la acest termen
                                </span>
                                <span className="font-medium">
                                  {caseCountLabel(
                                    row.cumulativeCount,
                                  )}
                                </span>
                              </div>

                              <div className="mt-1.5 flex items-center justify-between gap-4">
                                <span className="text-[rgb(var(--text-muted))]">
                                  La acest termen
                                </span>
                                <span className="font-medium tabular-nums">
                                  +{amount(row.addedValue)}
                                </span>
                              </div>
                            </div>

                            <p className="mt-2.5 text-micro leading-4 text-[rgb(var(--text-muted))]">
                              Monede originale ·{" "}
                              {compositionLabel(
                                row.cumulativeOriginals,
                              )}
                            </p>
                          </div>
                        );
                      }}
                    />

                    <Area
                      type="monotoneX"
                      dataKey="cumulative"
                      stroke="none"
                      fill={`url(#${gradientId})`}
                      isAnimationActive={!reduceMotion}
                      animationDuration={700}
                      animationEasing="ease-out"
                    />

                    <Line
                      type="monotoneX"
                      dataKey="cumulative"
                      stroke="rgb(var(--primary))"
                      strokeWidth={2.35}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      dot={{
                        r: 3,
                        fill: "rgb(var(--primary))",
                        stroke: "rgb(var(--surface))",
                        strokeWidth: 2,
                      }}
                      activeDot={{
                        r: 5,
                        fill: "rgb(var(--surface))",
                        stroke: "rgb(var(--primary))",
                        strokeWidth: 2.25,
                      }}
                      isAnimationActive={!reduceMotion}
                      animationDuration={700}
                      animationEasing="ease-out"
                    />
                  </ComposedChart>
                </ResponsiveContainer>

                <p className="pointer-events-none absolute bottom-0 right-2 text-[10px] text-[rgb(var(--text-faint))]">
                  Curba conectează vizual termene discrete.
                </p>
              </>
            ) : (
              <div className="flex h-full flex-col justify-center gap-3 text-xs leading-5 text-[rgb(var(--text-muted))]">
                <p>
                  {!fx
                    ? "Expunerea cumulată necesită un curs de referință valid. Valorile originale rămân disponibile."
                    : "Nu există termene comerciale confirmate pentru această selecție."}
                </p>

                {!fx ? (
                  <p className="flex flex-wrap gap-x-4 gap-y-1 font-medium tabular-nums text-[rgb(var(--foreground))]">
                    {model.originals.map((entry) => (
                      <span key={entry.currency}>
                        {formatProductCurrency(
                          entry.value,
                          entry.currency,
                        )}
                      </span>
                    ))}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div className="mt-2 flex min-h-10 flex-wrap items-start gap-x-4 gap-y-1 text-metadata text-[rgb(var(--text-muted))]">
            {!monetary ? (
              <p>Valorile originale rămân separate pe monede.</p>
            ) : model.overdueCount > 0 ? (
              <p className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--danger-text))]"
                />
                <span>
                  {amount(model.overdueValue)} înainte de astăzi ·{" "}
                  {caseCountLabel(model.overdueCount)}
                </span>
              </p>
            ) : (
              <p>
                {caseCountLabel(
                  points[points.length - 1]?.cumulativeCount ?? 0,
                )}{" "}
                cu valoare și termen confirmate
              </p>
            )}
          </div>
        </figure>

        <figure className={card}>
          <figcaption className="min-h-[88px]">
            <h2 className="text-sm font-semibold">
              Unde este concentrată expunerea
            </h2>
            <p className="mt-1 text-metadata leading-5 text-[rgb(var(--text-muted))]">
              Valoarea cazurilor deschise, grupată după apropierea termenului
            </p>
          </figcaption>

          <div
            className="relative h-[268px] w-full"
            role="img"
            aria-label={model.buckets
              .map(
                (entry) =>
                  `${entry.label}: ${
                    monetary
                      ? amount(sum(entry.values))
                      : unavailableAmount
                  }, ${caseCountLabel(
                    sum(entry.counts),
                  )}; ${compositionLabel(
                    entry.summary.originals,
                  )}`,
              )
              .join(". ")}
          >
            {hasBarData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  margin={{
                    top: 26,
                    right: 8,
                    bottom: 30,
                    left: 0,
                  }}
                  barCategoryGap="28%"
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="rgb(var(--border))"
                    strokeOpacity={0.72}
                  />

                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    height={52}
                    tick={renderBucketTick}
                  />

                  <YAxis
                    width={44}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={7}
                    domain={[
                      0,
                      (dataMax: number) =>
                        Math.max(1, dataMax * 1.16),
                    ]}
                    tick={{
                      fill: "rgb(var(--text-muted))",
                      fontSize: 11,
                    }}
                    tickFormatter={(value) =>
                      compact(Number(value))
                    }
                  />

                  <Tooltip
                    isAnimationActive={!reduceMotion}
                    animationDuration={160}
                    cursor={{
                      fill: "rgb(var(--foreground) / .025)",
                    }}
                    content={({ active, payload }) => {
                      const row = payload?.[0]?.payload as
                        | (typeof barData)[number]
                        | undefined;

                      if (!active || !row) return null;

                      return (
                        <div className={tooltipPanel}>
                          <p className="font-medium">
                            {row.label}
                          </p>

                          <p className="mt-2 text-micro text-[rgb(var(--text-muted))]">
                            {monetary
                              ? `Expunere estimată · ${currency}`
                              : "Monede originale"}
                          </p>

                          <p className="mt-0.5 text-lg font-semibold tracking-[-0.02em] tabular-nums">
                            {monetary
                              ? amount(row.value)
                              : row.originals
                                  .map((original) =>
                                    formatProductCurrency(
                                      original.value,
                                      original.currency,
                                    ),
                                  )
                                  .join(" · ") ||
                                "Valoare neconfirmată"}
                          </p>

                          <p className="mt-2.5">
                            {caseCountLabel(row.count)}
                          </p>

                          <p className="mt-1 text-micro text-[rgb(var(--text-muted))]">
                            Monede originale ·{" "}
                            {compositionLabel(row.originals) ||
                              "Nicio valoare confirmată"}
                          </p>

                          {row.excludedCount ? (
                            <p className="mt-1 text-micro text-[rgb(var(--text-muted))]">
                              {row.excludedCount} valori excluse din suma convertită.
                            </p>
                          ) : null}
                        </div>
                      );
                    }}
                  />

                  <Bar
                    dataKey="value"
                    radius={[6, 6, 2, 2]}
                    maxBarSize={46}
                    isAnimationActive={!reduceMotion}
                    animationDuration={620}
                    animationEasing="ease-out"
                  >
                    {barData.map((entry) => (
                      <Cell
                        key={entry.label}
                        fill={entry.color}
                      />
                    ))}

                    <LabelList
                      dataKey="value"
                      position="top"
                      formatter={(value: unknown) =>
                        compact(Number(value))
                      }
                      fill="rgb(var(--text-secondary))"
                      fontSize={12}
                      fontWeight={600}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center text-xs leading-5 text-[rgb(var(--text-muted))]">
                Nu există expunere eligibilă pentru distribuția curentă.
              </div>
            )}
          </div>

          <p className="mt-2 min-h-10 text-metadata leading-5 text-[rgb(var(--text-muted))]">
            {monetary
              ? "Valoare estimată și număr de cazuri, pentru fiecare interval."
              : fx
                ? "Sume neconfirmate: barele arată numărul de cazuri."
                : "Conversie indisponibilă: barele arată numărul de cazuri."}{" "}
            Fără termen, separat.
          </p>
        </figure>
      </div>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-x-5 gap-y-2 text-micro leading-5 text-[rgb(var(--text-muted))]">
        {model.undatedCount > 0 ? (
          <p>
            Fără termen: {caseCountLabel(model.undatedCount)} ·{" "}
            {model.undatedOriginals
              .map((entry) =>
                formatProductCurrency(
                  entry.value,
                  entry.currency,
                ),
              )
              .join(" · ") || "Valoare neconfirmată"}
          </p>
        ) : null}

        {excluded ? <p>{excluded}</p> : null}

        <p>
          Termene actuale, nu istoric al expunerii sau prognoză de încasare.
        </p>
      </div>

      <details className="mt-1 text-metadata text-[rgb(var(--text-muted))]">
        <summary className="focus-ring inline-block cursor-pointer py-1.5">
          Vezi valorile graficului
        </summary>

        <div className="mt-2 grid gap-5 xl:grid-cols-[1.8fr_1fr]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="pb-2 text-left font-medium">
                Cazuri cu termen · monedă originală și echivalent analitic
              </caption>
              <thead>
                <tr>
                  <th className="py-2 pr-3">Caz / termen</th>
                  <th className="pr-3">Original</th>
                  <th className="pr-3">
                    Echivalent {currency}
                  </th>
                  <th>Clasificare</th>
                </tr>
              </thead>
              <tbody>
                {points.flatMap((point) =>
                  point.cases.map((row) => (
                    <tr
                      key={row.item.id}
                      className="border-t border-[rgb(var(--border))]"
                    >
                      <td className="max-w-[260px] py-2 pr-3">
                        {row.item.opportunityTitle ??
                          "Oportunitate"}
                        <span className="block text-micro">
                          {dateLabel(point.date, true)}
                        </span>
                      </td>
                      <td className="pr-3 tabular-nums">
                        {formatProductCurrency(
                          row.item.value,
                          row.item.currency,
                        )}
                      </td>
                      <td className="pr-3 tabular-nums">
                        {amount(row.converted)}
                      </td>
                      <td>{row.classification}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>

            {!points.length ? (
              <p className="py-2">
                Nicio valoare cumulată disponibilă.
              </p>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="pb-2 text-left font-medium">
                Concentrarea expunerii ·{" "}
                {monetary ? currency : "monede originale"}
              </caption>
              <thead>
                <tr>
                  <th className="py-2 pr-3">Termen</th>
                  <th className="pr-3">Valoare</th>
                  <th>Cazuri</th>
                </tr>
              </thead>
              <tbody>
                {model.buckets.map((entry) => (
                  <tr
                    key={entry.label}
                    className="border-t border-[rgb(var(--border))]"
                  >
                    <td className="py-2 pr-3">
                      {entry.label}
                    </td>
                    <td className="pr-3 tabular-nums">
                      {monetary
                        ? amount(sum(entry.values))
                        : entry.summary.originals
                            .map((original) =>
                              formatProductCurrency(
                                original.value,
                                original.currency,
                              ),
                            )
                            .join(" · ") || "—"}
                    </td>
                    <td>{sum(entry.counts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>

      <p className="mt-1 text-micro leading-5 text-[rgb(var(--text-muted))]">
        Conversia este utilizată doar pentru analiză. Valorile originale rămân neschimbate.
      </p>
    </section>
  );
}
