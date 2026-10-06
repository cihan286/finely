// ─────────────────────────────────────────────────────────────────────────────
// Income and expenses by month (Insights chart)
//
// In plain words: a pair of bars for each month — money in (blue) and money
// out (orange) — so it's easy to see which months earned more than they
// spent. Hovering over a month shows its exact amounts; the same numbers
// are in the table below the chart.
//
// For developers: a client component ("use client") because of the hover
// tooltip. Drawn with Recharts. Series colors come from the --series-*
// tokens via currentColor (SVG attributes can't use var() directly).
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { Insights } from "@/lib/insights";
import { formatCompactCurrency, formatCurrency } from "@/utils/format";
import styles from "./InsightsView.module.css";

type Month = Insights["monthly"][number];

// Tooltip rows: the value leads, a short line in the series color names it
function MonthTooltip({ active, payload }: TooltipContentProps) {
  const month = payload?.[0]?.payload as Month | undefined;
  if (!active || !month) return null;
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipLabel}>
        {month.label} {month.month.slice(0, 4)}
        {month.partial && " (so far)"}
      </span>
      <span className={styles.tooltipRow}>
        <span className={`${styles.lineKey} ${styles.incomeKey}`} />
        <strong>{formatCurrency(month.income)}</strong> in
      </span>
      <span className={styles.tooltipRow}>
        <span className={`${styles.lineKey} ${styles.expensesKey}`} />
        <strong>{formatCurrency(month.expenses)}</strong> out
      </span>
    </div>
  );
}

export default function MonthlyChart({ monthly }: { monthly: Month[] }) {
  const axisTick = { fill: "currentColor", fontSize: 12 };
  return (
    <div className={styles.chartWrap}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={monthly}
          margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
          // 2px of space between a month's two bars
          barGap={2}
          barCategoryGap="28%"
          accessibilityLayer
        >
          {/* Faint solid horizontal guide lines */}
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.1} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={axisTick}
            tickMargin={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={axisTick}
            width={48}
            tickFormatter={formatCompactCurrency}
          />
          {/* A soft band behind the hovered month */}
          <Tooltip
            content={MonthTooltip}
            cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
          />
          <Bar
            dataKey="income"
            name="Money in"
            className={styles.incomeSeries}
            fill="currentColor"
            maxBarSize={24}
            // Rounded at the top, square at the baseline
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="expenses"
            name="Money out"
            className={styles.expensesSeries}
            fill="currentColor"
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
