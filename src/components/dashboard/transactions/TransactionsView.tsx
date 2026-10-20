// ─────────────────────────────────────────────────────────────────────────────
// Transactions list (the content of /dashboard/transactions)
//
// In plain words: the page title with "Export CSV", "Import CSV" and "Add
// transaction" buttons, a filter bar (search, account, category, dates), the table of
// transactions, and links to the previous and next page. Clicking a transaction opens it for
// editing; ticking several lets you give them all one category. Before the
// company has a bank account, it explains that one has to be added first.
//
// For developers: a server component; only the windows (TransactionDialog,
// ImportDialog) and the ticking (BulkCategorize) run in the browser. The filter bar is a GET form (next/form), so filtering just
// changes the address and the page re-renders on the server.
// ─────────────────────────────────────────────────────────────────────────────

import Form from "next/form";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileUp,
  Landmark,
  Paperclip,
  Plus,
  Search,
} from "lucide-react";
import Button from "@/components/common/button/Button";
import { Input, Select } from "@/components/common/form/controls";
import Message from "@/components/common/form/Message";
import type {
  Account,
  Card,
  Attachment,
  Category,
  CategoryRule,
  TransactionDetails,
} from "@/types/finance";
import { formatCurrency, formatDate } from "@/lib/format";
import { fill, plural } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getI18n } from "@/i18n/server";
import BulkCategorize from "./BulkCategorize";
import ImportDialog from "./ImportDialog";
import TransactionDialog from "./TransactionDialog";
import styles from "./TransactionsView.module.css";

const LIST_PATH = "/dashboard/transactions";

/** The filters and page shown, as read from the address */
export interface TransactionsQuery {
  q: string;
  account: string;
  category: string;
  /** A payment card's ID */
  card: string;
  from: string;
  to: string;
  page: number;
}

/** The address of this page with some values changed (empty ones are left out) */
function hrefFor(
  query: TransactionsQuery,
  changes: Partial<TransactionsQuery> & {
    new?: string;
    edit?: string;
    import?: string;
  } = {},
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...changes })) {
    if (key === "page" && value === 1) continue;
    if (value) params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${LIST_PATH}?${search}` : LIST_PATH;
}

/** The export file for the same search and filters (every page of them) */
function exportHref({ q, account, category, card, from, to }: TransactionsQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ q, account, category, card, from, to })) {
    if (value) params.set(key, value);
  }
  const search = params.toString();
  return `${LIST_PATH}/export${search ? `?${search}` : ""}`;
}

interface TransactionsViewProps {
  organizationName: string;
  /** The company's currency, e.g. "USD" */
  currency: string;
  /** Today in the company's timezone */
  today: string;
  /** Whether you may delete transactions and add bank accounts */
  canManage: boolean;
  query: TransactionsQuery;
  pageSize: number;
  /** This page of transactions */
  transactions: TransactionDetails[];
  /** How many transactions match the filters, on all pages */
  total: number;
  accounts: Account[];
  categories: Category[];
  /** The company's payment cards, for the filter and the form */
  cards: Card[];
  /** The company's category rules (for the import preview) */
  rules: CategoryRule[];
  /**
   * After an import: how many transactions were added and skipped, and how
   * many bills they paid
   */
  importResult: {
    imported: number;
    skipped: number;
    billsPaid: number;
    billsMerged: number;
  } | null;
  /**
   * After saving a transaction with "always use this category": how many
   * other transactions the new rule categorized
   */
  ruleResult: number | null;
  /** How many bills match the search too (0 without a search) */
  matchingBills: number;
  /** Which window is open, if any */
  dialog:
    | { mode: "new" }
    | { mode: "edit"; transaction: TransactionDetails; attachments: Attachment[] }
    | { mode: "import" }
    | null;
}

// "Imported 42 transactions. 3 were already there and were skipped. 2 bills
// were marked as paid."
function importMessage(
  {
    imported,
    skipped,
    billsPaid,
    billsMerged,
  }: {
    imported: number;
    skipped: number;
    billsPaid: number;
    billsMerged: number;
  },
  t: Messages["transactions"],
) {
  const parts = [imported === 0 ? t.noneImported : plural(imported, t.imported)];
  if (skipped > 0) parts.push(plural(skipped, t.skipped));
  if (billsPaid > 0) parts.push(plural(billsPaid, t.billsPaid));
  if (billsMerged > 0) parts.push(plural(billsMerged, t.billsMerged));
  return parts.join(" ");
}

export default async function TransactionsView({
  organizationName,
  currency,
  today,
  canManage,
  query,
  pageSize,
  transactions,
  total,
  accounts,
  categories,
  cards,
  rules,
  importResult,
  matchingBills,
  ruleResult,
  dialog,
}: TransactionsViewProps) {
  const { locale, m } = await getI18n();
  const t = m.transactions;
  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryColors = new Map(categories.map((c) => [c.id, c.color]));
  const isFiltered = Boolean(
    query.q || query.account || query.category || query.from || query.to,
  );
  const listHref = hrefFor(query);

  // "Showing 26–50 of 132"
  const firstShown = (query.page - 1) * pageSize + 1;
  const lastShown = firstShown + transactions.length - 1;
  const hasNextPage = lastShown < total;

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.subtitle}>{fill(t.subtitle, { company: organizationName })}</p>
        </div>
        {accounts.length > 0 && (
          <div className={styles.headerActions}>
            {/* Everything the filters show, not just this page */}
            {total > 0 && (
              <Button
                href={exportHref(query)}
                download
                variant="outline"
                size="sm"
                text={t.exportCsv}
                icon={<Download size={16} />}
              />
            )}
            <Button
              href={hrefFor(query, { import: "1" })}
              variant="outline"
              size="sm"
              text={t.importCsv}
              icon={<FileUp size={16} />}
            />
            <Button
              href={hrefFor(query, { new: "1" })}
              variant="primary"
              size="sm"
              text={t.add}
              icon={<Plus size={16} />}
            />
          </div>
        )}
      </div>

      {importResult && (
        <Message type="success">
          {importMessage(importResult, t)}
        </Message>
      )}
      {matchingBills > 0 && (
        <Message type="info">
          {plural(matchingBills, t.billsMatch, { search: query.q })}{" "}
          <Link
            href={`/dashboard/bills?q=${encodeURIComponent(query.q)}`}
            className={styles.messageLink}
          >
            {plural(matchingBills, t.seeBills)}
          </Link>
        </Message>
      )}
      {ruleResult !== null && (
        <Message type="success">
          {ruleResult === 0 ? t.ruleSavedNone : plural(ruleResult, t.ruleSaved)}{" "}
          <Link href="/dashboard/settings#rules" className={styles.messageLink}>
            {t.seeAllRules}
          </Link>
        </Message>
      )}

      {accounts.length === 0 ? (
        // Transactions need an account to belong to
        <section className={`${styles.card} ${styles.empty}`}>
          <div className={styles.emptyIcon}>
            <Landmark size={22} />
          </div>
          <h2 className={styles.emptyTitle}>{t.addAccountFirst}</h2>
          {canManage ? (
            <>
              <p className={styles.emptyText}>{t.addAccountText}</p>
              <Button
                href="/dashboard/settings#accounts"
                variant="primary"
                size="sm"
                text={t.addAccount}
              />
            </>
          ) : (
            <p className={styles.emptyText}>{t.addAccountMember}</p>
          )}
        </section>
      ) : (
        <>
          {/* Filter bar: submitting it changes the address */}
          <Form action={LIST_PATH} className={styles.filters}>
            <div className={styles.searchBox}>
              <Search size={16} className={styles.searchIcon} aria-hidden="true" />
              <Input
                name="q"
                type="search"
                placeholder={t.filters.searchPlaceholder}
                aria-label={t.filters.search}
                // Show a search made from the top bar while this page is open
                key={query.q}
                defaultValue={query.q}
                maxLength={100}
                className={styles.filter}
              />
            </div>
            <Select
              name="account"
              aria-label={t.filters.account}
              defaultValue={query.account}
              className={styles.filter}
            >
              <option value="">{t.filters.allAccounts}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
            <Select
              name="category"
              aria-label={t.filters.category}
              defaultValue={query.category}
              className={styles.filter}
            >
              <option value="">{t.filters.allCategories}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="none">{t.uncategorized}</option>
            </Select>
            {/* Only once the company has cards */}
            {cards.length > 0 && (
              <Select
                name="card"
                aria-label={t.filters.card}
                defaultValue={query.card}
                className={styles.filter}
              >
                <option value="">{t.filters.allCards}</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} •••• {c.last4}
                  </option>
                ))}
              </Select>
            )}
            <label className={styles.dateField}>
              <span>{t.filters.from}</span>
              <Input
                name="from"
                type="date"
                defaultValue={query.from}
                className={styles.filter}
              />
            </label>
            <label className={styles.dateField}>
              <span>{t.filters.to}</span>
              <Input
                name="to"
                type="date"
                defaultValue={query.to}
                className={styles.filter}
              />
            </label>
            <div className={styles.filterActions}>
              <Button type="submit" variant="outline" size="sm" text={t.filters.apply} />
              {isFiltered && (
                <Link href={LIST_PATH} className={styles.clearLink}>
                  {t.filters.clear}
                </Link>
              )}
            </div>
          </Form>

          <section className={styles.card}>
            {transactions.length === 0 ? (
              <p className={styles.noResults}>
                {isFiltered ? t.noMatches : t.empty}
              </p>
            ) : (
              <>
                {/* Ticking rows shows a bar to give them all one category.
                    A fresh one for each page and filter, so nothing stays
                    ticked out of sight. */}
                <BulkCategorize key={listHref} categories={categories}>
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th scope="col" className={styles.checkCell}>
                          <input
                            type="checkbox"
                            name="all"
                            aria-label={t.table.selectAll}
                          />
                        </th>
                        <th scope="col">{t.table.date}</th>
                        <th scope="col" className={styles.nameCell}>
                          {t.table.description}
                        </th>
                        <th scope="col" className={styles.mediumUp}>
                          {t.table.category}
                        </th>
                        <th scope="col" className={styles.wideOnly}>
                          {t.table.account}
                        </th>
                        <th scope="col" className={styles.wideOnly}>
                          {t.table.status}
                        </th>
                        <th scope="col" className={styles.amountCell}>
                          {t.table.amount}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id} className={styles.row}>
                          <td className={styles.checkCell}>
                            <input
                              type="checkbox"
                              name="ids"
                              value={tx.id}
                              aria-label={fill(t.table.select, { name: tx.name })}
                            />
                          </td>
                          <td className={styles.dateCell}>{formatDate(tx.day, locale)}</td>
                          <td className={styles.nameCell}>
                            {/* The link covers the whole row (see CSS) */}
                            <Link
                              href={hrefFor(query, { edit: tx.id })}
                              scroll={false}
                              className={styles.rowLink}
                            >
                              {tx.name}
                            </Link>
                            {tx.attachmentCount > 0 && (
                              <Paperclip
                                size={13}
                                className={styles.clip}
                                aria-label={plural(tx.attachmentCount, t.table.filesAttached)}
                              />
                            )}
                          </td>
                          <td className={styles.mediumUp}>
                            <span className={styles.category}>
                              <span
                                className={styles.categoryDot}
                                style={{
                                  backgroundColor:
                                    (tx.categoryId && categoryColors.get(tx.categoryId)) ||
                                    "var(--text-subtle)",
                                }}
                                aria-hidden="true"
                              />
                              {tx.category}
                            </span>
                          </td>
                          <td className={styles.wideOnly}>
                            {accountNames.get(tx.account)}
                          </td>
                          <td className={styles.wideOnly}>
                            <span
                              className={`${styles.status} ${tx.status === "pending" ? styles.pending : ""}`}
                            >
                              {tx.status === "pending" ? t.status.pending : t.status.completed}
                            </span>
                          </td>
                          <td
                            className={`${styles.amountCell} ${tx.amount > 0 ? styles.income : ""}`}
                          >
                            {formatCurrency(tx.amount, { signed: true, currency }, locale)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </BulkCategorize>

                {/* Paging */}
                <div className={styles.pagination}>
                  <span className={styles.pageInfo}>
                    {fill(t.showing, { first: firstShown, last: lastShown, total })}
                  </span>
                  <div className={styles.pageLinks}>
                    {query.page > 1 && (
                      <Link
                        href={hrefFor(query, { page: query.page - 1 })}
                        className={styles.pageLink}
                      >
                        <ChevronLeft size={16} /> {t.previous}
                      </Link>
                    )}
                    {hasNextPage && (
                      <Link
                        href={hrefFor(query, { page: query.page + 1 })}
                        className={styles.pageLink}
                      >
                        {t.next} <ChevronRight size={16} />
                      </Link>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </>
      )}

      {dialog?.mode === "import" && (
        <ImportDialog
          currency={currency}
          accounts={accounts}
          categories={categories}
          rules={rules}
          closeHref={listHref}
        />
      )}
      {dialog && dialog.mode !== "import" && (
        <TransactionDialog
          // A fresh form for each transaction opened
          key={dialog.mode === "edit" ? dialog.transaction.id : "new"}
          transaction={dialog.mode === "edit" ? dialog.transaction : null}
          attachments={dialog.mode === "edit" ? dialog.attachments : []}
          currency={currency}
          accounts={accounts}
          categories={categories}
          cards={cards}
          canManage={canManage}
          closeHref={listHref}
          today={today}
        />
      )}
    </main>
  );
}
