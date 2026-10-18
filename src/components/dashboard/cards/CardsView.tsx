// ─────────────────────────────────────────────────────────────────────────────
// Cards page content
//
// In plain words: everything on the Cards page — the title and "Add card"
// button, and one box per payment card showing its name, last four digits,
// who carries it, and what was paid with it this month against its limit
// (blue while it's fine, amber from 80%, red once it's over). Each links to
// its payments; owners and admins can edit them.
//
// For developers: a Server Component. Clicking a button changes the address
// (?new=1, ?edit=<id>), and the page hands back which window to show
// (`dialog`).
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { Plus } from "lucide-react";
import Button from "@/components/common/button/Button";
import { monthName, monthStart } from "@/lib/finance/budgets";
import type { CardProgress } from "@/lib/finance/cards";
import { formatCurrency } from "@/lib/format";
import type { Card, ISODate } from "@/types/finance";
import CardDialog from "./CardDialog";
import styles from "./CardsView.module.css";

const LIST_PATH = "/dashboard/cards";

interface CardsViewProps {
  organizationName: string;
  /** The company's currency, e.g. "USD" */
  currency: string;
  /** Today in the company's timezone; its month is the one shown */
  today: ISODate;
  /** Whether to show "Add card" and "Edit" (owners and admins) */
  canManage: boolean;
  /** The cards with this month's spending, cards in use first */
  cards: CardProgress[];
  /** The people who can carry a card: everyone on the team */
  members: { id: string; name: string }[];
  /** The window to show, if any */
  dialog: { mode: "new" } | { mode: "edit"; card: Card } | null;
}

// "$120.50 left", "$20.00 over the limit", "No limit"
function limitNote(card: CardProgress, currency: string): string {
  if (card.remaining === null) return "No limit";
  return card.remaining < 0
    ? `${formatCurrency(-card.remaining, { currency })} over the limit`
    : `${formatCurrency(card.remaining, { currency })} left`;
}

export default function CardsView({
  organizationName,
  currency,
  today,
  canManage,
  cards,
  members,
  dialog,
}: CardsViewProps) {
  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Cards</h1>
          <p className={styles.subtitle}>
            {organizationName}&apos;s payment cards, and what each spent in{" "}
            {monthName(today)}.
          </p>
        </div>
        {canManage && (
          <Button
            href={`${LIST_PATH}?new=1`}
            variant="primary"
            size="sm"
            text="Add card"
            icon={<Plus size={16} />}
          />
        )}
      </div>

      {cards.length === 0 ? (
        <p className={styles.empty}>
          No cards yet.{" "}
          {canManage
            ? "Add the cards your bank issued to see who spends what. Finely only needs a name and the last four digits."
            : "An owner or admin can add your company's payment cards here."}
        </p>
      ) : (
        <div className={styles.grid}>
          {cards.map((card) => (
            <article
              key={card.id}
              className={`${styles.item} ${card.archived ? styles.archived : ""}`}
            >
              {/* The card itself */}
              <div className={styles.plastic}>
                <div className={styles.plasticTop}>
                  <span className={styles.cardName}>{card.name}</span>
                  {card.archived && <span className={styles.badge}>Archived</span>}
                </div>
                <div>
                  <div
                    className={styles.digits}
                    aria-label={`Ending in ${card.last4}`}
                  >
                    •••• {card.last4}
                  </div>
                  <div className={styles.holder}>{card.holder ?? "Shared card"}</div>
                </div>
              </div>

              {/* What it spent this month */}
              <div className={styles.spending}>
                <div className={styles.spendingRow}>
                  <span className={styles.spent}>
                    {formatCurrency(card.spent, { currency })}
                    {card.monthlyLimit !== null &&
                      ` of ${formatCurrency(card.monthlyLimit, { currency })}`}
                  </span>
                  <span
                    className={`${styles.note} ${card.status && card.status !== "ok" ? styles[`note_${card.status}`] : ""}`}
                  >
                    {limitNote(card, currency)}
                  </span>
                </div>
                {card.ratio !== null && card.status !== null && (
                  <div
                    className={styles.barBg}
                    role="progressbar"
                    aria-label={`${card.name} limit used`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.min(Math.round(card.ratio * 100), 100)}
                  >
                    <div
                      className={`${styles.barFill} ${styles[`fill_${card.status}`]}`}
                      style={{ width: `${Math.min(card.ratio * 100, 100)}%` }}
                    />
                  </div>
                )}
                <span className={styles.note}>
                  {card.payments === 0
                    ? `No payments in ${monthName(today)}`
                    : `${card.payments} ${card.payments === 1 ? "payment" : "payments"} in ${monthName(today)}`}
                </span>
              </div>

              <div className={styles.links}>
                <Link
                  href={`/dashboard/transactions?card=${card.id}&from=${monthStart(today)}`}
                  className={styles.link}
                  aria-label={`View payments of ${card.name}`}
                >
                  View payments
                </Link>
                {canManage && (
                  <Link
                    href={`${LIST_PATH}?edit=${card.id}`}
                    scroll={false}
                    className={styles.link}
                    aria-label={`Edit ${card.name}`}
                  >
                    Edit
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {dialog && (
        <CardDialog
          // A fresh form for each card opened
          key={dialog.mode === "edit" ? dialog.card.id : "new"}
          card={dialog.mode === "edit" ? dialog.card : null}
          members={members}
          currency={currency}
          closeHref={LIST_PATH}
        />
      )}
    </main>
  );
}
