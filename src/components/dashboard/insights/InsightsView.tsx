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
import { AlertTriangle, Download, Landmark } from "lucide-react";
import Button from "@/components/common/button/Button";
import { CATEGORY_ICONS } from "@/components/dashboard/categoryIcons";
import type { RecurringPaymentDetails } from "@/lib/data/recurring";
import { INSIGHT_PERIODS, type Insights } from "@/lib/finance/insights";
import { formatCurrency, formatDate, formatRelativeDate } from "@/lib/format";
import MonthlyChart from "./MonthlyChart";
import { submitRecurringVisibility } from "@/app/dashboard/insights/actions";
import PrintButton from "./PrintButton";
import { fill, intlLocale, type Locale } from "@/i18n/config";
import { bold, rich } from "@/i18n/rich";
import { getI18n } from "@/i18n/server";
import styles from "./InsightsView.module.css";

// The Bills page with its "Add bill" window open and filled in from a
// regular payment
function billHref(payment: RecurringPaymentDetails): string {
  const params = new URLSearchParams({
    new: "1",
    name: payment.name,
    amount: String(payment.amount),
    due: payment.nextDay,
    repeat: payment.cadence,
  });
  if (payment.categoryId) params.set("category", payment.categoryId);
  return `/dashboard/bills?${params}`;
}

// 0.4166 -> "41.7%", in Turkish "%41,7"
const percent = (share: number, locale: Locale) =>
  new Intl.NumberFormat(intlLocale(locale), {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(share);

interface InsightsViewProps {
  organizationName: string;
  /** The company's currency, e.g. "USD" */
  currency: string;
  hasAccounts: boolean;
  canManage: boolean;
  insights: Insights;
  /** Payments that come back regularly, the largest per month first */
  recurring: RecurringPaymentDetails[];
  /** Payments someone marked "Not regular", to bring back */
  hiddenRecurring: { key: string; name: string }[];
}

export default async function InsightsView({
  organizationName,
  currency,
  hasAccounts,
  canManage,
  insights,
  recurring,
  hiddenRecurring,
}: InsightsViewProps) {
  const { locale, m } = await getI18n();
  const t = m.insights;
  const money = (value: number, signed = false) => formatCurrency(value, { signed, currency }, locale);
  // What the regular payments (money out) add up to per month
  const recurringPerMonth = recurring
    .filter((r) => r.direction === "out")
    .reduce((sum, r) => sum + r.monthlyAmount, 0);
  const { period, monthly, totals, categories, vendors, unusualCharges, today } =
    insights;
  const hasActivity = monthly.some((month) => month.income > 0 || month.expenses > 0);
  const categoryTotal = categories.reduce((sum, c) => sum + c.amount, 0);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.subtitle}>{fill(t.subtitle, { company: organizationName })}</p>
          {/* Only on paper: which period the printout covers */}
          <p className={styles.printOnly}>
            {fill(t.printPeriod, { months: period, date: formatDate(today, locale) })}
          </p>
        </div>
        {hasActivity && (
          <div className={styles.headerActions}>
            <Button
              href={`/dashboard/insights/export?months=${period}`}
              download
              variant="outline"
              size="sm"
              text={t.exportCsv}
              icon={<Download size={16} />}
            />
            <PrintButton />
          </div>
        )}
      </div>

      {/* The period: one row above everything it applies to */}
      <nav className={styles.periods} aria-label={t.period}>
        {INSIGHT_PERIODS.map((months) => (
          <Link
            key={months}
            href={`/dashboard/insights?months=${months}`}
            className={`${styles.period} ${months === period ? styles.periodActive : ""}`}
            aria-current={months === period ? "page" : undefined}
          >
            {fill(t.months, { months })}
          </Link>
        ))}
      </nav>

      {!hasActivity ? (
        <section className={`${styles.card} ${styles.empty}`}>
          <div className={styles.emptyIcon}>
            <Landmark size={22} />
          </div>
          <h2 className={styles.cardTitle}>{t.nothingYet}</h2>
          <p className={styles.muted}>
            {hasAccounts
              ? fill(t.noTransactions, { months: period })
              : canManage
                ? t.noAccounts
                : t.noAccountsMember}
          </p>
          {hasAccounts ? (
            <Button
              href="/dashboard/transactions?import=1"
              variant="primary"
              size="sm"
              text={t.importStatement}
            />
          ) : (
            canManage && (
              <Button
                href="/dashboard/settings#accounts"
                variant="primary"
                size="sm"
                text={t.addAccount}
              />
            )
          )}
        </section>
      ) : (
        <>
          {/* Totals for the period */}
          <div className={styles.stats}>
            <Stat label={t.moneyIn} value={money(totals.income)} />
            <Stat label={t.moneyOut} value={money(totals.expenses)} />
            <Stat
              label={t.net}
              value={money(totals.net, true)}
              tone={totals.net >= 0 ? "positive" : "negative"}
            />
            <Stat
              label={t.savingsRate}
              value={totals.savingsRate === null ? "—" : percent(totals.savingsRate, locale)}
              hint={t.savingsRateHint}
            />
          </div>

          {/* Money in and out per month */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>{t.byMonth}</h2>
              <div className={styles.legend}>
                <span>
                  <span className={`${styles.swatch} ${styles.incomeSwatch}`} />
                  {t.moneyIn}
                </span>
                <span>
                  <span className={`${styles.swatch} ${styles.expensesSwatch}`} />
                  {t.moneyOut}
                </span>
              </div>
            </div>
            <MonthlyChart monthly={monthly} currency={currency} />
            <details className={styles.tableView}>
              <summary>{t.asTable}</summary>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">{t.month}</th>
                    <th scope="col" className={styles.number}>{t.moneyIn}</th>
                    <th scope="col" className={styles.number}>{t.moneyOut}</th>
                    <th scope="col" className={styles.number}>{t.net}</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((month) => (
                    <tr key={month.month}>
                      <td>
                        {month.label} {month.month.slice(0, 4)}
                        {month.partial && <span className={styles.muted}> {t.soFar}</span>}
                      </td>
                      <td className={styles.number}>{money(month.income)}</td>
                      <td className={styles.number}>{money(month.expenses)}</td>
                      <td className={styles.number}>{money(month.income - month.expenses, true)}</td>
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
                <h2 className={styles.cardTitle}>{t.byCategory}</h2>
              </div>
              {categories.length === 0 ? (
                <p className={styles.muted}>{t.noSpending}</p>
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
                            {money(c.amount)}
                            <span className={styles.muted}> · {percent(share, locale)}</span>
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
                <h2 className={styles.cardTitle}>{t.topVendors}</h2>
              </div>
              {vendors.length === 0 ? (
                <p className={styles.muted}>{t.noSpending}</p>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">{t.vendor}</th>
                      <th scope="col" className={styles.number}>{t.payments}</th>
                      <th scope="col" className={styles.number}>{t.spent}</th>
                      <th scope="col" className={styles.number}>{t.share}</th>
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
                        <td className={styles.number}>{money(v.amount)}</td>
                        <td className={`${styles.number} ${styles.muted}`}>
                          {percent(v.share, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>

          {/* Subscriptions, payroll and other payments that keep coming back */}
          <section className={styles.card} id="recurring">
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>{t.regular}</h2>
              <p className={styles.muted}>
                {recurring.length === 0
                  ? t.regularNote
                  : fill(t.regularTotal, { amount: money(recurringPerMonth) })}
              </p>
            </div>
            {recurring.length === 0 ? (
              <p className={styles.muted}>{t.nothingRegular}</p>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">{t.payment}</th>
                      <th scope="col">{t.howOften}</th>
                      <th scope="col" className={styles.number}>{t.usually}</th>
                      <th scope="col" className={styles.number}>{t.perMonth}</th>
                      <th scope="col">{t.nextExpected}</th>
                      <th scope="col">
                        <span className={styles.srOnly}>{t.bill}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recurring.map((r) => (
                      <tr key={r.key}>
                        <td className={styles.vendorName}>
                          <Link
                            href={`/dashboard/transactions?q=${encodeURIComponent(r.name)}`}
                          >
                            {r.name}
                          </Link>
                          <span className={styles.recurringNote}>
                            {r.direction === "in" ? t.moneyIn : (r.category ?? t.uncategorized)}
                          </span>
                        </td>
                        <td>{m.bills.repeats[r.cadence]}</td>
                        <td
                          className={`${styles.number} ${r.direction === "in" ? styles.positive : ""}`}
                        >
                          {/* "~" when the amount changes from time to time */}
                          {r.variable && "~"}
                          {money(r.direction === "in" ? r.amount : -r.amount, true)}
                        </td>
                        <td className={`${styles.number} ${styles.muted}`}>
                          {money(r.monthlyAmount)}
                        </td>
                        <td>{formatDate(r.nextDay, locale)}</td>
                        <td className={styles.number}>
                          <span className={styles.rowActions}>
                            {r.direction === "out" &&
                              (r.billed ? (
                                <span className={styles.muted}>{t.trackedAsBill}</span>
                              ) : (
                                <Link
                                  href={billHref(r)}
                                  className={styles.addBill}
                                  aria-label={fill(t.addAsBillLabel, { name: r.name })}
                                >
                                  {t.addAsBill}
                                </Link>
                              ))}
                            {/* Leaves it out of this list and the forecast */}
                            <form action={submitRecurringVisibility}>
                              <input type="hidden" name="key" value={r.key} />
                              <input type="hidden" name="name" value={r.name} />
                              <button
                                type="submit"
                                className={styles.hideButton}
                                aria-label={fill(t.notRegularLabel, { name: r.name })}
                              >
                                {t.notRegular}
                              </button>
                            </form>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* The ones marked "Not regular", to bring back */}
            {hiddenRecurring.length > 0 && (
              <div className={styles.hiddenList}>
                <span className={styles.muted}>{t.notCounted}</span>
                {hiddenRecurring.map((h) => (
                  <form key={h.key} action={submitRecurringVisibility} className={styles.hiddenItem}>
                    <input type="hidden" name="key" value={h.key} />
                    <input type="hidden" name="intent" value="show" />
                    <input type="hidden" name="name" value={h.name} />
                    <span>
                      {h.name}
                      {h.key.startsWith("in:") && ` ${t.moneyInNote}`}
                    </span>
                    <button
                      type="submit"
                      className={styles.hideButton}
                      aria-label={fill(t.showAgainLabel, { name: h.name })}
                    >
                      {t.showAgain}
                    </button>
                  </form>
                ))}
              </div>
            )}
          </section>

          {/* Recent charges that are much higher than usual */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>{t.unusual}</h2>
              <p className={styles.muted}>{t.unusualNote}</p>
            </div>
            {unusualCharges.length === 0 ? (
              <p className={styles.muted}>{t.nothingUnusual}</p>
            ) : (
              <ul className={styles.alertList}>
                {unusualCharges.map((u) => (
                  <li key={u.id}>
                    <Link
                      href={`/dashboard/transactions?edit=${u.id}`}
                      className={styles.alert}
                    >
                      <span className={styles.alertIcon}>
                        <AlertTriangle size={16} aria-label={t.warning} />
                      </span>
                      <span className={styles.alertText}>
                        {rich(
                          fill(t.charged, {
                            name: u.name,
                            amount: money(u.amount),
                            percent: u.percentAbove,
                            usual: money(u.usual),
                          }),
                          bold,
                        )}
                      </span>
                      <span className={styles.muted}>
                        {formatRelativeDate(u.day, today, locale)}
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
