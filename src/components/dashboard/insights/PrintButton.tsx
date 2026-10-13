// ─────────────────────────────────────────────────────────────────────────────
// "Print / Save as PDF" button
//
// In plain words: opens the browser's print window for the page it's on.
// Every browser can save from there as a PDF, which is how a page such as
// Insights becomes a PDF to send to an accountant.
//
// For developers: a client component ("use client") because printing is a
// browser action. What the printout looks like (no menu, no top bar, no
// buttons) is decided by the "@media print" rules in the dashboard's CSS.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { Printer } from "lucide-react";
import Button from "@/components/common/button/Button";

export default function PrintButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      text="Print / Save as PDF"
      icon={<Printer size={16} />}
      action={() => window.print()}
    />
  );
}
