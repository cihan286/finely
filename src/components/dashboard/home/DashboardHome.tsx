// ─────────────────────────────────────────────────────────────────────────────
// Dashboard overview (the main content of /dashboard)
//
// In plain words: everything below the top bar on the dashboard's first page —
// the welcome line, four summary tiles (balance, and money in, out and net
// over the last 30 days), the cash flow chart, the spending breakdown, this
// month's budgets (how much of each is used), the forecast for the next 30
// days (where the balance is heading, given unpaid bills and regular
// payments), recent transactions and the bank accounts with their balances. A company that
// hasn't added a bank account yet sees how to get started instead.
//
// For developers: a server component; only the chart (CashFlowChart) runs in
// the browser. The figures come from getDashboardSummary() in
// lib/data/dashboard.ts, getBudgets() in lib/data/budgets.ts and
// getForecast() in lib/data/recurring.ts, via the page.
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import styles from "./DashboardHome.module.css";
import CashFlowChart from "./CashFlowChart";
import Button from "@/components/common/button/Button";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  FileUp,
  Plus,
  Landmark,
} from "lucide-react";
import { CATEGORY_ICONS } from "@/components/dashboard/categoryIcons";
import type { DashboardSummary } from "@/lib/data/dashboard";
import { monthName, monthStart, type BudgetProgress } from "@/lib/finance/budgets";
import { FORECAST_DAYS, type Forecast } from "@/lib/finance/forecast";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatRelativeDate,
  getMetricChange,
} from "@/lib/format";

// Which icon belongs to which summary tile
const metricIcons = {
  dollar: DollarSign,
  income: TrendingUp,
  expenses: TrendingDown,
  net: ArrowRightLeft,
};

// Names shown for each kind of account
const ACCOUNT_TYPES = {
  checking: "Checking",
  savings: "Savings",
  reserve: "Reserve",
};

interface DashboardHomeProps {
  firstName: string;
  organizationName: string;
  /** The company's currency, e.g. "USD" */
  currency: string;
  /** Whether you may add bank accounts (owners and admins) */
  canManage: boolean;
  summary: DashboardSummary;
  /** This month's budgets, the most used up first */
  budgets: BudgetProgress[];
  /** Where the balance is heading over the next 30 days */
  forecast: Forecast;
}

// How many expected payments the forecast card lists
const FORECAST_EVENTS_SHOWN = 6;

// "$120.50 over", "$20.00 left"
function budgetNote(budget: BudgetProgress, currency: string): string {
  return budget.remaining < 0
    ? `${formatCurrency(-budget.remaining, { currency: currency })} over`
    : `${formatCurrency(budget.remaining, { currency: currency })} left`;
}

export default function DashboardHome({
  firstName,
  organizationName,
  currency,
  canManage,
  summary,
  budgets,
  forecast,
}: DashboardHomeProps) {
  const {
    metrics,
    cashflow,
    expenseCategories,
    expensesTotal,
    recentTransactions,
    accounts,
  } = summary;

  return (
    <main className={styles.contentArea}>
      {/* Page title, welcome line and action buttons */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard Overview</h1>
          <p className={styles.subtitle}>
            Welcome back, {firstName}. Here is what is happening at{" "}
            {organizationName}.
          </p>
        </div>
        {accounts.length > 0 && (
          <div className={styles.headerActions}>
            <Button
              href="/dashboard/transactions?import=1"
              variant="outline"
              size="sm"
              text="Import CSV"
              icon={<FileUp size={16} />}
            />
            <Button
              href="/dashboard/transactions?new=1"
              variant="primary"
              size="sm"
              text="Add transaction"
              icon={<Plus size={16} />}
            />
          </div>
        )}
      </div>

      {accounts.length === 0 ? (
        // A new company: explain the first steps instead of showing zeros
        <section className={`${styles.card} ${styles.gettingStarted}`}>
          <h2 className={styles.cardTitle}>Get started with Finely</h2>
          <ol className={styles.steps}>
            <li>
              <strong>Add a bank account</strong>
              <span>
                {canManage
                  ? "Add each account your company keeps money in, with its current balance."
                  : "An owner or admin of your company adds its bank accounts in Settings."}
              </span>
            </li>
            <li>
              <strong>Bring in your transactions</strong>
              <span>
                Import a CSV statement from your bank, or add transactions one
                by one.
              </span>
            </li>
            <li>
              <strong>Watch your cash flow</strong>
              <span>
                This page then shows your balances, income, spending and where
                your money goes.
              </span>
            </li>
          </ol>
          {canManage && (
            <div>
              <Button
                href="/dashboard/settings#accounts"
                variant="primary"
                size="sm"
                text="Add a bank account"
                icon={<Landmark size={16} />}
              />
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Four summary tiles, each with the change against the 30 days before */}
          <div className={styles.metricsGrid}>
            {metrics.map((metric) => {
              const Icon = metricIcons[metric.iconKey];
              const change = getMetricChange(metric);
              return (
                <div key={metric.id} className={styles.metricCard}>
                  <div className={styles.metricHeader}>
                    <span className={styles.metricTitle}>{metric.title}</span>
                    <div className={styles.iconContainer}>
                      <Icon size={18} />
                    </div>
                  </div>
                  <div className={styles.metricBody}>
                    <span className={styles.metricValue}>
                      {metric.format === "currency"
                        ? formatCurrency(metric.value, { currency: currency })
                        : formatNumber(metric.value)}
                    </span>
                    <span
                      className={`${styles.metricChange} ${change.isPositive ? styles.positive : styles.negative}`}
                    >
                      {change.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.dashboardGrid}>
            {/* Chart of money in vs. money out (its own file: CashFlowChart.tsx) */}
            <CashFlowChart cashflow={cashflow} currency={currency} />

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Spending (30 days)</h2>
              </div>
              {expenseCategories.length === 0 ? (
                <p className={styles.emptyText}>
                  No spending in the last 30 days.
                </p>
              ) : (
                <div className={styles.expenseList}>
                  {expenseCategories.map((expense) => {
                    const Icon = CATEGORY_ICONS[expense.iconKey].icon;
                    // This category's share of all spending (bar length)
                    const share = (expense.amount / expensesTotal) * 100;
                    return (
                      <div key={expense.id} className={styles.expenseItem}>
                        <div className={styles.expenseHeader}>
                          <div className={styles.expenseCategory}>
                            <div
                              className={styles.expenseIcon}
                              style={{
                                backgroundColor: `${expense.color}15`,
                                color: expense.color,
                              }}
                            >
                              <Icon size={14} />
                            </div>
                            <span className={styles.expenseName}>
                              {expense.category}
                            </span>
                          </div>
                          <span className={styles.expenseAmount}>
                            {formatCurrency(expense.amount, { currency: currency })}
                          </span>
                        </div>
                        <div className={styles.progressBarBg}>
                          <div
                            className={styles.progressBarFill}
                            style={{
                              width: `${share}%`,
                              backgroundColor: expense.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Until a budget exists, say where to set one */}
              {budgets.length === 0 && canManage && (
                <Link
                  href="/dashboard/settings#categories"
                  className={`${styles.viewAllBtn} ${styles.budgetHint}`}
                >
                  Set monthly budgets
                </Link>
              )}
            </div>
          </div>

          {/* How much of each category's monthly budget is used */}
          {budgets.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  Budgets ({monthName(summary.today)})
                </h2>
                {canManage && (
                  <Link
                    href="/dashboard/settings#categories"
                    className={styles.viewAllBtn}
                  >
                    Manage
                  </Link>
                )}
              </div>
              <div className={styles.budgetGrid}>
                {budgets.map((budget) => {
                  const Icon = CATEGORY_ICONS[budget.iconKey].icon;
                  return (
                    <Link
                      key={budget.categoryId}
                      href={`/dashboard/transactions?category=${budget.categoryId}&from=${monthStart(summary.today)}`}
                      className={styles.budgetItem}
                    >
                      <div className={styles.expenseHeader}>
                        <div className={styles.expenseCategory}>
                          <div
                            className={styles.expenseIcon}
                            style={{
                              backgroundColor: `${budget.color}15`,
                              color: budget.color,
                            }}
                          >
                            <Icon size={14} />
                          </div>
                          <span className={styles.expenseName}>{budget.name}</span>
                        </div>
                        <span
                          className={`${styles.budgetNote} ${styles[`budget_${budget.status}`]}`}
                        >
                          {budgetNote(budget, currency)}
                        </span>
                      </div>
                      <div
                        className={styles.progressBarBg}
                        role="progressbar"
                        aria-label={`${budget.name} budget used`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.min(Math.round(budget.ratio * 100), 100)}
                      >
                        <div
                          className={`${styles.progressBarFill} ${styles[`budgetFill_${budget.status}`]}`}
                          style={{ width: `${Math.min(budget.ratio * 100, 100)}%` }}
                        />
                      </div>
                      <span className={styles.budgetAmounts}>
                        {formatCurrency(budget.spent, { currency: currency })} of{" "}
                        {formatCurrency(budget.budget, { currency: currency })}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Where the balance is heading, given bills and regular payments */}
          <div className={styles.card} id="forecast">
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                Forecast (next {FORECAST_DAYS} days)
              </h2>
              <Link href="/dashboard/insights#recurring" className={styles.viewAllBtn}>
                Regular payments
              </Link>
            </div>
            {forecast.events.length === 0 ? (
              <p className={styles.emptyText}>
                Nothing is expected in the next {FORECAST_DAYS} days. Add your
                bills, or keep importing statements: once a payment comes back
                regularly, Finely expects it here.
              </p>
            ) : (
              <div className={styles.forecast}>
                <div className={styles.forecastFigures}>
                  <div className={styles.forecastFigure}>
                    <span className={styles.forecastLabel}>
                      Expected on {formatDate(forecast.until)}
                    </span>
                    <span
                      className={`${styles.forecastValue} ${forecast.endBalance < 0 ? styles.negative : ""}`}
                    >
                      {formatCurrency(forecast.endBalance, { currency: currency })}
                    </span>
                    <span className={styles.forecastNote}>
                      {formatCurrency(forecast.endBalance - forecast.startBalance, { signed: true, currency: currency })}{" "}
                      from today&apos;s {formatCurrency(forecast.startBalance, { currency: currency })}
                    </span>
                  </div>
                  <div className={styles.forecastFigure}>
                    <span className={styles.forecastLabel}>Lowest point</span>
                    <span
                      className={`${styles.forecastValue} ${forecast.lowest.balance < 0 ? styles.negative : ""}`}
                    >
                      {formatCurrency(forecast.lowest.balance, { currency: currency })}
                    </span>
                    <span className={styles.forecastNote}>
                      {forecast.lowest.day === forecast.today
                        ? "Today"
                        : `On ${formatDate(forecast.lowest.day)}`}
                    </span>
                  </div>
                  <div className={styles.forecastFigure}>
                    <span className={styles.forecastLabel}>Expected in / out</span>
                    <span className={styles.forecastValue}>
                      {formatCurrency(forecast.moneyIn, { currency: currency })} /{" "}
                      {formatCurrency(forecast.moneyOut, { currency: currency })}
                    </span>
                    <span className={styles.forecastNote}>
                      Unpaid bills and regular payments only
                    </span>
                  </div>
                </div>
                <div className={styles.transactionList}>
                  {forecast.events.slice(0, FORECAST_EVENTS_SHOWN).map((event, i) => (
                    <div key={i} className={styles.forecastEvent}>
                      <div className={styles.txDetails}>
                        <span className={styles.txName}>{event.name}</span>
                        <span className={styles.txDate}>
                          {formatRelativeDate(event.day, forecast.today)} ·{" "}
                          {event.source === "bill" ? "Bill" : "Regular payment"}
                        </span>
                      </div>
                      <span
                        className={`${styles.txAmount} ${event.amount > 0 ? styles.positiveAmount : ""}`}
                      >
                        {/* "~" when the amount changes from time to time */}
                        {event.estimated && "~"}
                        {formatCurrency(event.amount, { signed: true, currency: currency })}
                      </span>
                    </div>
                  ))}
                  {forecast.events.length > FORECAST_EVENTS_SHOWN && (
                    <span className={styles.forecastNote}>
                      and {forecast.events.length - FORECAST_EVENTS_SHOWN} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={styles.dashboardGrid}>
            {/* Latest transactions: green arrow up = money in, grey arrow down = money out */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Recent Activity</h2>
                <Link href="/dashboard/transactions" className={styles.viewAllBtn}>
                  View all
                </Link>
              </div>
              {recentTransactions.length === 0 ? (
                <p className={styles.emptyText}>
                  No transactions yet. Import a statement or add one to see it
                  here.
                </p>
              ) : (
                <div className={styles.transactionList}>
                  {recentTransactions.map((tx) => {
                    const isIncome = tx.amount > 0;
                    return (
                      <Link
                        key={tx.id}
                        href={`/dashboard/transactions?edit=${tx.id}`}
                        className={styles.transactionItem}
                      >
                        <div className={styles.transactionLeft}>
                          <div
                            className={`${styles.txIcon} ${isIncome ? styles.txIconIncome : styles.txIconExpense}`}
                          >
                            {isIncome ? (
                              <ArrowUpRight size={16} />
                            ) : (
                              <ArrowDownRight size={16} />
                            )}
                          </div>
                          <div className={styles.txDetails}>
                            <span className={styles.txName}>{tx.name}</span>
                            <span className={styles.txDate}>
                              {formatRelativeDate(tx.day, summary.today)} · {tx.category}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`${styles.txAmount} ${isIncome ? styles.positiveAmount : ""}`}
                        >
                          {formatCurrency(tx.amount, { signed: true, currency: currency })}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Each bank account and what's in it */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Bank Accounts</h2>
                <Link
                  href="/dashboard/settings#accounts"
                  className={styles.viewAllBtn}
                >
                  Manage
                </Link>
              </div>
              <div className={styles.accountList}>
                {accounts.map((account) => (
                  <div key={account.id} className={styles.accountItem}>
                    <div className={styles.accountLeft}>
                      <div className={styles.accountIcon}>
                        <Landmark size={16} />
                      </div>
                      <div className={styles.accountDetails}>
                        <span className={styles.accountName}>{account.name}</span>
                        <span className={styles.accountType}>
                          {ACCOUNT_TYPES[account.type]}
                          {account.last4 && ` ••${account.last4}`}
                        </span>
                      </div>
                    </div>
                    <span className={styles.accountBalance}>
                      {formatCurrency(account.balance, { currency: currency })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
