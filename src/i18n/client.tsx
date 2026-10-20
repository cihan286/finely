"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Languages: the words in the browser
//
// In plain words: the server decides the language of a page (server.ts) and
// hands its words down to the parts of the page that run in the browser.
//
// For developers: <I18nProvider> wraps every page (app/layout.tsx); client
// components call useI18n() for { locale, m }. Server components use
// getI18n() from server.ts instead.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "./config";
import type { ClientMessages } from "./messages";

const I18nContext = createContext<{ locale: Locale; m: ClientMessages } | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: ClientMessages;
  children: ReactNode;
}) {
  return <I18nContext value={{ locale, m: messages }}>{children}</I18nContext>;
}

/** The page's language and its words (the parts client components use) */
export function useI18n(): { locale: Locale; m: ClientMessages } {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n() needs an <I18nProvider> above it");
  return value;
}
