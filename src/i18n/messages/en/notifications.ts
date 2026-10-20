// What the bell in the top bar says (lib/finance/notifications.ts)
export const notifications = {
  unusualTitle: "Unusually high charge",
  unusual: "{name} charged {amount}, {percent}% above its usual {usual}.",
  overdrawnTitle: "Account below zero",
  overdrawn: "{name} is at {balance}.",
  shortfallTitle: "Cash may run short",
  shortfall:
    "With the bills and regular payments expected, your balance could drop to {balance} by {date}.",
  overBudgetTitle: "Over budget",
  overBudget: "{name} is {over} over its {budget} budget for {month}.",
  nearBudgetTitle: "Budget nearly used up",
  nearBudget: "{name} has used {percent}% of its {budget} budget for {month}: {left} left.",
  cardTitle: "Card over its limit",
  card: "{name} (•••• {last4}) has spent {spent} of its {limit} limit for {month}.",
  overdueTitle: { one: "Bill overdue", other: "Bills overdue" },
  overdue: {
    one: "1 bill is past its due date, {amount} in total.",
    other: "{count} bills are past their due date, {amount} in total.",
  },
  dueSoonTitle: { one: "Bill due soon", other: "Bills due soon" },
  dueSoon: {
    one: "1 bill is due within a week, {amount} in total.",
    other: "{count} bills are due within a week, {amount} in total.",
  },
  maybePaidTitle: { one: "Bill possibly paid already", other: "Bills possibly paid already" },
  maybePaid: {
    one: "1 unpaid bill has a payment of the same amount in your transactions. Mark it as paid with that payment if that's it.",
    other:
      "{count} unpaid bills have a payment of the same amount in your transactions. Mark them as paid with that payment if that's them.",
  },
  pendingTitle: "Payments still pending",
  pending: {
    one: "1 payment has been pending for more than a week. Mark it completed once it has gone through.",
    other:
      "{count} payments have been pending for more than a week. Mark them completed once they've gone through.",
  },
  uncategorizedTitle: "Transactions without a category",
  uncategorized: {
    one: "1 transaction has no category, so it's missing from the spending breakdowns.",
    other: "{count} transactions have no category, so they're missing from the spending breakdowns.",
  },
};
