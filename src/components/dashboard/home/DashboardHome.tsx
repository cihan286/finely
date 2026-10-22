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
import {
  ALL_SPENDING,
  monthName,
  monthStart,
  type BudgetProgress,
} from "@/lib/finance/budgets";
import { FORECAST_DAYS, type Forecast } from "@/lib/finance/forecast";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatRelativeDate,
  getMetricChange,
  todayWord,
} from "@/lib/format";
import { fill, type Locale } from "@/i18n/config";
import { getI18n } from "@/i18n/server";

// Which icon belongs to which summary tile
const metricIcons = {
  dollar: DollarSign,
  income: TrendingUp,
  expenses: TrendingDown,
  net: ArrowRightLeft,
};

interface DashboardHomeProps {
  firstName: string;
  organizationName: string;
  /** The company's currency, e.g. "USD" */
  currency: string;
  /** Whether you may add bank accounts (owners and admins) */
  canManage: boolean;
  /** Whether you may add and change things (everyone but viewers) */
  canRecord: boolean;
  summary: DashboardSummary;
  /** This month's budgets, the most used up first */
  budgets: BudgetProgress[];
  /** Where the balance is heading over the next 30 days */
  forecast: Forecast;
}

// How many expected payments the forecast card lists
const FORECAST_EVENTS_SHOWN = 6;

// "$120.50 over", "$20.00 left"
function budgetNote(
  budget: BudgetProgress,
  currency: string,
  locale: Locale,
  t: { budgetOver: string; budgetLeft: string },
): string {
  return budget.remaining < 0
    ? fill(t.budgetOver, { amount: formatCurrency(-budget.remaining, { currency }, locale) })
    : fill(t.budgetLeft, { amount: formatCurrency(budget.remaining, { currency }, locale) });
}

export default async function DashboardHome({
  firstName,
  organizationName,
  currency,
  canManage,
  canRecord,
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
  const { locale, m } = await getI18n();
  const t = m.dashboard;
  const money = (value: number, signed = false) => formatCurrency(value, { signed, currency }, locale);

  return (
    <main className={styles.contentArea}>
      {/* Page title, welcome line and action buttons */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t.heading}</h1>
          <p className={styles.subtitle}>
            {fill(t.welcome, { name: firstName, company: organizationName })}
          </p>
        </div>
        {accounts.length > 0 && canRecord && (
          <div className={styles.headerActions}>
            <Button
              href="/dashboard/transactions?import=1"
              variant="outline"
              size="sm"
              text={t.importCsv}
              icon={<FileUp size={16} />}
            />
            <Button
              href="/dashboard/transactions?new=1"
              variant="primary"
              size="sm"
              text={t.addTransaction}
              icon={<Plus size={16} />}
            />
          </div>
        )}
      </div>

      {accounts.length === 0 ? (
        // A new company: explain the first steps instead of showing zeros
        <section className={`${styles.card} ${styles.gettingStarted}`}>
          <h2 className={styles.cardTitle}>{t.gettingStarted.title}</h2>
          <ol className={styles.steps}>
            <li>
              <strong>{t.gettingStarted.addAccount}</strong>
              <span>
                {canManage ? t.gettingStarted.addAccountText : t.gettingStarted.addAccountMember}
              </span>
            </li>
            <li>
              <strong>{t.gettingStarted.bringIn}</strong>
              <span>{t.gettingStarted.bringInText}</span>
            </li>
            <li>
              <strong>{t.gettingStarted.watch}</strong>
              <span>{t.gettingStarted.watchText}</span>
            </li>
          </ol>
          {canManage && (
            <div>
              <Button
                href="/dashboard/settings#accounts"
                variant="primary"
                size="sm"
                text={t.gettingStarted.addAccount}
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
              const change = getMetricChange(metric, locale);
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
                        ? money(metric.value)
                        : formatNumber(metric.value, locale)}
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
                <h2 className={styles.cardTitle}>{t.spending}</h2>
              </div>
              {expenseCategories.length === 0 ? (
                <p className={styles.emptyText}>{t.noSpending}</p>
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
                            {money(expense.amount)}
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
                  {t.setBudgets}
                </Link>
              )}
            </div>
          </div>

          {/* How much of each category's monthly budget is used */}
          {budgets.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  {fill(t.budgetsIn, { month: monthName(summary.today, locale) })}
                </h2>
                <div className={styles.cardLinks}>
                  {/* A plain link: it answers with a file, not a page */}
                  <a
                    href="/dashboard/budgets/export"
                    download
                    className={styles.viewAllBtn}
                  >
                    {t.exportCsv}
                  </a>
                  {canManage && (
                    <Link
                      href="/dashboard/settings#categories"
                      className={styles.viewAllBtn}
                    >
                      {t.manage}
                    </Link>
                  )}
                </div>
              </div>
              <div className={styles.budgetGrid}>
                {budgets.map((budget) => {
                  const Icon = CATEGORY_ICONS[budget.iconKey].icon;
                  return (
                    <Link
                      key={budget.categoryId}
                      // The overall budget is about every category
                      href={`/dashboard/transactions?${budget.categoryId === ALL_SPENDING ? "" : `category=${budget.categoryId}&`}from=${monthStart(summary.today)}`}
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
                          {budgetNote(budget, currency, locale, t)}
                        </span>
                      </div>
                      <div
                        className={styles.progressBarBg}
                        role="progressbar"
                        aria-label={fill(t.budgetUsed, { name: budget.name })}
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
                        {fill(t.amountOf, { spent: money(budget.spent), budget: money(budget.budget) })}
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
                {fill(t.forecast.title, { days: FORECAST_DAYS })}
              </h2>
              <Link href="/dashboard/insights#recurring" className={styles.viewAllBtn}>
                {t.forecast.regularPayments}
              </Link>
            </div>
            {forecast.events.length === 0 ? (
              <p className={styles.emptyText}>{fill(t.forecast.empty, { days: FORECAST_DAYS })}</p>
            ) : (
              <div className={styles.forecast}>
                <div className={styles.forecastFigures}>
                  <div className={styles.forecastFigure}>
                    <span className={styles.forecastLabel}>
                      {fill(t.forecast.expectedOn, { date: formatDate(forecast.until, locale) })}
                    </span>
                    <span
                      className={`${styles.forecastValue} ${forecast.endBalance < 0 ? styles.negative : ""}`}
                    >
                      {money(forecast.endBalance)}
                    </span>
                    <span className={styles.forecastNote}>
                      {fill(t.forecast.fromToday, {
                        change: money(forecast.endBalance - forecast.startBalance, true),
                        balance: money(forecast.startBalance),
                      })}
                    </span>
                  </div>
                  <div className={styles.forecastFigure}>
                    <span className={styles.forecastLabel}>{t.forecast.lowest}</span>
                    <span
                      className={`${styles.forecastValue} ${forecast.lowest.balance < 0 ? styles.negative : ""}`}
                    >
                      {money(forecast.lowest.balance)}
                    </span>
                    <span className={styles.forecastNote}>
                      {forecast.lowest.day === forecast.today
                        ? todayWord(locale)
                        : fill(t.forecast.onDay, { date: formatDate(forecast.lowest.day, locale) })}
                    </span>
                  </div>
                  <div className={styles.forecastFigure}>
                    <span className={styles.forecastLabel}>{t.forecast.inOut}</span>
                    <span className={styles.forecastValue}>
                      {money(forecast.moneyIn)} / {money(forecast.moneyOut)}
                    </span>
                    <span className={styles.forecastNote}>{t.forecast.inOutNote}</span>
                  </div>
                </div>
                <div className={styles.transactionList}>
                  {forecast.events.slice(0, FORECAST_EVENTS_SHOWN).map((event, i) => (
                    <div key={i} className={styles.forecastEvent}>
                      <div className={styles.txDetails}>
                        <span className={styles.txName}>{event.name}</span>
                        <span className={styles.txDate}>
                          {formatRelativeDate(event.day, forecast.today, locale)} ·{" "}
                          {t.forecastSources[event.source]}
                        </span>
                      </div>
                      <span
                        className={`${styles.txAmount} ${event.amount > 0 ? styles.positiveAmount : ""}`}
                      >
                        {/* "~" when the amount changes from time to time */}
                        {event.estimated && "~"}
                        {money(event.amount, true)}
                      </span>
                    </div>
                  ))}
                  {forecast.events.length > FORECAST_EVENTS_SHOWN && (
                    <span className={styles.forecastNote}>
                      {fill(t.forecast.andMore, { count: forecast.events.length - FORECAST_EVENTS_SHOWN })}
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
                <h2 className={styles.cardTitle}>{t.recentActivity}</h2>
                <Link href="/dashboard/transactions" className={styles.viewAllBtn}>
                  {t.viewAll}
                </Link>
              </div>
              {recentTransactions.length === 0 ? (
                <p className={styles.emptyText}>{t.noTransactions}</p>
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
                              {formatRelativeDate(tx.day, summary.today, locale)} · {tx.category}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`${styles.txAmount} ${isIncome ? styles.positiveAmount : ""}`}
                        >
                          {money(tx.amount, true)}
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
                <h2 className={styles.cardTitle}>{t.bankAccounts}</h2>
                <Link
                  href="/dashboard/settings#accounts"
                  className={styles.viewAllBtn}
                >
                  {t.manage}
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
                          {t.accountTypes[account.type]}
                          {account.last4 && ` ••${account.last4}`}
                        </span>
                      </div>
                    </div>
                    <span className={styles.accountBalance}>
                      {money(account.balance)}
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
