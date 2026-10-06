// ─────────────────────────────────────────────────────────────────────────────
// Sample (mock) data
//
// In plain words: made-up notifications for the bell in the top bar, until
// Finely sends real ones. Everything else on the dashboard is real data.
//
// For developers: shaped like the real data will be (types in
// types/finance.ts). Replace with a real source once notifications exist.
// ─────────────────────────────────────────────────────────────────────────────

import type { Notification } from "@/types/finance";

/* ------------------------------------------------------------------ */
/* Notifications (the bell in the top bar)                             */
/* ------------------------------------------------------------------ */
export const notifications: Notification[] = [
  {
    id: "n1",
    type: "payment",
    title: "Stripe payout received",
    description: "$2,400.00 landed in Business Checking.",
    time: "2h ago",
    read: false,
  },
  {
    id: "n2",
    type: "alert",
    title: "Unusual charge detected",
    description: "AWS billed 38% more than your 3-month average.",
    time: "6h ago",
    read: false,
  },
  {
    id: "n3",
    type: "bill",
    title: "Bill due tomorrow",
    description: "Google Workspace – $120.00 is due Oct 2.",
    time: "Yesterday",
    read: false,
  },
  {
    id: "n4",
    type: "card",
    title: "Card frozen",
    description: "Virtual card ••7730 was frozen by an admin.",
    time: "Sep 27",
    read: true,
  },
  {
    id: "n5",
    type: "system",
    title: "Monthly statement ready",
    description: "Your September statement is ready to download.",
    time: "Sep 26",
    read: true,
  },
];
