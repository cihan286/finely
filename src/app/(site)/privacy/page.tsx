// ─────────────────────────────────────────────────────────────────────────────
// Privacy policy (finely.com/privacy)
//
// In plain words: what Finely knows about the people and companies using
// it, why, who else handles that information, and what people can do about
// it.
//
// For developers: every statement here describes what the code really does
// (sessions keep the IP address and browser, Sentry gets no personal or
// financial data, the only cookies are the login and language ones…). When
// that changes — a new service, analytics, a new kind of data — change this
// text (in i18n/messages/<language>/site.ts, both languages) and its `updated` day
// below in the same commit. The text was not written by a lawyer: have one
// review it before relying on it.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { getMessages } from "@/i18n/server";
import LegalPage from "../LegalPage";

export async function generateMetadata(): Promise<Metadata> {
  const { privacy } = (await getMessages()).site;
  return { title: privacy.title, description: privacy.metaDescription };
}

export default async function PrivacyPage() {
  const { privacy } = (await getMessages()).site;
  return (
    <LegalPage
      title={privacy.title}
      intro={privacy.intro}
      updated="2026-10-20"
      sections={privacy.sections}
    />
  );
}

