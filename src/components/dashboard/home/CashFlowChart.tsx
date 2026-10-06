// ─────────────────────────────────────────────────────────────────────────────
// Cash flow chart
//
// In plain words: the chart on the dashboard that compares money coming in
// (blue) with money going out (orange), with totals above it. A dropdown switches
// between the last 30 days and this year. Hovering over the chart shows the
// exact amounts for that day or month.
//
// For developers: a client component ("use client") because of the dropdown
// and hover tooltip. Drawn with the Recharts library. The data comes from
// getDashboardSummary() (lib/data/dashboard.ts) via the dashboard page.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import styles from "./DashboardHome.module.css";
import type { Cashflow, CashflowRange } from "@/types/finance";
import { formatCurrency, formatCompactCurrency } from "@/utils/format";

// The time ranges in the dropdown, and the text shown for each
const RANGES: Record<CashflowRange, string> = {
  last30Days: "Last 30 Days",
  thisYear: "This Year",
};
// Colors come from the design tokens in globals.css. CSS `style` values can use
// var() directly; SVG attributes can't, so the chart paths use currentColor and
// get their color from the series className instead.
type SeriesKey = "income" | "expenses";

const SERIES: Record<
  SeriesKey,
  { label: string; color: string; className: string }
> = {
  income: {
    label: "Income",
    color: "var(--series-income)",
    className: styles.incomeSeries,
  },
  expenses: {
    label: "Expenses",
    color: "var(--series-expenses)",
    className: styles.expensesSeries,
  },
};

// The small box that appears when hovering over the chart
function ChartTooltip({
  active,
  payload,
  label,
}: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipLabel}>{label}</span>
      {payload.map((item) => {
        const series = SERIES[item.dataKey as SeriesKey];
        return (
          <div key={String(item.dataKey)} className={styles.tooltipRow}>
            <span
              className={styles.legendDot}
              style={{ backgroundColor: series.color }}
            />
            <span>{series.label}</span>
            <strong>{formatCurrency(Number(item.value))}</strong>
          </div>
        );
      })}
    </div>
  );
}

export default function CashFlowChart({ cashflow }: { cashflow: Cashflow }) {
  // Which time range is selected, and that range's data points
  const [range, setRange] = useState<CashflowRange>("last30Days");
  const data = cashflow[range];

  // Totals for the selected range; recalculated only when the range changes
  const totals = useMemo(() => {
    const income = data.reduce((sum, d) => sum + d.income, 0);
    const expenses = data.reduce((sum, d) => sum + d.expenses, 0);
    return { income, expenses, net: income - expenses };
  }, [data]);

  const axisTick = { fill: "currentColor", fontSize: 12 };

  return (
    <div className={`${styles.card} ${styles.chartCard}`}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Cash Flow</h2>
        <select
          className={styles.dropdown}
          value={range}
          onChange={(e) => setRange(e.target.value as CashflowRange)}
          aria-label="Cash flow period"
        >
          {Object.entries(RANGES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Net cash flow (in minus out), total income and total expenses */}
      <div className={styles.chartStats}>
        <div className={styles.chartStat}>
          <span className={styles.chartStatLabel}>Net cash flow</span>
          <span
            className={`${styles.chartStatValue} ${totals.net >= 0 ? styles.positive : styles.negative}`}
          >
            {formatCurrency(totals.net, { signed: true })}
          </span>
        </div>
        {(Object.keys(SERIES) as SeriesKey[]).map((key) => (
          <div key={key} className={styles.chartStat}>
            <span className={styles.chartStatLabel}>
              <span
                className={styles.legendDot}
                style={{ backgroundColor: SERIES[key].color }}
              />
              {SERIES[key].label}
            </span>
            <span className={styles.chartStatValue}>
              {formatCurrency(totals[key])}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            {/* Color fades under each line, from the line color to transparent */}
            <defs>
              {Object.entries(SERIES).map(([key, { color }]) => (
                <linearGradient
                  key={key}
                  id={`cf-${key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    style={{ stopColor: color, stopOpacity: 0.28 }}
                  />
                  <stop
                    offset="100%"
                    style={{ stopColor: color, stopOpacity: 0 }}
                  />
                </linearGradient>
              ))}
            </defs>
            {/* Faint horizontal guide lines */}
            <CartesianGrid
              vertical={false}
              stroke="currentColor"
              strokeOpacity={0.1}
            />
            {/* Dates along the bottom, amounts up the side ($1.2k…) */}
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              tickMargin={8}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              width={44}
              tickFormatter={formatCompactCurrency}
            />
            {/* Show the hover box (ChartTooltip above) and a vertical guide line */}
            <Tooltip
              content={ChartTooltip}
              cursor={{ stroke: "currentColor", strokeOpacity: 0.25 }}
            />
            <Area
              type="monotone"
              // Orange line: money going out
              dataKey="expenses"
              className={SERIES.expenses.className}
              stroke="currentColor"
              activeDot={{ className: SERIES.expenses.className }}
              strokeWidth={2}
              fill="url(#cf-expenses)"
            />
            <Area
              type="monotone"
              // Blue line: money coming in
              dataKey="income"
              className={SERIES.income.className}
              stroke="currentColor"
              activeDot={{ className: SERIES.income.className }}
              strokeWidth={2}
              fill="url(#cf-income)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
