// ─────────────────────────────────────────────────────────────────────────────
// Terms of service (finely.com/terms)
//
// In plain words: the agreement between Finely and the people and companies
// using it — what Finely is, what you may and may not do with it, who owns
// the data, and what happens when things go wrong.
//
// For developers: plain text, no data, in i18n/messages/<language>/site.ts (both
// languages). Update the `updated` day below with every change. The text
// was not written by a lawyer, and it leaves out what only
// the business can decide (the governing law and courts, refunds, a
// liability cap in figures): have a lawyer review and complete it before
// relying on it.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { getMessages } from "@/i18n/server";
import LegalPage from "../LegalPage";

export async function generateMetadata(): Promise<Metadata> {
  const { terms } = (await getMessages()).site;
  return { title: terms.title, description: terms.metaDescription };
}

export default async function TermsPage() {
  const { terms } = (await getMessages()).site;
  return (
    <LegalPage
      title={terms.title}
      intro={terms.intro}
      updated="2026-10-13"
      sections={terms.sections}
    />
  );
}

