// ─────────────────────────────────────────────────────────────────────────────
// Bills page content
//
// In plain words: everything on the Bills page — the title with the "Export
// CSV" and "Add bill" buttons, three totals (overdue, due in the next 7 days, owed in total), the
// table of bills still to pay with a "Mark as paid" button on each, and the
// table of recently paid ones, each linking to its payment and (for owners
// and admins) with "Undo".
//
// For developers: a Server Component. Clicking a bill or a button changes
// the address (?edit=<id>, ?pay=<id>, ?undo=<id>, ?new=1), and the page
// hands back which window to show (`dialog`).
// ─────────────────────────────────────────────────────────────────────────────

import Form from "next/form";
import Link from "next/link";
import { Download, Plus, Repeat, Search } from "lucide-react";
import Button from "@/components/common/button/Button";
import Message from "@/components/common/form/Message";
import { daysBetween } from "@/lib/dates";
import {
  BILL_REPEAT_LABELS,
  billStatus,
  summarizeBills,
} from "@/lib/finance/bills";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  Account,
  Bill,
  BillPaymentCandidate,
  Category,
  ISODate,
} from "@/types/finance";
import BillDialog, { type BillPrefill } from "./BillDialog";
import PayBillDialog from "./PayBillDialog";
import UndoPaymentDialog from "./UndoPaymentDialog";
import styles from "./BillsView.module.css";

const LIST_PATH = "/dashboard/bills";

interface BillsViewProps {
  organizationName: string;
  /** The company's currency, e.g. "USD" */
  currency: string;
  /** Today in the company's timezone */
  today: ISODate;
  /** Whether to show Delete and Undo (owners and admins) */
  canManage: boolean;
  /** Bills still owed, soonest due first */
  unpaid: Bill[];
  /** The most recently paid bills */
  paid: Bill[];
  /**
   * The unpaid bills (IDs) for which a payment of the same amount is
   * already among the transactions
   */
  possiblyPaid: string[];
  /** What the lists are narrowed down to (?q=…); "" for everything */
  search: string;
  /** Whether there are more paid bills than the ones listed */
  morePaid: boolean;
  /** Whether every paid bill is listed (?history=1) */
  allPaid: boolean;
  accounts: Account[];
  categories: Category[];
  /**
   * Set right after a payment, for the message; `linked` when the payment
   * was already among the transactions
   */
  paidResult: { nextDueDate: ISODate | null; linked: boolean } | null;
  /** Whether a payment was just undone, for the message */
  undone: boolean;
  /** How many regular payments were spotted that aren't bills yet */
  suggestions: number;
  /** The window to show, if any */
  dialog:
    | { mode: "new"; prefill: BillPrefill }
    | { mode: "edit"; bill: Bill }
    | { mode: "pay"; bill: Bill; candidates: BillPaymentCandidate[] }
    | { mode: "undo"; bill: Bill }
    | null;
}

// "Due today", "Due in 3 days", "5 days overdue"
function dueText(dueDate: ISODate, today: ISODate): string {
  const days = daysBetween(today, dueDate);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 1) return `Due in ${days} days`;
  return `${-days} ${days === -1 ? "day" : "days"} overdue`;
}

export default function BillsView({
  organizationName,
  currency,
  today,
  canManage,
  unpaid,
  paid,
  possiblyPaid,
  search,
  morePaid,
  allPaid,
  accounts,
  categories,
  paidResult,
  undone,
  suggestions,
  dialog,
}: BillsViewProps) {
  const summary = summarizeBills(unpaid, today);
  const categoryColors = new Map(categories.map((c) => [c.id, c.color]));

  // A category's name with its colored dot
  const categoryCell = (bill: Bill) => (
    <span className={styles.category}>
      <span
        className={styles.categoryDot}
        style={{
          backgroundColor:
            (bill.categoryId && categoryColors.get(bill.categoryId)) ||
            "var(--text-subtle)",
        }}
        aria-hidden="true"
      />
      {bill.category ?? "Uncategorized"}
    </span>
  );

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Bills</h1>
          <p className={styles.subtitle}>
            What {organizationName} has to pay, and when.
          </p>
        </div>
        <div className={styles.headerActions}>
          {/* Every bill, paid ones included */}
          {unpaid.length + paid.length > 0 && (
            <Button
              href={`${LIST_PATH}/export`}
              download
              variant="outline"
              size="sm"
              text="Export CSV"
              icon={<Download size={16} />}
            />
          )}
          <Button
            href={`${LIST_PATH}?new=1`}
            variant="primary"
            size="sm"
            text="Add bill"
            icon={<Plus size={16} />}
          />
        </div>
      </div>

      {undone && (
        <Message type="success">
          The payment was undone: the bill is back among what&apos;s still owed.
        </Message>
      )}

      {paidResult && (
        <Message type="success">
          {paidResult.linked
            ? "The bill was marked as paid with the payment that was already in your transactions."
            : "The bill was marked as paid and the payment was added to your transactions."}
          {paidResult.nextDueDate &&
            ` The next one is due ${formatDate(paidResult.nextDueDate)}.`}
        </Message>
      )}

      {/* Regular payments found in the history that could be bills */}
      {suggestions > 0 && (
        <Message type="info">
          Finely spotted {suggestions} regular{" "}
          {suggestions === 1 ? "payment that isn't a bill" : "payments that aren't bills"}{" "}
          yet.{" "}
          <Link href="/dashboard/insights#recurring" className={styles.messageLink}>
            See {suggestions === 1 ? "it" : "them"}
          </Link>
        </Message>
      )}

      {/* Narrows both lists down; submitting it changes the address */}
      <Form action={LIST_PATH} className={styles.searchBox}>
        <Search size={16} className={styles.searchIcon} aria-hidden="true" />
        <input
          name="q"
          type="search"
          placeholder="Search bills by name, notes or category"
          aria-label="Search bills"
          key={search}
          defaultValue={search}
          maxLength={100}
          className={styles.search}
        />
      </Form>
      {search && (
        <p className={styles.searchNote}>
          Showing bills that match “{search}”.{" "}
          <Link href={LIST_PATH} className={styles.viewLink}>
            Show all bills
          </Link>
        </p>
      )}

      {/* Totals of what's still owed (of everything, so not while searching) */}
      <div className={styles.tiles} hidden={Boolean(search)}>
        <div className={styles.tile}>
          <span className={styles.tileLabel}>Overdue</span>
          <span
            className={`${styles.tileValue} ${summary.overdue.count > 0 ? styles.danger : ""}`}
          >
            {formatCurrency(summary.overdue.amount, { currency: currency })}
          </span>
          <span className={styles.tileNote}>
            {summary.overdue.count} {summary.overdue.count === 1 ? "bill" : "bills"}
          </span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileLabel}>Due in the next 7 days</span>
          <span className={styles.tileValue}>
            {formatCurrency(summary.dueSoon.amount, { currency: currency })}
          </span>
          <span className={styles.tileNote}>
            {summary.dueSoon.count} {summary.dueSoon.count === 1 ? "bill" : "bills"}
          </span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileLabel}>Owed in total</span>
          <span className={styles.tileValue}>
            {formatCurrency(summary.unpaid.amount, { currency: currency })}
          </span>
          <span className={styles.tileNote}>
            {summary.unpaid.count} {summary.unpaid.count === 1 ? "bill" : "bills"}
          </span>
        </div>
      </div>

      {/* Bills still to pay */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>To pay</h2>
        {unpaid.length === 0 ? (
          <p className={styles.noResults}>
            {search
              ? "No unpaid bill matches your search."
              : paid.length === 0
                ? "No bills yet. Add rent, subscriptions or invoices with “Add bill” to see what's coming up."
                : "Nothing to pay right now."}
          </p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Due</th>
                  <th scope="col">Bill</th>
                  <th scope="col" className={styles.mediumUp}>
                    Category
                  </th>
                  <th scope="col" className={styles.amountCell}>
                    Amount
                  </th>
                  <th scope="col">
                    <span className={styles.srOnly}>Pay</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {unpaid.map((bill) => {
                  const status = billStatus(bill.dueDate, today);
                  return (
                    <tr key={bill.id} className={styles.row}>
                      <td>
                        <span className={styles.due}>
                          {formatDate(bill.dueDate)}
                          <span
                            className={`${styles.dueNote} ${status === "upcoming" ? "" : styles[status]}`}
                          >
                            {dueText(bill.dueDate, today)}
                          </span>
                        </span>
                      </td>
                      <td className={styles.nameCell}>
                        {/* The link covers the whole row (see CSS) */}
                        <Link
                          href={`${LIST_PATH}?edit=${bill.id}`}
                          scroll={false}
                          className={styles.rowLink}
                        >
                          {bill.name}
                        </Link>
                        {bill.repeat !== "none" && (
                          <span className={styles.repeat}>
                            <Repeat size={12} aria-hidden="true" />
                            {BILL_REPEAT_LABELS[bill.repeat]}
                          </span>
                        )}
                        {/* "Mark as paid" offers that payment */}
                        {possiblyPaid.includes(bill.id) && (
                          <span className={styles.maybePaid}>
                            A payment of this amount is already in your
                            transactions
                          </span>
                        )}
                      </td>
                      <td className={styles.mediumUp}>{categoryCell(bill)}</td>
                      <td className={styles.amountCell}>
                        {formatCurrency(bill.amount, { currency: currency })}
                      </td>
                      <td className={styles.actionCell}>
                        <Link
                          href={`${LIST_PATH}?pay=${bill.id}`}
                          scroll={false}
                          className={styles.payLink}
                          aria-label={`Mark as paid: ${bill.name}`}
                        >
                          Mark as paid
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recently paid, each with a link to its payment */}
      {paid.length > 0 && (
        <section className={styles.card}>
          <div className={styles.cardTitleRow}>
            <h2 className={styles.cardTitle}>{allPaid ? "Paid" : "Recently paid"}</h2>
            {morePaid && (
              <Link
                href={`${LIST_PATH}?history=1${search ? `&q=${encodeURIComponent(search)}` : ""}`}
                className={styles.viewLink}
              >
                Show all paid bills
              </Link>
            )}
            {allPaid && (
              <Link href={LIST_PATH} className={styles.viewLink}>
                Show the latest only
              </Link>
            )}
          </div>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Paid</th>
                  <th scope="col">Bill</th>
                  <th scope="col" className={styles.mediumUp}>
                    Category
                  </th>
                  <th scope="col" className={styles.amountCell}>
                    Amount
                  </th>
                  <th scope="col">
                    <span className={styles.srOnly}>Payment</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paid.map((bill) => (
                  <tr key={bill.id}>
                    <td className={styles.muted}>
                      {bill.paidDay && formatDate(bill.paidDay)}
                    </td>
                    <td className={styles.nameCell}>
                      <span className={styles.paidName}>{bill.name}</span>
                    </td>
                    <td className={styles.mediumUp}>{categoryCell(bill)}</td>
                    <td className={styles.amountCell}>
                      {formatCurrency(bill.amount, { currency: currency })}
                    </td>
                    <td className={styles.actionCell}>
                      <span className={styles.rowLinks}>
                        {/* Gone if the transaction was deleted since */}
                        {bill.transactionId && (
                          <Link
                            href={`/dashboard/transactions?edit=${bill.transactionId}`}
                            className={styles.viewLink}
                            aria-label={`View payment of ${bill.name}`}
                          >
                            View payment
                          </Link>
                        )}
                        {canManage && (
                          <Link
                            href={`${LIST_PATH}?undo=${bill.id}`}
                            className={styles.viewLink}
                            aria-label={`Undo the payment of ${bill.name}`}
                          >
                            Undo
                          </Link>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {dialog && (dialog.mode === "new" || dialog.mode === "edit") && (
        <BillDialog
          // A fresh form for each bill opened
          key={dialog.mode === "edit" ? dialog.bill.id : "new"}
          bill={dialog.mode === "edit" ? dialog.bill : null}
          prefill={dialog.mode === "new" ? dialog.prefill : undefined}
          categories={categories}
          currency={currency}
          canManage={canManage}
          closeHref={LIST_PATH}
          today={today}
        />
      )}
      {dialog?.mode === "pay" && (
        <PayBillDialog
          key={dialog.bill.id}
          bill={dialog.bill}
          candidates={dialog.candidates}
          accounts={accounts}
          currency={currency}
          canManage={canManage}
          closeHref={LIST_PATH}
          today={today}
        />
      )}
      {dialog?.mode === "undo" && (
        <UndoPaymentDialog
          key={dialog.bill.id}
          bill={dialog.bill}
          currency={currency}
          closeHref={LIST_PATH}
        />
      )}
    </main>
  );
}
