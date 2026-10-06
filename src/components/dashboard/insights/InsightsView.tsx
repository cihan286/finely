// ─────────────────────────────────────────────────────────────────────────────
// Insights (the content of /dashboard/insights)
//
// In plain words: a longer look at the company's money than the dashboard.
// At the top you pick the period (3, 6 or 12 months). Below: the totals for
// that period and how much of the income was kept, a chart of money in and
// out per month (also as a table), where the money went by category and by
// vendor, and recent charges that were unusually high for that vendor.
//
// For developers: a server component; only MonthlyChart runs in the
// browser. All figures come from getInsights() (lib/data/insights.ts). The
// period lives in the address (?months=3|6|12).
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { AlertTriangle, Landmark } from "lucide-react";
import Button from "@/components/common/button/Button";
import { CATEGORY_ICONS } from "@/components/dashboard/categoryIcons";
import { INSIGHT_PERIODS, type Insights } from "@/lib/insights";
import { formatCurrency, formatRelativeDate } from "@/utils/format";
import MonthlyChart from "./MonthlyChart";
import styles from "./InsightsView.module.css";

// 0.4166 -> "41.7%"
const percent = (share: number) => `${(share * 100).toFixed(1)}%`;

interface InsightsViewProps {
  organizationName: string;
  hasAccounts: boolean;
  canManage: boolean;
  insights: Insights;
}

export default function InsightsView({
  organizationName,
  hasAccounts,
  canManage,
  insights,
}: InsightsViewProps) {
  const { period, monthly, totals, categories, vendors, unusualCharges, today } =
    insights;
  const hasActivity = monthly.some((m) => m.income > 0 || m.expenses > 0);
  const categoryTotal = categories.reduce((sum, c) => sum + c.amount, 0);

  return (
    <main className={styles.page}>
      <div>
        <h1 className={styles.title}>Insights</h1>
        <p className={styles.subtitle}>
          Trends and patterns in {organizationName}&apos;s money.
        </p>
      </div>

      {/* The period: one row above everything it applies to */}
      <nav className={styles.periods} aria-label="Period">
        {INSIGHT_PERIODS.map((months) => (
          <Link
            key={months}
            href={`/dashboard/insights?months=${months}`}
            className={`${styles.period} ${months === period ? styles.periodActive : ""}`}
            aria-current={months === period ? "page" : undefined}
          >
            {months} months
          </Link>
        ))}
      </nav>

      {!hasActivity ? (
        <section className={`${styles.card} ${styles.empty}`}>
          <div className={styles.emptyIcon}>
            <Landmark size={22} />
          </div>
          <h2 className={styles.cardTitle}>Nothing to analyze yet</h2>
          <p className={styles.muted}>
            {hasAccounts
              ? `There are no completed transactions in the last ${period} months. Import a bank statement or add transactions, and the trends will show up here.`
              : canManage
                ? "Add a bank account and its transactions, and the trends will show up here."
                : "Once an owner or admin adds bank accounts and transactions, the trends will show up here."}
          </p>
          {hasAccounts ? (
            <Button
              href="/dashboard/transactions?import=1"
              variant="primary"
              size="sm"
              text="Import a statement"
            />
          ) : (
            canManage && (
              <Button
                href="/dashboard/settings#accounts"
                variant="primary"
                size="sm"
                text="Add a bank account"
              />
            )
          )}
        </section>
      ) : (
        <>
          {/* Totals for the period */}
          <div className={styles.stats}>
            <Stat label="Money in" value={formatCurrency(totals.income)} />
            <Stat label="Money out" value={formatCurrency(totals.expenses)} />
            <Stat
              label="Net"
              value={formatCurrency(totals.net, { signed: true })}
              tone={totals.net >= 0 ? "positive" : "negative"}
            />
            <Stat
              label="Savings rate"
              value={totals.savingsRate === null ? "—" : percent(totals.savingsRate)}
              hint="Share of money in that was kept"
            />
          </div>

          {/* Money in and out per month */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Money in and out by month</h2>
              <div className={styles.legend}>
                <span>
                  <span className={`${styles.swatch} ${styles.incomeSwatch}`} />
                  Money in
                </span>
                <span>
                  <span className={`${styles.swatch} ${styles.expensesSwatch}`} />
                  Money out
                </span>
              </div>
            </div>
            <MonthlyChart monthly={monthly} />
            <details className={styles.tableView}>
              <summary>Show as a table</summary>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Month</th>
                    <th scope="col" className={styles.number}>Money in</th>
                    <th scope="col" className={styles.number}>Money out</th>
                    <th scope="col" className={styles.number}>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((m) => (
                    <tr key={m.month}>
                      <td>
                        {m.label} {m.month.slice(0, 4)}
                        {m.partial && <span className={styles.muted}> (so far)</span>}
                      </td>
                      <td className={styles.number}>{formatCurrency(m.income)}</td>
                      <td className={styles.number}>{formatCurrency(m.expenses)}</td>
                      <td className={styles.number}>
                        {formatCurrency(m.income - m.expenses, { signed: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </section>

          <div className={styles.grid}>
            {/* Where the money went, by category */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Spending by category</h2>
              </div>
              {categories.length === 0 ? (
                <p className={styles.muted}>No spending in this period.</p>
              ) : (
                <ul className={styles.categoryList}>
                  {categories.map((c) => {
                    const Icon = CATEGORY_ICONS[c.iconKey]?.icon ?? CATEGORY_ICONS.more.icon;
                    const share = c.amount / categoryTotal;
                    return (
                      <li key={c.id} className={styles.categoryItem}>
                        <div className={styles.categoryHeader}>
                          <span className={styles.categoryName}>
                            <span
                              className={styles.categoryIcon}
                              style={{ backgroundColor: `${c.color}20`, color: c.color }}
                              aria-hidden="true"
                            >
                              <Icon size={14} />
                            </span>
                            {c.category}
                          </span>
                          <span className={styles.categoryAmount}>
                            {formatCurrency(c.amount)}
                            <span className={styles.muted}> · {percent(share)}</span>
                          </span>
                        </div>
                        <div className={styles.track}>
                          <div
                            className={styles.fill}
                            style={{ width: `${share * 100}%`, backgroundColor: c.color }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Where the money went, by vendor */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Top vendors</h2>
              </div>
              {vendors.length === 0 ? (
                <p className={styles.muted}>No spending in this period.</p>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Vendor</th>
                      <th scope="col" className={styles.number}>Payments</th>
                      <th scope="col" className={styles.number}>Spent</th>
                      <th scope="col" className={styles.number}>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((v) => (
                      <tr key={v.name}>
                        <td className={styles.vendorName}>
                          <Link
                            href={`/dashboard/transactions?q=${encodeURIComponent(v.name)}`}
                          >
                            {v.name}
                          </Link>
                        </td>
                        <td className={styles.number}>{v.count}</td>
                        <td className={styles.number}>{formatCurrency(v.amount)}</td>
                        <td className={`${styles.number} ${styles.muted}`}>
                          {percent(v.share)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>

          {/* Recent charges that are much higher than usual */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Unusual charges</h2>
              <p className={styles.muted}>
                Last 30 days, at least 50% above the vendor&apos;s average for
                the six months before.
              </p>
            </div>
            {unusualCharges.length === 0 ? (
              <p className={styles.muted}>Nothing unusual in the last 30 days.</p>
            ) : (
              <ul className={styles.alertList}>
                {unusualCharges.map((u) => (
                  <li key={u.id}>
                    <Link
                      href={`/dashboard/transactions?edit=${u.id}`}
                      className={styles.alert}
                    >
                      <span className={styles.alertIcon}>
                        <AlertTriangle size={16} aria-label="Warning" />
                      </span>
                      <span className={styles.alertText}>
                        <strong>{u.name}</strong> charged{" "}
                        <strong>{formatCurrency(u.amount)}</strong>,{" "}
                        {u.percentAbove}% more than usual ({formatCurrency(u.usual)})
                      </span>
                      <span className={styles.muted}>
                        {formatRelativeDate(u.day, today)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}

// One figure with its label
function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={`${styles.statValue} ${tone ? styles[tone] : ""}`}>{value}</span>
      {hint && <span className={styles.statHint}>{hint}</span>}
    </div>
  );
}
