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
} from "recharts";
import styles from "./DashboardHome.module.css";
import { cashflow } from "@/data/mockData";
import { formatCurrency, formatCompactCurrency } from "@/utils/format";

const RANGES = { last30Days: "Last 30 Days", thisYear: "This Year" };
const SERIES = {
  income: { label: "Income", color: "#10b981" },
  expenses: { label: "Expenses", color: "#ef4444" },
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipLabel}>{label}</span>
      {payload.map((item) => (
        <div key={item.dataKey} className={styles.tooltipRow}>
          <span
            className={styles.legendDot}
            style={{ backgroundColor: SERIES[item.dataKey].color }}
          />
          <span>{SERIES[item.dataKey].label}</span>
          <strong>{formatCurrency(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}

export default function CashFlowChart() {
  const [range, setRange] = useState("last30Days");
  const data = cashflow[range];

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
          onChange={(e) => setRange(e.target.value)}
          aria-label="Cash flow period"
        >
          {Object.entries(RANGES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.chartStats}>
        <div className={styles.chartStat}>
          <span className={styles.chartStatLabel}>Net cash flow</span>
          <span
            className={`${styles.chartStatValue} ${totals.net >= 0 ? styles.positive : styles.negative}`}
          >
            {formatCurrency(totals.net, { signed: true })}
          </span>
        </div>
        {Object.entries(SERIES).map(([key, { label, color }]) => (
          <div key={key} className={styles.chartStat}>
            <span className={styles.chartStatLabel}>
              <span
                className={styles.legendDot}
                style={{ backgroundColor: color }}
              />
              {label}
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
                  <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="currentColor"
              strokeOpacity={0.1}
            />
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
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "currentColor", strokeOpacity: 0.25 }}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke={SERIES.expenses.color}
              strokeWidth={2}
              fill="url(#cf-expenses)"
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke={SERIES.income.color}
              strokeWidth={2}
              fill="url(#cf-income)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
