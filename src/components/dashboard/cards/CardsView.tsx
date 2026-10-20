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
import { fill, plural, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getI18n } from "@/i18n/server";
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
function limitNote(
  card: CardProgress,
  currency: string,
  locale: Locale,
  t: Messages["cards"],
): string {
  if (card.remaining === null) return t.noLimit;
  return card.remaining < 0
    ? fill(t.overLimit, { amount: formatCurrency(-card.remaining, { currency }, locale) })
    : fill(t.left, { amount: formatCurrency(card.remaining, { currency }, locale) });
}

export default async function CardsView({
  organizationName,
  currency,
  today,
  canManage,
  cards,
  members,
  dialog,
}: CardsViewProps) {
  const { locale, m } = await getI18n();
  const t = m.cards;
  const month = monthName(today, locale);
  const money = (value: number) => formatCurrency(value, { currency }, locale);
  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.subtitle}>
            {fill(t.subtitle, { company: organizationName, month })}
          </p>
        </div>
        {canManage && (
          <Button
            href={`${LIST_PATH}?new=1`}
            variant="primary"
            size="sm"
            text={t.add}
            icon={<Plus size={16} />}
          />
        )}
      </div>

      {cards.length === 0 ? (
        <p className={styles.empty}>
          {t.empty} {canManage ? t.emptyManage : t.emptyMember}
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
                  {card.archived && <span className={styles.badge}>{t.archived}</span>}
                </div>
                <div>
                  <div
                    className={styles.digits}
                    aria-label={fill(t.endingIn, { last4: card.last4 })}
                  >
                    •••• {card.last4}
                  </div>
                  <div className={styles.holder}>{card.holder ?? t.shared}</div>
                </div>
              </div>

              {/* What it spent this month */}
              <div className={styles.spending}>
                <div className={styles.spendingRow}>
                  <span className={styles.spent}>
                    {card.monthlyLimit !== null
                      ? fill(t.spentOf, { spent: money(card.spent), limit: money(card.monthlyLimit) })
                      : money(card.spent)}
                  </span>
                  <span
                    className={`${styles.note} ${card.status && card.status !== "ok" ? styles[`note_${card.status}`] : ""}`}
                  >
                    {limitNote(card, currency, locale, t)}
                  </span>
                </div>
                {card.ratio !== null && card.status !== null && (
                  <div
                    className={styles.barBg}
                    role="progressbar"
                    aria-label={fill(t.limitUsed, { name: card.name })}
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
                    ? fill(t.noPayments, { month })
                    : plural(card.payments, t.payments, { month })}
                </span>
              </div>

              <div className={styles.links}>
                <Link
                  href={`/dashboard/transactions?card=${card.id}&from=${monthStart(today)}`}
                  className={styles.link}
                  aria-label={fill(t.viewPaymentsLabel, { name: card.name })}
                >
                  {t.viewPayments}
                </Link>
                {canManage && (
                  <Link
                    href={`${LIST_PATH}?edit=${card.id}`}
                    scroll={false}
                    className={styles.link}
                    aria-label={fill(t.editLabel, { name: card.name })}
                  >
                    {m.common.edit}
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
